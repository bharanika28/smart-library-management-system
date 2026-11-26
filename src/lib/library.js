import {
  addDoc, collection, deleteDoc, doc, getDocs, query, runTransaction,
  serverTimestamp, setDoc, Timestamp, updateDoc, where,
} from 'firebase/firestore';
import { db } from '../firebase';

export const DEFAULT_SETTINGS = { loanDays: 14, finePerDay: 5, graceDays: 0, maxFine: 500, currency: '₹' };
export const CATEGORIES = [
  'Computer Science', 'Engineering', 'Mathematics', 'Science', 'Technology', 'Business',
  'Literature', 'Fiction', 'Non-Fiction', 'History', 'Biography', 'Reference',
];
const DAY = 86400000;

/* ---------- date + money helpers ---------- */
export const toDate = (v) => (v?.toDate ? v.toDate() : v instanceof Date ? v : null);
export const toMs = (v) => toDate(v)?.getTime() ?? Date.now(); // null = pending server timestamp (just written)
export const fmtDate = (v) => {
  const d = toDate(v);
  return d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
};
export const money = (n, s = DEFAULT_SETTINGS) => `${s.currency}${Number(n || 0).toLocaleString('en-IN')}`;
export const byNewest = (field) => (a, b) => toMs(b[field]) - toMs(a[field]);

export const isOverdue = (tx) => tx.status === 'issued' && toDate(tx.dueDate) < new Date();
export const daysUntil = (due) => Math.ceil((toDate(due) - new Date()) / DAY);
export const isDueSoon = (tx, within = 3) => tx.status === 'issued' && !isOverdue(tx) && daysUntil(tx.dueDate) <= within;

// Fine rule: (days late - grace days) x fine per day, capped at maxFine.
export function calcFine(due, settings, ref = new Date()) {
  const d = toDate(due);
  if (!d || ref <= d) return { days: 0, amount: 0 };
  const days = Math.max(0, Math.ceil((ref - d) / DAY) - settings.graceDays);
  return { days, amount: Math.min(days * settings.finePerDay, settings.maxFine) };
}

export function filterBooks(books, { q = '', cat = 'All', onlyAvail = false }) {
  const s = q.trim().toLowerCase();
  return books.filter(
    (b) =>
      (cat === 'All' || b.category === cat) &&
      (!onlyAvail || b.availableCopies > 0) &&
      (!s || [b.title, b.author, b.isbn, b.category].some((v) => String(v || '').toLowerCase().includes(s))),
  );
}

export function fbError(e) {
  const map = {
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/wrong-password': 'Incorrect email or password.',
    'auth/user-not-found': 'Incorrect email or password.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/email-already-in-use': 'An account with this email already exists. Try signing in.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'permission-denied': 'You do not have permission to do this. Check your role and the Firestore rules.',
    unavailable: 'Cannot reach Firebase. Check your connection.',
  };
  return map[e?.code] || e?.message || 'Something went wrong. Please try again.';
}

/* ---------- book operations ---------- */
export async function saveBook(data, id) {
  const clean = {
    title: data.title.trim(), author: data.author.trim(), isbn: data.isbn.trim(),
    category: data.category.trim(), publisher: data.publisher.trim(),
    year: data.year ? Number(data.year) : null, description: data.description.trim(),
    coverUrl: data.coverUrl.trim(), totalCopies: Number(data.totalCopies),
  };
  if (!id) {
    await addDoc(collection(db, 'books'), {
      ...clean, availableCopies: clean.totalCopies, borrowCount: 0,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    return;
  }
  // Editing copies: shift availableCopies by the same delta, atomically.
  const ref = doc(db, 'books', id);
  await runTransaction(db, async (t) => {
    const snap = await t.get(ref);
    if (!snap.exists()) throw new Error('This book no longer exists.');
    const b = snap.data();
    const available = (b.availableCopies || 0) + (clean.totalCopies - (b.totalCopies || 0));
    if (available < 0) {
      throw new Error(`${(b.totalCopies || 0) - (b.availableCopies || 0)} copies are currently issued. Total copies cannot be lower than that.`);
    }
    t.update(ref, { ...clean, availableCopies: available, updatedAt: serverTimestamp() });
  });
}

export async function deleteBook(book) {
  if ((book.availableCopies || 0) < (book.totalCopies || 0)) {
    throw new Error('Some copies are still issued. Process their returns before deleting this book.');
  }
  await deleteDoc(doc(db, 'books', book.id));
}

/* ---------- borrowing workflow ---------- */
async function hasActive(studentId, bookId) {
  const [tx, rq] = await Promise.all([
    getDocs(query(collection(db, 'borrowTransactions'), where('studentId', '==', studentId))),
    getDocs(query(collection(db, 'borrowRequests'), where('studentId', '==', studentId))),
  ]);
  return {
    issued: tx.docs.some((d) => d.data().bookId === bookId && d.data().status === 'issued'),
    pending: rq.docs.some((d) => d.data().bookId === bookId && d.data().status === 'pending'),
  };
}

export async function requestBorrow({ book, user }) {
  if ((book.availableCopies || 0) < 1) throw new Error('No copies of this book are available right now.');
  const a = await hasActive(user.id, book.id);
  if (a.issued) throw new Error('You have already borrowed this book.');
  if (a.pending) throw new Error('You already have a pending request for this book.');
  await addDoc(collection(db, 'borrowRequests'), {
    bookId: book.id, bookTitle: book.title, studentId: user.id, studentName: user.name,
    studentEmail: user.email, status: 'pending', requestedAt: serverTimestamp(),
  });
}

export const cancelRequest = (id) =>
  updateDoc(doc(db, 'borrowRequests', id), { status: 'cancelled', cancelledAt: serverTimestamp() });

export const rejectRequest = (id, adminId) =>
  updateDoc(doc(db, 'borrowRequests', id), { status: 'rejected', reviewedBy: adminId, reviewedAt: serverTimestamp() });

// Used for both "approve request" and "direct issue". One transaction keeps the
// stock count, the request status and the new loan record consistent.
export async function issueBook({ bookId, student, requestId = null, settings, adminId }) {
  const a = await hasActive(student.id, bookId);
  if (a.issued) throw new Error('This student already has this book issued.');

  const bookRef = doc(db, 'books', bookId);
  const reqRef = requestId ? doc(db, 'borrowRequests', requestId) : null;
  const txRef = doc(collection(db, 'borrowTransactions'));

  await runTransaction(db, async (t) => {
    const bs = await t.get(bookRef);
    const rs = reqRef ? await t.get(reqRef) : null;
    if (!bs.exists()) throw new Error('Book not found.');
    if (rs && (!rs.exists() || rs.data().status !== 'pending')) throw new Error('This request is no longer pending.');
    const b = bs.data();
    if ((b.availableCopies || 0) < 1) throw new Error('No copies available. Cannot issue this book.');

    const due = new Date();
    due.setDate(due.getDate() + settings.loanDays);
    due.setHours(23, 59, 59, 0);

    t.update(bookRef, { availableCopies: b.availableCopies - 1, borrowCount: (b.borrowCount || 0) + 1, updatedAt: serverTimestamp() });
    t.set(txRef, {
      bookId, bookTitle: b.title, bookAuthor: b.author, category: b.category || 'Uncategorised',
      studentId: student.id, studentName: student.name, studentEmail: student.email,
      requestId, issuedBy: adminId, issueDate: Timestamp.now(), dueDate: Timestamp.fromDate(due),
      returnDate: null, status: 'issued', fineAmount: 0, overdueDays: 0, createdAt: serverTimestamp(),
    });
    if (reqRef) t.update(reqRef, { status: 'approved', transactionId: txRef.id, reviewedBy: adminId, reviewedAt: serverTimestamp() });
  });
}

export async function returnBook(txId, settings) {
  const txRef = doc(db, 'borrowTransactions', txId);
  await runTransaction(db, async (t) => {
    const ts = await t.get(txRef);
    if (!ts.exists()) throw new Error('Loan record not found.');
    const tx = ts.data();
    if (tx.status !== 'issued') throw new Error('This book has already been returned.');
    const bookRef = doc(db, 'books', tx.bookId);
    const bs = await t.get(bookRef);

    const now = new Date();
    const { days, amount } = calcFine(tx.dueDate, settings, now);

    if (bs.exists()) {
      const b = bs.data();
      t.update(bookRef, { availableCopies: Math.min((b.availableCopies || 0) + 1, b.totalCopies || 0), updatedAt: serverTimestamp() });
    }
    t.update(txRef, { status: 'returned', returnDate: Timestamp.fromDate(now), fineAmount: amount, overdueDays: days });
    if (amount > 0) {
      t.set(doc(db, 'fines', txId), {
        transactionId: txId, studentId: tx.studentId, studentName: tx.studentName,
        bookId: tx.bookId, bookTitle: tx.bookTitle, amount, overdueDays: days,
        status: 'pending', paidAt: null, createdAt: serverTimestamp(),
      });
    }
  });
}

export const setFineStatus = (id, status) =>
  updateDoc(doc(db, 'fines', id), { status, paidAt: status === 'paid' ? serverTimestamp() : null });

export const saveSettings = (s) => setDoc(doc(db, 'settings', 'library'), s, { merge: true });

/* ---------- analytics helpers ---------- */
export function monthly(txs, n = 6) {
  const now = new Date();
  const rows = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    rows.push({ key: `${d.getFullYear()}-${d.getMonth()}`, month: d.toLocaleString('en', { month: 'short' }), borrowed: 0, returned: 0 });
  }
  const bump = (date, field) => {
    const d = toDate(date);
    const row = d && rows.find((r) => r.key === `${d.getFullYear()}-${d.getMonth()}`);
    if (row) row[field]++;
  };
  txs.forEach((t) => { bump(t.issueDate, 'borrowed'); bump(t.returnDate, 'returned'); });
  return rows;
}

export function countBy(txs, field, limit = 6) {
  const m = new Map();
  txs.forEach((t) => m.set(t[field] || 'Unknown', (m.get(t[field] || 'Unknown') || 0) + 1));
  return [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, limit);
}

export function downloadCsv(filename, rows) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

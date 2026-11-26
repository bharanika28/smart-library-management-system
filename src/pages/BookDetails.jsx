import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useCol, useDoc } from '../hooks/useFirestore';
import { useRequest } from '../hooks/useRequest';
import { deleteBook, fbError, fmtDate, isOverdue } from '../lib/library';
import { Badge, BookCover, ConfirmDialog, Empty, FullSpinner, Spinner, StatusBadge, Table } from '../components/ui';

function WhoHasIt({ bookId }) {
  const { data } = useCol('borrowTransactions', 'bookId', bookId);
  const out = data.filter((t) => t.status === 'issued');
  return (
    <div className="card mt-6 overflow-hidden">
      <h2 className="px-5 pt-5 text-lg font-semibold">Currently issued copies</h2>
      {out.length === 0 ? <Empty title="No copies are out" text="Every copy of this book is on the shelf." /> : (
        <Table head={['Student', 'Issued', 'Due', 'Status']}>
          {out.map((t) => (
            <tr key={t.id}><td className="td font-medium">{t.studentName}</td><td className="td">{fmtDate(t.issueDate)}</td><td className="td">{fmtDate(t.dueDate)}</td>
              <td className="td"><StatusBadge status={isOverdue(t) ? 'overdue' : 'issued'} /></td></tr>
          ))}
        </Table>
      )}
    </div>
  );
}

export default function BookDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { isAdmin } = useAuth();
  const base = isAdmin ? '/admin' : '/student';
  const { data: book, loading } = useDoc('books', id);
  const { request, busyId, stateOf } = useRequest();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  if (loading) return <FullSpinner />;
  if (!book) return <div className="card"><Empty title="Book not found" text="It may have been removed.">
    <Link to={`${base}/books`} className="btn-primary">Back to catalogue</Link></Empty></div>;

  const avail = (book.availableCopies || 0) > 0;
  const state = isAdmin ? null : stateOf(book.id);
  let label = 'Request to borrow';
  if (state === 'pending') label = 'Request pending approval';
  else if (state === 'issued') label = 'You have borrowed this book';
  else if (!avail) label = 'No copies available';

  const remove = async () => {
    setBusy(true);
    try { await deleteBook(book); toast.success('Book deleted.'); nav(`${base}/books`, { replace: true }); }
    catch (e) { toast.error(fbError(e)); setBusy(false); setConfirm(false); }
  };

  const meta = [['ISBN', book.isbn], ['Publisher', book.publisher], ['Year', book.year], ['Total copies', book.totalCopies]];
  return (
    <>
      <Link to={`${base}/books`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-navy-800"><ArrowLeft className="h-4 w-4" />Back to books</Link>
      <div className="card grid gap-8 p-6 md:grid-cols-[260px_1fr]">
        <div className="overflow-hidden rounded-xl shadow-md"><BookCover book={book} className="aspect-[3/4] w-full" /></div>
        <div>
          {book.category && <Badge tone="teal">{book.category}</Badge>}
          <h1 className="mt-2 text-3xl font-semibold">{book.title}</h1>
          <p className="mt-1 text-slate-500">by {book.author}</p>
          <p className={`mt-4 text-sm font-medium ${avail ? 'text-emerald-600' : 'text-red-500'}`}>{avail ? `${book.availableCopies} of ${book.totalCopies} copies available` : 'All copies are issued'}</p>
          <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {meta.map(([k, v]) => (<div key={k}><dt className="text-xs text-slate-400">{k}</dt><dd className="text-sm font-medium">{v || '—'}</dd></div>))}
          </dl>
          <p className="mt-6 max-w-prose whitespace-pre-line leading-7 text-slate-600">{book.description || 'No description has been added for this book.'}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {isAdmin ? (
              <>
                <Link to={`/admin/books/${book.id}/edit`} className="btn-primary"><Pencil className="h-4 w-4" />Edit book</Link>
                <button className="btn-ghost text-red-600" onClick={() => setConfirm(true)}><Trash2 className="h-4 w-4" />Delete</button>
              </>
            ) : (
              <button className="btn-teal !px-6" disabled={busyId === book.id || state || !avail} onClick={() => request(book)}>
                {busyId === book.id && <Spinner className="h-4 w-4 !text-white" />}{label}
              </button>
            )}
          </div>
        </div>
      </div>
      {isAdmin && <WhoHasIt bookId={book.id} />}
      <ConfirmDialog open={confirm} danger busy={busy} title="Delete this book?" confirmLabel="Delete book"
        message={`“${book.title}” will be permanently removed. This cannot be undone.`} onConfirm={remove} onCancel={() => setConfirm(false)} />
    </>
  );
}

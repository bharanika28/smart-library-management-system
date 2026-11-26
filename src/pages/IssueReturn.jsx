import { useMemo, useState } from 'react';
import { ArrowLeftRight, BookCheck, Undo2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { useCol } from '../hooks/useFirestore';
import { calcFine, fbError, fmtDate, isOverdue, issueBook, money, returnBook, toMs } from '../lib/library';
import { ConfirmDialog, Empty, FullSpinner, PageHeader, Pager, SearchInput, Spinner, StatusBadge, Table, usePager } from '../components/ui';

export default function IssueReturn() {
  const { user } = useAuth();
  const settings = useSettings();
  const toast = useToast();
  const users = useCol('users');
  const books = useCol('books');
  const txs = useCol('borrowTransactions');
  const [studentId, setStudentId] = useState('');
  const [bookId, setBookId] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [q, setQ] = useState('');
  const [target, setTarget] = useState(null);
  const [returning, setReturning] = useState(false);

  const students = useMemo(() => users.data.filter((u) => u.role === 'student').sort((a, b) => a.name.localeCompare(b.name)), [users.data]);
  const available = useMemo(() => books.data.filter((b) => b.availableCopies > 0).sort((a, b) => a.title.localeCompare(b.title)), [books.data]);
  const issued = useMemo(() => {
    const s = q.trim().toLowerCase();
    return txs.data.filter((t) => t.status === 'issued' && (!s || `${t.bookTitle} ${t.studentName}`.toLowerCase().includes(s)))
      .sort((a, b) => toMs(a.dueDate) - toMs(b.dueDate));
  }, [txs.data, q]);
  const pager = usePager(issued, 8, q);

  const issue = async (e) => {
    e.preventDefault();
    const st = students.find((s) => s.id === studentId);
    if (!st || !bookId) return toast.error('Choose a student and a book first.');
    setIssuing(true);
    try {
      await issueBook({ bookId, student: { id: st.id, name: st.name, email: st.email }, settings, adminId: user.uid });
      toast.success(`Book issued to ${st.name}. Due in ${settings.loanDays} days.`);
      setBookId('');
    } catch (err) { toast.error(fbError(err)); } finally { setIssuing(false); }
  };

  const doReturn = async () => {
    setReturning(true);
    try {
      await returnBook(target.id, settings);
      const fine = calcFine(target.dueDate, settings).amount;
      toast.success(fine ? `Returned. A fine of ${money(fine, settings)} was recorded.` : 'Book returned. Availability updated.');
      setTarget(null);
    } catch (err) { toast.error(fbError(err)); } finally { setReturning(false); }
  };

  if (users.loading || books.loading || txs.loading) return <FullSpinner />;
  const targetFine = target ? calcFine(target.dueDate, settings) : null;

  return (
    <>
      <PageHeader title="Issue / return" subtitle={`Loan period: ${settings.loanDays} days. Fine: ${money(settings.finePerDay, settings)} per overdue day.`} />
      <form onSubmit={issue} className="card mb-6 grid gap-4 p-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <div><label className="label" htmlFor="stu">Student</label>
          <select id="stu" className="input" value={studentId} onChange={(e) => setStudentId(e.target.value)}><option value="">Select a student…</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}{s.studentNo ? ` (${s.studentNo})` : ''}</option>)}</select></div>
        <div><label className="label" htmlFor="bk">Book (available only)</label>
          <select id="bk" className="input" value={bookId} onChange={(e) => setBookId(e.target.value)}><option value="">Select a book…</option>
            {available.map((b) => <option key={b.id} value={b.id}>{b.title} · {b.availableCopies} left</option>)}</select></div>
        <button className="btn-teal" disabled={issuing}>{issuing ? <Spinner className="h-4 w-4 !text-white" /> : <BookCheck className="h-4 w-4" />}Issue book</button>
      </form>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <h2 className="text-lg font-semibold">Books on loan ({issued.length})</h2>
          <SearchInput value={q} onChange={setQ} placeholder="Search by book or student" className="w-full sm:w-72" />
        </div>
        {issued.length === 0 ? <Empty icon={ArrowLeftRight} title="No books on loan" text="Issued books waiting to be returned will be listed here." /> : (
          <>
            <Table head={['Book', 'Student', 'Issued', 'Due', 'Status', 'Fine now', '']}>
              {pager.slice.map((t) => {
                const late = isOverdue(t);
                return (
                  <tr key={t.id} className={late ? 'bg-red-50/50' : 'transition-colors hover:bg-slate-50'}>
                    <td className="td font-medium">{t.bookTitle}</td><td className="td">{t.studentName}</td><td className="td">{fmtDate(t.issueDate)}</td><td className="td">{fmtDate(t.dueDate)}</td>
                    <td className="td"><StatusBadge status={late ? 'overdue' : 'issued'} /></td>
                    <td className="td">{late ? <span className="font-medium text-red-600">{money(calcFine(t.dueDate, settings).amount, settings)}</span> : '—'}</td>
                    <td className="td"><button className="btn-primary btn-sm" onClick={() => setTarget(t)}><Undo2 className="h-3.5 w-3.5" />Return</button></td>
                  </tr>
                );
              })}
            </Table>
            <Pager pager={pager} />
          </>
        )}
      </div>

      <ConfirmDialog open={Boolean(target)} title="Process return?" confirmLabel="Confirm return" busy={returning} onConfirm={doReturn} onCancel={() => setTarget(null)}
        message={target && `“${target.bookTitle}” from ${target.studentName} will be marked returned and one copy added back to stock.${targetFine.amount ? ` It is ${targetFine.days} day(s) late, so a fine of ${money(targetFine.amount, settings)} will be recorded.` : ''}`} />
    </>
  );
}

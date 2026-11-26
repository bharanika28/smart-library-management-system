import { useMemo, useState } from 'react';
import { History } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { useCol } from '../hooks/useFirestore';
import { byNewest, calcFine, cancelRequest, daysUntil, fbError, fmtDate, isOverdue, money } from '../lib/library';
import { Badge, Empty, FullSpinner, PageHeader, Pager, SearchInput, StatusBadge, Table, usePager } from '../components/ui';

const filters = ['all', 'issued', 'overdue', 'returned'];

// Admin: every loan in the library. Student: own requests, loans and due dates.
export default function HistoryPage() {
  const { isAdmin, user } = useAuth();
  const settings = useSettings();
  const toast = useToast();
  const scope = isAdmin ? [undefined, undefined] : ['studentId', user.uid];
  const txs = useCol('borrowTransactions', ...scope);
  const reqs = useCol('borrowRequests', ...scope);
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return txs.data
      .filter((t) => (status === 'all' ? true : status === 'overdue' ? isOverdue(t) : t.status === status))
      .filter((t) => !s || `${t.bookTitle} ${t.studentName} ${t.bookAuthor}`.toLowerCase().includes(s))
      .sort(byNewest('createdAt'));
  }, [txs.data, status, q]);
  const pager = usePager(rows, 10, `${status}|${q}`);
  const openReqs = reqs.data.filter((r) => r.status === 'pending').sort(byNewest('requestedAt'));

  const cancel = async (r) => {
    try { await cancelRequest(r.id); toast.info('Request cancelled.'); } catch (e) { toast.error(fbError(e)); }
  };

  if (txs.loading || reqs.loading) return <FullSpinner />;
  return (
    <>
      <PageHeader title={isAdmin ? 'Borrowing history' : 'My borrowing'} subtitle={isAdmin ? 'Every issue and return in the library.' : 'Your requests, current loans and past loans.'} />

      {!isAdmin && openReqs.length > 0 && (
        <div className="card mb-6 overflow-hidden">
          <h2 className="px-5 pt-5 text-lg font-semibold">Pending requests</h2>
          <Table head={['Book', 'Requested', 'Status', '']}>
            {openReqs.map((r) => (<tr key={r.id}><td className="td font-medium">{r.bookTitle}</td><td className="td">{fmtDate(r.requestedAt)}</td><td className="td"><StatusBadge status={r.status} /></td>
              <td className="td"><button className="btn-ghost btn-sm" onClick={() => cancel(r)}>Cancel request</button></td></tr>))}
          </Table>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (<button key={f} onClick={() => setStatus(f)} className={`rounded-full border px-3.5 py-1 text-sm capitalize transition-colors ${status === f ? 'border-navy-800 bg-navy-800 text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-teal-500'}`}>{f}</button>))}
          </div>
          <SearchInput value={q} onChange={setQ} placeholder={isAdmin ? 'Search book or student' : 'Search your books'} className="w-full sm:w-72" />
        </div>
        {rows.length === 0 ? <Empty icon={History} title="No records found" text={txs.data.length ? 'Try a different filter or search.' : 'Borrowed books will be listed here.'} /> : (
          <>
            <Table head={['Book', ...(isAdmin ? ['Student'] : []), 'Issued', 'Due', 'Returned', 'Status', 'Fine']}>
              {pager.slice.map((t) => {
                const late = isOverdue(t);
                return (
                  <tr key={t.id} className={late ? 'bg-red-50/50' : 'transition-colors hover:bg-slate-50'}>
                    <td className="td font-medium">{t.bookTitle}<p className="text-xs font-normal text-slate-500">{t.bookAuthor}</p></td>
                    {isAdmin && <td className="td">{t.studentName}</td>}
                    <td className="td">{fmtDate(t.issueDate)}</td>
                    <td className="td">{fmtDate(t.dueDate)}{t.status === 'issued' && !late && <p className="text-xs text-slate-400">{daysUntil(t.dueDate)} day(s) left</p>}</td>
                    <td className="td">{fmtDate(t.returnDate)}</td>
                    <td className="td"><StatusBadge status={late ? 'overdue' : t.status} /></td>
                    <td className="td">{t.fineAmount ? <Badge tone="amber">{money(t.fineAmount, settings)}</Badge> : late ? <span className="text-red-600">{money(calcFine(t.dueDate, settings).amount, settings)} so far</span> : '—'}</td>
                  </tr>
                );
              })}
            </Table>
            <Pager pager={pager} />
          </>
        )}
      </div>
    </>
  );
}

import { useMemo, useState } from 'react';
import { Check, Inbox, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { useCol } from '../hooks/useFirestore';
import { byNewest, fbError, fmtDate, issueBook, rejectRequest } from '../lib/library';
import { Empty, FullSpinner, PageHeader, Pager, Spinner, StatusBadge, Table, usePager } from '../components/ui';

const tabs = ['pending', 'approved', 'rejected', 'cancelled', 'all'];

export default function BorrowRequests() {
  const { user } = useAuth();
  const settings = useSettings();
  const toast = useToast();
  const reqs = useCol('borrowRequests');
  const books = useCol('books');
  const [tab, setTab] = useState('pending');
  const [busy, setBusy] = useState(null);

  const bookMap = useMemo(() => new Map(books.data.map((b) => [b.id, b])), [books.data]);
  const rows = useMemo(() => reqs.data.filter((r) => tab === 'all' || r.status === tab).sort(byNewest('requestedAt')), [reqs.data, tab]);
  const pager = usePager(rows, 10, tab);

  const act = async (r, kind) => {
    setBusy(r.id + kind);
    try {
      if (kind === 'approve') {
        await issueBook({ bookId: r.bookId, student: { id: r.studentId, name: r.studentName, email: r.studentEmail }, requestId: r.id, settings, adminId: user.uid });
        toast.success(`Approved. “${r.bookTitle}” is issued to ${r.studentName}.`);
      } else {
        await rejectRequest(r.id, user.uid);
        toast.info(`Request from ${r.studentName} was rejected.`);
      }
    } catch (e) { toast.error(fbError(e)); } finally { setBusy(null); }
  };

  if (reqs.loading) return <FullSpinner />;
  return (
    <>
      <PageHeader title="Borrow requests" subtitle="Approving a request issues the book and reduces its available copies." />
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full border px-4 py-1.5 text-sm capitalize transition-colors ${tab === t ? 'border-navy-800 bg-navy-800 text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-teal-500'}`}>
            {t}{t !== 'all' && ` (${reqs.data.filter((r) => r.status === t).length})`}
          </button>
        ))}
      </div>
      <div className="card overflow-hidden">
        {rows.length === 0 ? <Empty icon={Inbox} title={tab === 'pending' ? 'No requests waiting' : `No ${tab} requests`} text="New student requests appear here instantly." /> : (
          <>
            <Table head={['Book', 'Student', 'Requested', 'Copies left', 'Status', 'Action']}>
              {pager.slice.map((r) => {
                const left = bookMap.get(r.bookId)?.availableCopies ?? 0;
                return (
                  <tr key={r.id} className="transition-colors hover:bg-slate-50">
                    <td className="td font-medium">{r.bookTitle}</td>
                    <td className="td">{r.studentName}<p className="text-xs text-slate-500">{r.studentEmail}</p></td>
                    <td className="td">{fmtDate(r.requestedAt)}</td>
                    <td className={`td font-medium ${left < 1 ? 'text-red-600' : 'text-emerald-600'}`}>{left}</td>
                    <td className="td"><StatusBadge status={r.status} /></td>
                    <td className="td">
                      {r.status === 'pending' ? (
                        <div className="flex gap-2">
                          <button className="btn-teal btn-sm" disabled={Boolean(busy) || left < 1} title={left < 1 ? 'No copies available' : ''} onClick={() => act(r, 'approve')}>{busy === r.id + 'approve' ? <Spinner className="h-3.5 w-3.5 !text-white" /> : <Check className="h-3.5 w-3.5" />}Approve</button>
                          <button className="btn-ghost btn-sm text-red-600" disabled={Boolean(busy)} onClick={() => act(r, 'reject')}>{busy === r.id + 'reject' ? <Spinner className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}Reject</button>
                        </div>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
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

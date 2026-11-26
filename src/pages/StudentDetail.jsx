import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Contact } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useCol, useDoc } from '../hooks/useFirestore';
import { byNewest, calcFine, fmtDate, isOverdue, money } from '../lib/library';
import { Badge, Empty, FullSpinner, StatusBadge, Table } from '../components/ui';

export default function StudentDetail() {
  const { id } = useParams();
  const settings = useSettings();
  const { data: u, loading } = useDoc('users', id);
  const txs = useCol('borrowTransactions', 'studentId', id);
  const fines = useCol('fines', 'studentId', id);
  if (loading || txs.loading) return <FullSpinner />;
  if (!u) return <div className="card"><Empty title="Student not found"><Link to="/admin/students" className="btn-primary">Back to students</Link></Empty></div>;

  const history = [...txs.data].sort(byNewest('createdAt'));
  const pendingFines = fines.data.filter((f) => f.status === 'pending').reduce((a, f) => a + f.amount, 0);
  const accruing = history.filter(isOverdue).reduce((a, t) => a + calcFine(t.dueDate, settings).amount, 0);
  const info = [[Mail, u.email], [Contact, u.studentNo ? `Roll no. ${u.studentNo}` : null], [Phone, u.phone]].filter((x) => x[1]);

  return (
    <>
      <Link to="/admin/students" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-navy-800"><ArrowLeft className="h-4 w-4" />Back to students</Link>
      <div className="card flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h1 className="text-2xl font-semibold">{u.name}</h1>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">{info.map(([Icon, v]) => <span key={v} className="flex items-center gap-1.5"><Icon className="h-4 w-4" />{v}</span>)}<span>Joined {fmtDate(u.createdAt)}</span></div>
        </div>
        <div className="flex gap-6 text-right">
          <div><p className="text-xs text-slate-400">Pending fines</p><p className="font-serif text-xl font-semibold">{money(pendingFines, settings)}</p></div>
          <div><p className="text-xs text-slate-400">Accruing (overdue)</p><p className="font-serif text-xl font-semibold text-red-600">{money(accruing, settings)}</p></div>
        </div>
      </div>
      <div className="card mt-6 overflow-hidden">
        <h2 className="px-5 pt-5 text-lg font-semibold">Borrowing history</h2>
        {history.length === 0 ? <Empty title="No borrowing history" text="This student has not borrowed any books yet." /> : (
          <Table head={['Book', 'Issued', 'Due', 'Returned', 'Status', 'Fine']}>
            {history.map((t) => (
              <tr key={t.id} className={isOverdue(t) ? 'bg-red-50/50' : ''}>
                <td className="td font-medium">{t.bookTitle}</td><td className="td">{fmtDate(t.issueDate)}</td><td className="td">{fmtDate(t.dueDate)}</td><td className="td">{fmtDate(t.returnDate)}</td>
                <td className="td"><StatusBadge status={isOverdue(t) ? 'overdue' : t.status} /></td>
                <td className="td">{t.status === 'returned' ? (t.fineAmount ? <Badge tone="amber">{money(t.fineAmount, settings)}</Badge> : '—') : isOverdue(t) ? <span className="text-red-600">{money(calcFine(t.dueDate, settings).amount, settings)} so far</span> : '—'}</td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </>
  );
}

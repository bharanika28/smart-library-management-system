import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { useCol } from '../hooks/useFirestore';
import { fmtDate, isOverdue } from '../lib/library';
import { Badge, Empty, FullSpinner, PageHeader, Pager, SearchInput, Table, usePager } from '../components/ui';

export default function Students() {
  const users = useCol('users');
  const txs = useCol('borrowTransactions');
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return users.data
      .filter((u) => u.role === 'student')
      .filter((u) => !s || [u.name, u.email, u.studentNo].some((v) => String(v || '').toLowerCase().includes(s)))
      .map((u) => {
        const mine = txs.data.filter((t) => t.studentId === u.id);
        return { ...u, borrowed: mine.filter((t) => t.status === 'issued').length, overdue: mine.filter(isOverdue).length, total: mine.length };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users.data, txs.data, q]);
  const pager = usePager(rows, 10, q);

  if (users.loading || txs.loading) return <FullSpinner />;
  return (
    <>
      <PageHeader title="Students" subtitle={`${rows.length} registered student${rows.length === 1 ? '' : 's'}`} />
      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 p-4"><SearchInput value={q} onChange={setQ} placeholder="Search by name, email or roll number" className="max-w-md" /></div>
        {rows.length === 0 ? <Empty icon={Users} title={q ? 'No students match your search' : 'No students have registered yet'} text={q ? 'Check the spelling or try another keyword.' : 'Students appear here after they create an account.'} /> : (
          <>
            <Table head={['Student', 'Roll no.', 'Joined', 'On loan', 'Overdue', 'Total loans']}>
              {pager.slice.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-slate-50">
                  <td className="td"><Link to={`/admin/students/${u.id}`} className="font-medium text-navy-800 hover:text-teal-700">{u.name}</Link><p className="text-xs text-slate-500">{u.email}</p></td>
                  <td className="td">{u.studentNo || '—'}</td><td className="td">{fmtDate(u.createdAt)}</td><td className="td">{u.borrowed}</td>
                  <td className="td">{u.overdue ? <Badge tone="red">{u.overdue} overdue</Badge> : <span className="text-slate-400">None</span>}</td><td className="td">{u.total}</td>
                </tr>
              ))}
            </Table>
            <Pager pager={pager} />
          </>
        )}
      </div>
    </>
  );
}

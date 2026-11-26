import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, BookCopy, BookMarked, BookOpenCheck, Coins, Inbox, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useCol } from '../hooks/useFirestore';
import { byNewest, countBy, fmtDate, isOverdue, money, monthly } from '../lib/library';
import { Empty, FullSpinner, PageHeader, StatCard, StatusBadge } from '../components/ui';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const settings = useSettings();
  const books = useCol('books');
  const users = useCol('users');
  const txs = useCol('borrowTransactions');
  const fines = useCol('fines');
  const reqs = useCol('borrowRequests');

  const s = useMemo(() => {
    const issued = txs.data.filter((t) => t.status === 'issued');
    const pendingFine = fines.data.filter((f) => f.status === 'pending').reduce((a, f) => a + f.amount, 0);
    return {
      copies: books.data.reduce((a, b) => a + (b.totalCopies || 0), 0),
      available: books.data.reduce((a, b) => a + (b.availableCopies || 0), 0),
      issued: issued.length,
      students: users.data.filter((u) => u.role === 'student').length,
      overdue: issued.filter(isOverdue).length,
      fineTotal: fines.data.reduce((a, f) => a + f.amount, 0),
      pendingFine,
      pendingReqs: reqs.data.filter((r) => r.status === 'pending').length,
      recent: [...txs.data].sort(byNewest('createdAt')).slice(0, 6),
      popular: countBy(txs.data, 'bookTitle', 5),
      chart: monthly(txs.data),
    };
  }, [books.data, users.data, txs.data, fines.data, reqs.data]);

  if ([books, users, txs, fines].some((x) => x.loading)) return <FullSpinner label="Loading dashboard…" />;
  const maxPop = Math.max(1, ...s.popular.map((p) => p.count));

  return (
    <>
      <PageHeader title={`Welcome, ${profile.name.split(' ')[0]}`} subtitle="Live overview of the library, calculated from Firestore.">
        {s.pendingReqs > 0 && <Link to="/admin/requests" className="btn-teal"><Inbox className="h-4 w-4" />{s.pendingReqs} request{s.pendingReqs > 1 ? 's' : ''} waiting</Link>}
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={BookCopy} label="Total books" value={s.copies} hint={`${books.data.length} titles`} tone="navy" />
        <StatCard icon={BookOpenCheck} label="Available books" value={s.available} tone="green" />
        <StatCard icon={BookMarked} label="Currently borrowed" value={s.issued} tone="teal" />
        <StatCard icon={Users} label="Registered students" value={s.students} tone="navy" />
        <StatCard icon={AlertTriangle} label="Overdue books" value={s.overdue} tone="red" />
        <StatCard icon={Coins} label="Total fines" value={money(s.fineTotal, settings)} hint={`${money(s.pendingFine, settings)} pending`} tone="amber" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold">Monthly borrowing</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={s.chart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={28} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="borrowed" name="Issued" fill="#142a4d" radius={[6, 6, 0, 0]} />
                <Bar dataKey="returned" name="Returned" fill="#14b8a6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-5">
          <h2 className="mb-4 text-lg font-semibold">Most popular books</h2>
          {s.popular.length === 0 ? <Empty title="No borrowing yet" text="Popular titles appear after the first book is issued." /> : (
            <ol className="space-y-4">
              {s.popular.map((p) => (
                <li key={p.name}>
                  <div className="flex justify-between gap-2 text-sm"><span className="line-clamp-1 font-medium">{p.name}</span><span className="text-slate-500">{p.count}×</span></div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-500 transition-all duration-500" style={{ width: `${(p.count / maxPop) * 100}%` }} /></div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <div className="card mt-6 overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5"><h2 className="text-lg font-semibold">Recent transactions</h2><Link to="/admin/history" className="text-sm text-teal-700 hover:underline">View all</Link></div>
        {s.recent.length === 0 ? <Empty title="No transactions yet" text="Issued and returned books will be listed here." /> : (
          <div className="overflow-x-auto"><table className="mt-3 w-full min-w-[560px]">
            <thead className="border-y border-slate-100 bg-slate-50/70"><tr>{['Book', 'Student', 'Issued', 'Due', 'Status'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">{s.recent.map((t) => (
              <tr key={t.id} className="transition-colors hover:bg-slate-50"><td className="td font-medium">{t.bookTitle}</td><td className="td">{t.studentName}</td>
                <td className="td">{fmtDate(t.issueDate)}</td><td className="td">{fmtDate(t.dueDate)}</td><td className="td"><StatusBadge status={isOverdue(t) ? 'overdue' : t.status} /></td></tr>
            ))}</tbody></table></div>
        )}
      </div>
    </>
  );
}

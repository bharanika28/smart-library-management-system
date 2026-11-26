import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Download } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useCol } from '../hooks/useFirestore';
import { countBy, downloadCsv, fmtDate, money, monthly } from '../lib/library';
import { Empty, FullSpinner, PageHeader } from '../components/ui';

const COLORS = ['#142a4d', '#14b8a6', '#3d609c', '#5eead4', '#8aa5cf', '#0f766e', '#b8c9e4'];

function Panel({ title, children, empty }) {
  return (
    <div className="card p-5">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {empty ? <Empty title="Not enough data yet" text="This chart fills in as books are borrowed." /> : <div className="h-72">{children}</div>}
    </div>
  );
}

export default function Reports() {
  const settings = useSettings();
  const txs = useCol('borrowTransactions');
  const fines = useCol('fines');
  const books = useCol('books');

  const d = useMemo(() => {
    const paid = fines.data.filter((f) => f.status === 'paid').reduce((a, f) => a + f.amount, 0);
    const pending = fines.data.filter((f) => f.status === 'pending').reduce((a, f) => a + f.amount, 0);
    const returned = txs.data.filter((t) => t.status === 'returned').length;
    return {
      months: monthly(txs.data, 12), top: countBy(txs.data, 'bookTitle', 6), cats: countBy(txs.data, 'category', 7),
      students: countBy(txs.data, 'studentName', 5), fineSplit: [{ name: 'Paid', value: paid }, { name: 'Pending', value: pending }].filter((x) => x.value > 0),
      returnRate: txs.data.length ? Math.round((returned / txs.data.length) * 100) : 0, paid, pending,
    };
  }, [txs.data, fines.data]);

  const exportTx = () => downloadCsv('borrowing-report.csv', txs.data.map((t) => ({
    Book: t.bookTitle, Author: t.bookAuthor, Category: t.category, Student: t.studentName, Email: t.studentEmail,
    Issued: fmtDate(t.issueDate), Due: fmtDate(t.dueDate), Returned: fmtDate(t.returnDate), Status: t.status, Fine: t.fineAmount || 0,
  })));

  if (txs.loading || fines.loading || books.loading) return <FullSpinner />;
  return (
    <>
      <PageHeader title="Reports and analytics" subtitle={`${txs.data.length} loans · ${books.data.length} titles · ${d.returnRate}% returned · ${money(d.paid, settings)} fines collected`}>
        <button className="btn-ghost" onClick={exportTx} disabled={!txs.data.length}><Download className="h-4 w-4" />Export loans (CSV)</button>
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Borrowing trend (12 months)" empty={!txs.data.length}>
          <ResponsiveContainer width="100%" height="100%"><LineChart data={d.months}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={28} /><Tooltip /><Legend />
            <Line type="monotone" dataKey="borrowed" name="Issued" stroke="#142a4d" strokeWidth={2.5} dot={false} /><Line type="monotone" dataKey="returned" name="Returned" stroke="#14b8a6" strokeWidth={2.5} dot={false} /></LineChart></ResponsiveContainer>
        </Panel>
        <Panel title="Loans by category" empty={!d.cats.length}>
          <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={d.cats} dataKey="count" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>{d.cats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>
        </Panel>
        <Panel title="Most borrowed books" empty={!d.top.length}>
          <ResponsiveContainer width="100%" height="100%"><BarChart data={d.top} layout="vertical" margin={{ left: 10 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" /><XAxis type="number" allowDecimals={false} fontSize={12} /><YAxis type="category" dataKey="name" width={130} fontSize={12} tickFormatter={(v) => (v.length > 18 ? `${v.slice(0, 17)}…` : v)} /><Tooltip /><Bar dataKey="count" name="Loans" fill="#14b8a6" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer>
        </Panel>
        <Panel title="Most active students" empty={!d.students.length}>
          <ResponsiveContainer width="100%" height="100%"><BarChart data={d.students} layout="vertical" margin={{ left: 10 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" /><XAxis type="number" allowDecimals={false} fontSize={12} /><YAxis type="category" dataKey="name" width={130} fontSize={12} /><Tooltip /><Bar dataKey="count" name="Loans" fill="#142a4d" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer>
        </Panel>
        <Panel title={`Fines: paid vs pending (${money(d.paid + d.pending, settings)})`} empty={!d.fineSplit.length}>
          <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={d.fineSplit} dataKey="value" nameKey="name" outerRadius={95} label={(e) => money(e.value, settings)}>{d.fineSplit.map((e) => <Cell key={e.name} fill={e.name === 'Paid' ? '#14b8a6' : '#f59e0b'} />)}</Pie><Tooltip formatter={(v) => money(v, settings)} /><Legend /></PieChart></ResponsiveContainer>
        </Panel>
      </div>
    </>
  );
}

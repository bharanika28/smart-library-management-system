import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BookMarked, BookUp, Clock, Hourglass } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCol } from '../hooks/useFirestore';
import { useRequest } from '../hooks/useRequest';
import { byNewest, daysUntil, filterBooks, fmtDate, isDueSoon, isOverdue } from '../lib/library';
import BookCard from '../components/BookCard';
import { Empty, FullSpinner, SearchInput, StatCard } from '../components/ui';

export default function StudentDashboard() {
  const { user, profile } = useAuth();
  const { data: books, loading } = useCol('books');
  const { data: txs } = useCol('borrowTransactions', 'studentId', user.uid);
  const { data: reqs } = useCol('borrowRequests', 'studentId', user.uid);
  const { request, busyId, stateOf } = useRequest();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');

  const cats = useMemo(() => ['All', ...new Set(books.map((b) => b.category).filter(Boolean))], [books]);
  const shown = useMemo(() => filterBooks(books, { q, cat }).sort((a, b) => (b.availableCopies > 0) - (a.availableCopies > 0) || a.title.localeCompare(b.title)).slice(0, 8), [books, q, cat]);
  const overdue = txs.filter(isOverdue);
  const dueSoon = txs.filter((t) => isDueSoon(t));
  const recent = [...txs].sort(byNewest('createdAt')).slice(0, 5);
  const pending = reqs.filter((r) => r.status === 'pending').length;

  if (loading) return <FullSpinner />;
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold sm:text-3xl">Welcome back, {profile.name.split(' ')[0]}</h1>
        <p className="mt-1 text-sm text-slate-500">Here is where your library account stands today.</p>
      </div>

      {(overdue.length > 0 || dueSoon.length > 0) && (
        <div className="mb-6 space-y-2">
          {overdue.map((t) => <div key={t.id} className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertTriangle className="h-4 w-4 shrink-0" /><span><b>{t.bookTitle}</b> was due on {fmtDate(t.dueDate)}. Return it soon: fines grow every day.</span></div>)}
          {dueSoon.map((t) => <div key={t.id} className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><Clock className="h-4 w-4 shrink-0" /><span><b>{t.bookTitle}</b> is due {fmtDate(t.dueDate)} ({daysUntil(t.dueDate)} day{daysUntil(t.dueDate) === 1 ? '' : 's'} left).</span></div>)}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={BookMarked} label="Total borrowed" value={txs.length} hint="all time" tone="navy" />
        <StatCard icon={Hourglass} label="Pending requests" value={pending} tone="amber" />
        <StatCard icon={Clock} label="Due soon" value={dueSoon.length} hint="within 3 days" tone="teal" />
        <StatCard icon={AlertTriangle} label="Overdue" value={overdue.length} tone="red" />
      </div>

      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Available catalogue</h2>
          <Link to="/student/books" className="text-sm text-teal-700 hover:underline">Browse everything</Link>
        </div>
        <SearchInput value={q} onChange={setQ} placeholder="Search by title, author, ISBN or category" />
        <div className="mt-3 flex flex-wrap gap-2">
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`rounded-full border px-3.5 py-1 text-sm transition-colors ${cat === c ? 'border-navy-800 bg-navy-800 text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-teal-500'}`}>{c}</button>
          ))}
        </div>
        {shown.length === 0 ? <div className="card mt-4"><Empty title="No books found" text="Try another keyword or category." /></div> : (
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shown.map((b) => <BookCard key={b.id} book={b} base="/student" state={stateOf(b.id)} busy={busyId === b.id} onRequest={request} />)}
          </div>
        )}
      </section>

      <section className="card mt-8 p-5">
        <h2 className="mb-3 text-lg font-semibold">Recently borrowed</h2>
        {recent.length === 0 ? <Empty icon={BookUp} title="You have not borrowed anything yet" text="Request a book above and it will show up here once a librarian approves it." /> : (
          <ul className="divide-y divide-slate-100">
            {recent.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0"><p className="truncate text-sm font-medium">{t.bookTitle}</p><p className="text-xs text-slate-500">Issued {fmtDate(t.issueDate)} · {t.status === 'returned' ? `Returned ${fmtDate(t.returnDate)}` : `Due ${fmtDate(t.dueDate)}`}</p></div>
                <span className={`text-xs font-medium ${t.status === 'returned' ? 'text-emerald-600' : isOverdue(t) ? 'text-red-600' : 'text-navy-600'}`}>{t.status === 'returned' ? 'Returned' : isOverdue(t) ? 'Overdue' : 'On loan'}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

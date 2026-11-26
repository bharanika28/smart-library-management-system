import { Link, Navigate } from 'react-router-dom';
import { BellRing, BookOpen, BarChart3, ClipboardCheck, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { homeFor } from '../components/Guard';

const features = [
  { icon: ClipboardCheck, title: 'Request, approve, issue', text: 'Students request a book online. Librarians approve it and the stock count updates on its own.' },
  { icon: BellRing, title: 'Due dates and fines', text: 'See what is due, what is late and what you owe. Fine rules are set by the librarian.' },
  { icon: BarChart3, title: 'Live reports', text: 'Borrowing trends, popular titles and fines, calculated from real library records.' },
  { icon: ShieldCheck, title: 'Role-based access', text: 'Students see their own records. Only librarians can change books, loans and fines.' },
];

export default function Landing() {
  const { profile } = useAuth();
  if (profile) return <Navigate to={homeFor(profile.role)} replace />;
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-navy-900 text-white">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-teal-500/20 p-2"><BookOpen className="h-5 w-5 text-teal-300" /></div>
            <span className="font-serif text-lg font-semibold">Smart Library</span>
          </div>
          <div className="flex gap-2">
            <Link to="/login" className="btn border border-white/25 text-white hover:bg-white/10">Sign in</Link>
            <Link to="/register" className="btn-teal hidden sm:inline-flex">Student sign up</Link>
          </div>
        </nav>
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-12 md:grid-cols-2 md:pb-28 md:pt-20">
          <div>
            <h1 className="!text-white text-4xl font-semibold leading-tight sm:text-5xl">Find a book. Borrow it. Know when to bring it back.</h1>
            <p className="mt-5 max-w-lg text-lg text-slate-300">One place for students to search the catalogue and track their loans, and for librarians to run issues, returns and fines.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="btn-teal !px-6 !py-3">Create student account</Link>
              <Link to="/login" className="btn !px-6 !py-3 border border-white/25 text-white hover:bg-white/10">Librarian sign in</Link>
            </div>
          </div>
          <div className="relative hidden md:block" aria-hidden="true">
            <div className="grid grid-cols-3 items-end gap-3">
              {[56, 72, 48, 80, 64, 76].map((h, i) => (
                <div key={i} className="rounded-t-xl border border-white/10 bg-gradient-to-b from-navy-600 to-navy-800 p-3 shadow-xl transition-transform duration-300 hover:-translate-y-1"
                  style={{ height: `${h * 3}px` }}>
                  <div className="h-1.5 w-8 rounded bg-teal-400/70" />
                  <div className="mt-2 h-1 w-12 rounded bg-white/20" />
                </div>
              ))}
            </div>
            <div className="h-2 rounded bg-teal-500/60" />
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-6 px-6 py-16 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(({ icon: Icon, title, text }) => (
          <div key={title} className="card card-hover p-6">
            <div className="mb-4 inline-block rounded-xl bg-teal-50 p-3"><Icon className="h-6 w-6 text-teal-700" /></div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-slate-600">{text}</p>
          </div>
        ))}
      </section>
      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">Smart Library Management System · Software Engineering Methodologies Lab</footer>
    </div>
  );
}

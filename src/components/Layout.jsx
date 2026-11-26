import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  ArrowLeftRight, BarChart3, Bell, BookOpen, Coins, History, Inbox, LayoutDashboard,
  Library, LogOut, Menu, UserCircle, Users, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCol } from '../hooks/useFirestore';
import { daysUntil, fmtDate, isDueSoon, isOverdue } from '../lib/library';

const adminNav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/books', label: 'Books', icon: Library },
  { to: '/admin/students', label: 'Students', icon: Users },
  { to: '/admin/requests', label: 'Borrow requests', icon: Inbox, badge: true },
  { to: '/admin/issue-return', label: 'Issue / return', icon: ArrowLeftRight },
  { to: '/admin/fines', label: 'Fines', icon: Coins },
  { to: '/admin/history', label: 'History', icon: History },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { to: '/admin/profile', label: 'Profile', icon: UserCircle },
];
const studentNav = [
  { to: '/student', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/student/books', label: 'Book catalogue', icon: Library },
  { to: '/student/history', label: 'My borrowing', icon: History },
  { to: '/student/fines', label: 'My fines', icon: Coins },
  { to: '/student/profile', label: 'Profile', icon: UserCircle },
];

function Reminders({ uid }) {
  const { data: txs } = useCol('borrowTransactions', 'studentId', uid);
  const [open, setOpen] = useState(false);
  const items = txs.filter((t) => isOverdue(t) || isDueSoon(t));
  return (
    <div className="relative">
      <button className="btn-ghost relative !px-2.5" onClick={() => setOpen(!open)} aria-label="Due-date reminders">
        <Bell className="h-4 w-4" />
        {items.length > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">{items.length}</span>}
      </button>
      {open && (
        <div className="card absolute right-0 z-40 mt-2 w-72 p-3 shadow-lg">
          <p className="mb-2 text-sm font-semibold text-navy-900">Due-date reminders</p>
          {items.length === 0 && <p className="text-sm text-slate-500">Nothing is due soon. You are all caught up.</p>}
          {items.map((t) => (
            <div key={t.id} className="border-t border-slate-100 py-2 first:border-0">
              <p className="line-clamp-1 text-sm font-medium">{t.bookTitle}</p>
              <p className={`text-xs ${isOverdue(t) ? 'text-red-600' : 'text-amber-600'}`}>
                {isOverdue(t) ? `Overdue since ${fmtDate(t.dueDate)}. Return it to avoid more fines.` : `Due ${fmtDate(t.dueDate)} (${daysUntil(t.dueDate)} day${daysUntil(t.dueDate) === 1 ? '' : 's'} left)`}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { profile, user, isAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { data: reqs } = useCol('borrowRequests', isAdmin ? undefined : 'studentId', isAdmin ? undefined : user.uid);
  const pending = isAdmin ? reqs.filter((r) => r.status === 'pending').length : 0; // students: only their own requests are loaded, badge is admin-only
  useEffect(() => setOpen(false), [pathname]);
  const nav = isAdmin ? adminNav : studentNav;

  return (
    <div className="min-h-screen">
      {open && <div className="fixed inset-0 z-30 bg-navy-950/50 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy-900 text-slate-300 transition-transform duration-300 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-teal-500/20 p-2"><BookOpen className="h-5 w-5 text-teal-300" /></div>
            <div className="leading-tight">
              <p className="font-serif text-base font-semibold text-white">Smart Library</p>
              <p className="text-xs text-slate-400">{isAdmin ? 'Librarian console' : 'Student portal'}</p>
            </div>
          </div>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {nav.map(({ to, label, icon: Icon, end, badge }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${isActive ? 'bg-teal-500/15 text-teal-300' : 'hover:bg-white/5 hover:text-white'}`}>
              <Icon className="h-[18px] w-[18px]" />
              <span className="flex-1">{label}</span>
              {badge && pending > 0 && <span className="rounded-full bg-teal-500 px-2 py-0.5 text-xs font-semibold text-white">{pending}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <p className="truncate text-sm font-medium text-white">{profile.name}</p>
          <p className="truncate text-xs text-slate-400">{profile.email}</p>
          <button onClick={logout} className="mt-3 flex items-center gap-2 text-sm text-slate-300 transition-colors hover:text-white"><LogOut className="h-4 w-4" />Sign out</button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-8">
          <button className="btn-ghost !px-2.5 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-4 w-4" /></button>
          <p className="hidden text-sm text-slate-500 lg:block">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <div className="flex items-center gap-3">{!isAdmin && <Reminders uid={user.uid} />}</div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8"><Outlet /></main>
      </div>
    </div>
  );
}

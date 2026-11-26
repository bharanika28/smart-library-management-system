import { useEffect, useState } from 'react';
import { AlertTriangle, BookOpen, ChevronLeft, ChevronRight, Inbox, Loader2, Search, X } from 'lucide-react';

export const Spinner = ({ className = 'h-5 w-5' }) => <Loader2 className={`animate-spin text-teal-600 ${className}`} />;

export const FullSpinner = ({ label = 'Loading…' }) => (
  <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-500">
    <Spinner className="h-8 w-8" />
    <p className="text-sm">{label}</p>
  </div>
);

export const PageHeader = ({ title, subtitle, children }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
    <div className="flex flex-wrap gap-2">{children}</div>
  </div>
);

export const Empty = ({ icon: Icon = Inbox, title, text, children }) => (
  <div className="flex flex-col items-center px-6 py-14 text-center">
    <div className="mb-3 rounded-full bg-slate-100 p-3"><Icon className="h-6 w-6 text-slate-400" /></div>
    <p className="font-medium text-slate-700">{title}</p>
    {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
    {children && <div className="mt-4">{children}</div>}
  </div>
);

const tones = {
  teal: 'bg-teal-50 text-teal-700', navy: 'bg-navy-50 text-navy-700', red: 'bg-red-50 text-red-600',
  amber: 'bg-amber-50 text-amber-700', green: 'bg-emerald-50 text-emerald-700', slate: 'bg-slate-100 text-slate-600',
};
export const Badge = ({ tone = 'slate', children }) => (
  <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>
);
const statusTone = {
  pending: 'amber', approved: 'green', rejected: 'red', cancelled: 'slate', issued: 'navy',
  returned: 'green', overdue: 'red', paid: 'green',
};
export const StatusBadge = ({ status }) => <Badge tone={statusTone[status] || 'slate'}>{status[0].toUpperCase() + status.slice(1)}</Badge>;

export function StatCard({ icon: Icon, label, value, hint, tone = 'teal' }) {
  return (
    <div className="card card-hover flex items-center gap-4 p-5">
      <div className={`rounded-xl p-3 ${tones[tone]}`}><Icon className="h-6 w-6" /></div>
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="font-serif text-2xl font-semibold text-navy-900">{value}</p>
        {hint && <p className="truncate text-xs text-slate-400">{hint}</p>}
      </div>
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input className="input pl-9" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </div>
  );
}

export function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm" onClick={onClose} />
      <div className="card relative w-full max-w-md p-6 shadow-xl">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600" aria-label="Close"><X className="h-5 w-5" /></button>
        <h2 className="pr-8 text-xl font-semibold">{title}</h2>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger = false, busy, onConfirm, onCancel }) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <div className="flex gap-3">
        {danger && <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />}
        <p className="text-sm text-slate-600">{message}</p>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm} disabled={busy}>
          {busy && <Spinner className="h-4 w-4 !text-white" />}{confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

// Client-side pagination. Pass a resetKey (e.g. the filter string) to jump back to page 1 when filters change.
export function usePager(items, size = 8, resetKey = '') {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(items.length / size));
  useEffect(() => setPage(1), [resetKey]);
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  return { page, setPage, pages, total: items.length, slice: items.slice((page - 1) * size, page * size) };
}

export function Pager({ pager }) {
  const { page, pages, setPage, total } = pager;
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
      <span>{total} results · page {page} of {pages}</span>
      <div className="flex gap-1">
        <button className="btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
        <button className="btn-ghost btn-sm" disabled={page === pages} onClick={() => setPage(page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

export function BookCover({ book, className = 'h-44 w-full' }) {
  const [failed, setFailed] = useState(false);
  if (book.coverUrl && !failed) {
    return <img src={book.coverUrl} alt={`Cover of ${book.title}`} onError={() => setFailed(true)} className={`${className} object-cover`} loading="lazy" />;
  }
  return (
    <div className={`${className} flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-navy-800 to-navy-600 p-3 text-center`}>
      <BookOpen className="h-7 w-7 text-teal-300" />
      <span className="line-clamp-3 font-serif text-sm text-white/90">{book.title}</span>
    </div>
  );
}

export const Table = ({ head, children }) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[640px]">
      <thead className="border-b border-slate-100 bg-slate-50/70"><tr>{head.map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-100">{children}</tbody>
    </table>
  </div>
);

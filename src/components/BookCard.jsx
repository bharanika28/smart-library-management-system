import { Link } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { Badge, BookCover, Spinner } from './ui';

export default function BookCard({ book, base, isAdmin, state, busy, onRequest, onDelete }) {
  const avail = (book.availableCopies || 0) > 0;
  let label = 'Request to borrow';
  if (state === 'pending') label = 'Request pending';
  else if (state === 'issued') label = 'Already borrowed';
  else if (!avail) label = 'Unavailable';

  return (
    <div className="card card-hover flex flex-col overflow-hidden">
      <Link to={`${base}/books/${book.id}`} aria-label={`View ${book.title}`}><BookCover book={book} /></Link>
      <div className="flex flex-1 flex-col p-4">
        {book.category && <div><Badge tone="teal">{book.category}</Badge></div>}
        <Link to={`${base}/books/${book.id}`} className="mt-2 line-clamp-2 font-serif text-base font-semibold text-navy-900 hover:text-teal-700">{book.title}</Link>
        <p className="text-sm text-slate-500">{book.author}</p>
        <p className={`mt-2 text-xs font-medium ${avail ? 'text-emerald-600' : 'text-red-500'}`}>
          {avail ? `${book.availableCopies} of ${book.totalCopies} copies available` : 'All copies issued'}
        </p>
        <div className="mt-auto pt-4">
          {isAdmin ? (
            <div className="flex gap-2">
              <Link to={`${base}/books/${book.id}/edit`} className="btn-ghost btn-sm flex-1"><Pencil className="h-3.5 w-3.5" />Edit</Link>
              <button onClick={() => onDelete(book)} className="btn-ghost btn-sm text-red-600" aria-label={`Delete ${book.title}`}><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ) : (
            <button className="btn-teal btn-sm w-full" disabled={busy || state || !avail} onClick={() => onRequest(book)}>
              {busy && <Spinner className="h-3.5 w-3.5 !text-white" />}{label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

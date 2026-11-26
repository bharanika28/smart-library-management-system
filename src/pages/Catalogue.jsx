import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Library, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useCol } from '../hooks/useFirestore';
import { useRequest } from '../hooks/useRequest';
import { deleteBook, fbError, filterBooks } from '../lib/library';
import BookCard from '../components/BookCard';
import { ConfirmDialog, Empty, FullSpinner, PageHeader, Pager, SearchInput, usePager } from '../components/ui';

const sorters = {
  title: (a, b) => a.title.localeCompare(b.title),
  author: (a, b) => a.author.localeCompare(b.author),
  year: (a, b) => (b.year || 0) - (a.year || 0),
  popular: (a, b) => (b.borrowCount || 0) - (a.borrowCount || 0),
};

// Shared by both roles: students get "Request to borrow", admins get edit/delete.
export default function Catalogue() {
  const { isAdmin } = useAuth();
  const base = isAdmin ? '/admin' : '/student';
  const toast = useToast();
  const { data: books, loading, error } = useCol('books');
  const { request, busyId, stateOf } = useRequest();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [sort, setSort] = useState('title');
  const [onlyAvail, setOnlyAvail] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const cats = useMemo(() => ['All', ...new Set(books.map((b) => b.category).filter(Boolean))].sort((a, b) => (a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b))), [books]);
  const list = useMemo(() => filterBooks(books, { q, cat, onlyAvail }).sort(sorters[sort]), [books, q, cat, onlyAvail, sort]);
  const pager = usePager(list, 12, `${q}|${cat}|${sort}|${onlyAvail}`);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteBook(toDelete);
      toast.success(`“${toDelete.title}” was deleted.`);
      setToDelete(null);
    } catch (e) { toast.error(fbError(e)); } finally { setDeleting(false); }
  };

  return (
    <>
      <PageHeader title={isAdmin ? 'Books' : 'Book catalogue'} subtitle={`${books.length} titles in the library`}>
        {isAdmin && <Link to="/admin/books/new" className="btn-teal"><Plus className="h-4 w-4" />Add book</Link>}
      </PageHeader>

      <div className="card mb-6 grid gap-3 p-4 md:grid-cols-[1fr_auto_auto_auto]">
        <SearchInput value={q} onChange={setQ} placeholder="Search by title, author, ISBN or category" />
        <select className="input md:w-48" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
          {cats.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="input md:w-44" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by">
          <option value="title">Sort: Title</option><option value="author">Sort: Author</option>
          <option value="year">Sort: Newest year</option><option value="popular">Sort: Most borrowed</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={onlyAvail} onChange={(e) => setOnlyAvail(e.target.checked)} className="h-4 w-4 accent-teal-600" />Available only</label>
      </div>

      {loading ? <FullSpinner label="Loading books…" /> : error ? (
        <div className="card"><Empty title="Could not load books" text="Check your Firestore rules and internet connection." /></div>
      ) : list.length === 0 ? (
        <div className="card">
          <Empty icon={Library} title={books.length ? 'No books match your search' : 'The library has no books yet'} text={books.length ? 'Try a different keyword or clear the filters.' : isAdmin ? 'Add the first book to get started.' : 'Ask a librarian to add books.'}>
            {isAdmin && !books.length && <Link to="/admin/books/new" className="btn-teal">Add a book</Link>}
          </Empty>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pager.slice.map((b) => (
              <BookCard key={b.id} book={b} base={base} isAdmin={isAdmin} state={isAdmin ? null : stateOf(b.id)} busy={busyId === b.id} onRequest={request} onDelete={setToDelete} />
            ))}
          </div>
          <div className="card mt-6"><Pager pager={pager} /></div>
        </>
      )}

      <ConfirmDialog open={Boolean(toDelete)} danger title="Delete this book?" confirmLabel="Delete book" busy={deleting}
        message={`“${toDelete?.title}” will be permanently removed from the catalogue. This cannot be undone.`}
        onConfirm={confirmDelete} onCancel={() => setToDelete(null)} />
    </>
  );
}

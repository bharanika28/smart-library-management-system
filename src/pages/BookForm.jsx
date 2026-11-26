import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useDoc } from '../hooks/useFirestore';
import { CATEGORIES, fbError, saveBook } from '../lib/library';
import { BookCover, FullSpinner, PageHeader, Spinner } from '../components/ui';

const blank = { title: '', author: '', isbn: '', category: '', publisher: '', year: '', description: '', totalCopies: 1, coverUrl: '' };

export default function BookForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { data: existing, loading } = useDoc('books', id);
  const [f, setF] = useState(blank);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (existing) setF({ ...blank, ...existing, year: existing.year ?? '', isbn: existing.isbn || '', publisher: existing.publisher || '', description: existing.description || '', coverUrl: existing.coverUrl || '', category: existing.category || '' });
  }, [existing]);

  if (id && loading) return <FullSpinner />;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const validate = () => {
    const e = {};
    const isbn = f.isbn.replace(/[-\s]/g, '');
    if (!f.title.trim()) e.title = 'Title is required.';
    if (!f.author.trim()) e.author = 'Author is required.';
    if (isbn && !/^(\d{9}[\dXx]|\d{13})$/.test(isbn)) e.isbn = 'ISBN must have 10 or 13 digits.';
    if (!f.category.trim()) e.category = 'Choose or type a category.';
    if (f.year && (!/^\d{4}$/.test(String(f.year)) || Number(f.year) > new Date().getFullYear())) e.year = 'Enter a valid 4-digit year.';
    if (!Number.isInteger(Number(f.totalCopies)) || Number(f.totalCopies) < 1) e.totalCopies = 'Enter a whole number, 1 or more.';
    if (f.coverUrl && !/^https?:\/\/\S+$/.test(f.coverUrl.trim())) e.coverUrl = 'Enter a full image link starting with http(s).';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      await saveBook(f, id);
      toast.success(id ? 'Book updated.' : 'Book added to the catalogue.');
      nav('/admin/books');
    } catch (err) { toast.error(fbError(err)); setBusy(false); }
  };

  const text = (k, label, props = {}) => (
    <div className={props.span ? 'sm:col-span-2' : ''}>
      <label className="label" htmlFor={k}>{label}</label>
      <input id={k} className="input" value={f[k]} onChange={set(k)} {...props.input} />
      {errors[k] && <p className="err">{errors[k]}</p>}
    </div>
  );

  return (
    <>
      <Link to="/admin/books" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-navy-800"><ArrowLeft className="h-4 w-4" />Back to books</Link>
      <PageHeader title={id ? 'Edit book' : 'Add a book'} subtitle={id ? 'Changing total copies adjusts availability automatically.' : 'New books start with every copy available.'} />
      <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="card grid gap-4 p-6 sm:grid-cols-2">
          {text('title', 'Title', { span: true })}
          {text('author', 'Author')}
          {text('isbn', 'ISBN (optional)')}
          <div>
            <label className="label" htmlFor="category">Category</label>
            <input id="category" list="cats" className="input" value={f.category} onChange={set('category')} />
            <datalist id="cats">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
            {errors.category && <p className="err">{errors.category}</p>}
          </div>
          {text('publisher', 'Publisher')}
          {text('year', 'Publication year', { input: { inputMode: 'numeric', maxLength: 4 } })}
          {text('totalCopies', 'Total copies', { input: { type: 'number', min: 1 } })}
          {text('coverUrl', 'Cover image link (optional)', { span: true, input: { placeholder: 'https://…' } })}
          <div className="sm:col-span-2">
            <label className="label" htmlFor="description">Description</label>
            <textarea id="description" rows={5} className="input" value={f.description} onChange={set('description')} />
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Link to="/admin/books" className="btn-ghost">Cancel</Link>
            <button className="btn-teal" disabled={busy}>{busy && <Spinner className="h-4 w-4 !text-white" />}{id ? 'Save changes' : 'Add book'}</button>
          </div>
        </div>
        <div className="card h-fit overflow-hidden"><p className="border-b border-slate-100 px-4 py-3 text-sm font-medium">Cover preview</p>
          <BookCover key={f.coverUrl} book={{ title: f.title || 'Untitled', coverUrl: f.coverUrl }} className="aspect-[3/4] w-full" /></div>
      </form>
    </>
  );
}

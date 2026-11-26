import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { BookOpen } from 'lucide-react';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fbError } from '../lib/library';
import { Spinner } from '../components/ui';
import { homeFor } from '../components/Guard';

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden w-5/12 flex-col justify-between bg-navy-900 p-10 text-white lg:flex">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="rounded-lg bg-teal-500/20 p-2"><BookOpen className="h-5 w-5 text-teal-300" /></div>
          <span className="font-serif text-lg font-semibold">Smart Library</span>
        </Link>
        <p className="font-serif text-3xl leading-snug text-white/90">A quiet place to start. Search, borrow and return, all in one account.</p>
        <p className="text-sm text-slate-400">Software Engineering Methodologies Lab</p>
      </div>
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-semibold">{title}</h1>
          <p className="mb-6 mt-1 text-sm text-slate-500">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const nav = useNavigate();
  const toast = useToast();
  const { user, profile } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (user && profile) nav(homeFor(profile.role), { replace: true }); }, [user, profile, nav]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) return setError('Enter your email and password.');
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, form.email.trim(), form.password);
    } catch (err) {
      setError(fbError(err));
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!form.email) return setError('Enter your email above first, then choose “Forgot password”.');
    try {
      await sendPasswordResetEmail(auth, form.email.trim());
      toast.success('Password reset email sent. Check your inbox.');
    } catch (err) { setError(fbError(err)); }
  };

  return (
    <AuthShell title="Sign in" subtitle="Students and librarians use the same form.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
        <button className="btn-primary w-full !py-2.5" disabled={busy}>{busy && <Spinner className="h-4 w-4 !text-white" />}Sign in</button>
        <div className="flex justify-between text-sm">
          <button type="button" onClick={reset} className="text-teal-700 hover:underline">Forgot password</button>
          <Link to="/register" className="text-teal-700 hover:underline">Create student account</Link>
        </div>
      </form>
    </AuthShell>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useToast } from '../context/ToastContext';
import { fbError } from '../lib/library';
import { Spinner } from '../components/ui';
import { AuthShell } from './Login';

export default function Register() {
  const nav = useNavigate();
  const toast = useToast();
  const [f, setF] = useState({ name: '', studentNo: '', phone: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const validate = () => {
    const e = {};
    if (f.name.trim().length < 2) e.name = 'Enter your full name.';
    if (!f.studentNo.trim()) e.studentNo = 'Enter your roll or student number.';
    if (f.phone && !/^[0-9+\-\s]{7,15}$/.test(f.phone)) e.phone = 'Enter a valid phone number.';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter a valid email address.';
    if (f.password.length < 6) e.password = 'Use at least 6 characters.';
    if (f.confirm !== f.password) e.confirm = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, f.email.trim(), f.password);
      await updateProfile(cred.user, { displayName: f.name.trim() });
      await setDoc(doc(db, 'users', cred.user.uid), {
        name: f.name.trim(), email: cred.user.email, studentNo: f.studentNo.trim(),
        phone: f.phone.trim(), role: 'student', createdAt: serverTimestamp(),
      });
      toast.success('Account created. Welcome to Smart Library!');
      nav('/student', { replace: true });
    } catch (err) {
      setErrors({ form: fbError(err) });
      setBusy(false);
    }
  };

  const field = (k, label, type = 'text', auto) => (
    <div>
      <label className="label" htmlFor={k}>{label}</label>
      <input id={k} type={type} autoComplete={auto} className="input" value={f[k]} onChange={set(k)} />
      {errors[k] && <p className="err">{errors[k]}</p>}
    </div>
  );

  return (
    <AuthShell title="Create student account" subtitle="Librarian accounts are created by an existing administrator.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        {field('name', 'Full name', 'text', 'name')}
        <div className="grid gap-4 sm:grid-cols-2">
          {field('studentNo', 'Roll / student number')}
          {field('phone', 'Phone (optional)', 'tel', 'tel')}
        </div>
        {field('email', 'Email', 'email', 'email')}
        <div className="grid gap-4 sm:grid-cols-2">
          {field('password', 'Password', 'password', 'new-password')}
          {field('confirm', 'Confirm password', 'password', 'new-password')}
        </div>
        {errors.form && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{errors.form}</p>}
        <button className="btn-primary w-full !py-2.5" disabled={busy}>{busy && <Spinner className="h-4 w-4 !text-white" />}Create account</button>
        <p className="text-center text-sm text-slate-500">Already registered? <Link to="/login" className="text-teal-700 hover:underline">Sign in</Link></p>
      </form>
    </AuthShell>
  );
}

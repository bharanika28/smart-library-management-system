import { useEffect, useState } from 'react';
import { sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fbError, fmtDate } from '../lib/library';
import { Badge, PageHeader, Spinner } from '../components/ui';

export default function Profile() {
  const { profile, user } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ name: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => setF({ name: profile.name || '', phone: profile.phone || '' }), [profile]);

  const save = async (e) => {
    e.preventDefault();
    const er = {};
    if (f.name.trim().length < 2) er.name = 'Enter your full name.';
    if (f.phone && !/^[0-9+\-\s]{7,15}$/.test(f.phone)) er.phone = 'Enter a valid phone number.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { name: f.name.trim(), phone: f.phone.trim() });
      await updateProfile(auth.currentUser, { displayName: f.name.trim() });
      toast.success('Profile updated.');
    } catch (err) { toast.error(fbError(err)); } finally { setBusy(false); }
  };

  const reset = async () => {
    try { await sendPasswordResetEmail(auth, profile.email); toast.success(`Password reset link sent to ${profile.email}.`); }
    catch (err) { toast.error(fbError(err)); }
  };

  return (
    <>
      <PageHeader title="Profile" subtitle="Update your contact details." />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <form onSubmit={save} noValidate className="card space-y-4 p-6">
          <div><label className="label" htmlFor="pn">Full name</label><input id="pn" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />{errors.name && <p className="err">{errors.name}</p>}</div>
          <div><label className="label" htmlFor="pp">Phone</label><input id="pp" className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />{errors.phone && <p className="err">{errors.phone}</p>}</div>
          <div><label className="label" htmlFor="pe">Email</label><input id="pe" className="input bg-slate-50" value={profile.email} disabled /></div>
          <button className="btn-teal" disabled={busy}>{busy && <Spinner className="h-4 w-4 !text-white" />}Save changes</button>
        </form>
        <div className="card h-fit space-y-4 p-6">
          <div><p className="text-xs text-slate-400">Role</p><Badge tone={profile.role === 'admin' ? 'navy' : 'teal'}>{profile.role === 'admin' ? 'Librarian / admin' : 'Student'}</Badge></div>
          {profile.studentNo && <div><p className="text-xs text-slate-400">Roll / student number</p><p className="text-sm font-medium">{profile.studentNo}</p></div>}
          <div><p className="text-xs text-slate-400">Member since</p><p className="text-sm font-medium">{fmtDate(profile.createdAt)}</p></div>
          <button className="btn-ghost w-full" onClick={reset}>Email me a password reset link</button>
        </div>
      </div>
    </>
  );
}

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FullSpinner } from './ui';

export const homeFor = (role) => (role === 'admin' ? '/admin' : '/student');

// Route guard: signed-in + (optionally) required role. Firestore rules enforce the same on the server.
export default function Guard({ role, children }) {
  const { user, profile, loading, logout } = useAuth();
  if (loading) return <FullSpinner label="Checking your session…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <FullSpinner label="Setting up your account…" />
        <p className="max-w-sm text-sm text-slate-500">If this does not finish, your account has no profile document in Firestore. Sign out and register again.</p>
        <button className="btn-ghost" onClick={logout}>Sign out</button>
      </div>
    );
  }
  if (role && profile.role !== role) return <Navigate to={homeFor(profile.role)} replace />;
  return children;
}

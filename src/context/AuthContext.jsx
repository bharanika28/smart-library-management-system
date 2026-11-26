import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = still checking
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u)), []);

  // Live profile document: role changes made in the console apply without re-login.
  useEffect(() => {
    if (!user) { setProfile(null); return undefined; }
    setProfileLoading(true);
    return onSnapshot(
      doc(db, 'users', user.uid),
      (s) => { setProfile(s.exists() ? { id: s.id, ...s.data() } : null); setProfileLoading(false); },
      (e) => { console.error(e); setProfile(null); setProfileLoading(false); },
    );
  }, [user]);

  const value = useMemo(
    () => ({
      user, profile,
      isAdmin: profile?.role === 'admin',
      loading: user === undefined || (Boolean(user) && profileLoading),
      logout: () => signOut(auth),
    }),
    [user, profile, profileLoading],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

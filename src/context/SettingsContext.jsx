import { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { DEFAULT_SETTINGS } from '../lib/library';
import { useAuth } from './AuthContext';

const Ctx = createContext(DEFAULT_SETTINGS);
export const useSettings = () => useContext(Ctx);

export function SettingsProvider({ children }) {
  const { user } = useAuth();
  const uid = user?.uid;
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  useEffect(() => {
    if (!uid) { setSettings(DEFAULT_SETTINGS); return undefined; }
    return onSnapshot(
      doc(db, 'settings', 'library'),
      (s) => setSettings({ ...DEFAULT_SETTINGS, ...(s.data() || {}) }),
      (e) => console.error(e),
    );
  }, [uid]);
  return <Ctx.Provider value={settings}>{children}</Ctx.Provider>;
}

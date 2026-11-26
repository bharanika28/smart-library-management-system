import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';

// Real-time collection listener. Optional single equality filter: useCol('fines', 'studentId', uid).
export function useCol(name, field, value) {
  const [state, setState] = useState({ data: [], loading: true, error: null });
  useEffect(() => {
    if (field && !value) { setState({ data: [], loading: false, error: null }); return undefined; }
    setState((s) => ({ ...s, loading: true }));
    const ref = field ? query(collection(db, name), where(field, '==', value)) : collection(db, name);
    return onSnapshot(
      ref,
      (snap) => setState({ data: snap.docs.map((d) => ({ id: d.id, ...d.data() })), loading: false, error: null }),
      (error) => { console.error(`[${name}]`, error); setState({ data: [], loading: false, error }); },
    );
  }, [name, field, value]);
  return state;
}

// Real-time single document listener.
export function useDoc(name, id) {
  const [state, setState] = useState({ data: null, loading: true });
  useEffect(() => {
    if (!id) { setState({ data: null, loading: false }); return undefined; }
    setState({ data: null, loading: true });
    return onSnapshot(
      doc(db, name, id),
      (s) => setState({ data: s.exists() ? { id: s.id, ...s.data() } : null, loading: false }),
      (error) => { console.error(`[${name}/${id}]`, error); setState({ data: null, loading: false }); },
    );
  }, [name, id]);
  return state;
}

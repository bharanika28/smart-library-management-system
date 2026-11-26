import { useCallback, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fbError, requestBorrow } from '../lib/library';
import { useCol } from './useFirestore';

// Student-side borrowing state + the "request to borrow" action.
export function useRequest() {
  const { user, profile } = useAuth();
  const toast = useToast();
  const { data: reqs } = useCol('borrowRequests', 'studentId', user?.uid);
  const { data: txs } = useCol('borrowTransactions', 'studentId', user?.uid);
  const [busyId, setBusyId] = useState(null);

  const stateOf = useCallback(
    (bookId) => {
      if (txs.some((t) => t.bookId === bookId && t.status === 'issued')) return 'issued';
      if (reqs.some((r) => r.bookId === bookId && r.status === 'pending')) return 'pending';
      return null;
    },
    [reqs, txs],
  );

  const request = async (book) => {
    setBusyId(book.id);
    try {
      await requestBorrow({ book, user: { id: user.uid, name: profile.name, email: profile.email } });
      toast.success(`Request sent for “${book.title}”. A librarian will review it.`);
    } catch (e) {
      toast.error(fbError(e));
    } finally {
      setBusyId(null);
    }
  };
  return { request, busyId, stateOf };
}

import { useEffect, useMemo, useState } from 'react';
import { Coins, Settings2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { useCol } from '../hooks/useFirestore';
import { byNewest, calcFine, fbError, fmtDate, isOverdue, money, saveSettings, setFineStatus } from '../lib/library';
import { Badge, Empty, FullSpinner, PageHeader, Pager, Spinner, StatCard, StatusBadge, Table, usePager } from '../components/ui';

function RulesCard() {
  const settings = useSettings();
  const toast = useToast();
  const [f, setF] = useState(settings);
  const [busy, setBusy] = useState(false);
  useEffect(() => setF(settings), [settings]);
  const num = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    const v = { loanDays: Number(f.loanDays), finePerDay: Number(f.finePerDay), graceDays: Number(f.graceDays), maxFine: Number(f.maxFine) };
    if (!Number.isInteger(v.loanDays) || v.loanDays < 1 || v.loanDays > 120) return toast.error('Loan period must be between 1 and 120 days.');
    if ([v.finePerDay, v.maxFine].some((n) => !(n >= 0)) || !Number.isInteger(v.graceDays) || v.graceDays < 0) return toast.error('Fine values cannot be negative.');
    setBusy(true);
    try { await saveSettings({ ...v, currency: f.currency || '₹' }); toast.success('Fine rules saved. They apply to future issues and returns.'); }
    catch (err) { toast.error(fbError(err)); } finally { setBusy(false); }
  };

  const fields = [['loanDays', 'Loan period (days)'], ['finePerDay', `Fine per day (${settings.currency})`], ['graceDays', 'Grace days'], ['maxFine', `Maximum fine per book (${settings.currency})`]];
  return (
    <form onSubmit={save} className="card mb-6 p-5">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Settings2 className="h-5 w-5 text-teal-600" />Fine rules</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
        {fields.map(([k, label]) => (<div key={k}><label className="label" htmlFor={k}>{label}</label><input id={k} type="number" min="0" className="input" value={f[k]} onChange={num(k)} /></div>))}
        <button className="btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4 !text-white" />}Save rules</button>
      </div>
    </form>
  );
}

// Admin: manage everything. Student: read-only view of their own fines.
export default function Fines() {
  const { isAdmin, user } = useAuth();
  const settings = useSettings();
  const toast = useToast();
  const fines = useCol('fines', isAdmin ? undefined : 'studentId', isAdmin ? undefined : user.uid);
  const txs = useCol('borrowTransactions', isAdmin ? undefined : 'studentId', isAdmin ? undefined : user.uid);
  const [tab, setTab] = useState('pending');
  const [busy, setBusy] = useState(null);

  const rows = useMemo(() => fines.data.filter((f) => tab === 'all' || f.status === tab).sort(byNewest('createdAt')), [fines.data, tab]);
  const accruing = useMemo(() => txs.data.filter(isOverdue).map((t) => ({ ...t, fine: calcFine(t.dueDate, settings) })), [txs.data, settings]);
  const pager = usePager(rows, 8, tab);
  const sum = (list) => list.reduce((a, f) => a + f.amount, 0);

  const toggle = async (f) => {
    const next = f.status === 'paid' ? 'pending' : 'paid';
    setBusy(f.id);
    try { await setFineStatus(f.id, next); toast.success(next === 'paid' ? 'Fine marked as paid.' : 'Fine moved back to pending.'); }
    catch (e) { toast.error(fbError(e)); } finally { setBusy(null); }
  };

  if (fines.loading || txs.loading) return <FullSpinner />;
  return (
    <>
      <PageHeader title={isAdmin ? 'Fine management' : 'My fines'} subtitle={`${money(settings.finePerDay, settings)} per overdue day after ${settings.graceDays} grace day(s), up to ${money(settings.maxFine, settings)} per book.`} />
      {isAdmin && <RulesCard />}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon={Coins} label="Pending fines" value={money(sum(fines.data.filter((f) => f.status === 'pending')), settings)} tone="amber" />
        <StatCard icon={Coins} label="Paid fines" value={money(sum(fines.data.filter((f) => f.status === 'paid')), settings)} tone="green" />
        <StatCard icon={Coins} label="Accruing on overdue loans" value={money(accruing.reduce((a, t) => a + t.fine.amount, 0), settings)} hint="becomes a fine on return" tone="red" />
      </div>

      {accruing.length > 0 && (
        <div className="card mb-6 overflow-hidden">
          <h2 className="px-5 pt-5 text-lg font-semibold">Overdue and not yet returned</h2>
          <Table head={['Book', ...(isAdmin ? ['Student'] : []), 'Due', 'Days late', 'Fine so far']}>
            {accruing.map((t) => (<tr key={t.id}><td className="td font-medium">{t.bookTitle}</td>{isAdmin && <td className="td">{t.studentName}</td>}<td className="td">{fmtDate(t.dueDate)}</td><td className="td">{t.fine.days}</td><td className="td font-medium text-red-600">{money(t.fine.amount, settings)}</td></tr>))}
          </Table>
        </div>
      )}

      <div className="mb-3 flex gap-2">
        {['pending', 'paid', 'all'].map((t) => (<button key={t} onClick={() => setTab(t)} className={`rounded-full border px-4 py-1.5 text-sm capitalize transition-colors ${tab === t ? 'border-navy-800 bg-navy-800 text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-teal-500'}`}>{t}</button>))}
      </div>
      <div className="card overflow-hidden">
        {rows.length === 0 ? <Empty icon={Coins} title={`No ${tab === 'all' ? '' : tab + ' '}fines`} text="Fines are recorded automatically when a late book is returned." /> : (
          <>
            <Table head={['Book', ...(isAdmin ? ['Student'] : []), 'Days late', 'Amount', 'Recorded', 'Status', ...(isAdmin ? ['Action'] : [])]}>
              {pager.slice.map((f) => (
                <tr key={f.id} className="transition-colors hover:bg-slate-50">
                  <td className="td font-medium">{f.bookTitle}</td>{isAdmin && <td className="td">{f.studentName}</td>}
                  <td className="td">{f.overdueDays}</td><td className="td font-medium">{money(f.amount, settings)}</td><td className="td">{fmtDate(f.createdAt)}</td>
                  <td className="td"><StatusBadge status={f.status} />{f.paidAt && <p className="mt-1 text-xs text-slate-400">on {fmtDate(f.paidAt)}</p>}</td>
                  {isAdmin && <td className="td"><button className={f.status === 'paid' ? 'btn-ghost btn-sm' : 'btn-teal btn-sm'} disabled={busy === f.id} onClick={() => toggle(f)}>{busy === f.id && <Spinner className="h-3.5 w-3.5" />}{f.status === 'paid' ? 'Mark pending' : 'Mark paid'}</button></td>}
                </tr>
              ))}
            </Table>
            <Pager pager={pager} />
          </>
        )}
      </div>
    </>
  );
}

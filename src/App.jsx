import { Navigate, Route, Routes } from 'react-router-dom';
import { configured } from './firebase';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { ToastProvider } from './context/ToastContext';
import Guard from './components/Guard';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import StudentDashboard from './pages/StudentDashboard';
import Catalogue from './pages/Catalogue';
import BookDetails from './pages/BookDetails';
import BookForm from './pages/BookForm';
import Students from './pages/Students';
import StudentDetail from './pages/StudentDetail';
import BorrowRequests from './pages/BorrowRequests';
import IssueReturn from './pages/IssueReturn';
import Fines from './pages/Fines';
import HistoryPage from './pages/HistoryPage';
import Reports from './pages/Reports';
import Profile from './pages/Profile';

function SetupNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-900 p-6">
      <div className="card max-w-lg p-8">
        <h1 className="text-2xl font-semibold">Firebase is not configured</h1>
        <p className="mt-3 text-sm text-slate-600">
          Copy <code className="rounded bg-slate-100 px-1">.env.example</code> to <code className="rounded bg-slate-100 px-1">.env</code>,
          paste your Firebase web app keys into it, then restart <code className="rounded bg-slate-100 px-1">npm run dev</code>.
          Step-by-step instructions are in README.md.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  if (!configured) return <SetupNotice />;
  return (
    <ToastProvider>
      <AuthProvider>
        <SettingsProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route path="/admin" element={<Guard role="admin"><Layout /></Guard>}>
              <Route index element={<AdminDashboard />} />
              <Route path="books" element={<Catalogue />} />
              <Route path="books/new" element={<BookForm />} />
              <Route path="books/:id" element={<BookDetails />} />
              <Route path="books/:id/edit" element={<BookForm />} />
              <Route path="students" element={<Students />} />
              <Route path="students/:id" element={<StudentDetail />} />
              <Route path="requests" element={<BorrowRequests />} />
              <Route path="issue-return" element={<IssueReturn />} />
              <Route path="fines" element={<Fines />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="reports" element={<Reports />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            <Route path="/student" element={<Guard role="student"><Layout /></Guard>}>
              <Route index element={<StudentDashboard />} />
              <Route path="books" element={<Catalogue />} />
              <Route path="books/:id" element={<BookDetails />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="fines" element={<Fines />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SettingsProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

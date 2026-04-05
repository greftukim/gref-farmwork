import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './stores/authStore';
import LoginPage from './pages/LoginPage';
import AdminLayout from './components/layout/AdminLayout';
import WorkerLayout from './components/layout/WorkerLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import EmployeesPage from './pages/admin/EmployeesPage';
import AttendancePage from './pages/admin/AttendancePage';
import LeavePage from './pages/admin/LeavePage';
import SchedulePage from './pages/admin/SchedulePage';
import WorkerHome from './pages/worker/WorkerHome';
import WorkerAttendancePage from './pages/worker/WorkerAttendancePage';
import WorkerLeavePage from './pages/worker/WorkerLeavePage';

function ProtectedRoute({ children, role }) {
  const { isAuthenticated, currentUser } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role && currentUser?.role !== role) {
    return <Navigate to={currentUser.role === 'admin' ? '/admin' : '/worker'} replace />;
  }
  return children;
}

function AppRedirect() {
  const { isAuthenticated, currentUser } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={currentUser.role === 'admin' ? '/admin' : '/worker'} replace />;
}

function PlaceholderPage({ title }) {
  return (
    <div className="text-gray-400 text-center py-20">
      <div className="text-lg font-medium">{title}</div>
      <div className="text-sm mt-1">준비 중입니다</div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/admin" element={
          <ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="leave" element={<LeavePage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="tasks" element={<PlaceholderPage title="작업 관리" />} />
          <Route path="records" element={<PlaceholderPage title="기록 조회" />} />
          <Route path="stats" element={<PlaceholderPage title="통계 분석" />} />
          <Route path="notices" element={<PlaceholderPage title="공지사항" />} />
        </Route>

        <Route path="/worker" element={
          <ProtectedRoute role="worker"><WorkerLayout /></ProtectedRoute>
        }>
          <Route index element={<WorkerHome />} />
          <Route path="tasks" element={<PlaceholderPage title="작업" />} />
          <Route path="survey" element={<PlaceholderPage title="생육조사" />} />
          <Route path="attendance" element={<WorkerAttendancePage />} />
          <Route path="leave" element={<WorkerLeavePage />} />
          <Route path="more" element={<PlaceholderPage title="더보기" />} />
        </Route>

        <Route path="*" element={<AppRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}

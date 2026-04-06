import { useState, useEffect } from 'react';
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
import CropZonePage from './pages/admin/CropZonePage';
import TaskPlanPage from './pages/admin/TaskPlanPage';
import TaskBoardPage from './pages/admin/TaskBoardPage';
import IssueCallPage from './pages/admin/IssueCallPage';
import NoticePage from './pages/admin/NoticePage';
import StatsPage from './pages/admin/StatsPage';
import WorkStatsPage from './pages/admin/WorkStatsPage';
import DailyReportPage from './pages/admin/DailyReportPage';
import LocationSettingsPage from './pages/admin/LocationSettingsPage';
import WorkerHome from './pages/worker/WorkerHome';
import WorkerTasksPage from './pages/worker/WorkerTasksPage';
import GrowthSurveyPage from './pages/worker/GrowthSurveyPage';
import WorkerAttendancePage from './pages/worker/WorkerAttendancePage';
import WorkerLeavePage from './pages/worker/WorkerLeavePage';
import IssuePage from './pages/worker/IssuePage';
import EmergencyCallPage from './pages/worker/EmergencyCallPage';
import WorkerNoticePage from './pages/worker/WorkerNoticePage';
import WorkerMorePage from './pages/worker/WorkerMorePage';

function HydrationGate({ children }) {
  const [hydrated, setHydrated] = useState(useAuthStore.persist.hasHydrated());

  useEffect(() => {
    // 이미 hydration 완료된 경우
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    // 아직 안 된 경우: 완료 시 콜백
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    return unsub;
  }, []);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-emerald-950 flex items-center justify-center">
        <div className="text-emerald-300 text-sm">로딩 중...</div>
      </div>
    );
  }
  return children;
}

function ProtectedRoute({ children, role }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const currentUser = useAuthStore((s) => s.currentUser);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role && currentUser?.role !== role) {
    return <Navigate to={currentUser.role === 'admin' ? '/admin' : '/worker'} replace />;
  }
  return children;
}

function AppRedirect() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const currentUser = useAuthStore((s) => s.currentUser);
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
    <HydrationGate>
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
            <Route path="crops" element={<CropZonePage />} />
            <Route path="tasks" element={<TaskPlanPage />} />
            <Route path="board" element={<TaskBoardPage />} />
            <Route path="records" element={<IssueCallPage />} />
            <Route path="stats" element={<StatsPage />} />
            <Route path="work-stats" element={<WorkStatsPage />} />
            <Route path="report" element={<DailyReportPage />} />
            <Route path="notices" element={<NoticePage />} />
            <Route path="location" element={<LocationSettingsPage />} />
          </Route>

          <Route path="/worker" element={
            <ProtectedRoute role="worker"><WorkerLayout /></ProtectedRoute>
          }>
            <Route index element={<WorkerHome />} />
            <Route path="tasks" element={<WorkerTasksPage />} />
            <Route path="survey" element={<GrowthSurveyPage />} />
            <Route path="attendance" element={<WorkerAttendancePage />} />
            <Route path="leave" element={<WorkerLeavePage />} />
            <Route path="issues" element={<IssuePage />} />
            <Route path="emergency" element={<EmergencyCallPage />} />
            <Route path="notices" element={<WorkerNoticePage />} />
            <Route path="more" element={<WorkerMorePage />} />
          </Route>

          <Route path="*" element={<AppRedirect />} />
        </Routes>
      </BrowserRouter>
    </HydrationGate>
  );
}

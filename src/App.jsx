import { useState, useEffect, Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './stores/authStore';
import { ADMIN_ROLES, isFarmAdmin, isAdminLevel } from './lib/permissions';

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('[ErrorBoundary]', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
          <div className="text-red-400 text-lg font-bold mb-2">앱 오류 발생</div>
          <div className="text-slate-400 text-sm mb-4 max-w-md">{this.state.error.message}</div>
          <button onClick={() => { localStorage.removeItem('gref-auth'); window.location.href = '/login'; }}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm">초기화 후 로그인</button>
        </div>
      );
    }
    return this.props.children;
  }
}
import { HQDashboardScreen } from './pages/hq/Dashboard';
import { HQDashboardInteractive } from './pages/hq/DashboardInteractive';
import { HQGrowthCompareScreen } from './pages/hq/GrowthCompare';
import { HQApprovalsScreen, HQBranchesScreen, HQEmployeesScreen, HQFinanceScreen, HQNoticesScreen } from './pages/hq/_pages';
import { FloorPlanScreen } from './pages/FloorPlan';
import { GrowthDashboardScreen, GrowthHeatmapScreen, GrowthInputScreen, GrowthMarkerDetailScreen } from './pages/Growth';
import { BranchPerformanceScreen, HQPerformanceScreen, PerformanceCompareScreen, PerformanceDetailScreen } from './pages/Performance';
import LoginPage from './pages/LoginPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import AdminLayout from './components/layout/AdminLayout';
import WorkerLayout from './components/layout/WorkerLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import EmployeesPage from './pages/admin/EmployeesPage';
import AttendancePage from './pages/admin/AttendancePage';
import LeavePage from './pages/admin/LeavePage';
import LeaveApprovalPage from './pages/admin/LeaveApprovalPage';
import LeaveStatusPage from './pages/admin/LeaveStatusPage';
import SchedulePage from './pages/admin/SchedulePage';
import CropZonePage from './pages/admin/CropZonePage';
import TaskPlanPage from './pages/admin/TaskPlanPage';
import TaskBoardPage from './pages/admin/TaskBoardPage';
import IssueCallPage from './pages/admin/IssueCallPage';
import NoticePage from './pages/admin/NoticePage';
import StatsPage from './pages/admin/StatsPage';
import WorkStatsPage from './pages/admin/WorkStatsPage';
import DailyReportPage from './pages/admin/DailyReportPage';
import AttendanceStatusPage from './pages/admin/AttendanceStatusPage';
import BranchSettingsPage from './pages/admin/BranchSettingsPage';
import AttendanceRecordsPage from './pages/admin/AttendanceRecordsPage';
import GrowthSurveyAdminPage from './pages/admin/GrowthSurveyAdminPage';
import LocationSettingsPage from './pages/admin/LocationSettingsPage';
import OvertimeApprovalPage from './pages/admin/OvertimeApprovalPage';
import TemporaryWorkersPage from './pages/admin/TemporaryWorkersPage';
import PackagingTasksPage from './pages/admin/PackagingTasksPage';
import PackagingRecordsPage from './pages/admin/PackagingRecordsPage';
import PackagingCustomersPage from './pages/admin/PackagingCustomersPage';
import BranchStatsPage from './pages/admin/BranchStatsPage';
import SafetyChecksPage from './pages/admin/SafetyChecksPage';
import SafetyIssuesPage from './pages/admin/SafetyIssuesPage';
import DailyWorkLogsPage from './pages/admin/DailyWorkLogsPage';
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
    const afterHydration = () => {
      setHydrated(true);
      // 작업자 토큰 유효성 백그라운드 재검증 (QR 재발급/해제 감지)
      useAuthStore.getState().revalidateWorkerToken();
    };

    if (useAuthStore.persist.hasHydrated()) {
      afterHydration();
      return;
    }
    const unsub = useAuthStore.persist.onFinishHydration(afterHydration);
    return unsub;
  }, []);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-blue-300 text-sm">로딩 중...</div>
      </div>
    );
  }
  return children;
}

function ProtectedRoute({ children, allowedRoles }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const currentUser = useAuthStore((s) => s.currentUser);
  if (!isAuthenticated || !currentUser) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function LeaveApprovalRoute() {
  const currentUser = useAuthStore((s) => s.currentUser);
  return isFarmAdmin(currentUser) ? <LeaveApprovalPage /> : <LeaveStatusPage />;
}

function AppRedirect() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const currentUser = useAuthStore((s) => s.currentUser);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={currentUser?.role === 'worker' ? '/worker' : '/admin'} replace />;
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
  useEffect(() => {
    useAuthStore.getState().initialize();
  }, []);

  return (
    <ErrorBoundary>
    <HydrationGate>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth" element={<AuthCallbackPage />} />

          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout /></ProtectedRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="leave" element={<LeavePage />} />
            <Route path="leave-approval" element={<LeaveApprovalRoute />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="crops" element={<CropZonePage />} />
            <Route path="tasks" element={<TaskPlanPage />} />
            <Route path="board" element={<TaskBoardPage />} />
            <Route path="records" element={<IssueCallPage />} />
            <Route path="stats" element={<StatsPage />} />
            <Route path="work-stats" element={<WorkStatsPage />} />
            <Route path="report" element={<DailyReportPage />} />
            <Route path="notices" element={<NoticePage />} />
            <Route path="attendance-status" element={<AttendanceStatusPage />} />
            <Route path="branch-settings" element={<BranchSettingsPage />} />
            <Route path="attendance-records" element={<AttendanceRecordsPage />} />
            <Route path="survey" element={<GrowthSurveyAdminPage />} />
            <Route path="location" element={<LocationSettingsPage />} />
            <Route path="overtime-approval" element={<OvertimeApprovalPage />} />
            <Route path="temporary-workers" element={<TemporaryWorkersPage />} />
            <Route path="packaging-tasks" element={<PackagingTasksPage />} />
            <Route path="packaging-records" element={<PackagingRecordsPage />} />
            <Route path="packaging-customers" element={<PackagingCustomersPage />} />
            <Route path="branch-stats" element={<BranchStatsPage />} />
            <Route path="safety-checks" element={<SafetyChecksPage />} />
            <Route path="safety-issues" element={<SafetyIssuesPage />} />
            <Route path="daily-work-logs" element={<DailyWorkLogsPage />} />
            <Route path="floor" element={<FloorPlanScreen />} />
            <Route path="growth" element={<GrowthDashboardScreen />} />
            <Route path="growth/input" element={<GrowthInputScreen />} />
            <Route path="growth/detail" element={<GrowthMarkerDetailScreen />} />
            <Route path="growth/heatmap" element={<GrowthHeatmapScreen />} />
            <Route path="performance" element={<BranchPerformanceScreen />} />
            <Route path="performance/detail" element={<PerformanceDetailScreen />} />
            <Route path="performance/compare" element={<PerformanceCompareScreen />} />
            <Route path="hq" element={<HQDashboardScreen />} />
            <Route path="hq/interactive" element={<HQDashboardInteractive />} />
            <Route path="hq/growth" element={<HQGrowthCompareScreen />} />
            <Route path="hq/performance" element={<HQPerformanceScreen />} />
            <Route path="hq/approvals" element={<HQApprovalsScreen />} />
            <Route path="hq/branches" element={<HQBranchesScreen />} />
            <Route path="hq/employees" element={<HQEmployeesScreen />} />
            <Route path="hq/finance" element={<HQFinanceScreen />} />
            <Route path="hq/notices" element={<HQNoticesScreen />} />
          </Route>

          <Route path="/worker" element={
            <ProtectedRoute allowedRoles={['worker']}><WorkerLayout /></ProtectedRoute>
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
    </ErrorBoundary>
  );
}

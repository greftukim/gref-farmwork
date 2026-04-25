import { NavLink } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import { isFarmAdmin, isMaster, isSupervisor, ROLE_LABELS } from '../../lib/permissions';

// ─── 아이콘 경로 상수 ────────────────────────────────────────────────────────
const ICONS = {
  dashboard: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  employees: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  workStats: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z',
  leaveApproval: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  overtime: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  tasks: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  board: 'M4 6h16M4 10h16M4 14h16M4 18h16',
  crops: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064',
  survey: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  records: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z',
  stats: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  report: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  notices: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
  attendance: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  attendanceRecords: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  leaveStatus: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  leave: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
  schedule: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  branchSettings: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
  packaging: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  building: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  shield: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  safetyAlert: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z',
};

// ─── 생산 관리 카테고리 (farm / master 공용) ─────────────────────────────────
const productionCategory = {
  type: 'category',
  label: '생산 관리',
  items: [
    { label: '작업 배정', to: '/admin/tasks', icon: ICONS.tasks },
    { label: '작업 현황', to: '/admin/board', icon: ICONS.board },
    { label: '작물 관리', to: '/admin/crops', icon: ICONS.crops },
    { label: '생육 조사', to: '/admin/survey', icon: ICONS.survey },
    { label: '신고·호출', to: '/admin/records', icon: ICONS.records },
    { label: '성과 분석', to: '/admin/stats', icon: ICONS.stats },
    { label: '일일 보고서', to: '/admin/report', icon: ICONS.report },
  ],
};

// ─── 재배팀 (farm_admin) ─────────────────────────────────────────────────────
const farmCategorizedMenu = [
  { type: 'item', label: '대시보드', to: '/admin', icon: ICONS.dashboard },
  {
    type: 'category',
    label: '인사 관리',
    items: [
      { label: '직원 관리', to: '/admin/employees', icon: ICONS.employees },
      { label: '일용직/시급제', to: '/admin/daily-work-logs', icon: ICONS.employees },
    ],
  },
  {
    type: 'category',
    label: '근태 관리',
    items: [
      { label: '근무 관리', to: '/admin/attendance', icon: ICONS.attendance },
      { label: '출근 현황', to: '/admin/attendance-status', icon: ICONS.clock },
      { label: '근무 시간', to: '/admin/work-stats', icon: ICONS.workStats },
      { label: '근태 승인', to: '/admin/leave-approval', icon: ICONS.leaveApproval },
      { label: '연장근무 승인', to: '/admin/overtime-approval', icon: ICONS.overtime },
    ],
  },
  productionCategory,
  {
    type: 'category',
    label: '안전 관리',
    items: [
      { label: 'TBM 현황', to: '/admin/safety-checks', icon: ICONS.shield },
      { label: '안전 이슈', to: '/admin/safety-issues', icon: ICONS.safetyAlert },
    ],
  },
  { type: 'item', label: '공지사항', to: '/admin/notices', icon: ICONS.notices },
];

// ─── 관리팀 (hr_admin) ───────────────────────────────────────────────────────
const mgmtCategorizedMenu = [
  { type: 'item', label: '대시보드', to: '/admin', icon: ICONS.dashboard },
  {
    type: 'category',
    label: '인사 관리',
    items: [
      { label: '정직원', to: '/admin/employees', icon: ICONS.employees },
      { label: '일용직/시급제', to: '/admin/daily-work-logs', icon: ICONS.employees },
    ],
  },
  {
    type: 'category',
    label: '근태 관리',
    items: [
      { label: '출근 현황', to: '/admin/attendance-status', icon: ICONS.clock },
      { label: '근무 관리', to: '/admin/attendance', icon: ICONS.attendance },
      { label: '출퇴근 기록', to: '/admin/attendance-records', icon: ICONS.attendanceRecords },
      { label: '근태 현황', to: '/admin/leave-approval', icon: ICONS.leaveStatus },
      { label: '휴가 관리', to: '/admin/leave', icon: ICONS.leave },
      { label: '주간 일정', to: '/admin/schedule', icon: ICONS.schedule },
      { label: '연장근무 관리', to: '/admin/overtime-approval', icon: ICONS.overtime },
    ],
  },
  {
    type: 'category',
    label: '포장 관리',
    items: [
      { label: '포장 작업 지시', to: '/admin/packaging-tasks', icon: ICONS.packaging },
      { label: '포장 실적', to: '/admin/packaging-records', icon: ICONS.attendanceRecords },
      { label: '출하처 관리', to: '/admin/packaging-customers', icon: ICONS.building },
    ],
  },
  {
    type: 'category',
    label: '성과',
    items: [
      { label: '지점별 성과', to: '/admin/branch-stats', icon: ICONS.stats },
    ],
  },
  {
    type: 'category',
    label: '안전 관리',
    items: [
      { label: 'TBM 현황', to: '/admin/safety-checks', icon: ICONS.shield },
      { label: '안전 이슈', to: '/admin/safety-issues', icon: ICONS.safetyAlert },
    ],
  },
  { type: 'item', label: '공지사항', to: '/admin/notices', icon: ICONS.notices },
  {
    type: 'category',
    label: '시스템',
    items: [
      { label: '지점 설정(GPS)', to: '/admin/branch-settings', icon: ICONS.branchSettings },
    ],
  },
];

// ─── 총괄 / 마스터 (supervisor, master) ──────────────────────────────────────
const masterCategorizedMenu = [
  { type: 'item', label: '대시보드', to: '/admin', icon: ICONS.dashboard },
  {
    type: 'category',
    label: '인사 관리',
    items: [
      { label: '정직원', to: '/admin/employees', icon: ICONS.employees },
      { label: '일용직/시급제', to: '/admin/daily-work-logs', icon: ICONS.employees },
    ],
  },
  {
    type: 'category',
    label: '근태 관리',
    items: [
      { label: '출근 현황', to: '/admin/attendance-status', icon: ICONS.clock },
      { label: '근무 관리', to: '/admin/attendance', icon: ICONS.attendance },
      { label: '출퇴근 기록', to: '/admin/attendance-records', icon: ICONS.attendanceRecords },
      { label: '근태 현황', to: '/admin/leave-approval', icon: ICONS.leaveStatus },
      { label: '휴가 관리', to: '/admin/leave', icon: ICONS.leave },
      { label: '주간 일정', to: '/admin/schedule', icon: ICONS.schedule },
      { label: '연장근무 승인', to: '/admin/overtime-approval', icon: ICONS.overtime },
    ],
  },
  productionCategory,
  {
    type: 'category',
    label: '포장 관리',
    items: [
      { label: '포장 작업 지시', to: '/admin/packaging-tasks', icon: ICONS.packaging },
      { label: '포장 실적', to: '/admin/packaging-records', icon: ICONS.attendanceRecords },
      { label: '출하처 관리', to: '/admin/packaging-customers', icon: ICONS.building },
    ],
  },
  {
    type: 'category',
    label: '성과',
    items: [
      { label: '지점별 성과', to: '/admin/branch-stats', icon: ICONS.stats },
    ],
  },
  {
    type: 'category',
    label: '안전 관리',
    items: [
      { label: 'TBM 현황', to: '/admin/safety-checks', icon: ICONS.shield },
      { label: '안전 이슈', to: '/admin/safety-issues', icon: ICONS.safetyAlert },
    ],
  },
  { type: 'item', label: '공지사항', to: '/admin/notices', icon: ICONS.notices },
  {
    type: 'category',
    label: '시스템',
    items: [
      { label: '지점 설정(GPS)', to: '/admin/branch-settings', icon: ICONS.branchSettings },
    ],
  },
];

// ─── 역할별 메뉴 선택 ────────────────────────────────────────────────────────
function getMenuForUser(user) {
  if (isFarmAdmin(user)) return farmCategorizedMenu;
  if (isMaster(user) || isSupervisor(user)) return masterCategorizedMenu;
  return mgmtCategorizedMenu;
}

// ─── 컴포넌트 ────────────────────────────────────────────────────────────────
function MenuIcon({ path }) {
  return (
    <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

/** 단독 메뉴 항목 (대시보드, 공지사항 등) */
function MenuItem({ item }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/admin'}
      className={({ isActive }) =>
        `w-full flex items-center h-14 rounded-2xl px-4 shrink-0 overflow-hidden transition-all ${
          isActive
            ? 'bg-white/20 text-white shadow-sm'
            : 'text-white/50 hover:bg-white/10 hover:text-white'
        }`
      }
    >
      <MenuIcon path={item.icon} />
      <span className="ml-4 text-sm font-medium opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity duration-300">
        {item.label}
      </span>
    </NavLink>
  );
}

/** 카테고리 + 하위 메뉴 (hover 시 펼침) */
function CategoryMenu({ entry }) {
  const categoryIcon = entry.items[0]?.icon;
  return (
    <div className="w-full overflow-hidden rounded-2xl">
      {/* 카테고리 헤더 */}
      <div className="w-full flex items-center h-14 text-white/50 px-4 shrink-0 overflow-hidden">
        <MenuIcon path={categoryIcon} />
        <span className="ml-4 flex-1 text-sm font-medium opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity duration-300">
          {entry.label}
        </span>
        <svg
          className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white/40"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {/* 하위 항목: 사이드바 hover 시 펼침 */}
      <div className="max-h-0 group-hover:max-h-[600px] opacity-0 group-hover:opacity-100 flex flex-col pl-[3.25rem] pr-4 transition-all duration-500 whitespace-nowrap overflow-hidden">
        <div className="py-2 flex flex-col gap-1 border-l border-white/20 ml-2 pl-3">
          {entry.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              className={({ isActive }) =>
                `block text-left text-sm py-1.5 transition-colors ${
                  isActive ? 'text-white font-medium' : 'text-indigo-200 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const menu = getMenuForUser(currentUser);
  const roleBadge = ROLE_LABELS[currentUser?.role];

  return (
    <aside className="hidden md:flex flex-col shrink-0 fixed left-0 top-0 h-screen w-[100px] hover:w-[260px] group bg-[#6366F1] z-40 transition-all duration-300 overflow-y-auto overflow-x-hidden shadow-[4px_0_24px_rgba(0,0,0,0.1)] py-10">

      {/* 프로필 영역 */}
      <div className="px-6 flex items-center gap-4 mb-10 w-[260px]">
        <div className="w-12 h-12 shrink-0 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-lg">
          {currentUser?.name?.[0] || 'G'}
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
          <p className="text-white font-bold text-sm">FarmWork</p>
          <p className="text-indigo-200 text-xs">{roleBadge || currentUser?.name || ''}</p>
        </div>
      </div>

      {/* 메뉴 */}
      <nav className="flex flex-col gap-2 w-full px-4">
        {menu.map((entry) => {
          if (entry.type === 'category') {
            return <CategoryMenu key={entry.label} entry={entry} />;
          }
          return <MenuItem key={entry.to} item={entry} />;
        })}
      </nav>
    </aside>
  );
}

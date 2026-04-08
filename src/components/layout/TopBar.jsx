import useAuthStore from '../../stores/authStore';
import useBranchStore from '../../stores/branchStore';
import { isAdminLevel } from '../../lib/permissions';

export default function TopBar({ title }) {
  const { currentUser, logout } = useAuthStore();
  const branches = useBranchStore((s) => s.branches);
  const selectedBranch = useBranchStore((s) => s.selectedBranch);
  const setSelectedBranch = useBranchStore((s) => s.setSelectedBranch);
  const isAdmin = isAdminLevel(currentUser);

  return (
    <header className="bg-white border-b border-gray-100 px-4 md:px-6 py-3 flex items-center justify-between min-h-[56px]">
      <h1 className="text-base md:text-lg font-heading font-bold text-gray-900">{title || 'GREF FarmWork'}</h1>
      <div className="flex items-center gap-2 md:gap-4">
        {/* 지점 선택: 모바일에서는 숨김 */}
        {isAdmin && (
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="hidden md:block border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white min-h-[36px]"
          >
            <option value="all">전체 지점</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
        {currentUser && (
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-blue-600">{currentUser.name?.[0]}</span>
            </div>
            {/* 이름: 모바일에서는 숨김 */}
            <span className="hidden md:inline text-sm text-gray-700 font-medium">{currentUser.name}</span>
            {isAdmin && (
              <button
                onClick={logout}
                className="text-sm text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <span className="hidden md:inline">로그아웃</span>
                {/* 모바일: 로그아웃 아이콘 */}
                <svg className="md:hidden w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

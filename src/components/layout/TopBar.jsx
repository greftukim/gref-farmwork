import useAuthStore from '../../stores/authStore';
import useBranchStore from '../../stores/branchStore';

export default function TopBar({ title }) {
  const { currentUser, logout } = useAuthStore();
  const branches = useBranchStore((s) => s.branches);
  const selectedBranch = useBranchStore((s) => s.selectedBranch);
  const setSelectedBranch = useBranchStore((s) => s.setSelectedBranch);
  const isAdmin = currentUser?.role === 'admin';

  return (
    <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between min-h-[56px]">
      <h1 className="text-lg font-heading font-bold text-gray-900">{title || 'GREF FarmWork'}</h1>
      <div className="flex items-center gap-4">
        {isAdmin && (
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white min-h-[36px]"
          >
            <option value="all">전체 지점</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
        {currentUser && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-sm font-medium text-blue-600">{currentUser.name?.[0]}</span>
            </div>
            <span className="text-sm text-gray-700 font-medium">{currentUser.name}</span>
            <button
              onClick={logout}
              className="text-sm text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              로그아웃
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

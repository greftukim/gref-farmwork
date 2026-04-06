import useAuthStore from '../../stores/authStore';

export default function TopBar({ title }) {
  const { currentUser, logout } = useAuthStore();

  return (
    <header className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between min-h-[56px]">
      <h1 className="text-lg font-heading font-semibold">{title || 'GREF FarmWork'}</h1>
      {currentUser && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-blue-200">{currentUser.name}</span>
          <button
            onClick={logout}
            className="text-sm text-blue-300 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            로그아웃
          </button>
        </div>
      )}
    </header>
  );
}

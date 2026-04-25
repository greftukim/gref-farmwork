import useInstallPrompt from '../../hooks/useInstallPrompt';

export default function InstallPromptBanner() {
  const { showPrompt, promptType, triggerInstall, dismiss } = useInstallPrompt();

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6 pointer-events-none">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 p-5 pointer-events-auto
        animate-[slideUp_0.3s_ease-out]">

        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-[#6366F1] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xl font-bold">G</span>
          </div>
          <div>
            <div className="font-bold text-gray-900 text-base">FarmWork</div>
            <div className="text-xs text-gray-400">앱처럼 빠르게 사용하세요</div>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          홈 화면에 추가하면 매번 브라우저를 열지 않고 바로 접속할 수 있습니다.
        </p>

        {/* iOS 안내 */}
        {promptType === 'ios' && (
          <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm text-gray-600">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg">①</span>
              <span>하단 공유 버튼을 탭하세요</span>
              <span className="text-blue-500 text-base">⎋</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">②</span>
              <span><b>"홈 화면에 추가"</b>를 선택하세요</span>
              <span className="text-base">＋</span>
            </div>
          </div>
        )}

        {/* 버튼 */}
        <div className="flex gap-2">
          {promptType === 'android' && (
            <button
              onClick={triggerInstall}
              className="flex-1 bg-[#6366F1] text-white text-sm font-bold rounded-xl py-3
                active:scale-95 transition-all shadow-lg shadow-indigo-500/20"
            >
              홈 화면에 추가
            </button>
          )}
          <button
            onClick={dismiss}
            className={`text-sm font-medium rounded-xl py-3 transition-all active:scale-95
              ${promptType === 'android'
                ? 'px-4 text-gray-400 hover:text-gray-600'
                : 'flex-1 bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            나중에
          </button>
        </div>
      </div>
    </div>
  );
}

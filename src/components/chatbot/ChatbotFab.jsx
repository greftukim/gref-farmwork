/**
 * ChatbotFab — AdminLayout 우하단 플로팅 챗봇 버튼
 *
 * §5.1 위치: fixed bottom-8 right-8, z-[60]
 * §5.1 노출 조건: role ∈ {farm_admin, hr_admin, master, general} (4종)
 *
 * 이중 방어:
 *   1차: 라우팅 ProtectedRoute가 ADMIN_ROLES 4종(farm_admin/
 *        hr_admin/supervisor/master)만 AdminLayout 진입 허용
 *   2차: 이 컴포넌트 내부 CHATBOT_ALLOWED_ROLES 3종이 supervisor
 *        제외. supervisor는 AdminLayout 진입 가능하나 FAB 미노출.
 *
 * isOpen 처리: 무시. z-[70] 패널이 z-[60] FAB 위를 덮어
 * 시각적 차단. 렌더 토글 최소화.
 *
 * 관련:
 *   - chatbot-query Edge Function ALLOWED_ROLES와 동기화 필요
 *   - H-5 master 모니터링 등 chatbot 관련 컴포넌트 추가 시
 *     permissions.js로 공통화 검토
 *     (BACKLOG CHATBOT-ROLES-EXTRACT-001 후보)
 */
import useAuthStore from '../../stores/authStore';
import useChatStore from '../../stores/chatStore';

const CHATBOT_ALLOWED_ROLES = ['farm_admin', 'hr_admin', 'master', 'general'];

export default function ChatbotFab() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const openPanel = useChatStore((s) => s.openPanel);
  const isOpen = useChatStore((s) => s.isOpen);

  if (!currentUser || !CHATBOT_ALLOWED_ROLES.includes(currentUser.role)) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={openPanel}
      aria-label="챗봇 열기"
      className="fixed bottom-8 right-8 z-[60] w-14 h-14 rounded-full bg-[#6366F1] hover:bg-[#4F46E5] active:bg-[#4F46E5] text-white shadow-lg shadow-indigo-300 flex items-center justify-center transition-colors"
    >
      💬
      {!isOpen && (
        <span className="absolute top-0 right-0 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500" />
        </span>
      )}
    </button>
  );
}

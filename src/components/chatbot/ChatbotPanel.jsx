/**
 * ChatbotPanel — AdminLayout 챗봇 패널
 *
 * §5.2 레이아웃:
 *   모바일(< md): 전체화면 모달 (fixed inset-0)
 *   데스크톱(≥ md): 우측 슬라이드 오버, 440px 고정 너비
 *   z-[70] (FAB z-[60] 위, Toast z-[100] 아래)
 *
 * §5.2 헤더: "GREF 관리자 도우미" + 닫기 버튼(✕)
 *
 * 이 파일은 단위 4 최소 껍데기 상태.
 * 단위 5에서 전면 확장 예정:
 *   - 새 대화 버튼(🔄)
 *   - 메시지 영역 (user/assistant turn, tool_use 로딩, 에러)
 *   - 환영 메시지 + 예시 질문 3개
 *   - 입력창 (textarea + 카운터 + 전송)
 *   - 스크롤 정책
 *   - useSendChatbotMessage hook 연결
 *   - body 스크롤 잠금 (모바일 fixed inset-0 시 배경 스크롤 차단)
 *   - 슬라이드 애니메이션 (필요 시 framer-motion 등 도입 검토)
 */
import useChatStore from '../../stores/chatStore';

export default function ChatbotPanel() {
  const isOpen = useChatStore((s) => s.isOpen);
  const closePanel = useChatStore((s) => s.closePanel);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 md:inset-auto md:top-0 md:right-0 md:w-[440px] md:h-full z-[70] bg-white flex flex-col shadow-xl">
      <header className="flex items-center justify-between p-4 border-b">
        <h2 className="text-base font-semibold">GREF 관리자 도우미</h2>
        <button
          type="button"
          onClick={closePanel}
          aria-label="챗봇 닫기"
          className="w-10 h-10 flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
        >
          ✕
        </button>
      </header>
      <div className="flex-1 flex items-center justify-center p-4 text-gray-400 text-sm">
        단위 5에서 구현 예정
      </div>
    </div>
  );
}

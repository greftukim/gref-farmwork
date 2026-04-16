/**
 * ChatbotPanel — AdminLayout 챗봇 패널 (완성판)
 *
 * §5.2 레이아웃:
 *   모바일(< md): 전체화면 모달 (fixed inset-0)
 *   데스크톱(≥ md): 우측 슬라이드 오버, 440px 고정 너비
 *   z-[70] (FAB z-[60] 위, Toast z-[100] 아래)
 *
 * §5.2 헤더: "GREF 관리자 도우미" + 새 대화(🔄) + 닫기(✕)
 *   - 새 대화 활성 조건: messages 1개 이상(toolUsePending 제외) + !isPending
 *   - confirm 다이얼로그로 의도 확인 후 resetSession
 *
 * §5.2 본문: ChatbotMessages (메시지 영역) + ChatbotInput (입력창)
 *   - flex-col + Messages flex-1 + Input footer
 *
 * §5.2 폰트: 13px Pretendard (루트 text-[13px], 자식 상속)
 *
 * body 스크롤 잠금: isOpen=true 시 모든 viewport 적용.
 *   useEffect cleanup으로 isOpen=false / unmount 시 자동 복원.
 *
 * isOpen === false 시 return null (DOM 제거).
 *
 * 자식 컴포넌트가 useSendChatbotMessage 직접 호출.
 * Panel은 조립자 — 셀렉터(isOpen, closePanel, resetSession, messages, isPending)만 사용.
 */
import { useEffect } from 'react';
import useChatStore from '../../stores/chatStore';
import ChatbotMessages from './ChatbotMessages';
import ChatbotInput from './ChatbotInput';

export default function ChatbotPanel() {
  const isOpen = useChatStore((s) => s.isOpen);
  const closePanel = useChatStore((s) => s.closePanel);
  const resetSession = useChatStore((s) => s.resetSession);
  const messages = useChatStore((s) => s.messages);
  const isPending = useChatStore((s) => s.isPending);

  // body 스크롤 잠금 (D40, D45): isOpen true 시 적용, cleanup 자동 복원
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  // 새 대화 버튼 활성 조건 (D43): toolUsePending 제외 실 메시지 1개 이상 + 전송 중 아님
  const hasMessages = messages.filter((m) => !m.toolUsePending).length >= 1;
  const canResetSession = hasMessages && !isPending;

  // 새 대화 핸들러 (D39): confirm 후 resetSession
  const handleNewConversation = () => {
    if (window.confirm('현재 대화를 지우고 새로 시작할까요?')) {
      resetSession();
    }
  };

  return (
    <div className="fixed inset-0 md:inset-auto md:top-0 md:right-0 md:w-[440px] md:h-full z-[70] bg-white flex flex-col shadow-xl text-[13px]">
      <header className="flex items-center justify-between p-4 border-b">
        <h2 className="text-base font-semibold">GREF 관리자 도우미</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleNewConversation}
            disabled={!canResetSession}
            aria-label="새 대화 시작"
            className="w-10 h-10 flex items-center justify-center rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            🔄
          </button>
          <button
            type="button"
            onClick={closePanel}
            aria-label="챗봇 닫기"
            className="w-10 h-10 flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>
      </header>
      <ChatbotMessages />
      <ChatbotInput />
    </div>
  );
}

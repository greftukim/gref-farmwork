/**
 * ChatbotPanel — AdminLayout 챗봇 패널 (완성판)
 *
 * §5.2 레이아웃:
 *   fixed bottom-28 right-8, w-[380px] h-[550px]
 *   rounded-3xl shadow-2xl, z-[70]
 *   전환 애니메이션: opacity + translate-y (항상 마운트, CSS 전환)
 *
 * §5.2 헤더: bg-[#6366F1] + "GREF 관리자 도우미" + 새 대화(🔄) + 닫기(✕)
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
 * isOpen === false 시 opacity-0 translate-y-4 pointer-events-none (DOM 유지, CSS 은닉).
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
    <div
      className={`fixed bottom-28 right-8 w-[380px] h-[550px] z-[70]
        bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden text-[13px]
        transition-all duration-300 ease-in-out
        ${isOpen
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
    >
      {/* 헤더 */}
      <header className="bg-[#6366F1] px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-white text-base leading-none">💬</span>
          <h2 className="text-sm font-semibold text-white">GREF 관리자 도우미</h2>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={handleNewConversation}
            disabled={!canResetSession}
            aria-label="새 대화 시작"
            className="w-8 h-8 flex items-center justify-center rounded-xl text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            🔄
          </button>
          <button
            type="button"
            onClick={closePanel}
            aria-label="챗봇 닫기"
            className="w-8 h-8 flex items-center justify-center rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
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

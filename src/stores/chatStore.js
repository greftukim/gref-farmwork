import { create } from 'zustand';

const TOOL_USE_PENDING_ID = 'tool-use-pending';

const useChatStore = create((set, get) => ({
  // §5.3 패널 열림 여부
  isOpen: false,

  // §5.3 현재 챗봇 세션 ID (패널 오픈 시 발급, 닫아도 보존)
  sessionId: null,

  // 메시지 배열. 아이템: { role, content, id, timestamp, toolUsePending?, isError? }
  // 환영 메시지는 스토어 비책임 — 패널 컴포넌트에서 messages.length === 0 렌더 (§5.2)
  messages: [],

  // 응답 대기 중 여부 (입력창·새 대화 버튼 비활성 기준 — §5.2 전송 중 처리)
  isPending: false,

  /**
   * 챗 패널 열기
   * §5.3 재오픈 시 새 session_id 발급 + 메시지 초기화
   * 이미 열려 있으면 no-op
   */
  openPanel: () => {
    if (get().isOpen) return;
    set({
      isOpen: true,
      sessionId: crypto.randomUUID(),
      messages: [],
      isPending: false,
    });
  },

  /**
   * 챗 패널 닫기
   * isOpen만 false로 전환. sessionId/messages는 보존.
   * 실제 세션 리셋은 openPanel() 재호출 시 수행 (§5.3 재오픈 시 새 세션).
   * 서버 chat_logs는 영구 저장되므로 클라이언트 상태 유지 여부와 무관.
   */
  closePanel: () => {
    set({ isOpen: false });
  },

  /**
   * 새 대화 시작 (새 대화 버튼 전용 — §5.2 헤더 새 대화(🔄))
   * §5.3 새 session_id 발급 + 메시지 초기화
   */
  resetSession: () => {
    set({
      sessionId: crypto.randomUUID(),
      messages: [],
      isPending: false,
    });
  },

  /**
   * 사용자 메시지 추가
   * isPending = true 전환 (§5.2 전송 중 상태 진입)
   */
  addUserMessage: (content) => {
    set((s) => ({
      messages: [
        ...s.messages,
        {
          role: 'user',
          content,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        },
      ],
      isPending: true,
    }));
  },

  /**
   * 어시스턴트 메시지 추가
   * isPending = false 전환 (§5.2 전송 중 상태 해제)
   */
  addAssistantMessage: (content) => {
    set((s) => ({
      messages: [
        ...s.messages,
        {
          role: 'assistant',
          content,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        },
      ],
      isPending: false,
    }));
  },

  /**
   * tool_use 로딩 말풍선 토글 (§5.2 "🔍 데이터 조회 중..." 시스템 말풍선)
   * pending=true: 임시 말풍선 push (멱등 — 중복 호출 안전)
   * pending=false: TOOL_USE_PENDING_ID 말풍선 제거
   */
  setToolUsePending: (pending) => {
    if (pending) {
      set((s) => {
        if (s.messages.some((m) => m.id === TOOL_USE_PENDING_ID)) {
          return s; // 이미 존재, no-op
        }
        return {
          messages: [
            ...s.messages,
            {
              role: 'assistant',
              content: '🔍 데이터 조회 중...',
              id: TOOL_USE_PENDING_ID,
              timestamp: new Date().toISOString(),
              toolUsePending: true,
            },
          ],
        };
      });
    } else {
      set((s) => ({
        messages: s.messages.filter((m) => m.id !== TOOL_USE_PENDING_ID),
      }));
    }
  },

  /**
   * 에러 메시지 추가
   * isError: true 플래그로 UI에서 에러 스타일 적용 가능
   * isPending = false 전환
   */
  setError: (text) => {
    set((s) => ({
      messages: [
        ...s.messages,
        {
          role: 'assistant',
          content: text,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          isError: true,
        },
      ],
      isPending: false,
    }));
  },
}));

export default useChatStore;

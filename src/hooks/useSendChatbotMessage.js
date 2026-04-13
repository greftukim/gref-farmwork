import { useCallback } from 'react';
import useChatStore from '../stores/chatStore';
import { sendChatbotMessage } from '../lib/chatbotClient';

export default function useSendChatbotMessage() {
  const sessionId = useChatStore((s) => s.sessionId);
  const isPending = useChatStore((s) => s.isPending);
  const addUserMessage = useChatStore((s) => s.addUserMessage);
  const addAssistantMessage = useChatStore((s) => s.addAssistantMessage);
  const setToolUsePending = useChatStore((s) => s.setToolUsePending);
  const setError = useChatStore((s) => s.setError);
  // messages는 selector로 읽지 않음.
  // 콜백 내부에서 getState()로 동적 읽기 → addUserMessage 직후 최신 배열 보장.
  // selector로 읽으면 closure 시점 스냅샷을 쓰게 되어 새 user turn 누락 위험.

  // useCallback으로 메모이제이션 — 자식 컴포넌트 불필요한 리렌더 방지
  const send = useCallback(async (content) => {
    // 1. 입력 검증
    const trimmed = content?.trim();
    if (!trimmed) return;

    // 2. 전송 중 중복 차단 (UI에서도 비활성하지만 hook 레벨 방어)
    if (isPending) return;

    // 3. addUserMessage — 스토어에 user turn 추가, isPending true 전환
    addUserMessage(trimmed);

    // 4. 서버 전송용 messages 배열 구성
    //    addUserMessage 직후 getState()로 최신 배열 읽기
    //    toolUsePending·isError 아이템 제외 (LLM 컨텍스트 오염 방지)
    const currentMessages = useChatStore.getState().messages;
    const filtered = currentMessages.filter(
      (m) => !m.toolUsePending && !m.isError
    );

    // 5. turnIndex 계산 (addUserMessage 후 기준)
    //    공식: (user_turn_count - 1) * 2
    //    예: 첫 전송 시 user 1개 → (1-1)*2 = 0
    //        두 번째 전송 시 user 2개 → (2-1)*2 = 2
    //    근거: chatbot-query index.ts L236 실측 (§5.3, 단위 3 단계 0)
    const cleanUserCount = filtered.filter((m) => m.role === 'user').length;
    const turnIndex = (cleanUserCount - 1) * 2;

    // 6. 로딩 말풍선 표시 (§5.2 "🔍 데이터 조회 중...")
    setToolUsePending(true);

    try {
      // 7. 래퍼 호출 — 에러 메시지는 chatbotClient에서 한국어 문구로 반환됨
      const { reply } = await sendChatbotMessage({
        sessionId,
        messages: filtered,
        turnIndex,
      });

      // 8. 성공: 로딩 말풍선 제거 + assistant turn 추가
      setToolUsePending(false);
      addAssistantMessage(reply);
    } catch (err) {
      // 9. 실패: 로딩 말풍선 제거 + 에러 메시지 추가
      //    err.message는 chatbotClient.classifyError가 반환한 한국어 문구
      setToolUsePending(false);
      setError(err.message);
    }
  }, [
    sessionId,
    isPending,
    addUserMessage,
    addAssistantMessage,
    setToolUsePending,
    setError,
  ]);

  return send;
}

// chatbot-query Edge Function 호출 래퍼.
// 서버 요구 body: { session_id, turn_index, messages: Array<{role, content}> }.
// messages 배열 구성 책임은 호출자(단위 5 useSendChatbotMessage hook).
// 클라이언트 부가 필드(id/timestamp/toolUsePending/isError)는 서버 .map 추출로 자동 무시.

import { supabase } from './supabase';
import { FunctionsHttpError, FunctionsFetchError } from '@supabase/supabase-js';

/**
 * chatbot-query Edge Function 호출 순수 래퍼.
 * useChatStore·React hook 미참조. 스토어 연결은 단위 5 hook에서 수행.
 *
 * @param {string}   sessionId - 챗봇 세션 UUID (useChatStore.sessionId)
 * @param {Array}    messages  - 대화 전체 이력. 마지막 요소는 role='user' 필수.
 *                               추가 필드(id, timestamp 등) 포함 가능, 서버 자동 무시.
 *                               toolUsePending/isError 아이템 제거는 호출자(hook) 책임.
 * @param {number}   turnIndex - 호출 시점에 이미 messages에 포함된 마지막 user turn의 인덱스.
 *                               공식: (user_turn_count - 1) * 2. 계산 책임은 호출자. (§5.3, Q1 (b))
 * @returns {Promise<{ reply: string, usage: { input_tokens: number, output_tokens: number }, turn_index_assistant: number }>}
 * @throws {Error} 다음 5가지 상황 중 하나:
 *   1. 로그인 필요 — session 없음
 *   2. 네트워크/타임아웃 — FunctionsFetchError (네트워크 실패 또는 fetch 중단)
 *   3. 권한 없음 — FunctionsHttpError 401/403
 *   4. 사용 한도 — FunctionsHttpError 429 (H-4 레이트리밋 미구현으로 현재 도달 불가. 방어 코드.)
 *   5. 일시적 오류 — FunctionsHttpError 5xx 또는 instanceof 매칭 실패 기타
 * @see §5 UI 도메인 노트 (DOMAIN_CHATBOT_V1.md)
 */
export async function sendChatbotMessage({ sessionId, messages, turnIndex }) {
  // 1. 세션 확인
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('로그인이 필요합니다.');
  }

  // 2. Edge Function 호출
  const { data, error } = await supabase.functions.invoke('chatbot-query', {
    body: {
      session_id: sessionId,
      turn_index: turnIndex,
      messages,
    },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  // 3. 에러 분기
  if (error) {
    throw new Error(classifyError(error));
  }

  return data;
}

/**
 * supabase.functions.invoke 에러를 사용자 문구로 변환.
 * 모듈 내부 전용 (export 안 함).
 */
function classifyError(error) {
  // 네트워크 실패 또는 fetch 중단 (AbortError 포함)
  if (error instanceof FunctionsFetchError) {
    return '네트워크가 불안정하거나 응답 시간이 오래 걸립니다. 잠시 후 다시 시도해주세요.';
  }

  if (error instanceof FunctionsHttpError) {
    const status = error.context?.status;

    if (status === 401 || status === 403) {
      return '이 기능을 사용할 권한이 없습니다.';
    }

    // H-4 레이트리밋 미구현으로 현재 도달 불가. 방어 코드.
    if (status === 429) {
      return '오늘 챗봇 사용 한도(100회)에 도달했습니다. 내일 다시 이용해 주세요.';
    }

    // 5xx 및 기타 HTTP 에러
    return '일시적인 오류입니다. 잠시 후 다시 시도해주세요.';
  }

  // instanceof 매칭 실패 (FunctionsRelayError 포함 기타)
  return '일시적인 오류입니다. 잠시 후 다시 시도해주세요.';
}

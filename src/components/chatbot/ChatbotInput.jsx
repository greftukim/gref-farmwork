/**
 * ChatbotInput — 챗봇 입력창
 *
 * §5.2 입력창:
 *   - textarea (자동 높이, max 5줄 ≈ 100px)
 *   - 500자 카운터 (우하단 absolute, 색상 단계)
 *   - 전송 버튼 (텍스트 "전송")
 *
 * 입력 정책 (§5.2, D4):
 *   - Enter 전송 / Shift+Enter 줄바꿈
 *   - IME 한국어 조합 중 Enter는 글자 확정 (e.nativeEvent.isComposing 체크)
 *
 * 전송 중 처리 (§5.2):
 *   - textarea + 전송 버튼 disabled
 *   - 시각 변화 (opacity, cursor)
 *   - hook 레벨 isPending 가드 (단위 5-A)와 이중 방어
 *
 * 입력값 로컬 useState 관리.
 * 전송 후 value '' 리셋 + textarea 포커스 유지 (연속 질문 UX).
 *
 * 공백만 입력 차단: disabled + hook 내부 trim 검증 (이중 방어).
 */
import { useEffect, useRef, useState } from 'react';
import useChatStore from '../../stores/chatStore';
import useSendChatbotMessage from '../../hooks/useSendChatbotMessage';

export default function ChatbotInput() {
  const isPending = useChatStore((s) => s.isPending);
  const send = useSendChatbotMessage();

  const [value, setValue] = useState('');
  const textareaRef = useRef(null);

  // 자동 높이 조정 (§5.2 max 5줄 ≈ 100px)
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 100)}px`;
  }, [value]);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || isPending) return;
    send(trimmed);
    setValue('');
    textareaRef.current?.focus();
  };

  // Enter 전송 / Shift+Enter 줄바꿈
  // e.nativeEvent.isComposing: IME 한국어 조합 중 Enter는 무시 (글자 확정 동작 보존)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  // 카운터 색상 단계: 기본 → 400자 초과 → 480자 초과
  const counterColor =
    value.length > 480 ? 'text-orange-600'
    : value.length > 400 ? 'text-gray-600'
    : 'text-gray-400';

  return (
    <div className="border-t p-3">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isPending}
          maxLength={500}
          placeholder="질문 또는 피드백을 입력하세요..."
          rows={1}
          className="w-full border border-gray-200 rounded-2xl px-3 py-2.5 pr-16 resize-none max-h-[100px] overflow-y-auto focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-50"
        />
        <span className={`absolute right-3 bottom-2 text-xs ${counterColor}`}>
          {value.length}/500
        </span>
      </div>
      <div className="flex justify-end mt-2">
        <button
          type="button"
          onClick={handleSend}
          disabled={isPending || value.trim() === ''}
          className="min-h-[44px] px-4 py-2 bg-[#6366F1] hover:bg-[#4F46E5] active:bg-[#4F46E5] active:scale-95 text-white rounded-xl font-medium shadow-lg shadow-indigo-200 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none transition-all"
        >
          전송
        </button>
      </div>
    </div>
  );
}

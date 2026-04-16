/**
 * ChatbotMessages — 챗봇 메시지 영역
 *
 * §5.2 메시지 영역 + 환영 메시지 + 예시 질문 3개 통합 렌더
 *
 * 메시지 시각 구분:
 *   - user: bg-blue-500 text-white (우측 정렬)
 *   - assistant: bg-gray-100 text-gray-900 (좌측 정렬)
 *   - assistant + isError: bg-red-50 text-red-800 + ⚠️ prefix
 *   - assistant + toolUsePending: 일반 assistant와 동일 (content 자체가 "🔍 데이터 조회 중...")
 *
 * 자동 스크롤 정책 (§5.2):
 *   - 새 메시지 도착 시 자동 하단 스크롤
 *   - 사용자 수동 스크롤 업 시 자동 중단 (distanceFromBottom >= 100px)
 *   - 사용자가 다시 하단 근처 도달 시 자동 스크롤 복원
 *
 * 예시 질문 클릭: useSendChatbotMessage 즉시 호출 (D26)
 */
import { useEffect, useRef, useState } from 'react';
import useChatStore from '../../stores/chatStore';
import useSendChatbotMessage from '../../hooks/useSendChatbotMessage';

// §5.2 확정 문구 (단일 출처 — 변경 시 DOMAIN_CHATBOT_V1.md §5.2도 함께 수정)
const WELCOME_MESSAGE =
  '안녕하세요, GREF 관리자 도우미입니다. 출근·휴가·안전점검 같은 운영 데이터를 질문하시거나, 버그·개선 의견을 자유롭게 남겨주세요. 아래 예시처럼 편하게 말씀하셔도 됩니다.';

const EXAMPLE_QUESTIONS = [
  '오늘 부산 지점 출근자 몇 명이야?',
  '이번 주 휴가 신청 현황 알려줘',
  '지난주 TBM 미실시 건 있었어?',
];

function MessageBubble({ message }) {
  const baseClass = 'p-3 max-w-[85%] break-words text-sm';

  if (message.isError) {
    return (
      <div className={`${baseClass} rounded-2xl rounded-tl-sm bg-red-50 text-red-800 border border-red-200`}>
        <span className="mr-1">⚠️</span>
        {message.content}
      </div>
    );
  }

  if (message.role === 'user') {
    return (
      <div className={`${baseClass} rounded-2xl rounded-tr-sm bg-[#6366F1] text-white ml-auto`}>
        {message.content}
      </div>
    );
  }

  // assistant (toolUsePending 포함 — content 자체가 "🔍 데이터 조회 중...")
  return (
    <div className={`${baseClass} rounded-2xl rounded-tl-sm bg-white text-gray-900 shadow-sm`}>
      {message.content}
    </div>
  );
}

function WelcomeArea({ onExampleClick, disabled }) {
  return (
    <div className="space-y-4">
      <div className="bg-white text-gray-900 rounded-2xl rounded-tl-sm shadow-sm p-3 text-sm">
        {WELCOME_MESSAGE}
      </div>
      <div className="space-y-2">
        {EXAMPLE_QUESTIONS.map((q, i) => (
          <button
            key={i}
            type="button"
            onClick={() => !disabled && onExampleClick(q)}
            disabled={disabled}
            className="w-full text-left bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl p-3 hover:bg-indigo-100 active:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ChatbotMessages() {
  const messages = useChatStore((s) => s.messages);
  const isPending = useChatStore((s) => s.isPending);
  const send = useSendChatbotMessage();

  const scrollContainerRef = useRef(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);

  // 사용자 스크롤 추적: 하단 100px 이내면 자동 스크롤 활성
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setIsAutoScrollEnabled(distanceFromBottom < 100);
  };

  // 새 메시지 도착 시 자동 스크롤 (isAutoScrollEnabled true일 때만)
  useEffect(() => {
    if (!isAutoScrollEnabled) return;
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages.length, isAutoScrollEnabled]);

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50"
    >
      {messages.length === 0 ? (
        <WelcomeArea onExampleClick={send} disabled={isPending} />
      ) : (
        messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))
      )}
    </div>
  );
}

// 작업자 공용 상태 UI — 트랙 77 U9 (그룹 1)
// 의도: Loading / Empty / Error 시각 일관성. 페이지별 1회 호출로 표준 상태 표시.
//
// 사용 예:
//   if (loading) return <Loading message="공지사항을 불러오는 중..." />;
//   if (items.length === 0) return <Empty icon={icons.bell} title="새 공지가 없어요" />;
//   if (error) return <ErrorState onRetry={refetch} message={error.message} />;

import React from 'react';
import { Card, Icon, T_worker as T, icons } from '../../design/primitives';

// CSS keyframes 1회 주입
if (typeof document !== 'undefined' && !document.getElementById('worker-states-styles')) {
  const style = document.createElement('style');
  style.id = 'worker-states-styles';
  style.textContent = `
    @keyframes worker-spin { to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(style);
}

// ─────────── Loading ───────────
export function Loading({ message = '불러오는 중...', size = 'md' }) {
  const dim = size === 'sm' ? 24 : 36;
  const border = size === 'sm' ? 2 : 3;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 16px', gap: 12,
    }}>
      <div style={{
        width: dim, height: dim, borderRadius: '50%',
        border: `${border}px solid ${T.borderSoft}`,
        borderTopColor: T.primary,
        animation: 'worker-spin 800ms linear infinite',
      }} />
      {message && (
        <div style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>{message}</div>
      )}
    </div>
  );
}

// 인라인 스피너 (버튼 내부용)
export function Spinner({ size = 14, color }) {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block', width: size, height: size, borderRadius: '50%',
        border: `2px solid ${color || 'rgba(255,255,255,0.4)'}`,
        borderTopColor: color || '#fff',
        animation: 'worker-spin 700ms linear infinite',
      }}
    />
  );
}

// ─────────── Empty ───────────
export function Empty({
  icon = icons.bell,
  title = '내용이 없어요',
  body,
  actionLabel,
  onAction,
}) {
  return (
    <Card pad={28} style={{ textAlign: 'center' }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14, marginBottom: 12,
        background: T.borderSoft,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon d={icon} size={26} c={T.mutedSoft} sw={1.6} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>
        {title}
      </div>
      {body && (
        <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>{body}</div>
      )}
      {actionLabel && onAction && (
        <button onClick={onAction} style={{
          marginTop: 16, height: 40, padding: '0 18px', borderRadius: 10, border: 0,
          background: T.primary, color: '#fff',
          fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: T.shadowSm,
        }}>{actionLabel}</button>
      )}
    </Card>
  );
}

// ─────────── ErrorState ───────────
export function ErrorState({
  title = '일시적인 문제가 발생했어요',
  message,
  onRetry,
  retryLabel = '다시 시도',
}) {
  return (
    <Card pad={28} style={{ textAlign: 'center' }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14, marginBottom: 12,
        background: T.dangerSoft,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon d={icons.alert} size={26} c={T.danger} sw={1.8} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 6 }}>
        {title}
      </div>
      {message && (
        <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6, marginBottom: 14 }}>
          {message}
        </div>
      )}
      {onRetry && (
        <button onClick={onRetry} style={{
          height: 40, padding: '0 18px', borderRadius: 10, border: 0,
          background: T.primary, color: '#fff',
          fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: T.shadowSm,
        }}>{retryLabel}</button>
      )}
    </Card>
  );
}

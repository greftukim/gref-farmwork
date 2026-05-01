// 이상신고 모달 — 트랙 77 U5
// 시안: screens/worker-screens-v2.jsx ScreenIssue
// 자산: useIssueStore.addIssue 기존 호출 (DB 변경 0)
// 미구현(G77-H): 사진 첨부 — Storage 버킷 미신설. UI 영역만 노출 + disabled.

import React, { useState } from 'react';
import { Card, Icon, T_worker as T, icons } from '../../design/primitives';
import useIssueStore from '../../stores/issueStore';
import useAuthStore from '../../stores/authStore';

const CATEGORIES = ['병해충', '시설고장', '안전', '환경', '기타'];

export default function IssueModal({ open, onClose, currentLocation = '' }) {
  const addIssue = useIssueStore((s) => s.addIssue);
  const currentUser = useAuthStore((s) => s.currentUser);

  const [category, setCategory] = useState('병해충');
  const [location, setLocation] = useState(currentLocation);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const valid = description.trim().length > 0;

  const handleSubmit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      // DB schema: comment 단일 컬럼. 위치 정보는 comment 앞에 prefix.
      const composedComment = location.trim()
        ? `[위치] ${location.trim()}\n${description.trim()}`
        : description.trim();

      await addIssue?.({
        workerId: currentUser?.id,
        workerName: currentUser?.name,
        zoneId: null, // UUID 미사용. 작업자는 위치 텍스트로 입력
        type: category,
        comment: composedComment,
        photo: null, // G77-H: Storage 버킷 미신설, 본 라운드 미구현
      });
      // 성공 — 폼 리셋 + 닫기
      setCategory('병해충');
      setLocation('');
      setDescription('');
      onClose?.();
      // toast 대신 alert (기존 패턴)
      alert('이상신고가 접수되었습니다.\n관리자에게 전달됩니다.');
    } catch (err) {
      alert('이상신고 전송에 실패했습니다.\n' + (err?.message || ''));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
      display: 'flex', alignItems: 'flex-end', zIndex: 100,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: T.surface, width: '100%',
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: 20, paddingBottom: 24,
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 999, background: T.borderSoft, margin: '0 auto 14px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Icon d={icons.alert} size={18} c={T.warning} sw={2} />
          <div style={{ fontSize: 17, fontWeight: 800, color: T.text }}>이상 신고</div>
          <button onClick={onClose} disabled={submitting} style={{
            marginLeft: 'auto', width: 32, height: 32, borderRadius: 16, border: 0,
            background: T.borderSoft, color: T.muted,
            cursor: submitting ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: submitting ? 0.5 : 1,
          }}>
            <Icon d={icons.x} size={14} sw={2.4} />
          </button>
        </div>
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>
          관리자에게 즉시 전달됩니다.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* 분류 */}
          <div>
            <label style={{ fontSize: 11, color: T.muted, fontWeight: 600, display: 'block', marginBottom: 8 }}>분류</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {CATEGORIES.map((c) => {
                const on = category === c;
                return (
                  <button key={c} onClick={() => setCategory(c)} style={{
                    height: 32, padding: '0 12px', borderRadius: 16,
                    border: on ? 0 : `1px solid ${T.border}`,
                    background: on ? T.primary : T.surface,
                    color: on ? '#fff' : T.muted,
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}>{c}</button>
                );
              })}
            </div>
          </div>

          {/* 위치 */}
          <div>
            <label style={{ fontSize: 11, color: T.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>위치 (선택)</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="예: 3동 D라인 4번 베드"
              style={{
                width: '100%', height: 42, padding: '0 12px',
                border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 14,
              }}
            />
          </div>

          {/* 사진 — G77-H 미구현, UI만 노출 */}
          <div>
            <label style={{ fontSize: 11, color: T.muted, fontWeight: 600, display: 'block', marginBottom: 8 }}>사진</label>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: 14, borderRadius: 10,
              border: `1.5px dashed ${T.borderSoft}`, background: T.bg,
              opacity: 0.6,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10, background: T.surface,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${T.border}`,
              }}>
                <Icon d={icons.camera} size={20} c={T.mutedSoft} sw={1.8} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.muted }}>사진 첨부</div>
                <div style={{ fontSize: 10, color: T.mutedSoft, marginTop: 2 }}>곧 출시 예정</div>
              </div>
            </div>
          </div>

          {/* 상세 내용 */}
          <div>
            <label style={{ fontSize: 11, color: T.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>상세 내용</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="발견하신 이상 증상을 자세히 입력하세요"
              rows={4}
              style={{
                width: '100%', padding: 10,
                border: `1px solid ${T.border}`, borderRadius: 8,
                fontSize: 14, fontFamily: 'inherit', resize: 'vertical', minHeight: 96,
              }}
            />
          </div>

          {/* 액션 */}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={onClose} disabled={submitting} style={{
              flex: 1, height: 46, borderRadius: 10,
              border: `1px solid ${T.border}`, background: T.surface, color: T.muted,
              fontSize: 14, fontWeight: 600,
              cursor: submitting ? 'default' : 'pointer',
              opacity: submitting ? 0.5 : 1,
            }}>취소</button>
            <button onClick={handleSubmit} disabled={!valid || submitting} style={{
              flex: 2, height: 46, borderRadius: 10, border: 0,
              background: valid && !submitting ? T.primary : T.borderSoft,
              color: valid && !submitting ? '#fff' : T.mutedSoft,
              fontSize: 14, fontWeight: 700,
              cursor: valid && !submitting ? 'pointer' : 'not-allowed',
            }}>{submitting ? '전송 중...' : '신고하기'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// IssueFab — 이상신고 floating action button (BottomNav 위)
// 시안: ScreenHome IssueFab (right: 16, bottom: 78)
export function IssueFab({ onClick, hidden = false }) {
  if (hidden) return null;
  return (
    <button
      aria-label="이상 신고"
      onClick={onClick}
      style={{
        position: 'fixed',
        right: 16,
        bottom: 78, // BottomNav(약 62px) 위로 16px 여유
        width: 56, height: 56, borderRadius: 28, border: 0,
        background: T.warning, color: '#fff',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 20px rgba(217,119,6,0.45), 0 2px 6px rgba(0,0,0,0.1)',
        gap: 1, zIndex: 30, cursor: 'pointer',
      }}
    >
      <Icon d={icons.alert} size={20} c="#fff" sw={2.4} />
      <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: -0.2 }}>신고</span>
    </button>
  );
}

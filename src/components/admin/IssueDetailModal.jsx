// 관리자 측 이상신고 상세 모달 — 트랙 77 후속 U13 (TRACK77-ISSUE-ADMIN-PHOTOS-001)
// 시안: 작업자 IssueModal 패턴 추종 (단 T 토큰 사용, 관리자 기존 디자인 시스템)
// 자산: useIssueStore.updateIssue 활용 (페이지 inline 핸들러 → 모달 위임)
//
// G77-V: 라이트박스 단순 클릭 확대 (좌우 스와이프 / pinch-zoom 미구현 — BACKLOG 후보)

import React, { useState } from 'react';
import { T, Avatar, Pill, Dot, Icon, icons } from '../../design/primitives';
import useIssueStore from '../../stores/issueStore';

const SEVERITY = {
  critical: { l: '긴급', c: T.danger, soft: T.dangerSoft },
  high: { l: '높음', c: T.warning, soft: T.warningSoft },
  normal: { l: '보통', c: T.info, soft: T.infoSoft },
};

const STATUS = {
  pending: { l: '미처리', tone: 'danger', c: T.danger },
  in_progress: { l: '처리중', tone: 'warning', c: T.warning },
  resolved: { l: '완료', tone: 'success', c: T.success },
};

export default function IssueDetailModal({ open, onClose, issue, employee }) {
  const updateIssue = useIssueStore((s) => s.updateIssue);
  const [lightbox, setLightbox] = useState(null); // 클릭한 사진 URL (없으면 null)

  if (!open || !issue) return null;

  const sv = SEVERITY[issue.severity] || SEVERITY.normal;
  const st = STATUS[issue.status] || STATUS.pending;
  const photos = Array.isArray(issue.photos) ? issue.photos : [];

  const handleStart = () => {
    updateIssue?.(issue.id, { status: 'in_progress' });
    onClose?.();
  };
  const handleResolve = () => {
    updateIssue?.(issue.id, { status: 'resolved', resolvedAt: new Date().toISOString() });
    onClose?.();
  };

  return (
    <>
      {/* 백드롭 */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
        {/* 모달 컨테이너 — 백드롭 클릭 차단 */}
        <div onClick={(e) => e.stopPropagation()} style={{
          background: T.surface, borderRadius: 12, width: '100%', maxWidth: 560, maxHeight: '85vh',
          overflow: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
        }}>
          {/* 헤더 */}
          <div style={{
            padding: '18px 20px', borderBottom: `1px solid ${T.borderSoft}`,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <Avatar name={employee?.name || '?'} color={issue.severity === 'critical' ? 'rose' : 'indigo'} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                  background: sv.soft, color: sv.c,
                }}>{sv.l}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{employee?.name || '익명'}</span>
                <Pill tone={st.tone}><Dot c={st.c} />{st.l}</Pill>
              </div>
              <div style={{ fontSize: 12, color: T.mutedSoft }}>
                {issue.category || issue.type || '기타'} · {new Date(issue.createdAt).toLocaleString('ko-KR')}
              </div>
            </div>
            <button onClick={onClose} aria-label="닫기" style={{
              width: 32, height: 32, borderRadius: 8, border: 0, background: 'transparent',
              color: T.muted, cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 0,
            }}>×</button>
          </div>

          {/* 본문 */}
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* 상세 내용 */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.mutedSoft, marginBottom: 6 }}>신고 내용</div>
              <div style={{ fontSize: 14, color: T.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {issue.comment || '(내용 없음)'}
              </div>
            </div>

            {/* 위치 */}
            {issue.location && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.mutedSoft, marginBottom: 6 }}>위치</div>
                <div style={{ fontSize: 13, color: T.text, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Icon d={icons.location} size={13} c={T.muted} sw={2} />{issue.location}
                </div>
              </div>
            )}

            {/* 사진 */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.mutedSoft, marginBottom: 8 }}>
                첨부 사진 ({photos.length}장)
              </div>
              {photos.length === 0 ? (
                <div style={{ fontSize: 12, color: T.mutedSoft, padding: '12px 0' }}>
                  첨부된 사진이 없습니다
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {photos.map((p) => (
                    <div key={p.id} onClick={() => setLightbox(p.photoUrl)} style={{
                      aspectRatio: '1 / 1', borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
                      background: T.bg, border: `1px solid ${T.borderSoft}`,
                    }}>
                      <img src={p.photoUrl} alt="첨부 사진" loading="lazy" style={{
                        width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                      }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 처리 시각 */}
            {issue.resolvedAt && (
              <div style={{ fontSize: 12, color: T.mutedSoft }}>
                완료: {new Date(issue.resolvedAt).toLocaleString('ko-KR')}
              </div>
            )}
          </div>

          {/* 액션 푸터 */}
          {issue.status !== 'resolved' && (
            <div style={{
              padding: '14px 20px', borderTop: `1px solid ${T.borderSoft}`, background: T.bg,
              display: 'flex', gap: 8, justifyContent: 'flex-end',
            }}>
              {issue.status === 'pending' && (
                <button onClick={handleStart} style={{
                  height: 36, padding: '0 14px', borderRadius: 8, border: `1px solid ${T.border}`,
                  background: T.surface, color: T.primary, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>처리 시작</button>
              )}
              <button onClick={handleResolve} style={{
                height: 36, padding: '0 14px', borderRadius: 8, border: 0,
                background: T.success, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>완료 처리</button>
            </div>
          )}
        </div>
      </div>

      {/* 라이트박스 */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
          zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          cursor: 'zoom-out',
        }}>
          <img src={lightbox} alt="확대 보기" style={{
            maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
          }} />
        </div>
      )}
    </>
  );
}

// 이상신고 모달 — 트랙 77 U5 → 후속 U11 (사진 첨부 활성화)
// 시안: screens/worker-screens-v2.jsx ScreenIssue
// 자산: useIssueStore.addIssue 시그니처 확장 (photos 배열 추가)
// 후속 U11 (G77-H 활성화):
//   - G-Storage-1: 최대 3장
//   - G-Storage-2: 카메라 + 갤러리 양쪽 (input capture="environment" + multiple)
//   - G-Storage-3: 1280px / JPEG 80% 압축 (issueStorage.js 내부)
//   - G-Storage-5: 자동 재시도 1회 (issueStorage.js 내부)
//   - G-Storage-6: 사진 미첨부도 신고 가능 (선택)

import React, { useRef, useState } from 'react';
import { Icon, T_worker as T, icons } from '../../design/primitives';
import useIssueStore from '../../stores/issueStore';
import useAuthStore from '../../stores/authStore';
import useNotificationStore from '../../stores/notificationStore';
import { MAX_PHOTOS } from '../../lib/issueStorage';

const CATEGORIES = ['병해충', '시설고장', '안전', '환경', '기타'];

export default function IssueModal({ open, onClose, currentLocation = '' }) {
  const addIssue = useIssueStore((s) => s.addIssue);
  const currentUser = useAuthStore((s) => s.currentUser);
  // U9: alert → toast (notificationStore 활용)
  const addNotification = useNotificationStore((s) => s.addNotification);

  const [category, setCategory] = useState('병해충');
  const [location, setLocation] = useState(currentLocation);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // 후속 U11: 사진 첨부 state — File[] + preview URL 별도 관리 (revoke 추적)
  const [photos, setPhotos] = useState([]); // { file: File, previewUrl: string }
  const fileInputRef = useRef(null);

  if (!open) return null;

  const valid = description.trim().length > 0;

  // 파일 선택 — 최대 3장으로 절삭
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const remaining = MAX_PHOTOS - photos.length;
    const accepted = files.slice(0, remaining);
    const newItems = accepted.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...newItems]);
    // 동일 파일 재선택 가능하도록 input 리셋
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (idx) => {
    setPhotos((prev) => {
      // 메모리 누수 방지 — preview URL revoke
      URL.revokeObjectURL(prev[idx]?.previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  };

  // 모달 닫을 때 preview URL 일괄 정리
  const cleanupPhotos = () => {
    photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPhotos([]);
  };

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
        zoneId: null,
        type: category,
        comment: composedComment,
        photo: null, // 호환 (단일 photo 컬럼). 다중 사진은 photos 배열로 issue_photos 테이블
        // 후속 U11: 사진 첨부 (File 객체 배열만 전달, preview URL 제외)
        photos: photos.map((p) => p.file),
      });
      // 성공 — 폼 리셋 + 사진 cleanup + 닫기 + toast
      setCategory('병해충');
      setLocation('');
      setDescription('');
      cleanupPhotos();
      onClose?.();
      addNotification({
        type: 'success',
        title: '이상신고가 접수되었습니다',
        message: photos.length > 0
          ? `사진 ${photos.length}장과 함께 관리자에게 전달되었습니다.`
          : '관리자에게 전달되었습니다.',
      });
    } catch (err) {
      // 후속 U11: 사진 업로드만 실패한 경우 — issue 자체는 INSERT 성공
      if (err?.message === 'PHOTO_UPLOAD_FAILED') {
        cleanupPhotos();
        onClose?.(); // issue는 이미 INSERT 됨 → 모달 닫음
        addNotification({
          type: 'warning',
          title: '신고는 전송됐으나 사진 업로드가 실패했습니다',
          message: '관리자에게 본문은 전달됐습니다. 사진은 다시 신고해 주세요.',
        });
      } else {
        addNotification({
          type: 'error',
          title: '이상신고 전송 실패',
          message: err?.message || '잠시 후 다시 시도해주세요.',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 모달 사용자 닫기 (취소 버튼 / 백드롭 / X) — preview URL cleanup
  const handleClose = () => {
    if (submitting) return;
    cleanupPhotos();
    onClose?.();
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

          {/* 사진 — 후속 U11 활성화 */}
          <div>
            <label style={{ fontSize: 11, color: T.muted, fontWeight: 600, display: 'block', marginBottom: 8 }}>
              사진 <span style={{ color: T.mutedSoft, fontWeight: 500 }}>(선택, 최대 {MAX_PHOTOS}장)</span>
            </label>

            {/* hidden input — capture="environment"로 모바일 시 후면 카메라 우선, multiple로 갤러리 다중 선택 */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />

            {/* 첨부 트리거 버튼 + preview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {photos.map((p, idx) => (
                <div key={p.previewUrl} style={{
                  position: 'relative', width: 64, height: 64, borderRadius: 10, overflow: 'hidden',
                  border: `1px solid ${T.border}`,
                }}>
                  <img
                    src={p.previewUrl}
                    alt={`첨부 ${idx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    aria-label="사진 제거"
                    style={{
                      position: 'absolute', top: 2, right: 2,
                      width: 22, height: 22, borderRadius: 11, border: 0,
                      background: 'rgba(15,23,42,0.7)', color: '#fff',
                      cursor: 'pointer', padding: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Icon d={icons.x} size={11} c="#fff" sw={2.6} />
                  </button>
                </div>
              ))}

              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={submitting}
                  style={{
                    width: 64, height: 64, borderRadius: 10,
                    border: `1.5px dashed ${T.border}`,
                    background: T.bg, color: T.muted,
                    cursor: submitting ? 'default' : 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                    opacity: submitting ? 0.5 : 1,
                  }}
                >
                  <Icon d={icons.camera} size={18} c={T.muted} sw={1.8} />
                  <span style={{ fontSize: 9, fontWeight: 700 }}>{photos.length}/{MAX_PHOTOS}</span>
                </button>
              )}
            </div>

            <div style={{ fontSize: 10, color: T.mutedSoft, marginTop: 6 }}>
              자동 압축됩니다 (1280px / JPEG)
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

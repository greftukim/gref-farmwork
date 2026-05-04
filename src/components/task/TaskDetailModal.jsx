// 작업 상세 모달 — 트랙 77 후속 U18 + U21
// 시안: 카드 클릭 → 상세 + 날짜 필드 편집 (카드 이동 = 이 필드 수정)
// 자산 보존: AssignWorkersModal 재사용 (변경 0). 본 모달에서 "배정 변경" 버튼 → 부모가 AssignWorkersModal 오픈.
//
// U21: 작물·줄범위 UI 입력 제거 (사용자 의견 6).
//   - cropId 는 zone+date 기반 자동 derive (DB 컬럼 보존, SafetyCheck TBM 매칭 의존)
//     단 편집 모드에서 task.cropId가 박제된 경우 그것 우선 (G77-TTT)
//   - rowRange 는 현장 작업자 자율 + QR 스캔 추적 (DB 컬럼 보존, UI 제거, 항상 NULL)

import React, { useState, useEffect, useMemo } from 'react';
import { Avatar, Pill, T } from '../../design/primitives';
import useTaskStore from '../../stores/taskStore';
import useCropStore from '../../stores/cropStore';
import useZoneCropStore from '../../stores/zoneCropStore';
import { deriveCropForTask, formatDerivedCropLabel } from '../../lib/cropDerive';

const STATUS_LABEL = {
  pending: { l: '계획', tone: 'muted' },
  planned: { l: '계획', tone: 'muted' },
  assigned: { l: '계획', tone: 'muted' },
  in_progress: { l: '진행중', tone: 'warning' },
  completed: { l: '완료', tone: 'success' },
  done: { l: '완료', tone: 'success' },
};

export default function TaskDetailModal({ task, zones, onClose, onSaved, onAssignClick }) {
  const addTask = useTaskStore((s) => s.addTask);
  const updateTask = useTaskStore((s) => s.updateTask);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const crops = useCropStore((s) => s.crops);
  const fetchCrops = useCropStore((s) => s.fetchCrops);
  const zoneCrops = useZoneCropStore((s) => s.zoneCrops);
  const fetchZoneCrops = useZoneCropStore((s) => s.fetchZoneCrops);

  const isNew = !!task?.__new;
  const taskId = task?.id;

  // 폼 state (U21: cropId / rowRange 제거)
  const [title, setTitle] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [date, setDate] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // [TRACK77-U21] 편집 모드에서 박제된 cropId 보존 (G77-TTT — task 우선)
  // 신규 또는 미박제 시 derive 사용
  const [originalCropId, setOriginalCropId] = useState(null);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title || '');
    setZoneId(task.zoneId || task.zones?.id || task.zone?.id || '');
    setDate(task.date || '');
    setEstimatedMinutes(task.estimatedMinutes ? String(task.estimatedMinutes) : '');
    setDescription(task.description || '');
    setOriginalCropId(task.__new ? null : (task.cropId || null));
  }, [task]);

  // [TRACK77-U21] 작기·작물 데이터 모달 mount 시 idempotent 로드
  useEffect(() => {
    if (!Array.isArray(zoneCrops) || zoneCrops.length === 0) fetchZoneCrops({ activeOnly: false });
    if (!Array.isArray(crops) || crops.length === 0) fetchCrops();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // [TRACK77-U21] zone+date 기반 자동 derive
  const derivedCrop = useMemo(
    () => deriveCropForTask(zoneCrops, zoneId, date),
    [zoneCrops, zoneId, date]
  );
  const derivedCropLabel = useMemo(
    () => formatDerivedCropLabel(derivedCrop, crops),
    [derivedCrop, crops]
  );

  // 저장 시 사용할 cropId — 편집 모드에서 박제된 값이 있으면 우선 (G77-TTT)
  const effectiveCropId = (originalCropId && !isNew) ? originalCropId : derivedCrop.cropId;

  if (!task) return null;

  const valid = title.trim().length > 0 && zoneId && date;

  const workers = task.workers || [];
  const status = task.status;
  const sp = STATUS_LABEL[status] || STATUS_LABEL.pending;

  const handleSave = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        zoneId,
        date,
        // [TRACK77-U21] 자동 derive (편집 모드는 박제된 값 우선, G77-TTT)
        cropId: effectiveCropId || null,
        // [TRACK77-U21] UI 제거 — 항상 NULL (G77-XXX, 현장 자율 + QR 추적)
        rowRange: null,
        estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes, 10) : null,
        description: description.trim() || null,
      };
      if (isNew) {
        await addTask(payload);
      } else {
        await updateTask(taskId, payload);
      }
      onSaved?.();
    } catch (err) {
      console.error('TaskDetailModal save error:', err);
      alert('저장에 실패했습니다.\n' + (err?.message || ''));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!taskId || isNew) return;
    if (!window.confirm('이 작업을 삭제하시겠습니까?')) return;
    setSubmitting(true);
    try {
      await deleteTask(taskId);
      onSaved?.();
    } catch (err) {
      alert('삭제에 실패했습니다.\n' + (err?.message || ''));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: T.surface, borderRadius: 12, width: '100%', maxWidth: 580,
        maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
      }}>
        {/* 헤더 */}
        <div style={{
          padding: '18px 20px', borderBottom: `1px solid ${T.borderSoft}`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.mutedSoft, marginBottom: 4 }}>
              {isNew ? '새 작업' : '작업 상세'}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>
              {isNew ? '작업을 추가하세요' : (task.title || '제목 없음')}
            </div>
          </div>
          {!isNew && <Pill tone={sp.tone}>{sp.l}</Pill>}
          <button onClick={onClose} aria-label="닫기" style={{
            width: 32, height: 32, borderRadius: 8, border: 0, background: 'transparent',
            color: T.muted, cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 0,
          }}>×</button>
        </div>

        {/* 본문 */}
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* 작업 종류 */}
          <Field label="작업 종류 *">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 방울토 따기"
              style={inputStyle}
            />
          </Field>

          {/* 동 + 날짜 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="동 *">
              <select value={zoneId} onChange={(e) => setZoneId(e.target.value)} style={inputStyle}>
                <option value="">선택</option>
                {(zones || []).map((z) => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </Field>
            <Field label="날짜 *">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>

          {/* [TRACK77-U21] 작물 자동 매칭 힌트 (입력 필드 제거 — zone_crops가 진실 공급원) */}
          {zoneId && date && (
            <div style={{
              padding: '10px 12px',
              background: derivedCrop.cropId ? '#ECFDF5' : '#FEF3C7',
              border: `1px solid ${derivedCrop.cropId ? '#10B981' : '#F59E0B'}`,
              borderRadius: 8,
              fontSize: 12,
              color: derivedCrop.cropId ? '#065F46' : '#854F0B',
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <span style={{ fontSize: 14, lineHeight: 1, marginTop: 1 }}>
                {derivedCrop.cropId ? '✓' : '⚠'}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>작물 자동 매칭</div>
                <div>{derivedCropLabel}</div>
                {originalCropId && !isNew && originalCropId !== derivedCrop.cropId && (
                  <div style={{ marginTop: 4, fontSize: 11, opacity: 0.85 }}>
                    저장된 값 보존 (편집 모드)
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 예상 시간 */}
          <Field label="예상 시간 (분)">
            <input
              type="number"
              min="0"
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(e.target.value)}
              placeholder="예: 90"
              style={inputStyle}
            />
          </Field>

          {/* 설명 */}
          <Field label="설명">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', minHeight: 70 }}
            />
          </Field>

          {/* 배정자 (보기 only — 변경은 별 모달) */}
          {!isNew && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.mutedSoft, marginBottom: 6 }}>
                배정자 ({workers.length}명)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {workers.length === 0 ? (
                  <span style={{ fontSize: 12, color: T.mutedSoft, fontStyle: 'italic' }}>미배정</span>
                ) : (
                  workers.map((w) => (
                    <div key={w.id} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '4px 10px 4px 4px', borderRadius: 999,
                      background: T.bg, border: `1px solid ${T.border}`,
                    }}>
                      <Avatar name={w.name || '?'} size={20} />
                      <span style={{ fontSize: 12, color: T.text, fontWeight: 600 }}>{w.name}</span>
                    </div>
                  ))
                )}
                <button
                  onClick={onAssignClick}
                  style={{
                    height: 28, padding: '0 10px', borderRadius: 6,
                    border: `1px solid ${T.border}`, background: T.surface, color: T.primary,
                    fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  }}
                >배정 변경</button>
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div style={{
          padding: '14px 20px', borderTop: `1px solid ${T.borderSoft}`, background: T.bg,
          display: 'flex', gap: 8, alignItems: 'center',
        }}>
          {!isNew && (
            <button
              onClick={handleDelete}
              disabled={submitting}
              style={{
                height: 36, padding: '0 14px', borderRadius: 8,
                border: `1px solid ${T.dangerSoft}`, background: T.surface, color: T.danger,
                fontSize: 13, fontWeight: 600,
                cursor: submitting ? 'default' : 'pointer',
              }}
            >삭제</button>
          )}
          <div style={{ flex: 1 }} />
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              height: 36, padding: '0 14px', borderRadius: 8,
              border: `1px solid ${T.border}`, background: T.surface, color: T.muted,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >취소</button>
          <button
            onClick={handleSave}
            disabled={!valid || submitting}
            style={{
              height: 36, padding: '0 18px', borderRadius: 8, border: 0,
              background: valid && !submitting ? T.primary : T.borderSoft,
              color: valid && !submitting ? '#fff' : T.mutedSoft,
              fontSize: 13, fontWeight: 700,
              cursor: valid && !submitting ? 'pointer' : 'not-allowed',
            }}
          >{submitting ? '저장 중...' : isNew ? '추가' : '저장'}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: T.mutedSoft, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  height: 38, padding: '0 10px',
  border: `1px solid ${T.border}`, borderRadius: 8,
  fontSize: 13, color: T.text,
  background: T.surface,
};

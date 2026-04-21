// 작업 생성 — 관리자
// 경로: /admin/tasks/new

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Icon, T, TopBar, icons,
} from '../../design/primitives';
import useEmployeeStore from '../../stores/employeeStore';
import useCropStore from '../../stores/cropStore';
import useZoneStore from '../../stores/zoneStore';
import useTaskStore from '../../stores/taskStore';

const TASK_TYPES = ['수확', '적엽', '유인', '정식', '적화', '적과', '줄 내리기', '측지제거', '선별·포장', '방제'];

const Label = ({ children, required }) => (
  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 6, letterSpacing: 0.2 }}>
    {children}{required && <span style={{ color: T.danger, marginLeft: 3 }}>*</span>}
  </label>
);

const inputStyle = {
  width: '100%', height: 40, padding: '0 12px',
  border: `1px solid ${T.border}`, borderRadius: 8,
  fontSize: 13, color: T.text, background: T.surface,
  outline: 'none', boxSizing: 'border-box',
};

export default function TaskCreatePage() {
  const navigate = useNavigate();
  const employees = useEmployeeStore((s) => s.employees);
  const crops = useCropStore((s) => s.crops);
  const zones = useZoneStore((s) => s.zones);
  const addTask = useTaskStore((s) => s.addTask);

  const [form, setForm] = useState({
    title: '', workerId: '', cropId: '', zoneId: '', rowRange: '',
    taskType: '', date: new Date().toISOString().split('T')[0],
    estimatedMinutes: '', description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const canSubmit = form.title && form.workerId && form.taskType && form.cropId && form.zoneId && form.date;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await addTask({
        title: form.title,
        workerId: form.workerId,
        cropId: form.cropId,
        zoneId: form.zoneId,
        rowRange: form.rowRange,
        taskType: form.taskType,
        date: form.date,
        estimatedMinutes: form.estimatedMinutes ? Number(form.estimatedMinutes) : null,
        description: form.description,
      });
      navigate('/admin/tasks');
    } catch {
      setError('작업 등록에 실패했습니다. 다시 시도해 주세요.');
      setSubmitting(false);
    }
  };

  const activeWorkers = employees.filter((e) => e.isActive !== false);

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, minWidth: 0 }}>
      <TopBar
        subtitle="작업 관리"
        title="작업 생성"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigate('/admin/tasks')} style={{
              height: 36, padding: '0 14px', borderRadius: 8,
              background: T.surface, border: `1px solid ${T.border}`, color: T.text,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>취소</button>
            <button onClick={handleSubmit} disabled={!canSubmit || submitting} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              height: 36, padding: '0 14px', borderRadius: 8,
              background: T.primary, color: '#fff', border: 0,
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(79,70,229,0.25)',
              opacity: (!canSubmit || submitting) ? 0.6 : 1,
            }}>
              <Icon d={icons.check} size={14} c="#fff" sw={2.4} />
              {submitting ? '등록 중...' : '작업 등록'}
            </button>
          </div>
        }
      />

      <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
        <Card pad={24}>
          <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${T.borderSoft}` }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0, marginBottom: 4 }}>새 작업 등록</h2>
            <p style={{ fontSize: 12, color: T.mutedSoft, margin: 0 }}>작업 정보를 입력하고 담당자를 배정하세요</p>
          </div>

          {error && (
            <div style={{ marginBottom: 16, padding: '10px 14px', background: T.dangerSoft, borderRadius: 8, fontSize: 12, color: T.danger, fontWeight: 600 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <Label required>작업명</Label>
              <input value={form.title} onChange={set('title')}
                placeholder="예: A동 토마토 수확 작업"
                style={inputStyle} />
            </div>

            <div>
              <Label required>담당 작업자</Label>
              <select value={form.workerId} onChange={set('workerId')} style={inputStyle}>
                <option value="">선택하세요</option>
                {activeWorkers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>

            <div>
              <Label required>작업 유형</Label>
              <select value={form.taskType} onChange={set('taskType')} style={inputStyle}>
                <option value="">선택하세요</option>
                {TASK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <Label required>작물</Label>
              <select value={form.cropId} onChange={set('cropId')} style={inputStyle}>
                <option value="">선택하세요</option>
                {crops.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <Label required>구역</Label>
              <select value={form.zoneId} onChange={set('zoneId')} style={inputStyle}>
                <option value="">선택하세요</option>
                {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>

            <div>
              <Label>열 범위</Label>
              <input value={form.rowRange} onChange={set('rowRange')}
                placeholder="예: 1-8열" style={inputStyle} />
            </div>

            <div>
              <Label required>작업 날짜</Label>
              <input type="date" value={form.date} onChange={set('date')} style={inputStyle} />
            </div>

            <div>
              <Label>예상 소요 시간 (분)</Label>
              <input type="number" value={form.estimatedMinutes} onChange={set('estimatedMinutes')}
                placeholder="예: 120" style={inputStyle} />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <Label>설명</Label>
              <textarea value={form.description} onChange={set('description')}
                rows={4} placeholder="작업에 대한 추가 설명 (선택)"
                style={{ ...inputStyle, height: 'auto', padding: 12, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
            </div>
          </div>
        </Card>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button onClick={() => navigate('/admin/tasks')} style={{
            height: 40, padding: '0 18px', borderRadius: 8,
            background: T.surface, border: `1px solid ${T.border}`, color: T.text,
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>취소</button>
          <button onClick={handleSubmit} disabled={!canSubmit || submitting} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            height: 40, padding: '0 20px', borderRadius: 8,
            background: T.primary, color: '#fff', border: 0,
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(79,70,229,0.25)',
            opacity: (!canSubmit || submitting) ? 0.6 : 1,
          }}>
            <Icon d={icons.check} size={14} c="#fff" sw={2.4} />
            {submitting ? '등록 중...' : '작업 등록'}
          </button>
        </div>
      </div>
    </div>
  );
}

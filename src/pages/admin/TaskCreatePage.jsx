// 작업 생성 — 관리자
// 경로: /admin/tasks/new

import React, { useState } from 'react';
import {
  Card, Icon, T, TopBar, btnSecondary, btnPrimary, icons,
} from '../../design/primitives';

const CROPS = ['토마토', '딸기', '파프리카', '오이', '가지'];
const ZONES = ['1cmp', '2cmp', '3cmp', '4cmp'];
const TASK_TYPES = ['수확', '적엽', '유인', '정식', '적화', '적과', '줄 내리기', '측지제거', '선별·포장', '방제'];
const WORKERS = ['김작업', '이성실', '박정연', '최민호', '정다영'];

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

export default function TaskCreatePage({ onCancel, onSubmit }) {
  const [form, setForm] = useState({
    title: '', worker: '', crop: '', zone: '', rowRange: '',
    taskType: '', date: new Date().toISOString().split('T')[0],
    estimatedMinutes: '', quantity: '', description: '',
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, minWidth: 0 }}>
      <TopBar
        subtitle="작업 관리"
        title="작업 생성"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onCancel} style={{
              height: 36, padding: '0 14px', borderRadius: 8,
              background: T.surface, border: `1px solid ${T.border}`, color: T.text,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>취소</button>
            <button onClick={() => onSubmit?.(form)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              height: 36, padding: '0 14px', borderRadius: 8,
              background: T.primary, color: '#fff', border: 0,
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(79,70,229,0.25)',
            }}>
              <Icon d={icons.check} size={14} c="#fff" sw={2.4} />
              작업 등록
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <Label required>작업명</Label>
              <input value={form.title} onChange={set('title')}
                placeholder="예: A동 토마토 수확 작업"
                style={inputStyle} />
            </div>

            <div>
              <Label required>담당 작업자</Label>
              <select value={form.worker} onChange={set('worker')} style={inputStyle}>
                <option value="">선택하세요</option>
                {WORKERS.map((w) => <option key={w} value={w}>{w}</option>)}
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
              <select value={form.crop} onChange={set('crop')} style={inputStyle}>
                <option value="">선택하세요</option>
                {CROPS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <Label required>구역</Label>
              <select value={form.zone} onChange={set('zone')} style={inputStyle}>
                <option value="">선택하세요</option>
                {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
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

            <div>
              <Label>수량 (선택)</Label>
              <input type="number" value={form.quantity} onChange={set('quantity')}
                placeholder="예: 50" style={inputStyle} />
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
          <button onClick={onCancel} style={{
            height: 40, padding: '0 18px', borderRadius: 8,
            background: T.surface, border: `1px solid ${T.border}`, color: T.text,
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>취소</button>
          <button onClick={() => onSubmit?.(form)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            height: 40, padding: '0 20px', borderRadius: 8,
            background: T.primary, color: '#fff', border: 0,
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(79,70,229,0.25)',
          }}>
            <Icon d={icons.check} size={14} c="#fff" sw={2.4} />
            작업 등록
          </button>
        </div>
      </div>
    </div>
  );
}

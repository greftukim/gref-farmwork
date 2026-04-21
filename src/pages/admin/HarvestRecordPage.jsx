// 수확 기록 관리 — 관리자
// 경로: /admin/harvest

import React, { useState } from 'react';
import {
  Avatar, Card, Icon, Pill, T, TopBar, icons,
} from '../../design/primitives';

const CROPS = ['토마토', '딸기', '파프리카', '오이', '가지'];
const WORKERS = ['김작업', '이성실', '박정연', '최민호', '정다영'];

const inputStyle = {
  height: 40, padding: '0 12px',
  border: `1px solid ${T.border}`, borderRadius: 8,
  fontSize: 13, color: T.text, background: T.surface,
  outline: 'none', boxSizing: 'border-box', width: '100%',
};

const Label = ({ children }) => (
  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 6 }}>{children}</label>
);

export default function HarvestRecordPage() {
  const [form, setForm] = useState({
    worker: '', crop: '', date: new Date().toISOString().split('T')[0], quantity: '',
  });
  const [records, setRecords] = useState([
    { id: 1, date: '2026-04-20', worker: '김작업', crop: '토마토', quantity: 48.5, createdAt: '2026-04-20T09:12:00' },
    { id: 2, date: '2026-04-20', worker: '이성실', crop: '딸기', quantity: 22.0, createdAt: '2026-04-20T10:45:00' },
    { id: 3, date: '2026-04-19', worker: '박정연', crop: '파프리카', quantity: 31.2, createdAt: '2026-04-19T14:20:00' },
  ]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const add = () => {
    if (!form.worker || !form.crop || !form.quantity) return;
    setRecords([{
      id: Date.now(),
      ...form,
      quantity: Number(form.quantity),
      createdAt: new Date().toISOString(),
    }, ...records]);
    setForm({ worker: '', crop: '', date: new Date().toISOString().split('T')[0], quantity: '' });
  };

  const totalKg = records.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayKg = records.filter((r) => r.date === todayStr).reduce((s, r) => s + Number(r.quantity), 0);

  const fmtAgo = (iso) => {
    const m = Math.floor((Date.now() - new Date(iso)) / 60000);
    if (m < 1) return '방금';
    if (m < 60) return `${m}분 전`;
    if (m < 1440) return `${Math.floor(m / 60)}시간 전`;
    return `${Math.floor(m / 1440)}일 전`;
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, minWidth: 0 }}>
      <TopBar subtitle="수확 관리" title="수확 기록" />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { l: '오늘 수확량', v: todayKg.toFixed(1), unit: 'kg', tone: T.success, soft: T.successSoft },
            { l: '누적 수확량', v: totalKg.toFixed(1), unit: 'kg', tone: T.primary, soft: T.primarySoft },
            { l: '기록 건수', v: records.length, unit: '건', tone: T.info, soft: T.infoSoft },
          ].map((k, i) => (
            <Card key={i} pad={18} style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.tone }} />
              <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginBottom: 14 }}>{k.l}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 36, fontWeight: 700, color: T.text, letterSpacing: -1, lineHeight: 1, fontFamily: 'ui-monospace,monospace' }}>{k.v}</span>
                <span style={{ fontSize: 14, color: T.mutedSoft, fontWeight: 500 }}>{k.unit}</span>
              </div>
            </Card>
          ))}
        </div>

        {/* 빠른 입력 */}
        <Card pad={20}>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: T.successSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon d={icons.plus} size={14} c={T.success} sw={2.4} />
            </div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>빠른 입력</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1.3fr auto', gap: 10, alignItems: 'end' }}>
            <div>
              <Label>작업자</Label>
              <select value={form.worker} onChange={set('worker')} style={inputStyle}>
                <option value="">선택</option>
                {WORKERS.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div>
              <Label>작물</Label>
              <select value={form.crop} onChange={set('crop')} style={inputStyle}>
                <option value="">선택</option>
                {CROPS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label>날짜</Label>
              <input type="date" value={form.date} onChange={set('date')} style={inputStyle} />
            </div>
            <div>
              <Label>수량 (kg)</Label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                <input type="number" step="0.1" value={form.quantity} onChange={set('quantity')}
                  placeholder="0.0"
                  style={{
                    ...inputStyle, height: 44, fontSize: 18, fontWeight: 700,
                    fontFamily: 'ui-monospace,monospace', letterSpacing: -0.3,
                    paddingRight: 50, textAlign: 'right',
                  }} />
                <span style={{
                  marginLeft: -42, width: 36, pointerEvents: 'none',
                  fontSize: 12, fontWeight: 700, color: T.mutedSoft, textAlign: 'center',
                }}>kg</span>
              </div>
            </div>
            <button onClick={add}
              disabled={!form.worker || !form.crop || !form.quantity}
              style={{
                height: 44, padding: '0 18px', borderRadius: 8, border: 0,
                background: T.success, color: '#fff',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                opacity: (!form.worker || !form.crop || !form.quantity) ? 0.5 : 1,
                display: 'inline-flex', alignItems: 'center', gap: 6,
                boxShadow: '0 1px 2px rgba(5,150,105,0.25)',
              }}>
              <Icon d={icons.plus} size={13} c="#fff" sw={2.4} />
              기록 추가
            </button>
          </div>
        </Card>

        {/* 기록 테이블 */}
        <Card pad={0}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.borderSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>최근 수확 기록 ({records.length})</div>
          </div>
          {records.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: T.mutedSoft, fontSize: 13 }}>
              수확 기록이 없습니다
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: T.bg, textAlign: 'left', color: T.mutedSoft, fontSize: 11, fontWeight: 700, letterSpacing: 0.3 }}>
                  <th style={{ padding: '10px 20px' }}>날짜</th>
                  <th style={{ padding: '10px 12px' }}>작업자</th>
                  <th style={{ padding: '10px 12px' }}>작물</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>수량</th>
                  <th style={{ padding: '10px 20px', textAlign: 'right' }}>등록</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={r.id} style={{ borderTop: i ? `1px solid ${T.borderSoft}` : 'none' }}>
                    <td style={{ padding: '12px 20px', color: T.text, fontWeight: 600, fontFamily: 'ui-monospace,monospace' }}>{r.date}</td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={r.worker} color="indigo" size={28} />
                        <span style={{ fontWeight: 600, color: T.text }}>{r.worker}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Pill tone="success">{r.crop}</Pill>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: T.text, fontFamily: 'ui-monospace,monospace' }}>
                        {Number(r.quantity).toFixed(1)}
                      </span>
                      <span style={{ fontSize: 11, color: T.mutedSoft, marginLeft: 3 }}>kg</span>
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'right', color: T.mutedSoft, fontSize: 11 }}>{fmtAgo(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}

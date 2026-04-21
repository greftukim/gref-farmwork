// 생육조사 관리 — /admin/growth-survey
import React, { useMemo, useState } from 'react';
import { Avatar, Card, Dot, Icon, Pill, T, TopBar, icons } from '../../design/primitives';
import useGrowthSurveyStore from '../../stores/growthSurveyStore';
import useEmployeeStore from '../../stores/employeeStore';

export default function GrowthSurveyAdminPage() {
  const surveys = useGrowthSurveyStore((s) => s.surveys);
  const employees = useEmployeeStore((s) => s.employees);
  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);

  const [q, setQ] = useState('');
  const [cropFilter, setCropFilter] = useState('all');

  const crops = useMemo(() => Array.from(new Set((surveys || []).map((s) => s.crop))).filter(Boolean), [surveys]);

  const filtered = useMemo(() => {
    const s = q.trim();
    return (surveys || [])
      .filter((x) => cropFilter === 'all' || x.crop === cropFilter)
      .filter((x) => !s || (empMap[x.surveyorId]?.name || '').includes(s) || (x.markerId || '').includes(s))
      .sort((a, b) => (b.surveyDate || '').localeCompare(a.surveyDate || ''));
  }, [surveys, cropFilter, q, empMap]);

  const avgHeight = useMemo(() => {
    const arr = filtered.map((r) => r.plantHeight).filter((v) => v != null);
    return arr.length ? (arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(1) : '—';
  }, [filtered]);

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, minWidth: 0 }}>
      <TopBar subtitle="생육조사" title="생육조사 기록" />
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { l: '총 조사 건', v: filtered.length, tone: T.primary },
            { l: '평균 초장', v: avgHeight, unit: 'cm', tone: T.success },
            { l: '조사 인원', v: new Set(filtered.map((r) => r.surveyorId)).size, unit: '명', tone: T.info },
          ].map((k, i) => (
            <Card key={i} pad={18} style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.tone }} />
              <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginBottom: 14 }}>{k.l}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 36, fontWeight: 700, color: T.text, letterSpacing: -1, lineHeight: 1, fontFamily: 'ui-monospace,monospace' }}>{k.v}</span>
                {k.unit && <span style={{ fontSize: 14, color: T.mutedSoft, fontWeight: 500 }}>{k.unit}</span>}
              </div>
            </Card>
          ))}
        </div>

        <Card pad={14} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select value={cropFilter} onChange={(e) => setCropFilter(e.target.value)}
            style={{ height: 34, padding: '0 10px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 13, minWidth: 120 }}>
            <option value="all">전체 작물</option>
            {crops.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, flex: 1, maxWidth: 260, marginLeft: 'auto' }}>
            <Icon d={icons.search} size={14} c={T.mutedSoft} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="조사자·표식주 검색" style={{ border: 0, background: 'transparent', outline: 'none', flex: 1, fontSize: 13 }} />
          </div>
        </Card>

        <Card pad={0}>
          {filtered.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: T.mutedSoft, fontSize: 13 }}>조사 기록이 없습니다</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: T.bg, textAlign: 'left', color: T.mutedSoft, fontSize: 11, fontWeight: 700, letterSpacing: 0.3 }}>
                  <th style={{ padding: '10px 20px' }}>조사일</th>
                  <th style={{ padding: '10px 12px' }}>표식주</th>
                  <th style={{ padding: '10px 12px' }}>작물</th>
                  <th style={{ padding: '10px 12px' }}>조사자</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>초장</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>엽수</th>
                  <th style={{ padding: '10px 20px', textAlign: 'right' }}>화방</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const emp = empMap[r.surveyorId];
                  return (
                    <tr key={r.id || i} style={{ borderTop: i ? `1px solid ${T.borderSoft}` : 'none' }}>
                      <td style={{ padding: '12px 20px', color: T.text, fontWeight: 600, fontFamily: 'ui-monospace,monospace' }}>{r.surveyDate}</td>
                      <td style={{ padding: '12px', fontFamily: 'ui-monospace,monospace', color: T.primary, fontWeight: 600 }}>{r.markerId}</td>
                      <td style={{ padding: '12px' }}><Pill tone="success">{r.crop}</Pill></td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar name={emp?.name || '?'} color="indigo" size={26} />
                          <span style={{ fontWeight: 500, color: T.text }}>{emp?.name || '—'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'ui-monospace,monospace', fontWeight: 700, color: T.text }}>{r.plantHeight ?? '—'}<span style={{ fontSize: 10, color: T.mutedSoft, marginLeft: 3 }}>cm</span></td>
                      <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'ui-monospace,monospace', color: T.text }}>{r.leafCount ?? '—'}</td>
                      <td style={{ padding: '12px 20px', textAlign: 'right', fontFamily: 'ui-monospace,monospace', color: T.text }}>{r.flowerCluster ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}

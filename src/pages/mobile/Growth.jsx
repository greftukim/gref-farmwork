import React, { useState } from 'react';
import { GROWTH_SCHEMA, GR_DATA, STANDARD_CURVE } from '../../data/growth';
import { Icon, Pill, T, icons } from '../../design/primitives';

// 생육조사 — 모바일 현장 입력 (반장용, 단독 화면)
// 4탭이 아닌 단독 풀스크린. 헤더 + 표식주 목록 → 입력 폼

function MobileGrowthScreen({ defaultMode = 'list' }) {
  const [mode, setMode] = useState(defaultMode); // list | input
  const crop = '토마토';
  const plants = GR_DATA.markerPlants.filter(p => p.crop === crop);
  const schema = GROWTH_SCHEMA[crop].filter(s => s.type !== 'derived');
  const curve = STANDARD_CURVE[crop];
  const weekIdx = GR_DATA.currentWeek - 1;

  if (mode === 'input') {
    const p = plants[0];
    return (
      <div style={{ background: '#F2F2F7', height: '100%', overflow: 'auto', fontFamily: '-apple-system, Pretendard, system-ui', paddingBottom: 80 }}>
        {/* 헤더 */}
        <div style={{ background: T.surface, padding: '16px 16px 14px', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <button onClick={() => setMode('list')} style={{ width: 32, height: 32, borderRadius: 8, background: T.bg, border: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon d={icons.chevLeft} size={16} c={T.text} sw={2} />
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: T.mutedSoft }}>{crop} · {p.bed}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: T.text, fontFamily: 'ui-monospace, monospace', letterSpacing: -0.3 }}>{p.id}</div>
            </div>
            <Pill tone={p.health === 'good' ? 'success' : 'warning'}>{p.health === 'good' ? '양호' : '주의'}</Pill>
          </div>
          <div style={{ display: 'flex', gap: 6, fontSize: 10, color: T.mutedSoft }}>
            <span style={{ padding: '3px 8px', background: T.bg, borderRadius: 4 }}>작기 {GR_DATA.currentWeek}주차</span>
            <span style={{ padding: '3px 8px', background: T.bg, borderRadius: 4 }}>{GR_DATA.date} 입력</span>
          </div>
        </div>

        {/* 진행률 바 */}
        <div style={{ padding: '12px 16px', background: T.surface, borderBottom: `1px solid ${T.borderSoft}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.muted, fontWeight: 600, marginBottom: 4 }}>
            <span>입력 진행</span>
            <span style={{ color: T.primary }}>3 / {schema.length}</span>
          </div>
          <div style={{ height: 4, background: T.borderSoft, borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${3 / schema.length * 100}%`, height: '100%', background: T.primary }} />
          </div>
        </div>

        {/* 입력 카드들 */}
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {schema.slice(0, 6).map((s, i) => {
            const target = curve[s.key]?.[weekIdx];
            const last = p.last[s.key];
            const done = i < 3;
            return (
              <div key={s.key} style={{
                background: T.surface, borderRadius: 14, padding: 16,
                border: done ? `1.5px solid ${T.success}` : `1px solid ${T.border}`,
                boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>
                      {done && <span style={{ marginRight: 6, color: T.success }}>✓</span>}
                      {s.label}
                    </div>
                    <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 2 }}>
                      지난주 {last}{s.unit} · 목표 {target}{s.unit}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, fontSize: 11, color: T.mutedSoft, fontWeight: 600 }}>
                    <span>{s.unit}</span>
                  </div>
                </div>
                {/* 큰 입력 필드 */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: done ? T.successSoft : T.bg, borderRadius: 10, padding: '4px 6px',
                }}>
                  <button style={{
                    width: 40, height: 40, borderRadius: 8, border: 0,
                    background: T.surface, fontSize: 20, fontWeight: 700, color: T.text,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                  }}>−</button>
                  <input
                    type="number" step={s.step}
                    defaultValue={done ? (last + (i === 0 ? 0.5 : 0)).toFixed(s.step < 1 ? 1 : 0) : ''}
                    placeholder={done ? '' : '입력'}
                    style={{
                      flex: 1, textAlign: 'center', fontSize: 28, fontWeight: 700, color: T.text,
                      background: 'transparent', border: 0, outline: 'none', padding: '10px 0',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  />
                  <button style={{
                    width: 40, height: 40, borderRadius: 8, border: 0,
                    background: T.surface, fontSize: 20, fontWeight: 700, color: T.text,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                  }}>+</button>
                </div>
                {i === 3 && (
                  <div style={{ marginTop: 10, padding: 10, background: T.warningSoft, borderRadius: 8, fontSize: 11, color: T.warning, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>⚠</span>
                    <span style={{ color: T.text }}>지난주 대비 큰 변화가 감지되었습니다. 값을 다시 확인해 주세요.</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* 사진 첨부 */}
          <div style={{ background: T.surface, borderRadius: 14, padding: 16, border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 10 }}>사진 첨부 (선택)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <div style={{ aspectRatio: '1', background: `linear-gradient(135deg, #A7F3D0, #34D399)`, borderRadius: 10 }} />
              <div style={{ aspectRatio: '1', background: T.bg, border: `2px dashed ${T.border}`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon d={icons.camera} size={24} c={T.mutedSoft} />
              </div>
              <div style={{ aspectRatio: '1', background: T.bg, border: `2px dashed ${T.border}`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 20, color: T.mutedSoft }}>+</span>
              </div>
            </div>
          </div>

          {/* 이상 체크 */}
          <div style={{ background: T.surface, borderRadius: 14, padding: 16, border: `1px solid ${T.border}` }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <span style={{ width: 22, height: 22, borderRadius: 6, background: T.surface, border: `2px solid ${T.border}` }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>이상 개체로 기록</span>
            </label>
          </div>
        </div>

        {/* 하단 고정 액션 */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: T.surface, padding: 14, borderTop: `1px solid ${T.border}`, display: 'flex', gap: 8 }}>
          <button style={{ flex: 1, padding: '14px 0', borderRadius: 12, background: T.bg, border: `1px solid ${T.border}`, fontSize: 14, fontWeight: 700, color: T.muted }}>
            임시저장
          </button>
          <button style={{ flex: 2, padding: '14px 0', borderRadius: 12, background: T.primary, border: 0, fontSize: 14, fontWeight: 700, color: '#fff' }}>
            다음 표식주 →
          </button>
        </div>
      </div>
    );
  }

  // ─── 리스트 모드 ───
  return (
    <div style={{ background: '#F2F2F7', height: '100%', overflow: 'auto', fontFamily: '-apple-system, Pretendard, system-ui', paddingBottom: 20 }}>
      {/* 헤더 */}
      <div style={{ background: `linear-gradient(160deg, ${T.primary} 0%, ${T.primaryDark} 100%)`, color: '#fff', padding: '16px 20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <button style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: 0 }}>
            <Icon d={icons.chevLeft} size={16} c="#fff" sw={2} />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, opacity: 0.85 }}>생육조사</div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.3 }}>이번 주 표식주 기록</div>
          </div>
        </div>
        {/* KPI */}
        <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '12px 14px', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>작기 주차</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{GR_DATA.currentWeek}주차</div>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.2)' }} />
          <div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>완료</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>3<span style={{ fontSize: 12, opacity: 0.7 }}>/{plants.length}</span></div>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.2)' }} />
          <div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>이상</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>1<span style={{ fontSize: 12, opacity: 0.7 }}>건</span></div>
          </div>
        </div>
      </div>

      {/* 작물 탭 */}
      <div style={{ padding: '14px 16px 10px', display: 'flex', gap: 8, overflow: 'auto' }}>
        {GR_DATA.crops.map(c => {
          const on = c.name === crop;
          return (
            <button key={c.id} style={{
              padding: '8px 14px', fontSize: 13, fontWeight: 700, borderRadius: 999, whiteSpace: 'nowrap',
              border: `1px solid ${on ? T.primary : T.border}`,
              background: on ? T.primary : T.surface,
              color: on ? '#fff' : T.muted,
            }}>{c.name} <span style={{ opacity: on ? 0.8 : 0.6, fontSize: 11, marginLeft: 4, fontWeight: 500 }}>{c.surveyPlants}</span></button>
          );
        })}
      </div>

      {/* 표식주 카드 리스트 */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {plants.map((p, i) => {
          const done = i < 3;
          return (
            <div key={p.id} onClick={() => setMode('input')} style={{
              background: T.surface, borderRadius: 14, padding: 14,
              border: `1px solid ${done ? T.successSoft : T.border}`,
              display: 'flex', alignItems: 'center', gap: 12,
              boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                background: done ? T.successSoft : T.bg,
                color: done ? T.success : T.muted,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: done ? 20 : 14, fontWeight: 700,
              }}>
                {done ? '✓' : i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: 'ui-monospace, monospace' }}>{p.id}</span>
                  {p.health === 'warn' && <Pill tone="warning" size="sm">주의</Pill>}
                </div>
                <div style={{ fontSize: 11, color: T.mutedSoft }}>
                  {p.bed} · {p.row} · {p.no}번
                  {done && <span style={{ marginLeft: 6, color: T.success, fontWeight: 600 }}>· 완료</span>}
                </div>
              </div>
              <Icon d={icons.chevRight} size={16} c={T.mutedSoft} />
            </div>
          );
        })}
      </div>

      {/* 하단 빠른 기록 */}
      <div style={{ padding: 16 }}>
        <button style={{
          width: '100%', padding: '14px 0', borderRadius: 14,
          background: T.surface, border: `1.5px dashed ${T.border}`,
          fontSize: 13, fontWeight: 700, color: T.muted,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <Icon d={icons.camera} size={16} c={T.muted} sw={2} />
          이상 개체 즉시 보고 (사진 첨부)
        </button>
      </div>
    </div>
  );
}
export { MobileGrowthScreen };

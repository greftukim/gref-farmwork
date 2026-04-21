import React from 'react';
import { Icon, icons } from '../../design/primitives';
import { AdminMobileShell, MA, StatTile, CardBlock, Chip } from './AdminMobile';

// ═══════════════════════════════════════════════════════════
// ③ 승인 탭 — Tinder식 스와이프 카드
// ═══════════════════════════════════════════════════════════
function MobileApprovalScreen({ role = 'farm' }) {
  return (
    <AdminMobileShell role={role} active="approve">
      {({ accent }) => (
        <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* 헤더 */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: MA.text, letterSpacing: -0.4 }}>승인 대기</div>
              <div style={{ fontSize: 12, color: MA.muted, marginTop: 2 }}>7건 남음 · 스와이프로 빠른 처리</div>
            </div>
            <div style={{ flex: 1 }} />
            <button style={{ padding: '7px 11px', borderRadius: 9, background: MA.card, border: `1px solid ${MA.border}`, fontSize: 11, fontWeight: 600, color: MA.text, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Icon d={icons.filter} size={12} c={MA.text} sw={2} />
              필터
            </button>
          </div>

          {/* 유형 필터 칩 */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
            {['전체 7', '휴가 3', '연장 2', 'TBM 1', '경조사 1'].map((t, i) => (
              <span key={i} style={{
                padding: '6px 12px', borderRadius: 999, whiteSpace: 'nowrap',
                background: i === 0 ? MA.text : MA.card, color: i === 0 ? '#fff' : MA.muted,
                fontSize: 12, fontWeight: 600, border: i === 0 ? 'none' : `1px solid ${MA.border}`,
              }}>{t}</span>
            ))}
          </div>

          {/* 카드 스택 */}
          <div style={{ position: 'relative', height: 410, marginTop: 4 }}>
            {/* 뒤 카드 2개 */}
            <ApprovalCard stackIdx={2} data={{ type: '연장근무', who: '최수민', branch: '부산LAB' }} accent={accent} />
            <ApprovalCard stackIdx={1} data={{ type: '휴가', who: '정수아', branch: '부산LAB' }} accent={accent} />
            {/* 최상단 카드 */}
            <ApprovalCard stackIdx={0} accent={accent} data={{
              type: '연차 휴가',
              who: '김민국',
              role: '반장 · A동',
              branch: '부산LAB',
              date: '2026.04.28 (화) — 2026.04.30 (목)',
              days: 3,
              reason: '가족 경조사로 인한 연차 사용 요청드립니다. 업무 인수인계는 이영희 반장에게 완료했습니다.',
              balance: { used: 4, total: 15 },
              submitted: '2시간 전',
            }} />
          </div>

          {/* 액션 버튼 */}
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '10px 30px', marginTop: 2 }}>
            <button style={{
              width: 52, height: 52, borderRadius: 999, border: `2px solid ${MA.danger}`,
              background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(220,38,38,0.15)',
            }}>
              <Icon d="M18 6L6 18M6 6l12 12" size={22} c={MA.danger} sw={2.4} />
            </button>
            <button style={{
              width: 44, height: 44, borderRadius: 999, border: `1.5px solid ${MA.border}`,
              background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon d={icons.chat} size={18} c={MA.muted} sw={2} />
            </button>
            <button style={{
              width: 52, height: 52, borderRadius: 999, border: 'none',
              background: MA.success, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
            }}>
              <Icon d={icons.check} size={22} c="#fff" sw={2.6} />
            </button>
          </div>

          {/* 하단 가이드 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: MA.mutedSoft, padding: '0 22px' }}>
            <span>← 반려</span>
            <span>댓글</span>
            <span>승인 →</span>
          </div>
        </div>
      )}
    </AdminMobileShell>
  );
}

// 승인 카드 컴포넌트
const ApprovalCard = ({ data, stackIdx = 0, accent }) => {
  const isTop = stackIdx === 0;
  const scale = 1 - stackIdx * 0.04;
  const offsetY = stackIdx * 8;
  const opacity = 1 - stackIdx * 0.25;
  const toneByType = (t) => {
    if (t.includes('휴가') || t.includes('연차')) return { bg: '#DBEAFE', fg: '#1D4ED8', label: '휴가' };
    if (t.includes('연장')) return { bg: '#FEF3C7', fg: '#B45309', label: '연장' };
    if (t.includes('TBM')) return { bg: '#E0E7FF', fg: '#4338CA', label: 'TBM' };
    return { bg: '#F1F5F9', fg: MA.muted, label: '기타' };
  };
  const tone = toneByType(data.type);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: MA.card, borderRadius: 18,
      boxShadow: isTop ? '0 20px 40px rgba(15,23,42,0.15), 0 4px 10px rgba(15,23,42,0.08)' : '0 6px 20px rgba(15,23,42,0.08)',
      padding: isTop ? 20 : 0,
      transform: `scale(${scale}) translateY(${offsetY}px)`,
      opacity,
      zIndex: 10 - stackIdx,
      overflow: 'hidden',
    }}>
      {!isTop ? null : (
        <>
          {/* 상단 배지 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ padding: '4px 10px', borderRadius: 999, background: tone.bg, color: tone.fg, fontSize: 11, fontWeight: 700 }}>{tone.label}</span>
            <span style={{ fontSize: 11, color: MA.mutedSoft }}>· {data.branch}</span>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: MA.mutedSoft }}>{data.submitted}</span>
          </div>

          {/* 제목 & 작성자 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 999, background: accent, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 700, letterSpacing: -0.3,
            }}>{data.who.charAt(0)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: MA.text, letterSpacing: -0.3 }}>{data.who}</div>
              <div style={{ fontSize: 11, color: MA.muted, marginTop: 2 }}>{data.role}</div>
            </div>
          </div>

          <div style={{ height: 1, background: MA.divider, margin: '0 -20px 14px' }} />

          {/* 내용 블록 */}
          <div style={{ fontSize: 20, fontWeight: 700, color: MA.text, letterSpacing: -0.4, marginBottom: 4 }}>{data.type}</div>
          <div style={{ fontSize: 13, color: MA.text, fontWeight: 600, marginBottom: 12 }}>{data.date}</div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <div style={{ flex: 1, background: MA.bg, borderRadius: 10, padding: 10 }}>
              <div style={{ fontSize: 10, color: MA.mutedSoft, fontWeight: 600 }}>신청 일수</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: MA.text, marginTop: 2 }}>{data.days}<span style={{ fontSize: 11, color: MA.muted, fontWeight: 600, marginLeft: 3 }}>일</span></div>
            </div>
            <div style={{ flex: 1, background: MA.bg, borderRadius: 10, padding: 10 }}>
              <div style={{ fontSize: 10, color: MA.mutedSoft, fontWeight: 600 }}>잔여 연차</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: MA.text, marginTop: 2 }}>{data.balance.total - data.balance.used}<span style={{ fontSize: 11, color: MA.muted, fontWeight: 600, marginLeft: 3 }}>/ {data.balance.total}</span></div>
            </div>
          </div>

          {/* 사유 */}
          <div style={{ background: MA.bg, borderRadius: 10, padding: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: MA.mutedSoft, fontWeight: 600, marginBottom: 4 }}>사유</div>
            <div style={{ fontSize: 12, color: MA.text, lineHeight: 1.55 }}>{data.reason}</div>
          </div>

          {/* 가이드 */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
            background: '#F0FDF4', borderRadius: 8,
          }}>
            <Icon d={icons.check} size={12} c={MA.success} sw={2.4} />
            <span style={{ fontSize: 11, color: '#065F46', fontWeight: 600 }}>동일 기간 다른 휴가 겹치지 않음</span>
          </div>
        </>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// ④ 평면도 탭 — 모바일 핀치줌 뷰
// ═══════════════════════════════════════════════════════════
function MobileFloorScreen({ role = 'farm' }) {
  return (
    <AdminMobileShell role={role} active="floor">
      {({ accent }) => (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* 동 선택 탭 */}
          <div style={{
            background: MA.card, borderBottom: `1px solid ${MA.border}`,
            padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
          }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: MA.text, letterSpacing: -0.3 }}>실시간 현황</div>
            <div style={{ flex: 1 }} />
            <div style={{
              padding: '5px 10px', borderRadius: 999, background: '#F0FDF4',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: MA.success }} />
              <span style={{ fontSize: 10, color: '#065F46', fontWeight: 700 }}>실시간</span>
            </div>
          </div>

          <div style={{ padding: '10px 14px 0', display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0 }}>
            {['1cmp', '2cmp', '3cmp', '4cmp'].map((d, i) => (
              <span key={d} style={{
                padding: '7px 14px', borderRadius: 999, whiteSpace: 'nowrap',
                background: i === 0 ? accent : MA.card, color: i === 0 ? '#fff' : MA.muted,
                fontSize: 12, fontWeight: 700, border: i === 0 ? 'none' : `1px solid ${MA.border}`,
              }}>{d}</span>
            ))}
          </div>

          {/* KPI */}
          <div style={{ padding: '10px 14px 8px', display: 'flex', gap: 6, flexShrink: 0 }}>
            <StatTile label="작업중" value="6" sub="골 기준" tone="primary" accent={accent} />
            <StatTile label="일시정지" value="1" sub="휴식 중" tone="warning" accent={accent} />
            <StatTile label="완료" value="8" sub="오늘 / 10골" tone="success" accent={accent} />
          </div>

          {/* 평면도 (핀치줌 영역) */}
          <div style={{ padding: '0 14px', flexShrink: 0 }}>
            <div style={{
              background: MA.card, borderRadius: 14, padding: 12, position: 'relative',
              height: 250, overflow: 'hidden',
            }}>
              {/* 핀치줌 안내 */}
              <div style={{
                position: 'absolute', top: 10, left: 10, zIndex: 2,
                padding: '4px 9px', borderRadius: 999, background: 'rgba(15,23,42,0.7)',
                color: '#fff', fontSize: 10, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <Icon d="M15 3h6v6M14 10l6.1-6.1M9 21H3v-6M10 14l-6.1 6.1" size={10} c="#fff" sw={2.2} />
                핀치줌 · 드래그
              </div>

              {/* 미니 평면도 SVG */}
              <MiniFloorPlan />

              {/* 하단 범례 */}
              <div style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(255,255,255,0.95)', borderRadius: 8, padding: '6px 9px', display: 'flex', gap: 10 }}>
                <LegendItem c={accent} l="작업중" />
                <LegendItem c={MA.warn} l="일시정지" />
                <LegendItem c={MA.mutedSoft} l="빈 골" />
              </div>
            </div>
          </div>

          {/* 작업 중 리스트 */}
          <div style={{ padding: '12px 14px 14px', flex: 1, overflow: 'auto' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: MA.text, marginBottom: 8 }}>현재 작업 중 (7)</div>
            <div style={{ background: MA.card, borderRadius: 14, padding: '2px 14px' }}>
              {[
                { g: '1cmp · 3골', w: '김민국', task: '적엽', p: 62, time: '43분', state: 'work' },
                { g: '1cmp · 5골', w: '이영희', task: '유인', p: 28, time: '12분', state: 'work' },
                { g: '2cmp · 2골', w: '박서준', task: '적엽', p: 85, time: '1h 12분', state: 'work' },
                { g: '2cmp · 7골', w: '최수민', task: '수확', p: 45, time: '26분', state: 'pause' },
                { g: '3cmp · 1골', w: '정수아', task: '적엽', p: 18, time: '8분', state: 'work' },
              ].map((r, i, arr) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: i < arr.length - 1 ? `1px solid ${MA.divider}` : 'none' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 999,
                    background: r.state === 'pause' ? MA.warn : accent,
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                  }}>{r.w.charAt(0)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: MA.text }}>{r.w}</span>
                      <span style={{ fontSize: 11, color: MA.muted }}>· {r.task}</span>
                      {r.state === 'pause' && <Chip tone="warn">일시정지</Chip>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: MA.muted, minWidth: 80 }}>{r.g}</span>
                      <div style={{ flex: 1, height: 4, background: MA.bg, borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ width: `${r.p}%`, height: '100%', background: r.state === 'pause' ? MA.warn : accent, borderRadius: 999 }} />
                      </div>
                      <span style={{ fontSize: 10, color: MA.mutedSoft, fontWeight: 600, width: 30, textAlign: 'right' }}>{r.p}%</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: MA.mutedSoft, fontWeight: 600 }}>{r.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AdminMobileShell>
  );
}

const LegendItem = ({ c, l }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
    <span style={{ width: 8, height: 8, borderRadius: 999, background: c }} />
    <span style={{ fontSize: 10, color: MA.muted, fontWeight: 600 }}>{l}</span>
  </div>
);

// 간소화 평면도 SVG
const MiniFloorPlan = () => {
  const gutters = 10;
  const gols = 10;
  const cellW = 14;
  const cellH = 150;
  const workerPositions = [
    { col: 2, phase: 0.6, tone: 'work' },
    { col: 4, phase: 0.3, tone: 'work' },
    { col: 6, phase: 0.85, tone: 'pause' },
    { col: 8, phase: 0.2, tone: 'work' },
  ];
  return (
    <svg viewBox="0 0 320 210" style={{ width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid meet">
      {/* 동 경계 */}
      <rect x={10} y={15} width={300} height={170} fill="none" stroke="#E5E7EB" strokeWidth="1.5" strokeDasharray="3,3" rx={6} />
      {/* 거터 + 골 교차 */}
      {Array.from({ length: gutters + gols }).map((_, i) => {
        const x = 14 + i * cellW;
        const isGutter = i % 2 === 0;
        return (
          <g key={i}>
            {isGutter ? (
              <rect x={x} y={20} width={cellW - 2} height={cellH} fill="#D1FAE5" stroke="#6EE7B7" strokeWidth="0.8" rx={2} />
            ) : (
              <rect x={x} y={20} width={cellW - 2} height={cellH} fill="#FAFAFA" stroke="#E5E7EB" strokeWidth="0.6" rx={2} />
            )}
            {isGutter && (
              <text x={x + (cellW - 2) / 2} y={16} fontSize="6" fill="#6B7280" textAnchor="middle" fontWeight="700">
                {gutters - Math.floor(i / 2)}
              </text>
            )}
          </g>
        );
      })}
      {/* 복도 (하단) */}
      <rect x={10} y={175} width={300} height={12} fill="#F3F4F6" stroke="#E5E7EB" strokeWidth="0.8" rx={2} />
      <text x={160} y={184} fontSize="7" fill="#9CA3AF" textAnchor="middle" fontWeight="600">복도</text>
      {/* 작업자 아이콘 */}
      {workerPositions.map((w, i) => {
        const x = 14 + (w.col * 2 + 1) * cellW + (cellW - 2) / 2;
        const y = 20 + (1 - w.phase) * cellH;
        const color = w.tone === 'pause' ? '#F59E0B' : '#10B981';
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={7} fill={color} stroke="#fff" strokeWidth="2" />
            <text x={x} y={y + 2.5} fontSize="7" fill="#fff" textAnchor="middle" fontWeight="700">
              {['김', '이', '최', '정'][i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

// ═══════════════════════════════════════════════════════════
// ⑤ 성과 탭 — 지표별 Top 5
// ═══════════════════════════════════════════════════════════
function MobilePerfScreen({ role = 'farm' }) {
  return (
    <AdminMobileShell role={role} active="perf">
      {({ accent }) => (
        <div style={{ padding: '12px 14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: MA.text, letterSpacing: -0.4 }}>작업자 성과</div>
              <div style={{ fontSize: 12, color: MA.muted, marginTop: 2 }}>이번 주 · 토마토 정규화 기준</div>
            </div>
          </div>

          {/* 기간·작물 필터 */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, overflowX: 'auto' }}>
            {['일', '주', '월', '분기'].map((t, i) => (
              <span key={t} style={{
                padding: '6px 14px', borderRadius: 999,
                background: i === 1 ? MA.text : MA.card, color: i === 1 ? '#fff' : MA.muted,
                fontSize: 12, fontWeight: 700, border: i === 1 ? 'none' : `1px solid ${MA.border}`,
              }}>{t}</span>
            ))}
            <div style={{ flex: 1 }} />
            <span style={{ padding: '6px 12px', borderRadius: 999, background: MA.card, border: `1px solid ${MA.border}`, fontSize: 12, fontWeight: 600, color: MA.text, whiteSpace: 'nowrap' }}>토마토 ▾</span>
          </div>

          {/* 지표 선택 */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto' }}>
            {[
              { l: '표준 효율', k: 'eff', on: true },
              { l: '시간당 주', k: 'perHr' },
              { l: '주간 거터', k: 'weekG' },
              { l: '주간 수확', k: 'weekK' },
            ].map(m => (
              <span key={m.k} style={{
                padding: '6px 12px', borderRadius: 999, whiteSpace: 'nowrap',
                background: m.on ? accent : MA.card, color: m.on ? '#fff' : MA.muted,
                fontSize: 12, fontWeight: 700, border: m.on ? 'none' : `1px solid ${MA.border}`,
              }}>{m.l}</span>
            ))}
          </div>

          {/* Top 5 카드 */}
          <CardBlock title="표준 효율 Top 5" pad={0}>
            {[
              { r: 1, n: '김민국', v: '128', u: '%', sub: '평균 114 · 부산LAB', delta: '+6' },
              { r: 2, n: '박서준', v: '122', u: '%', sub: '평균 114 · 부산LAB', delta: '+4' },
              { r: 3, n: '정수아', v: '119', u: '%', sub: '평균 114 · 진주HUB', delta: '+2' },
              { r: 4, n: '이영희', v: '115', u: '%', sub: '평균 114 · 부산LAB', delta: '+1' },
              { r: 5, n: '최수민', v: '112', u: '%', sub: '평균 114 · 하동HUB', delta: '0' },
            ].map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: i < 4 ? `1px solid ${MA.divider}` : 'none' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: p.r === 1 ? '#FEF3C7' : p.r === 2 ? '#F1F5F9' : p.r === 3 ? '#FED7AA' : MA.bg,
                  color: p.r === 1 ? '#B45309' : p.r === 2 ? MA.muted : p.r === 3 ? '#C2410C' : MA.mutedSoft,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 800, flexShrink: 0,
                }}>{p.r}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: MA.text, letterSpacing: -0.2 }}>{p.n}</div>
                  <div style={{ fontSize: 11, color: MA.muted, marginTop: 1 }}>{p.sub}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: MA.text, letterSpacing: -0.3 }}>{p.v}</span>
                    <span style={{ fontSize: 11, color: MA.muted, fontWeight: 600 }}>{p.u}</span>
                  </div>
                  <span style={{ fontSize: 10, color: MA.success, fontWeight: 700 }}>{p.delta}%p</span>
                </div>
              </div>
            ))}
          </CardBlock>

          {/* 하위 Top 5 토글 */}
          <div style={{ padding: '4px 0 8px', textAlign: 'center' }}>
            <span style={{ fontSize: 12, color: MA.muted, fontWeight: 600 }}>하위 5명 보기 ▾</span>
          </div>

          {/* 작업별 미니 차트 */}
          <CardBlock title="작업 유형별 평균 효율">
            {[
              { t: '적엽', v: 118, w: '12명' },
              { t: '수확', v: 109, w: '8명' },
              { t: '유인', v: 95, w: '15명' },
              { t: '선별·포장', v: 112, w: '5명' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 3 ? `1px solid ${MA.divider}` : 'none' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: MA.text, width: 70 }}>{r.t}</div>
                <div style={{ flex: 1, height: 6, background: MA.bg, borderRadius: 999, overflow: 'hidden', position: 'relative' }}>
                  <div style={{ width: `${Math.min(r.v, 150) / 150 * 100}%`, height: '100%', background: r.v >= 110 ? MA.success : r.v >= 100 ? accent : MA.warn, borderRadius: 999 }} />
                  <div style={{ position: 'absolute', left: `${100 / 150 * 100}%`, top: 0, bottom: 0, width: 1, background: MA.mutedSoft }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: MA.text, width: 36, textAlign: 'right' }}>{r.v}%</div>
              </div>
            ))}
          </CardBlock>
        </div>
      )}
    </AdminMobileShell>
  );
}

// ═══════════════════════════════════════════════════════════
// ⑥ 더보기 탭
// ═══════════════════════════════════════════════════════════
function MobileMoreScreen({ role = 'farm' }) {
  const isHQ = role === 'hq';
  return (
    <AdminMobileShell role={role} active="more">
      {({ accent, roleLabel }) => (
        <div style={{ padding: '12px 14px 16px' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: MA.text, letterSpacing: -0.4, marginBottom: 14 }}>더보기</div>

          {/* 프로필 카드 */}
          <div style={{ background: MA.card, borderRadius: 14, padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 999, background: accent, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 700, letterSpacing: -0.3,
            }}>{isHQ ? '이' : '박'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: MA.text }}>{isHQ ? '이차장' : '박지점장'}</div>
              <div style={{ fontSize: 12, color: MA.muted, marginTop: 2 }}>{roleLabel}</div>
            </div>
            <Icon d="M9 18l6-6-6-6" size={16} c={MA.mutedSoft} sw={2} />
          </div>

          {/* 섹션 1: 업무 */}
          <div style={{ fontSize: 11, color: MA.mutedSoft, fontWeight: 700, padding: '0 4px 6px', letterSpacing: 0.5 }}>업무</div>
          <CardBlock pad={0}>
            {[
              { l: '공지 작성 / 발송', d: icons.bell, tone: MA.blue, badge: null },
              { l: isHQ ? '지점 관리' : '작업 배정 보드', d: icons.clipboard, tone: accent, badge: null },
              { l: isHQ ? '전사 직원' : '지점 직원 관리', d: icons.users, tone: '#7C3AED', badge: '52' },
              { l: '생육조사 결과', d: icons.leaf, tone: MA.success, badge: '이번주' },
              { l: '휴가 / 근태 캘린더', d: icons.calendar, tone: '#DB2777', badge: null },
            ].map((r, i, arr) => (
              <MoreRow key={i} {...r} divider={i < arr.length - 1} />
            ))}
          </CardBlock>

          {/* 섹션 2: 알림 & 설정 */}
          <div style={{ fontSize: 11, color: MA.mutedSoft, fontWeight: 700, padding: '12px 4px 6px', letterSpacing: 0.5 }}>알림 & 설정</div>
          <CardBlock pad={0}>
            {[
              { l: '알림 인박스', d: icons.bell, tone: MA.danger, badge: '3' },
              { l: '푸시 알림 설정', d: icons.bell, tone: MA.muted, toggle: true },
              { l: '언어 / 지역', d: icons.target, tone: MA.muted, right: '한국어' },
              { l: '데이터 / 저장공간', d: icons.dashboard, tone: MA.muted, right: null },
            ].map((r, i, arr) => (
              <MoreRow key={i} {...r} divider={i < arr.length - 1} />
            ))}
          </CardBlock>

          {/* 섹션 3: 기타 */}
          <div style={{ fontSize: 11, color: MA.mutedSoft, fontWeight: 700, padding: '12px 4px 6px', letterSpacing: 0.5 }}>기타</div>
          <CardBlock pad={0}>
            {[
              { l: '도움말 / 문의', d: icons.chat, tone: MA.muted },
              { l: '앱 정보 · v1.0.0', d: icons.target, tone: MA.muted },
              { l: '로그아웃', d: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1", tone: MA.danger },
            ].map((r, i, arr) => (
              <MoreRow key={i} {...r} divider={i < arr.length - 1} />
            ))}
          </CardBlock>
        </div>
      )}
    </AdminMobileShell>
  );
}

const MoreRow = ({ l, d, tone, badge, right, toggle, divider = true }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
    borderBottom: divider ? `1px solid ${MA.divider}` : 'none',
  }}>
    <div style={{ width: 32, height: 32, borderRadius: 8, background: `${tone}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon d={d} size={15} c={tone} sw={2} />
    </div>
    <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: MA.text, letterSpacing: -0.2 }}>{l}</div>
    {badge && <span style={{ padding: '3px 8px', borderRadius: 999, background: `${MA.danger}15`, color: MA.danger, fontSize: 10, fontWeight: 700 }}>{badge}</span>}
    {right && <span style={{ fontSize: 12, color: MA.muted }}>{right}</span>}
    {toggle && (
      <div style={{ width: 36, height: 22, borderRadius: 999, background: MA.primary, position: 'relative' }}>
        <div style={{ width: 18, height: 18, borderRadius: 999, background: '#fff', position: 'absolute', top: 2, right: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
      </div>
    )}
    {!toggle && !right && <Icon d="M9 18l6-6-6-6" size={14} c={MA.mutedSoft} sw={2} />}
  </div>
);

// ═══════════════════════════════════════════════════════════
// ⑦ 알림 인박스 (풀스크린 모달)
// ═══════════════════════════════════════════════════════════
function MobileInboxScreen({ role = 'farm' }) {
  return (
    <AdminMobileShell role={role} active="home" showHeader title="알림" badge>
      {() => (
        <div style={{ padding: '0 0 16px' }}>
          {/* 필터 */}
          <div style={{ padding: '10px 14px 8px', display: 'flex', gap: 6, overflowX: 'auto' }}>
            {['전체 12', '긴급 2', '승인 7', '일반 3'].map((t, i) => (
              <span key={t} style={{
                padding: '6px 12px', borderRadius: 999, whiteSpace: 'nowrap',
                background: i === 0 ? MA.text : MA.card, color: i === 0 ? '#fff' : MA.muted,
                fontSize: 12, fontWeight: 700, border: i === 0 ? 'none' : `1px solid ${MA.border}`,
              }}>{t}</span>
            ))}
          </div>

          {/* 알림 리스트 */}
          <div style={{ padding: '0 14px' }}>
            {/* 긴급 */}
            <InboxGroup label="긴급 · 즉시 응답" items={[
              { icon: icons.bell, tone: MA.danger, title: '긴급 호출 · B동 3번 골', sub: '이영희 · 설비 이상', time: '2분 전', unread: true, highlight: true },
              { icon: icons.bell, tone: MA.danger, title: '이상 신고 · 해충 발견', sub: '김민국 · A동 2번 골', time: '25분 전', unread: true },
            ]} />

            {/* 승인 요청 */}
            <InboxGroup label="승인 요청" items={[
              { icon: icons.clipboard, tone: MA.blue, title: '연차 휴가 신청 · 김민국', sub: '4/28 ~ 4/30 (3일)', time: '2시간 전', unread: true },
              { icon: icons.clipboard, tone: MA.warn, title: '연장근무 · 최수민', sub: '오늘 · 2시간', time: '3시간 전', unread: true },
              { icon: icons.clipboard, tone: '#7C3AED', title: 'TBM 승인 · 안전점검', sub: '반장 제출', time: '오전 9:12', unread: false },
            ]} />

            {/* 오늘 */}
            <InboxGroup label="오늘" items={[
              { icon: icons.check, tone: MA.success, title: '수확 작업 완료 · B동', sub: '최수민 외 3명 · 845kg', time: '오전 11:30', unread: false },
              { icon: icons.users, tone: MA.muted, title: '지각 알림 · 이영희', sub: '08:12 · 12분', time: '오전 8:15', unread: false },
            ]} />
          </div>
        </div>
      )}
    </AdminMobileShell>
  );
}

const InboxGroup = ({ label, items }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ fontSize: 11, color: MA.mutedSoft, fontWeight: 700, padding: '6px 4px', letterSpacing: 0.5 }}>{label.toUpperCase()}</div>
    <div style={{ background: MA.card, borderRadius: 14, padding: '2px 14px' }}>
      {items.map((r, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0',
          borderBottom: i < items.length - 1 ? `1px solid ${MA.divider}` : 'none',
          background: r.highlight ? 'linear-gradient(90deg, rgba(220,38,38,0.04), transparent)' : 'transparent',
          marginLeft: r.highlight ? -14 : 0, marginRight: r.highlight ? -14 : 0, paddingLeft: r.highlight ? 14 : 0, paddingRight: r.highlight ? 14 : 0,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, background: `${r.tone}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            position: 'relative',
          }}>
            <Icon d={r.icon} size={15} c={r.tone} sw={2.2} />
            {r.unread && <span style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: 999, background: MA.danger, border: '2px solid #fff' }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: r.unread ? 700 : 600, color: MA.text, letterSpacing: -0.2 }}>{r.title}</div>
            <div style={{ fontSize: 11, color: MA.muted, marginTop: 2 }}>{r.sub}</div>
          </div>
          <div style={{ fontSize: 10, color: MA.mutedSoft, fontWeight: 600, flexShrink: 0 }}>{r.time}</div>
        </div>
      ))}
    </div>
  </div>
);

export {
  MobileApprovalScreen,
  MobileFloorScreen,
  MobilePerfScreen,
  MobileMoreScreen,
  MobileInboxScreen,
};

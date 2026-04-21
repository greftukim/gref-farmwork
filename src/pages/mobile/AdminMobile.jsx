import React from 'react';
import { T, Icon, icons } from '../../design/primitives';

// ─────── 공통 토큰 확장 ───────
const MA = {
  bg: '#F2F2F7',
  card: '#FFFFFF',
  text: '#1F2937',
  muted: '#64748B',
  mutedSoft: '#94A3B8',
  border: '#E5E7EB',
  divider: '#F1F5F9',
  primary: T.primary,        // green (작업자와 통일)
  primaryDark: T.primaryDark,
  teal: '#0D9488',           // 관리팀용 액센트
  tealDark: '#0F766E',
  blue: '#2563EB',
  danger: '#DC2626',
  warn: '#F59E0B',
  success: '#10B981',
};

// ─────── Shell ───────
// role: 'farm' | 'hq'
function AdminMobileShell({ role = 'farm', active = 'home', children, title, showHeader = false, badge }) {
  const accent = role === 'hq' ? MA.teal : MA.primary;
  const accentDark = role === 'hq' ? MA.tealDark : MA.primaryDark;
  const roleLabel = role === 'hq' ? '관리팀 · 본사' : '재배팀 · 부산LAB';
  const roleChip = role === 'hq' ? '본사' : '부산LAB';

  const tabs = [
    { id: 'home', label: '홈', d: icons.home },
    { id: 'approve', label: '승인', d: icons.clipboard, badge: 7 },
    { id: 'floor', label: '현황', d: icons.target },
    { id: 'perf', label: '성과', d: icons.trending },
    { id: 'more', label: '더보기', d: icons.menu },
  ];

  return (
    <div style={{ background: MA.bg, height: '100%', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, Pretendard, system-ui', position: 'relative' }}>
      {showHeader && (
        <div style={{
          background: MA.card, borderBottom: `1px solid ${MA.border}`,
          padding: '12px 16px 14px', display: 'flex', alignItems: 'center', gap: 10,
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: MA.text, letterSpacing: -0.3 }}>{title}</div>
          <div style={{ flex: 1 }} />
          <div style={{ width: 34, height: 34, borderRadius: 999, background: MA.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <Icon d={icons.bell} size={16} c={MA.text} sw={2} />
            {badge && <span style={{ position: 'absolute', top: 6, right: 8, width: 7, height: 7, borderRadius: 999, background: MA.danger, border: '1.5px solid #fff' }} />}
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {children({ accent, accentDark, roleLabel, roleChip, role })}
      </div>

      {/* 하단 탭바 — iOS 스타일 */}
      <div style={{
        background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(18px)',
        borderTop: `1px solid ${MA.border}`,
        display: 'flex', padding: '6px 0 22px', flexShrink: 0,
      }}>
        {tabs.map(t => {
          const on = t.id === active;
          return (
            <div key={t.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '6px 0', cursor: 'pointer', position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <Icon d={t.d} size={22} c={on ? accent : MA.mutedSoft} sw={on ? 2.2 : 2} />
                {t.badge && (
                  <span style={{
                    position: 'absolute', top: -4, right: -8,
                    minWidth: 16, height: 16, borderRadius: 999,
                    background: MA.danger, color: '#fff', fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                    border: '2px solid #fff',
                  }}>{t.badge}</span>
                )}
              </div>
              <div style={{ fontSize: 10, fontWeight: on ? 700 : 500, color: on ? accent : MA.mutedSoft }}>{t.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────── 공용 위젯 ───────
const StatTile = ({ label, value, unit, sub, tone, accent }) => {
  const toneColor = {
    primary: accent,
    warning: MA.warn,
    danger: MA.danger,
    success: MA.success,
    info: MA.blue,
  }[tone] || MA.text;
  return (
    <div style={{ background: MA.card, borderRadius: 14, padding: 14, flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 11, color: MA.mutedSoft, fontWeight: 600 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 4 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: toneColor, letterSpacing: -0.4 }}>{value}</span>
        {unit && <span style={{ fontSize: 12, color: MA.muted, fontWeight: 600 }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 11, color: MA.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
};

const CardBlock = ({ children, title, right, pad = 14 }) => (
  <div style={{ background: MA.card, borderRadius: 14, padding: pad, marginBottom: 12 }}>
    {title && (
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: MA.text, letterSpacing: -0.2 }}>{title}</div>
        <div style={{ flex: 1 }} />
        {right}
      </div>
    )}
    {children}
  </div>
);

const Row = ({ left, right, sub, onClick, divider = true }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
    borderBottom: divider ? `1px solid ${MA.divider}` : 'none',
  }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: MA.text, letterSpacing: -0.2 }}>{left}</div>
      {sub && <div style={{ fontSize: 11, color: MA.muted, marginTop: 2 }}>{sub}</div>}
    </div>
    {right}
  </div>
);

const Chip = ({ children, tone = 'default' }) => {
  const color = {
    danger: { bg: '#FEE2E2', fg: MA.danger },
    warn: { bg: '#FEF3C7', fg: '#B45309' },
    success: { bg: '#DCFCE7', fg: '#047857' },
    info: { bg: '#DBEAFE', fg: '#1D4ED8' },
    default: { bg: MA.bg, fg: MA.muted },
  }[tone];
  return (
    <span style={{
      display: 'inline-block', padding: '3px 8px', borderRadius: 999,
      background: color.bg, color: color.fg, fontSize: 10, fontWeight: 700,
    }}>{children}</span>
  );
};

// ═══════════════════════════════════════════════════════════
// ① 홈 — 재배팀 (지점장/반장)
// ═══════════════════════════════════════════════════════════
function MobileAdminHomeFarm() {
  return (
    <AdminMobileShell role="farm" active="home">
      {({ accent, accentDark, roleLabel }) => (
        <div>
          {/* 상단 헤더 */}
          <div style={{
            background: `linear-gradient(160deg, ${accent} 0%, ${accentDark} 100%)`,
            color: '#fff', padding: '18px 20px 80px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>2026.04.21 화 · {roleLabel}</div>
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4, marginTop: 3 }}>안녕하세요, 박지점장님</div>
              </div>
              <div style={{ width: 38, height: 38, borderRadius: 999, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <Icon d={icons.bell} size={17} c="#fff" sw={2} />
                <span style={{ position: 'absolute', top: 6, right: 10, width: 8, height: 8, borderRadius: 999, background: '#FDE047', border: '1.5px solid #fff' }} />
              </div>
            </div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>A동·B동·C동·D동 · 총 20명 관리</div>
          </div>

          {/* 오버랩 KPI — 4칸 */}
          <div style={{ padding: '0 14px', marginTop: -65, position: 'relative', zIndex: 2 }}>
            <div style={{ background: MA.card, borderRadius: 16, padding: 14, boxShadow: '0 10px 30px rgba(15,23,42,0.1)' }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <StatTile label="오늘 출근" value="18" unit="/20" sub="결근 1 · 지각 1" tone="success" accent={accent} />
                <StatTile label="진행 작업" value="7" unit="/12" sub="완료 5" tone="primary" accent={accent} />
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <StatTile label="승인 대기" value="7" sub="휴가 4·TBM 3" tone="warning" accent={accent} />
                <StatTile label="미해결 이슈" value="2" sub="긴급 1" tone="danger" accent={accent} />
              </div>
            </div>
          </div>

          {/* 긴급 알림 배너 */}
          <div style={{ padding: '12px 14px 0' }}>
            <div style={{
              background: '#FEF2F2', border: `1px solid ${MA.danger}30`, borderRadius: 14, padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: MA.danger, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon d={icons.bell} size={17} c="#fff" sw={2.2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: MA.danger, fontWeight: 700 }}>긴급 호출 · B동 3번 골</div>
                <div style={{ fontSize: 11, color: MA.muted, marginTop: 1 }}>이영희 · 2분 전 · 설비 이상</div>
              </div>
              <button style={{ padding: '7px 12px', borderRadius: 10, background: MA.danger, color: '#fff', border: 'none', fontSize: 11, fontWeight: 700 }}>응답</button>
            </div>
          </div>

          {/* 오늘 작업 진행 현황 */}
          <div style={{ padding: '16px 14px 0' }}>
            <CardBlock title="오늘 작업 진행" right={<span style={{ fontSize: 11, color: accent, fontWeight: 600 }}>전체 →</span>}>
              {[
                { t: '적엽 · A동 1~3골', p: 62, w: '김민국 외 2명', s: '진행중', tone: 'info' },
                { t: '수확 · 토마토 B동', p: 100, w: '최수민 외 3명', s: '완료', tone: 'success' },
                { t: '유인 · C동 5~8골', p: 0, w: '배정 대기', s: '대기', tone: 'default' },
              ].map((r, i) => (
                <div key={i} style={{ padding: '10px 0', borderBottom: i < 2 ? `1px solid ${MA.divider}` : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: MA.text }}>{r.t}</div>
                    <Chip tone={r.tone}>{r.s}</Chip>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 5, background: MA.bg, borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${r.p}%`, height: '100%', background: r.tone === 'success' ? MA.success : accent, borderRadius: 999 }} />
                    </div>
                    <span style={{ fontSize: 11, color: MA.muted, fontWeight: 600, width: 34, textAlign: 'right' }}>{r.p}%</span>
                  </div>
                  <div style={{ fontSize: 11, color: MA.muted, marginTop: 4 }}>{r.w}</div>
                </div>
              ))}
            </CardBlock>
          </div>

          {/* 빠른 실행 */}
          <div style={{ padding: '0 14px' }}>
            <CardBlock title="빠른 실행">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {[
                  { l: '승인', d: icons.check, tone: accent },
                  { l: '공지 작성', d: icons.bell, tone: MA.blue },
                  { l: '평면도', d: icons.target, tone: MA.teal },
                  { l: '생육 입력', d: icons.leaf, tone: MA.success },
                ].map((q, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '8px 4px', cursor: 'pointer' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 13, background: `${q.tone}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon d={q.d} size={20} c={q.tone} sw={2.2} />
                    </div>
                    <div style={{ fontSize: 11, color: MA.text, fontWeight: 600 }}>{q.l}</div>
                  </div>
                ))}
              </div>
            </CardBlock>
          </div>

          {/* 이번 주 성과 요약 */}
          <div style={{ padding: '0 14px 16px' }}>
            <CardBlock title="이번 주 수확" right={<Chip tone="success">+8% WoW</Chip>}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 26, fontWeight: 700, color: MA.text, letterSpacing: -0.5 }}>1,842</span>
                <span style={{ fontSize: 13, color: MA.muted, fontWeight: 600 }}>kg</span>
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 11, color: MA.muted }}>목표 2,000</span>
              </div>
              <MiniBars data={[720, 840, 900, 1020, 1280, 1520, 1842]} accent={accent} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 9, color: MA.mutedSoft, fontWeight: 600 }}>
                <span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span><span>일</span>
              </div>
            </CardBlock>
          </div>
        </div>
      )}
    </AdminMobileShell>
  );
}

const MiniBars = ({ data, accent }) => {
  const max = Math.max(...data);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 50 }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ height: `${(v / max) * 100}%`, background: i === data.length - 1 ? accent : `${accent}60`, borderRadius: 3, minHeight: 4 }} />
        </div>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// ② 홈 — 관리팀 (본사)
// ═══════════════════════════════════════════════════════════
function MobileAdminHomeHQ() {
  return (
    <AdminMobileShell role="hq" active="home">
      {({ accent, accentDark, roleLabel }) => (
        <div>
          <div style={{
            background: `linear-gradient(160deg, ${accent} 0%, ${accentDark} 100%)`,
            color: '#fff', padding: '18px 20px 85px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>2026.04.21 화 · {roleLabel}</div>
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4, marginTop: 3 }}>안녕하세요, 이차장님</div>
              </div>
              <div style={{ width: 38, height: 38, borderRadius: 999, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <Icon d={icons.bell} size={17} c="#fff" sw={2} />
                <span style={{ position: 'absolute', top: 6, right: 10, width: 8, height: 8, borderRadius: 999, background: '#FDE047', border: '1.5px solid #fff' }} />
              </div>
            </div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>부산LAB · 진주HUB · 하동HUB · 총 52명</div>
          </div>

          {/* 전사 KPI */}
          <div style={{ padding: '0 14px', marginTop: -70, position: 'relative', zIndex: 2 }}>
            <div style={{ background: MA.card, borderRadius: 16, padding: 14, boxShadow: '0 10px 30px rgba(15,23,42,0.1)' }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <StatTile label="전사 가동률" value="94" unit="%" sub="+2.1 WoW" tone="primary" accent={accent} />
                <StatTile label="월 수확량" value="24.2" unit="t" sub="달성 92%" tone="success" accent={accent} />
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <StatTile label="월 인건비" value="1.28" unit="억" sub="예산내" tone="info" accent={accent} />
                <StatTile label="미해결" value="5" sub="긴급 2건" tone="danger" accent={accent} />
              </div>
            </div>
          </div>

          {/* 지점 카드 리스트 */}
          <div style={{ padding: '14px 14px 0' }}>
            <CardBlock title="지점별 현황" right={<span style={{ fontSize: 11, color: accent, fontWeight: 600 }}>자세히 →</span>}>
              {[
                { n: '부산LAB', attend: '18/20', harvest: '820kg', ach: 98, issue: 1 },
                { n: '진주HUB', attend: '16/17', harvest: '640kg', ach: 91, issue: 0 },
                { n: '하동HUB', attend: '14/15', harvest: '382kg', ach: 85, issue: 1 },
              ].map((b, i) => (
                <div key={i} style={{ padding: '11px 0', borderBottom: i < 2 ? `1px solid ${MA.divider}` : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: MA.text, flex: 1 }}>{b.n}</div>
                    {b.issue > 0 && <Chip tone="danger">이슈 {b.issue}</Chip>}
                  </div>
                  <div style={{ display: 'flex', gap: 14, fontSize: 11 }}>
                    <div>
                      <span style={{ color: MA.mutedSoft, fontWeight: 600 }}>출근 </span>
                      <span style={{ color: MA.text, fontWeight: 700 }}>{b.attend}</span>
                    </div>
                    <div>
                      <span style={{ color: MA.mutedSoft, fontWeight: 600 }}>수확 </span>
                      <span style={{ color: MA.text, fontWeight: 700 }}>{b.harvest}</span>
                    </div>
                    <div style={{ flex: 1 }} />
                    <div>
                      <span style={{ color: MA.mutedSoft, fontWeight: 600 }}>달성 </span>
                      <span style={{ color: b.ach >= 95 ? MA.success : b.ach >= 90 ? accent : MA.warn, fontWeight: 700 }}>{b.ach}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardBlock>
          </div>

          {/* 전사 승인 허브 */}
          <div style={{ padding: '0 14px' }}>
            <CardBlock title="승인 대기" right={<Chip tone="warn">7건</Chip>}>
              {[
                { b: '부산LAB', t: '연장근무', n: '김민국', tone: 'info' },
                { b: '진주HUB', t: '휴가', n: '정수아', tone: 'warn' },
                { b: '하동HUB', t: 'TBM 승인', n: '반장 제출', tone: 'default' },
              ].map((r, i) => (
                <Row key={i} left={`${r.b} · ${r.t}`} sub={r.n} divider={i < 2}
                  right={<Chip tone={r.tone}>대기</Chip>} />
              ))}
            </CardBlock>
          </div>

          {/* 공지 발송 */}
          <div style={{ padding: '0 14px 16px' }}>
            <button style={{
              width: '100%', padding: '14px', borderRadius: 14, border: 'none',
              background: accent, color: '#fff', fontSize: 14, fontWeight: 700, letterSpacing: -0.2,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <Icon d={icons.bell} size={16} c="#fff" sw={2.2} />
              전 지점에 공지 발송
            </button>
          </div>
        </div>
      )}
    </AdminMobileShell>
  );
}

export {
  AdminMobileShell,
  MobileAdminHomeFarm,
  MobileAdminHomeHQ,
  MA, StatTile, CardBlock, Row, Chip, MiniBars,
};

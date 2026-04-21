import React from 'react';
import { HQ, HQTopBar } from '../../design/hq-shell';
import { Card, Dot, Icon, Pill, T, btnPrimary, btnSecondary, icons } from '../../design/primitives';

// 관리팀(본사) 대시보드 화면
function HQDashboardScreen() {
  // 지점 데이터 (부산LAB, 진주HUB, 하동HUB)
  const branches = [
    { code: 'busan', name: '부산LAB', mgr: '김재배', workers: 20, checkedIn: 18, late: 2, rate: 90, harvest: 1240, harvestT: 1200, tbm: 100, accent: T.primary, accentSoft: T.primarySoft, status: 'active' },
    { code: 'jinju', name: '진주HUB', mgr: '박지점', workers: 14, checkedIn: 13, late: 0, rate: 93, harvest: 980, harvestT: 1100, tbm: 92, accent: T.success, accentSoft: T.successSoft, status: 'active' },
    { code: 'hadong', name: '하동HUB', mgr: '최책임', workers: 12, checkedIn: 10, late: 1, rate: 83, harvest: 760, harvestT: 950, tbm: 75, accent: T.warning, accentSoft: T.warningSoft, status: 'alert' },
  ];

  const totalWorkers = branches.reduce((s, b) => s + b.workers, 0);
  const totalCheckedIn = branches.reduce((s, b) => s + b.checkedIn, 0);
  const totalHarvest = branches.reduce((s, b) => s + b.harvest, 0);
  const totalTarget = branches.reduce((s, b) => s + b.harvestT, 0);

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg }}>
      <HQTopBar
        subtitle="본사 · 다지점 통합"
        title="2026년 4월 · 월간 운영 리포트"
        actions={<>{btnSecondary('리포트 내보내기', icons.chart)}{btnPrimary('전사 공지 작성', icons.plus)}</>}
      />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ─────── 전사 KPI 4개 (경영 지표) ─────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { label: '전사 가동률', value: Math.round(totalCheckedIn / totalWorkers * 100), unit: '%', sub: `${totalCheckedIn} / ${totalWorkers}명 출근`, trend: '+2.1%p', tone: 'success' },
            { label: '월 수확량', value: (totalHarvest).toLocaleString(), unit: 'kg', sub: `목표 ${totalTarget.toLocaleString()}kg · ${Math.round(totalHarvest / totalTarget * 100)}%`, trend: '▲ 8%', tone: 'primary' },
            { label: '월 인건비', value: '8,420', unit: '만원', sub: '예산 9,200만원 · 91%', trend: '−3.2%', tone: 'warning' },
            { label: '미해결 이슈', value: 7, unit: '건', sub: '긴급 2 · 일반 5', trend: '긴급', tone: 'danger' },
          ].map((k, i) => {
            const tones = { success: T.success, primary: HQ.accent, warning: T.warning, danger: T.danger };
            const softs = { success: T.successSoft, primary: HQ.accentSoft, warning: T.warningSoft, danger: T.dangerSoft };
            return (
              <Card key={i} pad={18} style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: tones[k.tone] }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <span style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>{k.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', background: softs[k.tone], color: tones[k.tone], borderRadius: 4 }}>{k.trend}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 32, fontWeight: 700, color: T.text, letterSpacing: -1, lineHeight: 1 }}>{k.value}</span>
                  <span style={{ fontSize: 14, color: T.mutedSoft, fontWeight: 500 }}>{k.unit}</span>
                </div>
                <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 8 }}>{k.sub}</div>
              </Card>
            );
          })}
        </div>

        {/* ─────── 지점별 운영 현황 카드 3개 ─────── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0 }}>지점별 운영 현황</h3>
              <span style={{ fontSize: 11, color: T.mutedSoft }}>오늘 09:30 기준</span>
            </div>
            <span style={{ fontSize: 11, color: HQ.accent, fontWeight: 600, cursor: 'pointer' }}>지점 관리 →</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {branches.map((b) => (
              <Card key={b.code} pad={0} style={{ overflow: 'hidden', cursor: 'pointer' }}>
                {/* 헤더 */}
                <div style={{
                  padding: '14px 16px',
                  background: b.accentSoft,
                  borderBottom: `1px solid ${T.borderSoft}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 8,
                      background: b.accent, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon d={icons.location} size={16} c="#fff" sw={2} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{b.name}</div>
                      <div style={{ fontSize: 10, color: T.mutedSoft, marginTop: 1 }}>지점장 {b.mgr}</div>
                    </div>
                  </div>
                  {b.status === 'alert' ? (
                    <Pill tone="warning">주의</Pill>
                  ) : (
                    <Pill tone="success">정상</Pill>
                  )}
                </div>

                {/* 바디 */}
                <div style={{ padding: 16 }}>
                  {/* 출근 현황 */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: T.muted }}>출근 현황</span>
                      <span style={{ fontSize: 11, color: T.mutedSoft }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: T.text, letterSpacing: -0.3 }}>{b.checkedIn}</span>
                        <span style={{ marginLeft: 3 }}> / {b.workers}명</span>
                      </span>
                    </div>
                    <div style={{ height: 6, background: T.borderSoft, borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${b.rate}%`, height: '100%', background: b.accent }} />
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 6, fontSize: 10, color: T.mutedSoft }}>
                      <span>정상 <span style={{ color: T.success, fontWeight: 700 }}>{b.checkedIn - b.late}</span></span>
                      <span>지각 <span style={{ color: T.warning, fontWeight: 700 }}>{b.late}</span></span>
                      <span>미출근 <span style={{ color: T.danger, fontWeight: 700 }}>{b.workers - b.checkedIn}</span></span>
                    </div>
                  </div>

                  {/* 지표 */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, paddingTop: 12, borderTop: `1px solid ${T.borderSoft}` }}>
                    {[
                      { l: '수확', v: b.harvest, u: 'kg' },
                      { l: '달성', v: Math.round(b.harvest / b.harvestT * 100), u: '%' },
                      { l: 'TBM', v: b.tbm, u: '%' },
                    ].map((s, i) => (
                      <div key={i}>
                        <div style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 600 }}>{s.l}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: T.text, letterSpacing: -0.3, marginTop: 2 }}>
                          {s.v}
                          <span style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 500, marginLeft: 1 }}>{s.u}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* ─────── 중단: 지점별 수확량 비교 + 승인 허브 ─────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
          {/* 이번 달 수확량 · 지점별 비교 */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>이번 달 지점별 수확량</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
                  <span style={{ fontSize: 28, fontWeight: 700, color: T.text, letterSpacing: -0.6, lineHeight: 1 }}>{totalHarvest.toLocaleString()}</span>
                  <span style={{ fontSize: 13, color: T.mutedSoft, fontWeight: 500 }}>kg</span>
                  <Pill tone="success">목표 대비 {Math.round(totalHarvest / totalTarget * 100)}%</Pill>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, background: T.bg, padding: 3, borderRadius: 6, fontSize: 11 }}>
                {['토마토', '딸기', '파프리카', '오이'].map((t, i) => (
                  <span key={t} style={{
                    padding: '4px 10px', borderRadius: 4, fontWeight: 600,
                    background: i === 0 ? T.surface : 'transparent',
                    color: i === 0 ? T.text : T.mutedSoft,
                    boxShadow: i === 0 ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    cursor: 'pointer',
                  }}>{t}</span>
                ))}
              </div>
            </div>

            {/* 가로 막대 차트 (지점×주차) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
              {branches.map((b) => {
                const weeks = [
                  { w: '1주', v: b.code === 'busan' ? 310 : b.code === 'jinju' ? 240 : 190 },
                  { w: '2주', v: b.code === 'busan' ? 295 : b.code === 'jinju' ? 220 : 175 },
                  { w: '3주', v: b.code === 'busan' ? 335 : b.code === 'jinju' ? 260 : 200 },
                  { w: '4주', v: b.code === 'busan' ? 300 : b.code === 'jinju' ? 260 : 195 },
                ];
                const max = 360;
                return (
                  <div key={b.code}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Dot c={b.accent} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{b.name}</span>
                      </div>
                      <div style={{ fontSize: 11, color: T.mutedSoft }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{b.harvest.toLocaleString()}</span> / {b.harvestT.toLocaleString()}kg
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 3, height: 32, alignItems: 'flex-end' }}>
                      {weeks.map((w, i) => (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                          <div style={{
                            width: '100%', height: `${w.v / max * 100}%`,
                            background: b.accent, borderRadius: '3px 3px 0 0', minHeight: 4,
                          }} />
                          <span style={{ fontSize: 9, color: T.mutedSoft }}>{w.w}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${T.borderSoft}`, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.mutedSoft }}>
              <span>전년 동월 대비 <span style={{ color: T.success, fontWeight: 700 }}>▲ 12.4%</span></span>
              <span>작물별 상세 분석 → <span style={{ color: HQ.accent, fontWeight: 600, cursor: 'pointer' }}>보고서 열기</span></span>
            </div>
          </Card>

          {/* 승인 허브 — 지점장 요청 */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>승인 허브</h3>
                <Pill tone="danger">12</Pill>
              </div>
              <span style={{ fontSize: 11, color: HQ.accent, fontWeight: 600, cursor: 'pointer' }}>전체 →</span>
            </div>

            {/* 승인 필터 탭 */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, fontSize: 11 }}>
              {[
                { l: '전체', n: 12, on: true },
                { l: '근태', n: 5 },
                { l: '예산', n: 3 },
                { l: '인사', n: 2 },
                { l: '자재', n: 2 },
              ].map((t, i) => (
                <span key={i} style={{
                  padding: '4px 9px', borderRadius: 6, fontWeight: 600, cursor: 'pointer',
                  background: t.on ? T.text : T.bg,
                  color: t.on ? '#fff' : T.muted,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {t.l}
                  <span style={{
                    fontSize: 9, padding: '0 5px', borderRadius: 999,
                    background: t.on ? 'rgba(255,255,255,0.2)' : T.borderSoft,
                    color: t.on ? '#fff' : T.muted,
                  }}>{t.n}</span>
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340, overflow: 'auto' }}>
              {[
                { branch: '부산LAB', bc: T.primary, name: '김재배', tag: '근태', tagTone: 'primary', type: '연차 신청', detail: '4/23 (수) · 본인', time: '10분 전', urgent: false },
                { branch: '하동HUB', bc: T.warning, name: '최책임', tag: '예산', tagTone: 'warning', type: '설비 구매 요청', detail: '환기팬 2대 · 480만원', time: '42분 전', urgent: true },
                { branch: '진주HUB', bc: T.success, name: '박지점', tag: '인사', tagTone: 'info', type: '신규 작업자 등록', detail: '임시 3명 · 5/1~31', time: '1시간 전', urgent: false },
                { branch: '부산LAB', bc: T.primary, name: '김재배', tag: '자재', tagTone: 'success', type: '농약 재고 발주', detail: '총 120만원', time: '2시간 전', urgent: false },
                { branch: '하동HUB', bc: T.warning, name: '최책임', tag: '근태', tagTone: 'primary', type: '연장근무 승인', detail: '오늘 2명 · 각 2h', time: '3시간 전', urgent: false },
              ].map((r, i) => (
                <div key={i} style={{
                  padding: '10px 12px', background: T.bg, borderRadius: 8,
                  borderLeft: r.urgent ? `3px solid ${T.danger}` : '3px solid transparent',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Dot c={r.bc} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: T.muted }}>{r.branch}</span>
                    <span style={{ fontSize: 10, color: T.mutedSoft }}>· {r.name}</span>
                    <Pill tone={r.tagTone} size="sm">{r.tag}</Pill>
                    {r.urgent && <Pill tone="danger" size="sm">긴급</Pill>}
                    <span style={{ fontSize: 10, color: T.mutedSoft, marginLeft: 'auto' }}>{r.time}</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{r.type}</div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{r.detail}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button style={{
                      flex: 1, padding: '5px 0', borderRadius: 6, border: `1px solid ${T.border}`,
                      background: T.surface, color: T.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    }}>반려</button>
                    <button style={{
                      flex: 1, padding: '5px 0', borderRadius: 6, border: 0,
                      background: HQ.accent, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    }}>승인</button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ─────── 하단: 경영지표 트렌드 + 지점 이슈 피드 + 공지 ─────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 20 }}>
          {/* 경영 지표 트렌드 (인건비 vs 수확액) */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>월별 경영 지표 추이</h3>
                <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 11 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 10, height: 2, background: HQ.accent }} />
                    <span style={{ color: T.muted, fontWeight: 600 }}>수확액</span>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 10, height: 2, background: T.warning, borderStyle: 'dashed' }} />
                    <span style={{ color: T.muted, fontWeight: 600 }}>인건비</span>
                  </span>
                </div>
              </div>
              <span style={{ fontSize: 11, color: HQ.accent, fontWeight: 600, cursor: 'pointer' }}>상세 →</span>
            </div>

            {/* 라인 차트 */}
            <div style={{ height: 140, position: 'relative', marginBottom: 8 }}>
              <svg viewBox="0 0 420 140" width="100%" height="140" preserveAspectRatio="none">
                {/* 그리드 */}
                {[0, 35, 70, 105, 140].map((y, i) => (
                  <line key={i} x1="0" y1={y} x2="420" y2={y} stroke={T.borderSoft} strokeWidth="1" />
                ))}
                {/* 수확액 (area) */}
                <path d="M 0,90 L 60,75 L 120,65 L 180,55 L 240,48 L 300,38 L 360,30 L 420,28 L 420,140 L 0,140 Z"
                  fill={HQ.accentSoft} />
                <path d="M 0,90 L 60,75 L 120,65 L 180,55 L 240,48 L 300,38 L 360,30 L 420,28"
                  fill="none" stroke={HQ.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {/* 인건비 (dashed) */}
                <path d="M 0,95 L 60,92 L 120,88 L 180,82 L 240,78 L 300,70 L 360,62 L 420,58"
                  fill="none" stroke={T.warning} strokeWidth="2" strokeDasharray="4 3" strokeLinecap="round" />
                {/* 현재 포인트 */}
                <circle cx="420" cy="28" r="4" fill={HQ.accent} stroke="#fff" strokeWidth="2" />
                <circle cx="420" cy="58" r="4" fill={T.warning} stroke="#fff" strokeWidth="2" />
              </svg>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.mutedSoft, padding: '0 2px' }}>
              {['10월', '11월', '12월', '1월', '2월', '3월', '4월'].map(m => <span key={m}>{m}</span>)}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${T.borderSoft}` }}>
              {[
                { l: '수확액', v: '4.2억', sub: '▲ 18%', tone: T.success },
                { l: '인건비율', v: '20%', sub: '전년比 −2%p', tone: T.success },
                { l: 'kg당 원가', v: '2,740원', sub: '▼ 6%', tone: T.success },
              ].map((s, i) => (
                <div key={i}>
                  <div style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 600 }}>{s.l}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.text, letterSpacing: -0.3, marginTop: 2 }}>{s.v}</div>
                  <div style={{ fontSize: 10, color: s.tone, fontWeight: 600, marginTop: 1 }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* 지점 통합 이슈 피드 */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>전 지점 이상 신고</h3>
                <Pill tone="danger">7</Pill>
              </div>
              <span style={{ fontSize: 11, color: HQ.accent, fontWeight: 600, cursor: 'pointer' }}>전체 →</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { branch: '부산LAB', bc: T.primary, severity: 'critical', type: '병해충', place: 'B동 3열 · 딸기', who: '최수진', time: '8분 전', note: '잎 하면 흰색 반점 다수 확인' },
                { branch: '하동HUB', bc: T.warning, severity: 'critical', type: '설비 고장', place: '환기창 2번', who: '이강모', time: '32분 전', note: '자동 개폐 반응 없음' },
                { branch: '진주HUB', bc: T.success, severity: 'warning', type: 'EC 이상', place: 'C동 2열 · 파프리카', who: '자동감지', time: '1시간 전', note: 'EC 3.2 → 기준 초과' },
                { branch: '부산LAB', bc: T.primary, severity: 'info', type: '작물 이상', place: 'A동 7열 · 토마토', who: '김수확', time: '2시간 전', note: '과실 일부 열과 발생' },
              ].map((it, i) => {
                const sevTone = { critical: 'danger', warning: 'warning', info: 'info' }[it.severity];
                const sevBg = { critical: T.dangerSoft, warning: T.warningSoft, info: T.infoSoft }[it.severity];
                const sevBorder = { critical: T.danger, warning: T.warning, info: T.info }[it.severity];
                return (
                  <div key={i} style={{
                    padding: '10px 12px', background: sevBg, borderRadius: 8,
                    borderLeft: `3px solid ${sevBorder}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Dot c={it.bc} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: T.muted }}>{it.branch}</span>
                      <Pill tone={sevTone} size="sm">{it.type}</Pill>
                      <span style={{ fontSize: 10, color: T.mutedSoft, marginLeft: 'auto' }}>{it.time}</span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{it.place}</div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{it.who} — {it.note}</div>
                  </div>
                );
              })}
              <div style={{ padding: 10, background: T.bg, borderRadius: 8, textAlign: 'center' }}>
                <span style={{ fontSize: 11, color: T.mutedSoft }}>해결됨 · 오늘 5건</span>
              </div>
            </div>
          </Card>

          {/* 공지 · 정책 관리 */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>공지 · 정책 관리</h3>
              </div>
              <span style={{ fontSize: 11, color: HQ.accent, fontWeight: 600, cursor: 'pointer' }}>+ 새 공지</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { tag: '전사 · 중요', tone: 'danger', title: '5월 안전교육 이수 필참 안내', meta: '전 직원 · 읽음 42/60 (70%)', pinned: true, branches: 'ALL' },
                { tag: '정책', tone: 'info', title: '2026년 연차 사용 가이드라인 개정', meta: '전 직원 · 읽음 58/60 (97%)', branches: 'ALL' },
                { tag: '부산LAB', tone: 'primary', title: '금주 토요일 출근조 편성', meta: '부산LAB · 읽음 18/20', branches: 'busan' },
                { tag: '하동HUB', tone: 'warning', title: '설비 점검일 연기', meta: '하동HUB · 읽음 8/12', branches: 'hadong' },
              ].map((n, i) => {
                const tones = { danger: T.danger, primary: T.primary, success: T.success, warning: T.warning, info: HQ.accent, muted: T.mutedSoft };
                const softs = { danger: T.dangerSoft, primary: T.primarySoft, success: T.successSoft, warning: T.warningSoft, info: HQ.accentSoft, muted: T.bg };
                return (
                  <div key={i} style={{
                    padding: '10px 12px', background: T.bg, borderRadius: 8,
                    borderLeft: n.pinned ? `3px solid ${T.danger}` : '3px solid transparent',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                        background: softs[n.tone], color: tones[n.tone],
                      }}>{n.tag}</span>
                      {n.pinned && <Icon d="M10 2l2 5 5 1-4 4 1 6-5-3-5 3 1-6-4-4 5-1z" size={11} c={T.danger} />}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.text, lineHeight: 1.35 }}>{n.title}</div>
                    <div style={{ fontSize: 10, color: T.mutedSoft, marginTop: 3 }}>{n.meta}</div>
                  </div>
                );
              })}
            </div>

            {/* 하단 요약 */}
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.borderSoft}`, display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: T.mutedSoft }}>활성 공지 <span style={{ color: T.text, fontWeight: 700 }}>8건</span></span>
              <span style={{ color: T.mutedSoft }}>평균 열람률 <span style={{ color: T.success, fontWeight: 700 }}>83%</span></span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
export { HQDashboardScreen };

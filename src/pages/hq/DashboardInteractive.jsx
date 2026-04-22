import React, { useState } from 'react';
import { T, Card, Pill, Dot, Icon, icons, btnPrimary, btnGhostStyle } from '../../design/primitives';
import { HQ } from '../../design/hq-shell';

// 관리팀(본사) 대시보드 — 인터랙티브
// 기간 탭 · 지점 막대 → 클릭 시 작물별 분해 드릴다운 · 승인 필터 · 지점 상세 모달

function HQDashboardInteractive() {
  const [period, setPeriod] = useState('월');
  const [drillBranch, setDrillBranch] = useState(null); // code or null
  const [approvalFilter, setApprovalFilter] = useState('전체');
  const [branchModal, setBranchModal] = useState(null);

  // 지점 + 지점별 작물 구성
  const branches = [
    { code: 'busan', name: '부산LAB', mgr: '김재배', workers: 20, checkedIn: 18, late: 2, rate: 90,
      harvest: 1240, harvestT: 1200, tbm: 100, accent: T.primary, accentSoft: T.primarySoft, status: 'active',
      crops: [
        { name: '토마토', v: 580, t: 560, c: '#E11D48' },
        { name: '딸기', v: 360, t: 360, c: '#EC4899' },
        { name: '파프리카', v: 300, t: 280, c: '#F59E0B' },
      ],
    },
    { code: 'jinju', name: '진주HUB', mgr: '박지점', workers: 14, checkedIn: 13, late: 0, rate: 93,
      harvest: 980, harvestT: 1100, tbm: 92, accent: T.success, accentSoft: T.successSoft, status: 'active',
      crops: [
        { name: '오이', v: 620, t: 700, c: '#10B981' },
        { name: '애호박', v: 360, t: 400, c: '#84CC16' },
      ],
    },
    { code: 'hadong', name: '하동HUB', mgr: '최책임', workers: 12, checkedIn: 10, late: 1, rate: 83,
      harvest: 760, harvestT: 950, tbm: 75, accent: T.warning, accentSoft: T.warningSoft, status: 'alert',
      crops: [
        { name: '방울토마토', v: 480, t: 600, c: '#F97316' },
        { name: '고추', v: 280, t: 350, c: '#DC2626' },
      ],
    },
  ];

  // 기간별 스케일 배수 (같은 지점 구조 유지, 총량만 스케일)
  const periodMeta = {
    '일': { mult: 0.048, label: '일간 · 4/22', kpiHarvest: 142, harvestT: 160, labor: '280', laborU: '만원', issue: 3, issueSub: '긴급 1', ga: 87, gaSub: '52 / 60명' },
    '주': { mult: 0.24, label: '주간 · 4/20~26', kpiHarvest: 720, harvestT: 800, labor: '1,980', laborU: '만원', issue: 5, issueSub: '긴급 1 · 일반 4', ga: 89, gaSub: '평균 53 / 60명' },
    '월': { mult: 1, label: '월간 · 2026년 4월', kpiHarvest: 2980, harvestT: 3250, labor: '8,420', laborU: '만원', issue: 7, issueSub: '긴급 2 · 일반 5', ga: 88, gaSub: '53 / 60명 평균' },
    '분기': { mult: 3.1, label: '분기 · 2026 1Q', kpiHarvest: 9140, harvestT: 9800, labor: '2.52', laborU: '억원', issue: 18, issueSub: '해결 73%', ga: 90, gaSub: '54 / 60명' },
  };
  const pm = periodMeta[period];

  // 승인 데이터
  const approvals = [
    { id: 1, branch: '부산LAB', bc: T.primary, name: '김재배', tag: '근태', tagTone: 'primary', type: '연차 신청', detail: '4/23 (수) · 본인', time: '10분 전', urgent: false },
    { id: 2, branch: '하동HUB', bc: T.warning, name: '최책임', tag: '예산', tagTone: 'warning', type: '설비 구매 요청', detail: '환기팬 2대 · 480만원', time: '42분 전', urgent: true },
    { id: 3, branch: '진주HUB', bc: T.success, name: '박지점', tag: '인사', tagTone: 'info', type: '신규 작업자 등록', detail: '임시 3명 · 5/1~31', time: '1시간 전', urgent: false },
    { id: 4, branch: '부산LAB', bc: T.primary, name: '김재배', tag: '자재', tagTone: 'success', type: '농약 재고 발주', detail: '총 120만원', time: '2시간 전', urgent: false },
    { id: 5, branch: '하동HUB', bc: T.warning, name: '최책임', tag: '근태', tagTone: 'primary', type: '연장근무 승인', detail: '오늘 2명 · 각 2h', time: '3시간 전', urgent: false },
    { id: 6, branch: '진주HUB', bc: T.success, name: '박지점', tag: '예산', tagTone: 'warning', type: '비료 추가 발주', detail: '총 340만원', time: '4시간 전', urgent: false },
    { id: 7, branch: '부산LAB', bc: T.primary, name: '김재배', tag: '인사', tagTone: 'info', type: '계약직 재계약', detail: '2명 · 7/1 시행', time: '5시간 전', urgent: false },
  ];
  const approvalFiltered = approvalFilter === '전체' ? approvals : approvals.filter(a => a.tag === approvalFilter);
  const approvalCounts = {
    '전체': approvals.length, '근태': approvals.filter(a => a.tag === '근태').length,
    '예산': approvals.filter(a => a.tag === '예산').length, '인사': approvals.filter(a => a.tag === '인사').length,
    '자재': approvals.filter(a => a.tag === '자재').length,
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, position: 'relative' }}>
      <HQTopBarInteractive
        subtitle={`본사 · 다지점 통합 · ${pm.label}`}
        title="운영 리포트"
        period={period}
        onPeriodChange={setPeriod}
      />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* KPI 4개 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { label: `${period === '일' ? '오늘' : period === '주' ? '이번 주' : period === '월' ? '이번 달' : '이번 분기'} 가동률`, value: pm.ga, unit: '%', sub: pm.gaSub, trend: '+2.1%p', tone: 'success' },
            { label: `${period} 수확량`, value: typeof pm.kpiHarvest === 'number' ? pm.kpiHarvest.toLocaleString() : pm.kpiHarvest, unit: 'kg', sub: `목표 ${pm.harvestT.toLocaleString()}kg · ${Math.round(pm.kpiHarvest / pm.harvestT * 100)}%`, trend: '▲ 8%', tone: 'primary' },
            { label: `${period} 인건비`, value: pm.labor, unit: pm.laborU, sub: '예산 대비 91%', trend: '−3.2%', tone: 'warning' },
            { label: '미해결 이슈', value: pm.issue, unit: '건', sub: pm.issueSub, trend: '긴급', tone: 'danger' },
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

        {/* 지점별 운영 현황 */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0 }}>지점별 운영 현황</h3>
              <span style={{ fontSize: 11, color: T.mutedSoft }}>클릭하여 상세 보기</span>
            </div>
            <span style={{ fontSize: 11, color: HQ.accent, fontWeight: 600, cursor: 'pointer' }}>지점 관리 →</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {branches.map((b) => (
              <Card key={b.code} pad={0} style={{
                overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: branchModal?.code === b.code ? `0 0 0 2px ${b.accent}` : 'none',
              }} onClick={() => setBranchModal(b)}>
                <div style={{
                  padding: '14px 16px', background: b.accentSoft, borderBottom: `1px solid ${T.borderSoft}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 8, background: b.accent, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon d={icons.location} size={16} c="#fff" sw={2} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{b.name}</div>
                      <div style={{ fontSize: 10, color: T.mutedSoft, marginTop: 1 }}>지점장 {b.mgr} · 작물 {b.crops.length}종</div>
                    </div>
                  </div>
                  {b.status === 'alert' ? <Pill tone="warning">주의</Pill> : <Pill tone="success">정상</Pill>}
                </div>

                <div style={{ padding: 16 }}>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: T.muted }}>출근 현황</span>
                      <span style={{ fontSize: 11, color: T.mutedSoft }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: T.text, letterSpacing: -0.3 }}>{b.checkedIn}</span>
                        <span style={{ marginLeft: 3 }}> / {b.workers}명</span>
                      </span>
                    </div>
                    <div style={{ height: 6, background: T.borderSoft, borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${b.rate}%`, height: '100%', background: b.accent, transition: 'width 0.4s' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 6, fontSize: 10, color: T.mutedSoft }}>
                      <span>정상 <span style={{ color: T.success, fontWeight: 700 }}>{b.checkedIn - b.late}</span></span>
                      <span>지각 <span style={{ color: T.warning, fontWeight: 700 }}>{b.late}</span></span>
                      <span>미출근 <span style={{ color: T.danger, fontWeight: 700 }}>{b.workers - b.checkedIn}</span></span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, paddingTop: 12, borderTop: `1px solid ${T.borderSoft}` }}>
                    {[
                      { l: '수확', v: Math.round(b.harvest * pm.mult), u: 'kg' },
                      { l: '달성', v: Math.round(b.harvest / b.harvestT * 100), u: '%' },
                      { l: 'TBM', v: b.tbm, u: '%' },
                    ].map((s, i) => (
                      <div key={i}>
                        <div style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 600 }}>{s.l}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: T.text, letterSpacing: -0.3, marginTop: 2 }}>
                          {s.v}<span style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 500, marginLeft: 1 }}>{s.u}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* 중단: 수확량 차트 + 승인 허브 */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
          <Card>
            {/* 드릴다운 헤더 */}
            {drillBranch ? (() => {
              const b = branches.find(x => x.code === drillBranch);
              return (
                <div style={{ marginBottom: 16 }}>
                  <button onClick={() => setDrillBranch(null)} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 6, border: `1px solid ${T.border}`,
                    background: T.surface, color: T.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    marginBottom: 10,
                  }}>
                    <Icon d="M15 18l-6-6 6-6" size={11} sw={2.2} />
                    지점 비교로 돌아가기
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 6, background: b.accent, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon d={icons.location} size={14} c="#fff" sw={2} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>{b.name} · 작물별 수확량</h3>
                      <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 2 }}>{b.crops.length}개 작물 · {pm.label}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
                    <span style={{ fontSize: 24, fontWeight: 700, color: T.text, letterSpacing: -0.6, lineHeight: 1 }}>
                      {Math.round(b.harvest * pm.mult).toLocaleString()}
                    </span>
                    <span style={{ fontSize: 13, color: T.mutedSoft }}>kg</span>
                    <Pill tone="success">목표 대비 {Math.round(b.harvest / b.harvestT * 100)}%</Pill>
                  </div>
                </div>
              );
            })() : (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>지점별 수확량 비교</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
                  <span style={{ fontSize: 24, fontWeight: 700, color: T.text, letterSpacing: -0.6, lineHeight: 1 }}>
                    {Math.round(branches.reduce((s, b) => s + b.harvest, 0) * pm.mult).toLocaleString()}
                  </span>
                  <span style={{ fontSize: 13, color: T.mutedSoft }}>kg</span>
                  <Pill tone="success">목표 대비 {Math.round(pm.kpiHarvest / pm.harvestT * 100)}%</Pill>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: T.mutedSoft }}>막대 클릭 → 작물별 분해</span>
                </div>
              </div>
            )}

            {/* 차트 */}
            {drillBranch ? (
              <CropBarChart branch={branches.find(b => b.code === drillBranch)} mult={pm.mult} />
            ) : (
              <BranchBarChart branches={branches} mult={pm.mult} onDrill={setDrillBranch} />
            )}
          </Card>

          {/* 승인 허브 */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>승인 허브</h3>
                <Pill tone="danger">{approvalFiltered.length}</Pill>
              </div>
              <span style={{ fontSize: 11, color: HQ.accent, fontWeight: 600, cursor: 'pointer' }}>전체 →</span>
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 12, fontSize: 11, flexWrap: 'wrap' }}>
              {['전체', '근태', '예산', '인사', '자재'].map(f => {
                const on = approvalFilter === f;
                return (
                  <button key={f} onClick={() => setApprovalFilter(f)} style={{
                    padding: '4px 9px', borderRadius: 6, fontWeight: 600, cursor: 'pointer', border: 0,
                    background: on ? T.text : T.bg, color: on ? '#fff' : T.muted,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    {f}
                    <span style={{
                      fontSize: 9, padding: '0 5px', borderRadius: 999,
                      background: on ? 'rgba(255,255,255,0.2)' : T.borderSoft,
                      color: on ? '#fff' : T.muted,
                    }}>{approvalCounts[f]}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 380, overflow: 'auto' }}>
              {approvalFiltered.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: T.mutedSoft, fontSize: 12 }}>
                  해당 유형의 요청이 없습니다
                </div>
              ) : approvalFiltered.map((r) => (
                <div key={r.id} style={{
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

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 20 }}>
          <FinanceTrendCard />
          <IssueFeedCard />
          <NoticeMgmtCard />
        </div>
      </div>

      {branchModal && <BranchDetailModal branch={branchModal} onClose={() => setBranchModal(null)} mult={pm.mult} />}
    </div>
  );
}

// ─── 상단바 ───
function HQTopBarInteractive({ title, subtitle, period, onPeriodChange }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '20px 32px', borderBottom: `1px solid ${T.border}`, background: T.surface,
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: T.mutedSoft, marginBottom: 4 }}>
          <span style={{ padding: '2px 8px', borderRadius: 4, background: HQ.accentSoft, color: HQ.accentText, fontWeight: 700, letterSpacing: 0.3 }}>HQ</span>
          <span>{subtitle}</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: -0.4, margin: 0 }}>{title}</h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 0, padding: 3,
          background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12, fontWeight: 600,
        }}>
          {['일', '주', '월', '분기'].map((p) => {
            const on = period === p;
            return (
              <button key={p} onClick={() => onPeriodChange(p)} style={{
                padding: '5px 14px', borderRadius: 5, border: 0, cursor: 'pointer',
                background: on ? T.surface : 'transparent', color: on ? T.text : T.mutedSoft,
                boxShadow: on ? '0 1px 2px rgba(0,0,0,0.06)' : 'none', fontWeight: 600,
              }}>{p}</button>
            );
          })}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
          background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8,
          width: 200, color: T.mutedSoft, fontSize: 13,
        }}>
          <Icon d={icons.search} size={14} />
          <span>검색</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 5px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, fontWeight: 600 }}>⌘K</span>
        </div>
        <button style={btnGhostStyle}>
          <Icon d={icons.bell} size={16} />
          <span style={{ position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: 999, background: T.danger }} />
        </button>
        {btnPrimary('전사 공지', icons.plus)}
      </div>
    </div>
  );
}

// ─── 막대 차트 (공통 컴포넌트) ───
const CHART_H = 180;
const CHART_TOP_PAD = 28;
const CHART_BOTTOM_PAD = 52;

function BranchBarChart({ branches, mult, onDrill }) {
  const [hover, setHover] = useState(null);
  const maxTarget = Math.max(...branches.map(b => Math.max(b.harvest, b.harvestT)));
  const max = maxTarget * mult * 1.05;

  return (
    <div style={{
      position: 'relative', padding: `${CHART_TOP_PAD}px 40px ${CHART_BOTTOM_PAD}px`,
      height: CHART_H + CHART_TOP_PAD + CHART_BOTTOM_PAD,
    }}>
      {/* Y축 그리드 */}
      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
        const y = CHART_TOP_PAD + CHART_H * (1 - p);
        return (
          <div key={i} style={{
            position: 'absolute', left: 40, right: 40, top: y,
            borderTop: `1px ${p === 0 ? 'solid' : 'dashed'} ${T.borderSoft}`,
          }}>
            <span style={{ position: 'absolute', left: -36, top: -6, fontSize: 9, color: T.mutedSoft, fontWeight: 600 }}>
              {Math.round(max * p).toLocaleString()}
            </span>
          </div>
        );
      })}

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, height: CHART_H, position: 'relative' }}>
        {branches.map(b => {
          const v = Math.round(b.harvest * mult);
          const tv = Math.round(b.harvestT * mult);
          const h = (v / max) * CHART_H;
          const th = (tv / max) * CHART_H;
          const isHover = hover === b.code;
          const pct = Math.round(v / tv * 100);
          return (
            <div key={b.code}
              style={{ flex: 1, display: 'flex', justifyContent: 'center', position: 'relative', height: '100%', cursor: 'pointer' }}
              onMouseEnter={() => setHover(b.code)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onDrill(b.code)}
            >
              <div style={{ width: '60%', maxWidth: 64, position: 'relative', height: '100%' }}>
                {/* 목표 라인 */}
                <div style={{
                  position: 'absolute', left: '-10%', right: '-10%',
                  bottom: th, height: 0, borderTop: `2px dashed ${T.mutedSoft}`, zIndex: 1,
                }}>
                  <span style={{ position: 'absolute', right: -32, top: -7, fontSize: 9, color: T.mutedSoft, fontWeight: 600 }}>목표</span>
                </div>
                {/* 막대 */}
                <div style={{
                  position: 'absolute', left: 0, right: 0, bottom: 0, height: h,
                  background: b.accent, borderRadius: '6px 6px 0 0',
                  boxShadow: isHover ? `0 0 0 3px ${b.accentSoft}` : 'none',
                  transition: 'all 0.2s', zIndex: 2,
                }}>
                  {/* 숫자 라벨 — 막대 위 */}
                  <div style={{
                    position: 'absolute', top: -22, left: -10, right: -10, textAlign: 'center',
                    fontSize: 11, fontWeight: 700, color: T.text,
                  }}>{v.toLocaleString()}</div>
                </div>
                {/* 호버 툴팁 */}
                {isHover && (
                  <div style={{
                    position: 'absolute', left: '50%', top: -12, transform: 'translate(-50%, -100%)',
                    background: T.text, color: '#fff', padding: '6px 10px', borderRadius: 6,
                    fontSize: 11, whiteSpace: 'nowrap', zIndex: 10,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}>
                    <div style={{ fontWeight: 700 }}>{b.name}</div>
                    <div style={{ marginTop: 2 }}>{v.toLocaleString()} / {tv.toLocaleString()}kg · {pct}%</div>
                    <div style={{ marginTop: 2, color: '#CBD5E1', fontSize: 10 }}>작물 {b.crops.length}종 · 클릭하여 분해</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* X축 라벨 */}
      <div style={{ position: 'absolute', left: 40, right: 40, bottom: 16, display: 'flex', gap: 20 }}>
        {branches.map(b => (
          <div key={b.code} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: T.text }}>
              <Dot c={b.accent} />
              {b.name}
            </div>
            <div style={{ fontSize: 10, color: T.mutedSoft, marginTop: 2 }}>
              {b.crops.map(c => c.name).join(' · ')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CropBarChart({ branch, mult }) {
  const [hover, setHover] = useState(null);
  const maxTarget = Math.max(...branch.crops.map(c => Math.max(c.v, c.t)));
  const max = maxTarget * mult * 1.05;

  return (
    <div style={{
      position: 'relative', padding: `${CHART_TOP_PAD}px 40px ${CHART_BOTTOM_PAD}px`,
      height: CHART_H + CHART_TOP_PAD + CHART_BOTTOM_PAD,
    }}>
      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
        const y = CHART_TOP_PAD + CHART_H * (1 - p);
        return (
          <div key={i} style={{
            position: 'absolute', left: 40, right: 40, top: y,
            borderTop: `1px ${p === 0 ? 'solid' : 'dashed'} ${T.borderSoft}`,
          }}>
            <span style={{ position: 'absolute', left: -36, top: -6, fontSize: 9, color: T.mutedSoft, fontWeight: 600 }}>
              {Math.round(max * p).toLocaleString()}
            </span>
          </div>
        );
      })}

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, height: CHART_H, position: 'relative' }}>
        {branch.crops.map(c => {
          const v = Math.round(c.v * mult);
          const tv = Math.round(c.t * mult);
          const h = (v / max) * CHART_H;
          const th = (tv / max) * CHART_H;
          const isHover = hover === c.name;
          const pct = Math.round(v / tv * 100);
          return (
            <div key={c.name}
              style={{ flex: 1, display: 'flex', justifyContent: 'center', position: 'relative', height: '100%' }}
              onMouseEnter={() => setHover(c.name)}
              onMouseLeave={() => setHover(null)}
            >
              <div style={{ width: '60%', maxWidth: 64, position: 'relative', height: '100%' }}>
                <div style={{
                  position: 'absolute', left: '-10%', right: '-10%',
                  bottom: th, height: 0, borderTop: `2px dashed ${T.mutedSoft}`, zIndex: 1,
                }}>
                  <span style={{ position: 'absolute', right: -32, top: -7, fontSize: 9, color: T.mutedSoft, fontWeight: 600 }}>목표</span>
                </div>
                <div style={{
                  position: 'absolute', left: 0, right: 0, bottom: 0, height: h,
                  background: c.c, borderRadius: '6px 6px 0 0',
                  boxShadow: isHover ? `0 0 0 3px ${c.c}22` : 'none',
                  transition: 'all 0.2s', zIndex: 2,
                }}>
                  <div style={{
                    position: 'absolute', top: -22, left: -10, right: -10, textAlign: 'center',
                    fontSize: 11, fontWeight: 700, color: T.text,
                  }}>{v.toLocaleString()}</div>
                </div>
                {isHover && (
                  <div style={{
                    position: 'absolute', left: '50%', top: -12, transform: 'translate(-50%, -100%)',
                    background: T.text, color: '#fff', padding: '6px 10px', borderRadius: 6,
                    fontSize: 11, whiteSpace: 'nowrap', zIndex: 10,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}>
                    <div style={{ fontWeight: 700 }}>{c.name}</div>
                    <div style={{ marginTop: 2 }}>{v.toLocaleString()} / {tv.toLocaleString()}kg · {pct}%</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ position: 'absolute', left: 40, right: 40, bottom: 16, display: 'flex', gap: 20 }}>
        {branch.crops.map(c => {
          const pct = Math.round(c.v / c.t * 100);
          return (
            <div key={c.name} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: T.text }}>
                <Dot c={c.c} />
                {c.name}
              </div>
              <div style={{ fontSize: 10, color: pct >= 95 ? T.success : pct >= 85 ? T.warning : T.danger, fontWeight: 600, marginTop: 2 }}>
                달성 {pct}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 하단 카드 3개 (간소화) ───
function FinanceTrendCard() {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>월별 경영 지표</h3>
          <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 11 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 2, background: HQ.accent }} />
              <span style={{ color: T.muted, fontWeight: 600 }}>수확액</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 2, background: T.warning }} />
              <span style={{ color: T.muted, fontWeight: 600 }}>인건비</span>
            </span>
          </div>
        </div>
      </div>
      <div style={{ height: 140 }}>
        <svg viewBox="0 0 420 140" width="100%" height="140" preserveAspectRatio="none">
          {[0, 35, 70, 105, 140].map((y, i) => <line key={i} x1="0" y1={y} x2="420" y2={y} stroke={T.borderSoft} strokeWidth="1" />)}
          <path d="M 0,90 L 60,75 L 120,65 L 180,55 L 240,48 L 300,38 L 360,30 L 420,28 L 420,140 L 0,140 Z" fill={HQ.accentSoft} />
          <path d="M 0,90 L 60,75 L 120,65 L 180,55 L 240,48 L 300,38 L 360,30 L 420,28" fill="none" stroke={HQ.accent} strokeWidth="2.5" />
          <path d="M 0,95 L 60,92 L 120,88 L 180,82 L 240,78 L 300,70 L 360,62 L 420,58" fill="none" stroke={T.warning} strokeWidth="2" strokeDasharray="4 3" />
          <circle cx="420" cy="28" r="4" fill={HQ.accent} stroke="#fff" strokeWidth="2" />
          <circle cx="420" cy="58" r="4" fill={T.warning} stroke="#fff" strokeWidth="2" />
        </svg>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.mutedSoft, padding: '0 2px', marginTop: 4 }}>
        {['10월', '11월', '12월', '1월', '2월', '3월', '4월'].map(m => <span key={m}>{m}</span>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.borderSoft}` }}>
        {[{ l: '수확액', v: '4.2억', sub: '▲ 18%' }, { l: '인건비율', v: '20%', sub: '−2%p' }, { l: 'kg당 원가', v: '2,740원', sub: '▼ 6%' }].map((s, i) => (
          <div key={i}>
            <div style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 600 }}>{s.l}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text, letterSpacing: -0.3, marginTop: 2 }}>{s.v}</div>
            <div style={{ fontSize: 10, color: T.success, fontWeight: 600, marginTop: 1 }}>{s.sub}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function IssueFeedCard() {
  return (
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
          { branch: '부산LAB', bc: T.primary, sev: 'critical', type: '병해충', place: 'B동 3열 · 딸기', who: '최수진', time: '8분 전', note: '잎 하면 흰색 반점 다수 확인' },
          { branch: '하동HUB', bc: T.warning, sev: 'critical', type: '설비 고장', place: '환기창 2번', who: '이강모', time: '32분 전', note: '자동 개폐 반응 없음' },
          { branch: '진주HUB', bc: T.success, sev: 'warning', type: 'EC 이상', place: 'C동 2열 · 오이', who: '자동감지', time: '1시간 전', note: 'EC 3.2 → 기준 초과' },
          { branch: '부산LAB', bc: T.primary, sev: 'info', type: '작물 이상', place: 'A동 7열 · 토마토', who: '김수확', time: '2시간 전', note: '과실 일부 열과 발생' },
        ].map((it, i) => {
          const sevTone = { critical: 'danger', warning: 'warning', info: 'info' }[it.sev];
          const sevBg = { critical: T.dangerSoft, warning: T.warningSoft, info: T.infoSoft }[it.sev];
          const sevBorder = { critical: T.danger, warning: T.warning, info: T.info }[it.sev];
          return (
            <div key={i} style={{ padding: '10px 12px', background: sevBg, borderRadius: 8, borderLeft: `3px solid ${sevBorder}` }}>
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
      </div>
    </Card>
  );
}

function NoticeMgmtCard() {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>공지 · 정책 관리</h3>
        <span style={{ fontSize: 11, color: HQ.accent, fontWeight: 600, cursor: 'pointer' }}>+ 새 공지</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { tag: '전사 · 중요', tone: 'danger', title: '5월 안전교육 이수 필참 안내', meta: '전 직원 · 42/60 (70%)', pinned: true },
          { tag: '정책', tone: 'info', title: '2026년 연차 사용 가이드라인 개정', meta: '전 직원 · 58/60 (97%)' },
          { tag: '부산LAB', tone: 'primary', title: '금주 토요일 출근조 편성', meta: '부산LAB · 18/20' },
          { tag: '하동HUB', tone: 'warning', title: '설비 점검일 연기', meta: '하동HUB · 8/12' },
        ].map((n, i) => {
          const tones = { danger: T.danger, primary: T.primary, warning: T.warning, info: HQ.accent };
          const softs = { danger: T.dangerSoft, primary: T.primarySoft, warning: T.warningSoft, info: HQ.accentSoft };
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
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.text, lineHeight: 1.35 }}>{n.title}</div>
              <div style={{ fontSize: 10, color: T.mutedSoft, marginTop: 3 }}>{n.meta}</div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.borderSoft}`, display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
        <span style={{ color: T.mutedSoft }}>활성 <span style={{ color: T.text, fontWeight: 700 }}>8건</span></span>
        <span style={{ color: T.mutedSoft }}>평균 열람률 <span style={{ color: T.success, fontWeight: 700 }}>83%</span></span>
      </div>
    </Card>
  );
}

// ─── 지점 상세 모달 ───
function BranchDetailModal({ branch, onClose, mult }) {
  const notChecked = branch.workers - branch.checkedIn;
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{
        position: 'relative', zIndex: 10, width: 560, maxHeight: '85%', overflow: 'auto',
        background: T.surface, borderRadius: 16, boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
      }}>
        <div style={{
          padding: '18px 24px', borderBottom: `1px solid ${T.borderSoft}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: branch.accentSoft,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10, background: branch.accent, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon d={icons.location} size={20} c="#fff" sw={2} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.text, letterSpacing: -0.3 }}>{branch.name}</div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>지점장 {branch.mgr} · 출근 {branch.checkedIn}/{branch.workers}명</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: T.muted,
          }}>
            <Icon d={icons.x} size={14} sw={2.2} />
          </button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { l: '총 인원', v: branch.workers, c: T.text, bg: T.bg },
              { l: '정상', v: branch.checkedIn - branch.late, c: T.success, bg: T.successSoft },
              { l: '지각', v: branch.late, c: T.warning, bg: T.warningSoft },
              { l: '미출근', v: notChecked, c: T.danger, bg: T.dangerSoft },
            ].map((s, i) => (
              <div key={i} style={{ padding: 10, background: s.bg, borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: T.muted, fontWeight: 600 }}>{s.l}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.c, marginTop: 2 }}>{s.v}<span style={{ fontSize: 11, color: T.mutedSoft, marginLeft: 2 }}>명</span></div>
              </div>
            ))}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Dot c={branch.accent} />
              <h4 style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0 }}>작물별 현황 ({branch.crops.length}종)</h4>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 12, background: T.bg, borderRadius: 8 }}>
              {branch.crops.map(c => {
                const v = Math.round(c.v * mult);
                const tv = Math.round(c.t * mult);
                const pct = Math.round(c.v / c.t * 100);
                return (
                  <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Dot c={c.c} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.text, width: 70 }}>{c.name}</span>
                    <div style={{ flex: 1, height: 6, background: T.borderSoft, borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: c.c }} />
                    </div>
                    <span style={{ fontSize: 11, color: T.muted, width: 110, textAlign: 'right' }}>
                      <span style={{ fontWeight: 700, color: T.text }}>{v.toLocaleString()}</span> / {tv.toLocaleString()}kg
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: pct >= 95 ? T.success : pct >= 85 ? T.warning : T.danger, width: 36, textAlign: 'right' }}>
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: '0 0 8px' }}>이번 달 지표</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { l: '총 수확량', v: Math.round(branch.harvest * mult).toLocaleString(), u: 'kg', sub: `목표 ${branch.harvestT.toLocaleString()}kg` },
                { l: '목표 달성', v: Math.round(branch.harvest / branch.harvestT * 100), u: '%', sub: '▲ 전월 대비 +4%p' },
                { l: 'TBM 이수율', v: branch.tbm, u: '%', sub: branch.tbm === 100 ? '완료' : '미완료 있음' },
              ].map((s, i) => (
                <div key={i} style={{ padding: 12, background: T.bg, borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>{s.l}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: T.text, letterSpacing: -0.3, marginTop: 4 }}>
                    {s.v}<span style={{ fontSize: 12, color: T.mutedSoft, marginLeft: 2 }}>{s.u}</span>
                  </div>
                  <div style={{ fontSize: 10, color: T.mutedSoft, marginTop: 3 }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: `1px solid ${T.borderSoft}` }}>
            <button style={{
              flex: 1, padding: '10px 0', borderRadius: 8, border: `1px solid ${T.border}`,
              background: T.surface, color: T.text, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>지점 대시보드 열기</button>
            <button style={{
              flex: 1, padding: '10px 0', borderRadius: 8, border: 0,
              background: HQ.accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>지점장에게 메시지</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { HQDashboardInteractive };

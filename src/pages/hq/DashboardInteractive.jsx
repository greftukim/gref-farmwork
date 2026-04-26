import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { T, Card, Pill, Dot, Icon, icons, btnPrimary, btnGhostStyle } from '../../design/primitives';
import { HQ } from '../../design/hq-shell';
import useHarvestStore from '../../stores/harvestStore';
import useBranchStore from '../../stores/branchStore';
import useEmployeeStore from '../../stores/employeeStore';
import useIssueStore from '../../stores/issueStore';
import useLeaveStore from '../../stores/leaveStore';
import useAuthStore from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

// 관리팀(본사) 대시보드 — 인터랙티브
// 기간 탭 · 지점 막대 → 클릭 시 작물별 분해 드릴다운 · 승인 필터 · 지점 상세 모달

const FARM_CODES = ['busan', 'jinju', 'hadong'];
const LEAVE_TYPE_KO = { annual: '연차', sick: '병가', personal: '개인', family: '경조사' };
const BRANCH_LABEL_MAP = { busan: '부산LAB', jinju: '진주HUB', hadong: '하동HUB' };
const BRANCH_BC = { busan: T.primary, jinju: T.success, hadong: T.warning };
const BRANCH_ACCENTS = {
  busan: { accent: T.primary, accentSoft: T.primarySoft },
  jinju: { accent: T.success, accentSoft: T.successSoft },
  hadong: { accent: T.warning, accentSoft: T.warningSoft },
};
const CROP_COLORS = {
  토마토: '#E11D48', 완숙토마토: '#DC2626', 방울토마토: '#F97316',
  딸기: '#EC4899', 파프리카: '#F59E0B',
  오이: '#10B981', 미니오이: '#059669', 애호박: '#84CC16', 고추: '#EF4444',
};

// 상대 시간 포맷 (교훈 52: toLocaleString 표시용)
function fmtAgo(iso) {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return '방금';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

function HQDashboardInteractive() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('월');
  const [drillBranch, setDrillBranch] = useState(null);
  const [approvalFilter, setApprovalFilter] = useState('전체');
  const [branchModal, setBranchModal] = useState(null);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [loading, setLoading] = useState(true);

  // store 구독
  const records = useHarvestStore((s) => s.records);
  const fetchCurrentMonth = useHarvestStore((s) => s.fetchCurrentMonth);
  const dbBranches = useBranchStore((s) => s.branches);
  const fetchBranches = useBranchStore((s) => s.fetchBranches);
  const employees = useEmployeeStore((s) => s.employees);
  const fetchEmployees = useEmployeeStore((s) => s.fetchEmployees);
  const issues = useIssueStore((s) => s.issues);
  const fetchIssues = useIssueStore((s) => s.fetchIssues);
  const leaveRequests = useLeaveStore((s) => s.requests);
  const currentUser = useAuthStore((s) => s.currentUser);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        await Promise.all([
          fetchCurrentMonth(),
          fetchBranches(),
          fetchEmployees(currentUser),
          fetchIssues(currentUser),
        ]);
        // 오늘 출근 현황 — join 없이 직접 쿼리 후 store 교차 (교훈 77: 로컬 날짜 포매팅)
        const d = new Date();
        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const empBranchMap = useEmployeeStore.getState().employees.reduce(
          (acc, e) => { acc[e.id] = e.branch; return acc; }, {},
        );
        const { data: attData } = await supabase
          .from('attendance')
          .select('employee_id, status')
          .eq('date', today)
          .not('check_in', 'is', null);
        if (attData) {
          const aMap = {};
          attData.forEach((a) => {
            const br = empBranchMap[a.employee_id];
            if (!br || !FARM_CODES.includes(br)) return;
            if (!aMap[br]) aMap[br] = { checkedIn: 0, late: 0 };
            aMap[br].checkedIn++;
            if (a.status === 'late') aMap[br].late++;
          });
          setAttendanceMap(aMap);
        }
      } catch (err) {
        console.error('[DashboardInteractive] load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // 지점별 실데이터 branches 배열 (harvestStore currentMonth 기준 — 교훈 74)
  const branches = useMemo(() => {
    const byBranchMap = {};
    const byCropMap = {};
    records.forEach((r) => {
      const br = r.employee?.branch;
      const crop = r.crop?.name;
      if (!br || !FARM_CODES.includes(br)) return;
      byBranchMap[br] = (byBranchMap[br] || 0) + Number(r.quantity || 0);
      if (crop) {
        if (!byCropMap[br]) byCropMap[br] = {};
        byCropMap[br][crop] = (byCropMap[br][crop] || 0) + Number(r.quantity || 0);
      }
    });

    const workersByBranch = {};
    const mgrByBranch = {};
    employees.forEach((e) => {
      if (!FARM_CODES.includes(e.branch)) return;
      if (e.isActive) workersByBranch[e.branch] = (workersByBranch[e.branch] || 0) + 1;
      // 지점장: farm_admin 중 첫 번째 실명 (재배팀 계정 제외)
      if (e.role === 'farm_admin' && !mgrByBranch[e.branch] && !e.name.includes('재배팀')) {
        mgrByBranch[e.branch] = e.name;
      }
    });

    return FARM_CODES.map((code) => {
      const dbB = dbBranches.find((b) => b.code === code) || {};
      const harvest = Math.round(byBranchMap[code] || 0);
      const harvestT = Number(dbB.monthlyHarvestTargetKg || 0) || 1;
      const workers = workersByBranch[code] || 0;
      const att = attendanceMap[code] || { checkedIn: 0, late: 0 };
      const checkedIn = att.checkedIn;
      const late = att.late;
      const rate = workers > 0 ? Math.round((checkedIn / workers) * 100) : 0;
      const ac = BRANCH_ACCENTS[code] || { accent: T.muted, accentSoft: T.bg };
      const cropMap = byCropMap[code] || {};
      const cropCount = Math.max(Object.keys(cropMap).length, 1);
      const crops = Object.entries(cropMap)
        .sort((a, b) => b[1] - a[1])
        .map(([name, v]) => ({
          name, v: Math.round(v),
          t: Math.round(harvestT / cropCount),
          c: CROP_COLORS[name] || '#6366F1',
        }));
      return {
        code,
        name: dbB.name || code,
        mgr: mgrByBranch[code] || '—',
        workers,
        checkedIn,
        late,
        rate,
        harvest,
        harvestT,
        tbm: 100,
        ...ac,
        status: harvest > 0 && (harvest / harvestT) < 0.7 ? 'alert' : 'active',
        crops: crops.length > 0 ? crops : [{ name: '데이터 없음', v: 0, t: harvestT, c: T.muted }],
      };
    });
  }, [records, dbBranches, employees, attendanceMap]);

  // 실데이터 집계
  const realMonthHarvest = useMemo(
    () => records.reduce((s, r) => s + Number(r.quantity || 0), 0),
    [records],
  );
  const totalTarget = useMemo(
    () => dbBranches.filter((b) => FARM_CODES.includes(b.code)).reduce((s, b) => s + Number(b.monthlyHarvestTargetKg || 0), 0),
    [dbBranches],
  );
  const openIssueCount = useMemo(() => issues.filter((i) => !i.isResolved).length, [issues]);

  // 기간별 스케일 배수 (가동률/인건비는 하드코딩 유지 — HQ-DASHBOARD-INTERACTIVE-002)
  const periodMeta = {
    '일': { mult: 0.048, label: '일간 · 오늘', laborU: '만원', ga: 87, gaSub: '오늘 기준' },
    '주': { mult: 0.24, label: '주간 · 이번 주', laborU: '만원', ga: 89, gaSub: '주간 평균' },
    '월': { mult: 1, label: '월간 · 이번 달', laborU: '만원', ga: 88, gaSub: '월간 평균' },
    '분기': { mult: 3.1, label: '분기 · 2026 2Q', laborU: '억원', ga: 90, gaSub: '분기 평균' },
  };
  const pmBase = periodMeta[period];
  const pm = {
    ...pmBase,
    // 수확량: 월 실데이터 × 기간 배수 (교훈 52: toLocaleString 적용은 렌더에서)
    kpiHarvest: Math.round(realMonthHarvest * pmBase.mult),
    harvestT: totalTarget > 0 ? Math.round(totalTarget * pmBase.mult) : 3250,
    // 인건비: 하드코딩 유지 (HQ-DASHBOARD-INTERACTIVE-002)
    labor: period === '분기' ? '2.52' : period === '월' ? '8,420' : period === '주' ? '1,980' : '280',
    // 미해결이슈: 실데이터
    issue: openIssueCount,
    issueSub: openIssueCount === 0 ? '이슈 없음' : `병해충 ${issues.filter((i) => !i.isResolved && i.type === '병해충').length}건 포함`,
  };

  // 승인 결재 실데이터 (HQ-DASHBOARD-INTERACTIVE-003)
  const approvals = useMemo(() => {
    const pending = leaveRequests.filter((r) => r.status === 'pending');
    return pending.map((r) => {
      const emp = employees.find((e) => e.id === r.employeeId);
      const branch = emp?.branch || '';
      return {
        id: r.id,
        branch: BRANCH_LABEL_MAP[branch] || branch || '—',
        bc: BRANCH_BC[branch] || T.primary,
        name: emp?.name || '직원',
        tag: '근태',
        tagTone: 'primary',
        type: `${LEAVE_TYPE_KO[r.type] || r.type || '휴가'} 신청`,
        detail: r.date || '—',
        time: fmtAgo(r.createdAt),
        urgent: false,
      };
    });
  }, [leaveRequests, employees]);

  const approvalFiltered = approvalFilter === '전체' ? approvals : approvals.filter((a) => a.tag === approvalFilter);
  const approvalCounts = {
    '전체': approvals.length,
    '근태': approvals.length,
    '예산': 0,
    '인사': 0,
    '자재': 0,
  };

  // 이슈피드용 보조 맵
  const empMap = useMemo(
    () => employees.reduce((acc, e) => { acc[e.id] = e; return acc; }, {}),
    [employees],
  );
  const branchNameMap = useMemo(
    () => dbBranches.reduce((acc, b) => { acc[b.code] = b.name; return acc; }, {}),
    [dbBranches],
  );

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, position: 'relative' }}>
      <HQTopBarInteractive
        subtitle={`본사 · 다지점 통합 · ${pm.label}`}
        title="운영 리포트"
        period={period}
        onPeriodChange={setPeriod}
        onNotice={() => navigate('/admin/hq/notices')}
      />

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
          <span style={{ fontSize: 13, color: T.mutedSoft }}>데이터 로딩 중...</span>
        </div>
      )}
      {!loading && <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* KPI 4개 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { label: `${period === '일' ? '오늘' : period === '주' ? '이번 주' : period === '월' ? '이번 달' : '이번 분기'} 가동률`, value: pm.ga, unit: '%', sub: pm.gaSub, trend: '+2.1%p', tone: 'success' },
            { label: `${period} 수확량`, value: pm.kpiHarvest.toLocaleString(), unit: 'kg', sub: `목표 ${pm.harvestT.toLocaleString()}kg · ${pm.harvestT > 0 ? Math.round(pm.kpiHarvest / pm.harvestT * 100) : 0}%`, trend: '실데이터', tone: 'primary' },
            { label: `${period} 인건비`, value: pm.labor, unit: pm.laborU, sub: '예산 대비 91%', trend: '추정', tone: 'warning' },
            { label: '미해결 이슈', value: pm.issue, unit: '건', sub: pm.issueSub, trend: pm.issue > 0 ? '확인 필요' : '정상', tone: pm.issue > 0 ? 'danger' : 'success' },
          ].map((k, i) => {
            const tones = { success: T.success, primary: HQ.accent, warning: T.warning, danger: T.danger };
            const softs = { success: T.successSoft, primary: HQ.accentSoft, warning: T.warningSoft, danger: T.dangerSoft };
            const isClickable = k.label === '미해결 이슈';
            return (
              <Card key={i} pad={18} style={{ position: 'relative', overflow: 'hidden', cursor: isClickable ? 'pointer' : 'default' }}
                onClick={isClickable ? () => navigate('/admin/hq/issues') : undefined}>
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
            <span onClick={() => navigate('/admin/hq/branches')} style={{ fontSize: 11, color: HQ.accent, fontWeight: 600, cursor: 'pointer' }}>지점 관리 →</span>
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
                      { l: '수확', v: Math.round(b.harvest * pmBase.mult).toLocaleString(), u: 'kg' },
                      { l: '달성', v: b.harvestT > 0 ? Math.round(b.harvest / b.harvestT * 100) : 0, u: '%' },
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
                      {Math.round(b.harvest * pmBase.mult).toLocaleString()}
                    </span>
                    <span style={{ fontSize: 13, color: T.mutedSoft }}>kg</span>
                    <Pill tone="success">목표 대비 {b.harvestT > 0 ? Math.round(b.harvest / b.harvestT * 100) : 0}%</Pill>
                  </div>
                </div>
              );
            })() : (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>지점별 수확량 비교</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
                  <span style={{ fontSize: 24, fontWeight: 700, color: T.text, letterSpacing: -0.6, lineHeight: 1 }}>
                    {Math.round(branches.reduce((s, b) => s + b.harvest, 0) * pmBase.mult).toLocaleString()}
                  </span>
                  <span style={{ fontSize: 13, color: T.mutedSoft }}>kg</span>
                  <Pill tone="success">목표 대비 {pm.harvestT > 0 ? Math.round(pm.kpiHarvest / pm.harvestT * 100) : 0}%</Pill>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: T.mutedSoft }}>막대 클릭 → 작물별 분해</span>
                </div>
              </div>
            )}

            {/* 차트 */}
            {drillBranch ? (
              <CropBarChart branch={branches.find(b => b.code === drillBranch)} mult={pmBase.mult} />
            ) : (
              <BranchBarChart branches={branches} mult={pmBase.mult} onDrill={setDrillBranch} />
            )}
          </Card>

          {/* 승인 결재 */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>승인 결재</h3>
                <Pill tone="danger">{approvalFiltered.length}</Pill>
              </div>
              <span onClick={() => navigate('/admin/hq/approvals')} style={{ fontSize: 11, color: HQ.accent, fontWeight: 600, cursor: 'pointer' }}>전체 →</span>
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
          <IssueFeedCard issues={issues} empMap={empMap} branchNameMap={branchNameMap} onViewAll={() => navigate('/admin/hq/issues')} />
          <NoticeMgmtCard onNewNotice={() => navigate('/admin/hq/notices')} />
        </div>
      </div>}

      {!loading && branchModal && <BranchDetailModal branch={branchModal} onClose={() => setBranchModal(null)} mult={pmBase.mult} />}
    </div>
  );
}

// ─── 상단바 ───
function HQTopBarInteractive({ title, subtitle, period, onPeriodChange, onNotice }) {
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
        {btnPrimary('전사 공지', icons.plus, onNotice)}
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
          const h = max > 0 ? (v / max) * CHART_H : 0;
          const th = max > 0 ? (tv / max) * CHART_H : 0;
          const isHover = hover === b.code;
          const pct = tv > 0 ? Math.round(v / tv * 100) : 0;
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
          const h = max > 0 ? (v / max) * CHART_H : 0;
          const th = max > 0 ? (tv / max) * CHART_H : 0;
          const isHover = hover === c.name;
          const pct = tv > 0 ? Math.round(v / tv * 100) : 0;
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
          const pct = c.t > 0 ? Math.round(c.v / c.t * 100) : 0;
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

// ─── 하단 카드 3개 ───
function FinanceTrendCard() {
  const [chartData, setChartData] = useState([]);
  const [summary, setSummary] = useState({ revenue: 0, laborRate: '—', costPerKg: null });

  useEffect(() => {
    async function load() {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const [{ data: m }, { data: h }] = await Promise.all([
        supabase.from('finance_monthly').select('year,month,revenue,labor_cost,material_cost,energy_cost,maintenance_cost,training_cost,other_cost').order('year,month'),
        supabase.from('harvest_records').select('date,quantity'),
      ]);
      if (!m) return;
      const map = {};
      m.forEach(r => {
        const k = `${r.year}-${String(r.month).padStart(2, '0')}`;
        if (!map[k]) map[k] = { key: k, label: `${r.month}월`, revenue: 0, labor: 0, cost: 0 };
        map[k].revenue += (r.revenue || 0);
        map[k].labor += (r.labor_cost || 0);
        map[k].cost += (r.labor_cost || 0) + (r.material_cost || 0) + (r.energy_cost || 0)
          + (r.maintenance_cost || 0) + (r.training_cost || 0) + (r.other_cost || 0);
      });
      const sorted = Object.values(map).sort((a, b) => (a.key < b.key ? -1 : 1));
      setChartData(sorted.slice(-7).map(d => ({
        ...d,
        revenue: Math.round(d.revenue / 10000),
        labor: Math.round(d.labor / 10000),
      })));
      const ytd = m.filter(r => r.year === currentYear && r.month <= currentMonth);
      const ytdRevenue = ytd.reduce((s, r) => s + (r.revenue || 0), 0);
      const ytdLabor = ytd.reduce((s, r) => s + (r.labor_cost || 0), 0);
      const ytdCost = ytd.reduce((s, r) =>
        s + (r.labor_cost || 0) + (r.material_cost || 0) + (r.energy_cost || 0)
        + (r.maintenance_cost || 0) + (r.training_cost || 0) + (r.other_cost || 0), 0);
      const laborRate = ytdRevenue > 0 ? (ytdLabor / ytdRevenue * 100).toFixed(1) : '—';
      let costPerKg = null;
      if (h && h.length > 0) {
        const ytdKg = h.filter(r => {
          const d = new Date(r.date);
          return d.getFullYear() === currentYear && d.getMonth() + 1 <= currentMonth;
        }).reduce((s, r) => s + Number(r.quantity || 0), 0);
        costPerKg = ytdKg > 0 ? Math.round(ytdCost / ytdKg) : null;
      }
      setSummary({ revenue: ytdRevenue, laborRate, costPerKg });
    }
    load();
  }, []);

  const revenueDisplay = summary.revenue >= 100000000
    ? `${(summary.revenue / 100000000).toFixed(1)}억원`
    : summary.revenue > 0
      ? `${Math.round(summary.revenue / 10000).toLocaleString()}만원`
      : '—';

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>월별 경영 지표</h3>
          <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 11 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: HQ.accent, display: 'inline-block' }} />
              <span style={{ color: T.muted, fontWeight: 600 }}>수확액</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 2, background: T.warning, display: 'inline-block' }} />
              <span style={{ color: T.muted, fontWeight: 600 }}>인건비</span>
            </span>
          </div>
        </div>
      </div>
      <div style={{ height: 140 }}>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.borderSoft} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: T.mutedSoft }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}억` : `${v}`}
                tick={{ fontSize: 9, fill: T.mutedSoft }} axisLine={false} tickLine={false}
              />
              <Tooltip
                formatter={(v, name) => [`${v.toLocaleString()}만원`, name === 'revenue' ? '수확액' : '인건비']}
                contentStyle={{ fontSize: 10, borderRadius: 6, border: `1px solid ${T.border}` }}
              />
              <Bar dataKey="revenue" fill={HQ.accent} radius={[3, 3, 0, 0]} maxBarSize={28} opacity={0.8} />
              <Line dataKey="labor" stroke={T.warning} strokeWidth={2} dot={{ r: 2, fill: T.warning, strokeWidth: 0 }} strokeDasharray="4 3" />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: T.mutedSoft, fontSize: 12 }}>
            로딩 중…
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.mutedSoft, padding: '0 2px', marginTop: 4 }}>
        {chartData.map(d => <span key={d.key}>{d.label}</span>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.borderSoft}` }}>
        {[
          { l: '수확액(YTD)', v: revenueDisplay },
          { l: '인건비율(YTD)', v: summary.laborRate !== '—' ? `${summary.laborRate}%` : '—' },
          { l: 'kg당 원가', v: summary.costPerKg !== null ? `${summary.costPerKg.toLocaleString()}원` : '—' },
        ].map((s, i) => (
          <div key={i}>
            <div style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 600 }}>{s.l}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text, letterSpacing: -0.3, marginTop: 2 }}>{s.v}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// 이상 신고 피드 — 실데이터 (issueStore 경유)
const TYPE_META = {
  병해충: { tone: 'danger', bg: () => T.dangerSoft, border: () => T.danger },
  시설이상: { tone: 'warning', bg: () => T.warningSoft, border: () => T.warning },
  작물이상: { tone: 'info', bg: () => T.infoSoft, border: () => T.info },
  기타: { tone: 'muted', bg: () => T.bg, border: () => T.borderSoft },
};

function IssueFeedCard({ issues, empMap, branchNameMap, onViewAll }) {
  const recentOpen = issues.filter((i) => !i.isResolved).slice(0, 4);
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>전 지점 이상 신고</h3>
          <Pill tone="danger">{issues.filter((i) => !i.isResolved).length}</Pill>
        </div>
        <span onClick={onViewAll} style={{ fontSize: 11, color: HQ.accent, fontWeight: 600, cursor: 'pointer' }}>전체 →</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {recentOpen.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: T.mutedSoft, fontSize: 12 }}>미해결 이슈 없음</div>
        ) : recentOpen.map((it) => {
          const meta = TYPE_META[it.type] || TYPE_META['기타'];
          const emp = empMap[it.workerId];
          const brName = branchNameMap[emp?.branch] || emp?.branch || '—';
          const brAccent = emp?.branch === 'busan' ? T.primary : emp?.branch === 'jinju' ? T.success : T.warning;
          return (
            <div key={it.id} style={{ padding: '10px 12px', background: meta.bg(), borderRadius: 8, borderLeft: `3px solid ${meta.border()}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Dot c={brAccent} />
                <span style={{ fontSize: 11, fontWeight: 700, color: T.muted }}>{brName}</span>
                <Pill tone={meta.tone} size="sm">{it.type}</Pill>
                <span style={{ fontSize: 10, color: T.mutedSoft, marginLeft: 'auto' }}>{fmtAgo(it.createdAt)}</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{it.comment || '—'}</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{emp?.name || '—'}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function NoticeMgmtCard({ onNewNotice }) {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>공지 · 정책 관리</h3>
        <span onClick={onNewNotice} style={{ fontSize: 11, color: HQ.accent, fontWeight: 600, cursor: 'pointer' }}>+ 새 공지</span>
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
        <span style={{ color: T.mutedSoft }}>활성 <span style={{ color: T.text, fontWeight: 700 }}>4건</span></span>
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
                const pct = c.t > 0 ? Math.round(c.v / c.t * 100) : 0;
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
                { l: '목표 달성', v: branch.harvestT > 0 ? Math.round(branch.harvest / branch.harvestT * 100) : 0, u: '%', sub: '이번 달 기준' },
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

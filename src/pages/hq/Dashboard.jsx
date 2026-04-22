import React, { useState, useEffect, useMemo } from 'react';
import { T, Card, Pill, Dot, Icon, icons, btnPrimary, btnSecondary } from '../../design/primitives';
import { HQ, HQTopBar } from '../../design/hq-shell';
import { supabase } from '../../lib/supabase';
import useEmployeeStore from '../../stores/employeeStore';
import useLeaveStore from '../../stores/leaveStore';
import useIssueStore from '../../stores/issueStore';
import useNoticeStore from '../../stores/noticeStore';
import useAuthStore from '../../stores/authStore';
import useAttendanceStore from '../../stores/attendanceStore';

const D_BRANCH_META = {
  busan:        { name: '부산LAB',  dot: T.primary,   avatar: 'blue',    accent: T.primary,   accentSoft: T.primarySoft  },
  jinju:        { name: '진주HUB',  dot: T.success,   avatar: 'emerald', accent: T.success,   accentSoft: T.successSoft  },
  hadong:       { name: '하동HUB',  dot: T.warning,   avatar: 'amber',   accent: T.warning,   accentSoft: T.warningSoft  },
  headquarters: { name: '총괄본사', dot: T.text,      avatar: 'slate' },
  management:   { name: '관리팀',   dot: HQ.accent,   avatar: 'slate' },
  seedlab:      { name: 'Seed LAB', dot: T.mutedSoft, avatar: 'slate' },
};

// 관리팀(본사) 대시보드 화면
function HQDashboardScreen() {
  const employees    = useEmployeeStore((s) => s.employees);
  const fetchEmployees = useEmployeeStore((s) => s.fetchEmployees);
  const requests     = useLeaveStore((s) => s.requests);
  const fetchRequests = useLeaveStore((s) => s.fetchRequests);
  const farmReview   = useLeaveStore((s) => s.farmReview);
  const issues       = useIssueStore((s) => s.issues);
  const fetchIssues  = useIssueStore((s) => s.fetchIssues);
  const notices      = useNoticeStore((s) => s.notices);
  const fetchNotices = useNoticeStore((s) => s.fetchNotices);
  const currentUser  = useAuthStore((s) => s.currentUser);
  const records      = useAttendanceStore((s) => s.records);
  const fetchRecords = useAttendanceStore((s) => s.fetchRecords);

  const [monthlyHarvestByEmp, setMonthlyHarvestByEmp] = useState({});
  const [approvalFilter, setApprovalFilter] = useState('all');

  useEffect(() => {
    fetchEmployees();
    fetchRequests();
    fetchIssues();
    fetchNotices();
    fetchRecords();
    // harvest_records: employee_id별 이번 달 수확량 집계 (행 없으면 빈 map)
    const now = new Date();
    const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    supabase.from('harvest_records').select('quantity, employee_id').gte('date', firstOfMonth)
      .then(({ data }) => {
        if (!data) return;
        const map = {};
        data.forEach((r) => { map[r.employee_id] = (map[r.employee_id] || 0) + (r.quantity || 0); });
        setMonthlyHarvestByEmp(map);
      });
  }, []);

  const today = new Date().toISOString().split('T')[0];

  const bwc = (code) => employees.filter((e) => e.branch === code && e.isActive).length;

  const branchMgr = (code) =>
    employees.find((e) => e.branch === code && e.role === 'farm_admin' && e.isActive)?.name || '—';

  const branchAttendance = (code) => {
    const empIds = new Set(employees.filter((e) => e.branch === code && e.isActive).map((e) => e.id));
    const todayRecs = records.filter((r) => r.date === today && empIds.has(r.employeeId));
    return {
      checkedIn: todayRecs.filter((r) => r.checkIn).length,
      late: todayRecs.filter((r) => r.status === 'late').length,
    };
  };

  const branchHarvest = (code) => {
    const empIds = new Set(employees.filter((e) => e.branch === code && e.isActive).map((e) => e.id));
    return [...empIds].reduce((sum, id) => sum + (monthlyHarvestByEmp[id] || 0), 0);
  };

  // 지점 — workers/mgr/checkedIn/late/harvest 실데이터, harvestT/tbm BACKLOG
  const branches = ['busan', 'jinju', 'hadong'].map((code) => {
    const m = D_BRANCH_META[code];
    const workers = bwc(code);
    const att = branchAttendance(code);
    const harvest = branchHarvest(code);
    const rate = workers > 0 ? Math.round(att.checkedIn / workers * 100) : 0;
    return {
      code, name: m.name, accent: m.accent, accentSoft: m.accentSoft,
      mgr: branchMgr(code),
      workers, checkedIn: att.checkedIn, late: att.late, rate,
      harvest,
      harvestT: 0,  // BACKLOG: HARVEST-TABLE-001
      tbm: 0,       // BACKLOG: TBM-COMPLETION-001
      status: rate < 80 && workers > 0 ? 'alert' : 'active',
    };
  });

  const totalWorkers   = branches.reduce((s, b) => s + b.workers, 0);
  const totalCheckedIn = branches.reduce((s, b) => s + b.checkedIn, 0);
  const totalHarvest   = branches.reduce((s, b) => s + b.harvest, 0);
  const totalTarget    = branches.reduce((s, b) => s + b.harvestT, 0);

  const openIssues   = issues.filter((i) => !i.isResolved);
  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  const pendingLeave = useMemo(() =>
    requests.filter((r) => r.status === 'pending').slice(0, 5).map((r) => {
      const emp = employees.find((e) => e.id === r.employeeId);
      const bm = D_BRANCH_META[emp?.branch] || { name: emp?.branch || '—', dot: T.mutedSoft };
      return {
        id: r.id, branch: bm.name, bc: bm.dot, name: emp?.name || '—',
        tag: '근태', tagTone: 'primary', type: r.type,
        detail: `${r.date}${r.reason ? ' · ' + r.reason.slice(0, 12) : ''}`,
        time: r.createdAt ? new Date(r.createdAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) + '일' : '—',
        urgent: false,
      };
    }), [requests, employees]);

  const issueFeed = useMemo(() =>
    openIssues.slice(0, 4).map((i) => {
      const emp = employees.find((e) => e.id === i.workerId);
      const bm = D_BRANCH_META[emp?.branch] || { name: '—', dot: T.mutedSoft };
      const sevMap = { '병해충': 'critical', '설비고장': 'critical', '작물이상': 'warning' };
      return {
        branch: bm.name, bc: bm.dot, severity: sevMap[i.type] || 'info',
        type: i.type, place: '—', who: emp?.name || '—',
        time: i.createdAt ? new Date(i.createdAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) + '일' : '—',
        note: i.comment || '이상 신고',
      };
    }), [issues, employees]);

  const noticeItems = useMemo(() =>
    notices.slice(0, 4).map((n) => ({
      tag: n.priority === 'important' ? '전사 · 중요' : (n.authorTeam || '정책'),
      tone: n.priority === 'important' ? 'danger' : 'info',
      title: n.title,
      meta: `작성 ${new Date(n.createdAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}일`,
      pinned: n.priority === 'important',
    })), [notices]);

  const now = new Date();
  const titleStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 · 월간 운영 리포트`;
  const gadongyulSub = totalWorkers > 0 ? `${totalCheckedIn} / ${totalWorkers}명 출근` : '출근 데이터 없음';
  const harvestSub = totalTarget > 0
    ? `목표 ${totalTarget.toLocaleString()}kg · ${Math.round(totalHarvest / totalTarget * 100)}%`
    : '수확 목표 없음';

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg }}>
      <HQTopBar
        subtitle="본사 · 다지점 통합"
        title={titleStr}
        actions={<>{btnSecondary('리포트 내보내기', icons.chart)}{btnPrimary('전사 공지 작성', icons.plus)}</>}
      />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ─────── 전사 KPI 4개 ─────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { label: '전사 가동률', value: totalWorkers > 0 ? Math.round(totalCheckedIn / totalWorkers * 100) : 0, unit: '%', sub: gadongyulSub, trend: '—', tone: 'success' },
            { label: '월 수확량', value: totalHarvest.toLocaleString(), unit: 'kg', sub: harvestSub, trend: '—', tone: 'primary' },
            { label: '월 인건비', value: '—', unit: '', sub: '집계 없음', trend: '—', tone: 'warning' },
            { label: '미해결 이슈', value: openIssues.length, unit: '건', sub: '이상 신고 미해결', trend: '긴급', tone: 'danger' },
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
              <span style={{ fontSize: 11, color: T.mutedSoft }}>오늘 기준</span>
            </div>
            <span style={{ fontSize: 11, color: HQ.accent, fontWeight: 600, cursor: 'pointer' }}>지점 관리 →</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {branches.map((b) => (
              <Card key={b.code} pad={0} style={{ overflow: 'hidden', cursor: 'pointer' }}>
                <div style={{
                  padding: '14px 16px', background: b.accentSoft,
                  borderBottom: `1px solid ${T.borderSoft}`,
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
                      <div style={{ fontSize: 10, color: T.mutedSoft, marginTop: 1 }}>지점장 {b.mgr}</div>
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
                      <div style={{ width: `${b.rate}%`, height: '100%', background: b.accent }} />
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 6, fontSize: 10, color: T.mutedSoft }}>
                      <span>정상 <span style={{ color: T.success, fontWeight: 700 }}>{b.checkedIn - b.late}</span></span>
                      <span>지각 <span style={{ color: T.warning, fontWeight: 700 }}>{b.late}</span></span>
                      <span>미출근 <span style={{ color: T.danger, fontWeight: 700 }}>{b.workers - b.checkedIn}</span></span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, paddingTop: 12, borderTop: `1px solid ${T.borderSoft}` }}>
                    {[
                      { l: '수확', v: b.harvest > 0 ? b.harvest : '—', u: b.harvest > 0 ? 'kg' : '' },
                      { l: '달성', v: b.harvestT > 0 ? `${Math.round(b.harvest / b.harvestT * 100)}` : '—', u: b.harvestT > 0 ? '%' : '' },
                      { l: 'TBM', v: '—', u: '' },
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

        {/* ─────── 지점별 수확량 비교 + 승인 허브 ─────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>이번 달 지점별 수확량</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
                  <span style={{ fontSize: 28, fontWeight: 700, color: T.text, letterSpacing: -0.6, lineHeight: 1 }}>{totalHarvest.toLocaleString()}</span>
                  <span style={{ fontSize: 13, color: T.mutedSoft, fontWeight: 500 }}>kg</span>
                  {totalTarget > 0 && <Pill tone="success">목표 대비 {Math.round(totalHarvest / totalTarget * 100)}%</Pill>}
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

            {/* 주별 바 차트 — 주간 집계 없음, 0으로 표시 (BACKLOG: HARVEST-WEEKLY-001) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
              {branches.map((b) => {
                const weeks = [{ w: '1주', v: 0 }, { w: '2주', v: 0 }, { w: '3주', v: 0 }, { w: '4주', v: 0 }];
                const max = 360;
                return (
                  <div key={b.code}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Dot c={b.accent} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{b.name}</span>
                      </div>
                      <div style={{ fontSize: 11, color: T.mutedSoft }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{b.harvest.toLocaleString()}</span>
                        {b.harvestT > 0 ? ` / ${b.harvestT.toLocaleString()}kg` : ' kg'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 3, height: 32, alignItems: 'flex-end' }}>
                      {weeks.map((w, i) => (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                          <div style={{
                            width: '100%', height: `${Math.max(w.v / max * 100, 0)}%`,
                            background: b.accent, borderRadius: '3px 3px 0 0', minHeight: 4, opacity: 0.25,
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
              <span>전년 동월 대비 <span style={{ fontWeight: 700 }}>—</span></span>
              <span>작물별 상세 분석 → <span style={{ color: HQ.accent, fontWeight: 600, cursor: 'pointer' }}>보고서 열기</span></span>
            </div>
          </Card>

          {/* 승인 허브 */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>승인 허브</h3>
                <Pill tone="danger">{pendingCount}</Pill>
              </div>
              <span style={{ fontSize: 11, color: HQ.accent, fontWeight: 600, cursor: 'pointer' }}>전체 →</span>
            </div>

            {/* 필터 탭 — 근태=leave_requests 전체, 예산/인사/자재 테이블 없음→0 (BACKLOG: APPROVAL-CATEGORY-001) */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, fontSize: 11 }}>
              {[
                { k: 'all',        l: '전체', n: pendingCount },
                { k: 'attendance', l: '근태', n: pendingCount },
                { k: 'budget',     l: '예산', n: 0 },
                { k: 'hr',         l: '인사', n: 0 },
                { k: 'material',   l: '자재', n: 0 },
              ].map((p) => {
                const on = approvalFilter === p.k;
                return (
                  <span key={p.k} onClick={() => setApprovalFilter(p.k)} style={{
                    padding: '4px 9px', borderRadius: 6, fontWeight: 600, cursor: 'pointer',
                    background: on ? T.text : T.bg,
                    color: on ? '#fff' : T.muted,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    {p.l}
                    <span style={{
                      fontSize: 9, padding: '0 5px', borderRadius: 999,
                      background: on ? 'rgba(255,255,255,0.2)' : T.borderSoft,
                      color: on ? '#fff' : T.muted,
                    }}>{p.n}</span>
                  </span>
                );
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340, overflow: 'auto' }}>
              {approvalFilter !== 'all' && approvalFilter !== 'attendance' ? (
                <div style={{ padding: 20, textAlign: 'center', color: T.mutedSoft, fontSize: 12 }}>해당 카테고리 데이터 없음</div>
              ) : pendingLeave.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: T.mutedSoft, fontSize: 12 }}>대기 중인 승인 요청 없음</div>
              ) : pendingLeave.map((r) => (
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
                    <button onClick={() => farmReview(r.id, false, currentUser?.id)} style={{
                      flex: 1, padding: '5px 0', borderRadius: 6, border: `1px solid ${T.border}`,
                      background: T.surface, color: T.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    }}>반려</button>
                    <button onClick={() => farmReview(r.id, true, currentUser?.id)} style={{
                      flex: 1, padding: '5px 0', borderRadius: 6, border: 0,
                      background: HQ.accent, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    }}>승인</button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ─────── 경영지표 트렌드 + 이슈피드 + 공지 ─────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 20 }}>
          {/* 경영 지표 트렌드 — 재무 집계 없음 (BACKLOG: HQ-FINANCE-001) */}
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
                    <span style={{ width: 10, height: 2, background: T.warning }} />
                    <span style={{ color: T.muted, fontWeight: 600 }}>인건비</span>
                  </span>
                </div>
              </div>
              <span style={{ fontSize: 11, color: HQ.accent, fontWeight: 600, cursor: 'pointer' }}>상세 →</span>
            </div>

            <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg, borderRadius: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: T.mutedSoft }}>재무 데이터 집계 없음</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.mutedSoft, padding: '0 2px' }}>
              {['10월', '11월', '12월', '1월', '2월', '3월', '4월'].map((m) => <span key={m}>{m}</span>)}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${T.borderSoft}` }}>
              {[
                { l: '수확액', v: '—', sub: '집계 없음', tone: T.mutedSoft },
                { l: '인건비율', v: '—', sub: '집계 없음', tone: T.mutedSoft },
                { l: 'kg당 원가', v: '—', sub: '집계 없음', tone: T.mutedSoft },
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
                <Pill tone="danger">{openIssues.length}</Pill>
              </div>
              <span style={{ fontSize: 11, color: HQ.accent, fontWeight: 600, cursor: 'pointer' }}>전체 →</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {issueFeed.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: T.mutedSoft, fontSize: 12 }}>미해결 이슈 없음</div>
              ) : issueFeed.map((it, i) => {
                const sevTone = { critical: 'danger', warning: 'warning', info: 'info' }[it.severity];
                const sevBg = { critical: T.dangerSoft, warning: T.warningSoft, info: T.infoSoft }[it.severity];
                const sevBorder = { critical: T.danger, warning: T.warning, info: T.info }[it.severity];
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
              <div style={{ padding: 10, background: T.bg, borderRadius: 8, textAlign: 'center' }}>
                <span style={{ fontSize: 11, color: T.mutedSoft }}>해결됨 · 총 {issues.filter((i) => i.isResolved).length}건</span>
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
              {noticeItems.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: T.mutedSoft, fontSize: 12 }}>공지 없음</div>
              ) : noticeItems.map((n, i) => {
                const tones = { danger: T.danger, primary: T.primary, success: T.success, warning: T.warning, info: HQ.accent, muted: T.mutedSoft };
                const softs = { danger: T.dangerSoft, primary: T.primarySoft, success: T.successSoft, warning: T.warningSoft, info: HQ.accentSoft, muted: T.bg };
                return (
                  <div key={i} style={{ padding: '10px 12px', background: T.bg, borderRadius: 8, borderLeft: n.pinned ? `3px solid ${T.danger}` : '3px solid transparent' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: softs[n.tone], color: tones[n.tone] }}>{n.tag}</span>
                      {n.pinned && <Icon d="M10 2l2 5 5 1-4 4 1 6-5-3-5 3 1-6-4-4 5-1z" size={11} c={T.danger} />}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.text, lineHeight: 1.35 }}>{n.title}</div>
                    <div style={{ fontSize: 10, color: T.mutedSoft, marginTop: 3 }}>{n.meta}</div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.borderSoft}`, display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: T.mutedSoft }}>활성 공지 <span style={{ color: T.text, fontWeight: 700 }}>{notices.length}건</span></span>
              <span style={{ color: T.mutedSoft }}>평균 열람률 <span style={{ fontWeight: 700 }}>—</span></span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export { HQDashboardScreen };

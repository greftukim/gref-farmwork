import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { HQ, HQTopBar } from '../../design/hq-shell';
import { Card, Dot, Icon, Pill, T, btnPrimary, btnSecondary, icons } from '../../design/primitives';
import useAuthStore from '../../stores/authStore';
import useBranchStore from '../../stores/branchStore';
import useEmployeeStore from '../../stores/employeeStore';
import useAttendanceStore from '../../stores/attendanceStore';
import useIssueStore from '../../stores/issueStore';
import useLeaveStore from '../../stores/leaveStore';
import useOvertimeStore from '../../stores/overtimeStore';
import useNoticeStore from '../../stores/noticeStore';

// ─── 상수 ───────────────────────────────────────────────
const TODAY = new Date().toISOString().split('T')[0];
const FARM_BRANCHES = ['busan', 'jinju', 'hadong'];
const BRANCH_ACCENT = { busan: T.primary, jinju: T.success, hadong: T.warning };
const BRANCH_ACCENT_SOFT = { busan: T.primarySoft, jinju: T.successSoft, hadong: T.warningSoft };
const BRANCH_NAMES = { busan: '부산LAB', jinju: '진주HUB', hadong: '하동HUB', headquarters: '총괄본사', management: '관리팀', seedlab: 'Seed LAB' };

const LEAVE_TYPE_KO = {
  annual: '연차 신청', half_am: '오전 반차', half_pm: '오후 반차',
  special: '특별휴가', sick: '병가',
};

function branchDisplayName(code) { return BRANCH_NAMES[code] || code || '-'; }

function timeAgo(iso) {
  if (!iso) return '-';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return d === 1 ? '어제' : `${d}일 전`;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}/${d.getDate()} (${days[d.getDay()]})`;
}

// ─── 메인 컴포넌트 ───────────────────────────────────────
function HQDashboardScreen() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);
  const branchList = useBranchStore((s) => s.branches);
  const employees = useEmployeeStore((s) => s.employees);
  const records = useAttendanceStore((s) => s.records);
  const issues = useIssueStore((s) => s.issues);
  const leaveRequests = useLeaveStore((s) => s.requests);
  const overtimeRequests = useOvertimeStore((s) => s.requests);
  const notices = useNoticeStore((s) => s.notices);

  const leaveApprove = useLeaveStore((s) => s.farmReview);
  const otApprove = useOvertimeStore((s) => s.approveRequest);
  const otReject = useOvertimeStore((s) => s.rejectRequest);

  const [approvalError, setApprovalError] = useState(null);

  // 직원 ID → 객체 룩업맵
  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);

  // ─── 지점별 집계 ────────────────────────────────────────
  const todayRecords = useMemo(() => records.filter((r) => r.date === TODAY && r.checkIn), [records]);

  const branchData = useMemo(() => {
    return FARM_BRANCHES.map((code) => {
      const branch = branchList.find((b) => b.code === code);
      const branchEmps = employees.filter((e) => e.isActive && e.branch === code);
      const checkedInRecs = todayRecords.filter((r) => empMap[r.employeeId]?.branch === code);
      const lateRecs = checkedInRecs.filter((r) => r.status === 'late');
      const openIssuesCount = issues.filter((i) => !i.isResolved && empMap[i.workerId]?.branch === code).length;

      const workers = branchEmps.length;
      const checkedIn = checkedInRecs.length;
      const late = lateRecs.length;
      const rate = workers ? Math.round((checkedIn / workers) * 100) : 0;

      // 지점 관리자: farm_admin이면서 '팀' 이름이 아닌 첫 번째
      const mgr = branchEmps.filter((e) => e.role === 'farm_admin' && !e.name.includes('팀'))[0]?.name ?? '-';

      return {
        code,
        name: branch?.name ?? BRANCH_NAMES[code] ?? code,
        mgr,
        workers,
        checkedIn,
        late,
        rate,
        harvest: 0,
        harvestT: 0,
        tbm: 0,
        issues: openIssuesCount,
        accent: BRANCH_ACCENT[code] ?? T.muted,
        accentSoft: BRANCH_ACCENT_SOFT[code] ?? T.bg,
        status: rate > 0 && rate < 85 ? 'alert' : 'active',
      };
    });
  }, [branchList, employees, todayRecords, issues, empMap]);

  const totalWorkers = branchData.reduce((s, b) => s + b.workers, 0);
  const totalCheckedIn = branchData.reduce((s, b) => s + b.checkedIn, 0);
  const totalHarvest = branchData.reduce((s, b) => s + b.harvest, 0);
  const totalTarget = branchData.reduce((s, b) => s + b.harvestT, 0);
  const totalOpenIssues = issues.filter((i) => !i.isResolved).length;

  // ─── 승인 허브 ───────────────────────────────────────────
  const approvals = useMemo(() => {
    const leaves = leaveRequests
      .filter((r) => r.status === 'pending')
      .map((r) => {
        const emp = empMap[r.employeeId];
        return {
          id: r.id,
          _table: 'leave_requests',
          branch: branchDisplayName(emp?.branch),
          bc: BRANCH_ACCENT[emp?.branch] ?? T.muted,
          name: emp?.name ?? '-',
          tag: '근태', tagTone: 'primary',
          type: LEAVE_TYPE_KO[r.type] ?? r.type ?? '휴가',
          detail: formatDate(r.startDate) + (r.endDate && r.endDate !== r.startDate ? ` ~ ${formatDate(r.endDate)}` : ' · 본인'),
          time: timeAgo(r.createdAt),
          urgent: false,
          createdAt: r.createdAt,
        };
      });

    const ots = overtimeRequests
      .filter((r) => r.status === 'pending')
      .map((r) => {
        const emp = empMap[r.employeeId];
        return {
          id: r.id,
          _table: 'overtime_requests',
          branch: branchDisplayName(emp?.branch),
          bc: BRANCH_ACCENT[emp?.branch] ?? T.muted,
          name: emp?.name ?? '-',
          tag: '근태', tagTone: 'primary',
          type: '연장근무 승인',
          detail: `${formatDate(r.date)} · ${r.hours ?? 0}시간${r.minutes ? ` ${r.minutes}분` : ''}`,
          time: timeAgo(r.createdAt),
          urgent: false,
          createdAt: r.createdAt,
        };
      });

    return [...leaves, ...ots].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
  }, [leaveRequests, overtimeRequests, empMap]);

  const [localApprovals, setLocalApprovals] = useState(null);
  const displayApprovals = localApprovals ?? approvals;

  const handleApprove = useCallback(async (item) => {
    setApprovalError(null);
    try {
      if (item._table === 'leave_requests') {
        await leaveApprove(item.id, true, currentUser?.id);
      } else {
        await otApprove(item.id, currentUser?.id);
      }
      setLocalApprovals((prev) => (prev ?? approvals).filter((a) => a.id !== item.id));
    } catch {
      setApprovalError('권한이 없습니다 (승인 권한: master/farm_admin)');
    }
  }, [leaveApprove, otApprove, currentUser, approvals]);

  const handleReject = useCallback(async (item) => {
    setApprovalError(null);
    try {
      if (item._table === 'leave_requests') {
        await leaveApprove(item.id, false, currentUser?.id);
      } else {
        await otReject(item.id, currentUser?.id);
      }
      setLocalApprovals((prev) => (prev ?? approvals).filter((a) => a.id !== item.id));
    } catch {
      setApprovalError('권한이 없습니다 (승인 권한: master/farm_admin)');
    }
  }, [leaveApprove, otReject, currentUser, approvals]);

  // approvals 스토어 업데이트 시 localApprovals 동기화
  const approvalCount = displayApprovals.length;

  // ─── 이슈 피드 ───────────────────────────────────────────
  const issueFeed = useMemo(() => {
    const real = issues
      .slice()
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 6)
      .map((i) => {
        const emp = empMap[i.workerId];
        const branchCode = emp?.branch ?? '';
        return {
          branch: branchDisplayName(branchCode),
          bc: BRANCH_ACCENT[branchCode] ?? T.muted,
          severity: i.isResolved ? 'info' : 'critical',
          type: i.type ?? '기타',
          place: '-',
          who: emp?.name ?? '-',
          time: timeAgo(i.createdAt),
          note: i.comment ?? '',
        };
      });
    return real;
  }, [issues, empMap]);

  const resolvedTodayCount = issues.filter(
    (i) => i.isResolved && i.resolvedAt?.startsWith(TODAY)
  ).length;

  // ─── 공지 (noticeStore 활용) ──────────────────────────────
  const noticeItems = useMemo(() => {
    const real = notices.slice(0, 4).map((n) => {
      const tone = n.priority === 'urgent' ? 'danger' : n.priority === 'high' ? 'warning' : 'info';
      return {
        tag: n.priority === 'urgent' ? '전사 · 중요' : '공지',
        tone,
        title: n.title,
        meta: `${timeAgo(n.createdAt)}`,
        pinned: n.priority === 'urgent',
        branches: 'ALL',
      };
    });
    return real;
  }, [notices]);

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg }}>
      <HQTopBar
        subtitle="본사 · 다지점 통합"
        title="2026년 4월 · 월간 운영 리포트"
        onSearch={() => alert('검색 기능은 준비 중입니다')}
        onBell={() => navigate('/admin/hq/notices')}
        actions={<>{btnSecondary('리포트 내보내기', icons.chart, () => alert('내보내기 기능은 준비 중입니다'))}{btnPrimary('전사 공지 작성', icons.plus, () => navigate('/admin/hq/notices'))}</>}
      />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ─────── 전사 KPI 4개 (경영 지표) ─────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            {
              label: '전사 가동률',
              value: totalWorkers ? Math.round((totalCheckedIn / totalWorkers) * 100) : 0,
              unit: '%',
              sub: `${totalCheckedIn} / ${totalWorkers}명 출근`,
              trend: '+2.1%p', tone: 'success',
            },
            {
              label: '월 수확량',
              value: totalHarvest.toLocaleString(),
              unit: 'kg',
              sub: `목표 ${totalTarget.toLocaleString()}kg · ${totalTarget ? Math.round((totalHarvest / totalTarget) * 100) : 0}%`,
              trend: '▲ 8%', tone: 'primary',
            },
            { label: '월 인건비', value: '8,420', unit: '만원', sub: '예산 9,200만원 · 91%', trend: '−3.2%', tone: 'warning' },
            {
              label: '미해결 이슈',
              value: totalOpenIssues,
              unit: '건',
              sub: `오늘 해결 ${resolvedTodayCount}건`,
              trend: totalOpenIssues > 0 ? '긴급' : '정상', tone: totalOpenIssues > 0 ? 'danger' : 'success',
            },
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
            <span onClick={() => navigate('/admin/hq/branches')} style={{ fontSize: 11, color: HQ.accent, fontWeight: 600, cursor: 'pointer' }}>지점 관리 →</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {branchData.map((b) => (
              <Card key={b.code} pad={0} onClick={() => navigate('/admin/hq/branches')} style={{ overflow: 'hidden', cursor: 'pointer' }}>
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
                      { l: '달성', v: b.harvestT ? Math.round((b.harvest / b.harvestT) * 100) : '-', u: b.harvestT ? '%' : '' },
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
                  <Pill tone="success">목표 대비 {totalTarget ? Math.round((totalHarvest / totalTarget) * 100) : 0}%</Pill>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, background: T.bg, padding: 3, borderRadius: 6, fontSize: 11 }}>
                {['토마토', '딸기', '파프리카', '오이'].map((t, i) => (
                  <span key={t} onClick={() => alert('작물별 필터 기능은 준비 중입니다')} style={{
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
              {branchData.map((b) => {
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
                            width: '100%', height: `${(w.v / max) * 100}%`,
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
              <span>작물별 상세 분석 → <span onClick={() => navigate('/admin/hq/growth')} style={{ color: HQ.accent, fontWeight: 600, cursor: 'pointer' }}>보고서 열기</span></span>
            </div>
          </Card>

          {/* 승인 허브 — P2-b */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>승인 허브</h3>
                {approvalCount > 0 && <Pill tone="danger">{approvalCount}</Pill>}
              </div>
              <span onClick={() => navigate('/admin/hq/approvals')} style={{ fontSize: 11, color: HQ.accent, fontWeight: 600, cursor: 'pointer' }}>전체 →</span>
            </div>

            {/* 승인 필터 탭 */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, fontSize: 11 }}>
              {[
                { l: '전체', n: approvalCount, on: true },
                { l: '근태', n: approvalCount },
              ].map((t, i) => (
                <span key={i} onClick={() => navigate('/admin/hq/approvals')} style={{
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

            {approvalError && (
              <div style={{ padding: '6px 10px', background: T.dangerSoft, borderRadius: 6, fontSize: 11, color: T.danger, marginBottom: 8 }}>
                {approvalError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340, overflow: 'auto' }}>
              {displayApprovals.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: T.mutedSoft, fontSize: 12 }}>
                  대기 중인 승인 요청이 없습니다
                </div>
              ) : displayApprovals.map((r, i) => (
                <div key={r.id ?? i} style={{
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
                    <button
                      onClick={() => handleReject(r)}
                      style={{
                        flex: 1, padding: '5px 0', borderRadius: 6, border: `1px solid ${T.border}`,
                        background: T.surface, color: T.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      }}>반려</button>
                    <button
                      onClick={() => handleApprove(r)}
                      style={{
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
          {/* 경영 지표 트렌드 (인건비 vs 수확액) — finance_data 없음, fallback 유지 */}
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
              <span onClick={() => navigate('/admin/hq/finance')} style={{ fontSize: 11, color: HQ.accent, fontWeight: 600, cursor: 'pointer' }}>상세 →</span>
            </div>

            {/* 라인 차트 */}
            <div style={{ height: 140, position: 'relative', marginBottom: 8 }}>
              <svg viewBox="0 0 420 140" width="100%" height="140" preserveAspectRatio="none">
                {[0, 35, 70, 105, 140].map((y, i) => (
                  <line key={i} x1="0" y1={y} x2="420" y2={y} stroke={T.borderSoft} strokeWidth="1" />
                ))}
                <path d="M 0,90 L 60,75 L 120,65 L 180,55 L 240,48 L 300,38 L 360,30 L 420,28 L 420,140 L 0,140 Z"
                  fill={HQ.accentSoft} />
                <path d="M 0,90 L 60,75 L 120,65 L 180,55 L 240,48 L 300,38 L 360,30 L 420,28"
                  fill="none" stroke={HQ.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 0,95 L 60,92 L 120,88 L 180,82 L 240,78 L 300,70 L 360,62 L 420,58"
                  fill="none" stroke={T.warning} strokeWidth="2" strokeDasharray="4 3" strokeLinecap="round" />
                <circle cx="420" cy="28" r="4" fill={HQ.accent} stroke="#fff" strokeWidth="2" />
                <circle cx="420" cy="58" r="4" fill={T.warning} stroke="#fff" strokeWidth="2" />
              </svg>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.mutedSoft, padding: '0 2px' }}>
              {['10월', '11월', '12월', '1월', '2월', '3월', '4월'].map((m) => <span key={m}>{m}</span>)}
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

          {/* 지점 통합 이슈 피드 — P2-c */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>전 지점 이상 신고</h3>
                {totalOpenIssues > 0 && <Pill tone="danger">{totalOpenIssues}</Pill>}
              </div>
              <span onClick={() => navigate('/admin/records')} style={{ fontSize: 11, color: HQ.accent, fontWeight: 600, cursor: 'pointer' }}>전체 →</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {issueFeed.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: T.mutedSoft, fontSize: 13 }}>데이터가 없습니다</div>
              ) : issueFeed.map((it, i) => {
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
                <span style={{ fontSize: 11, color: T.mutedSoft }}>해결됨 · 오늘 {resolvedTodayCount}건</span>
              </div>
            </div>
          </Card>

          {/* 공지 · 정책 관리 */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>공지 · 정책 관리</h3>
              </div>
              <span onClick={() => navigate('/admin/hq/notices')} style={{ fontSize: 11, color: HQ.accent, fontWeight: 600, cursor: 'pointer' }}>+ 새 공지</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {noticeItems.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: T.mutedSoft, fontSize: 13 }}>데이터가 없습니다</div>
              ) : noticeItems.map((n, i) => {
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
              <span style={{ color: T.mutedSoft }}>활성 공지 <span style={{ color: T.text, fontWeight: 700 }}>{notices.length}건</span></span>
              <span style={{ color: T.mutedSoft }}>평균 열람률 <span style={{ color: T.success, fontWeight: 700 }}>83%</span></span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
export { HQDashboardScreen };

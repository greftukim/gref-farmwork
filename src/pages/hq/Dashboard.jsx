import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { T, Card, Pill, Dot, Icon, icons, btnPrimary, btnSecondary } from '../../design/primitives';
import { HQ, HQTopBar } from '../../design/hq-shell';
import useEmployeeStore from '../../stores/employeeStore';
import useLeaveStore from '../../stores/leaveStore';
import useIssueStore from '../../stores/issueStore';
import useNoticeStore from '../../stores/noticeStore';
import useAuthStore from '../../stores/authStore';
import useAttendanceStore from '../../stores/attendanceStore';
import useHarvestStore from '../../stores/harvestStore';
import { downloadHQReportExcel, downloadCropReportExcel } from '../../lib/hqReportExcel';

const D_BRANCH_META = {
  busan:        { name: '부산LAB',  dot: T.primary, avatar: 'blue',    accent: T.primary, accentSoft: T.primarySoft },
  jinju:        { name: '진주HUB',  dot: T.success, avatar: 'emerald', accent: T.success, accentSoft: T.successSoft },
  hadong:       { name: '하동HUB',  dot: T.warning, avatar: 'amber',   accent: T.warning, accentSoft: T.warningSoft },
  headquarters: { name: '총괄본사', dot: T.text,    avatar: 'slate' },
  management:   { name: '관리팀',   dot: HQ.accent, avatar: 'slate' },
  seedlab:      { name: 'Seed LAB', dot: T.mutedSoft, avatar: 'slate' },
};

const BRANCH_CROPS = {
  busan:  ['토마토', '방울토마토', '완숙토마토'],
  jinju:  ['미니오이'],
  hadong: ['완숙토마토'],
};

const CROP_COLORS = {
  busan:  { main: '#6366F1', sub: '#A5B4FC', sub2: '#818CF8' },
  jinju:  { main: '#059669', sub: '#6EE7B7' },
  hadong: { main: '#D97706', sub: '#FDE68A' },
};

function HQDashboardScreen() {
  const employees      = useEmployeeStore((s) => s.employees);
  const fetchEmployees = useEmployeeStore((s) => s.fetchEmployees);
  const requests       = useLeaveStore((s) => s.requests);
  const fetchRequests  = useLeaveStore((s) => s.fetchRequests);
  const farmReview     = useLeaveStore((s) => s.farmReview);
  const issues         = useIssueStore((s) => s.issues);
  const fetchIssues    = useIssueStore((s) => s.fetchIssues);
  const notices        = useNoticeStore((s) => s.notices);
  const fetchNotices   = useNoticeStore((s) => s.fetchNotices);
  const currentUser    = useAuthStore((s) => s.currentUser);
  const records        = useAttendanceStore((s) => s.records);
  const fetchRecords   = useAttendanceStore((s) => s.fetchRecords);
  const harvestRecords = useHarvestStore((s) => s.records);
  const fetchHarvest   = useHarvestStore((s) => s.fetchCurrentMonth);

  const navigate = useNavigate();
  const [approvalFilter, setApprovalFilter] = useState('all');
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [period, setPeriod] = useState('월');

  useEffect(() => {
    fetchEmployees(); fetchRequests(); fetchIssues();
    fetchNotices(); fetchRecords(); fetchHarvest();
  }, []);

  const monthlyHarvestByEmp = useMemo(() => {
    const map = {};
    harvestRecords.forEach((r) => {
      map[r.employee_id] = (map[r.employee_id] || 0) + Number(r.quantity || 0);
    });
    return map;
  }, [harvestRecords]);

  const branchCropData = useMemo(() => {
    const result = {};
    harvestRecords.forEach((r) => {
      const br = r.employee?.branch;
      const crop = r.crop?.name;
      if (!br || !crop || !['busan', 'jinju', 'hadong'].includes(br)) return;
      if (!result[br]) result[br] = {};
      result[br][crop] = (result[br][crop] || 0) + Number(r.quantity || 0);
    });
    return result;
  }, [harvestRecords]);

  const barMax = useMemo(() => {
    let max = 0;
    ['busan', 'jinju', 'hadong'].forEach((br) => {
      Object.values(branchCropData[br] || {}).forEach((v) => { if (v > max) max = v; });
    });
    return max > 0 ? max : 1;
  }, [branchCropData]);

  const trendData = useMemo(() => {
    if (!selectedCrop) return [];
    const { branch, crop } = selectedCrop;
    const src = harvestRecords.filter((r) => r.employee?.branch === branch && r.crop?.name === crop);
    const dateMap = {};
    src.forEach((r) => { dateMap[r.date] = (dateMap[r.date] || 0) + Number(r.quantity || 0); });
    const now = new Date();
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (29 - i));
      const key = d.toISOString().split('T')[0];
      return { date: key, qty: Math.round((dateMap[key] || 0) * 10) / 10 };
    });
  }, [harvestRecords, selectedCrop]);

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
      harvestT: 0,  // BACKLOG: HARVEST-TARGETS-001
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
  const PERIOD_LABEL = { '일': '일간', '주': '주간', '월': '월간', '분기': '분기' };
  const titleStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 · ${PERIOD_LABEL[period] || '월간'} 운영 리포트`;
  const gadongyulSub = totalWorkers > 0 ? `${totalCheckedIn} / ${totalWorkers}명 출근` : '출근 데이터 없음';
  const harvestSub = totalTarget > 0
    ? `목표 ${totalTarget.toLocaleString()}kg · ${Math.round(totalHarvest / totalTarget * 100)}%`
    : '수확 목표 없음';

  // ── Y축 그리드 helper (지점별 수확량 차트용) ──
  const Y_TICKS = useMemo(() => {
    const niceMax = Math.ceil(barMax / 100) * 100;
    return [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(niceMax * f));
  }, [barMax]);

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg }}>
      <HQTopBar
        subtitle="본사 · 다지점 통합"
        title={titleStr}
        period={period}
        onPeriodChange={setPeriod}
        actions={<>
          {btnSecondary('리포트 내보내기', icons.chart, () => downloadHQReportExcel(branches, totalWorkers, totalCheckedIn, totalHarvest))}
          {btnPrimary('전사 공지 작성', icons.plus, () => navigate('/admin/hq/notices'))}
        </>}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 24 }}>

        {/* ─────── 전사 KPI 4개 ─────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { label: '전사 가동률', value: totalWorkers > 0 ? Math.round(totalCheckedIn / totalWorkers * 100) : 0, unit: '%', sub: gadongyulSub, trend: '실측', tone: 'success', to: '/admin/hq/employees' },
            { label: '월 수확량',   value: totalHarvest.toLocaleString(), unit: 'kg', sub: harvestSub, trend: '실데이터', tone: 'primary', to: '/admin/hq/finance' },
            { label: '월 인건비',   value: '—', unit: '', sub: '집계 없음', trend: '—', tone: 'warning', to: '/admin/hq/finance' },
            { label: '미해결 이슈', value: openIssues.length, unit: '건', sub: '이상 신고 미해결', trend: openIssues.length > 0 ? '확인 필요' : '정상', tone: 'danger', to: '/admin/hq/issues' },
          ].map((k, i) => {
            const tones = { success: T.success, primary: HQ.accent, warning: T.warning, danger: T.danger };
            const softs = { success: T.successSoft, primary: HQ.accentSoft, warning: T.warningSoft, danger: T.dangerSoft };
            return (
              <Card key={i} pad={18} onClick={() => k.to ? navigate(k.to) : null} style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer' }}>
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

        {/* ─────── 지점별 운영 현황 카드 3개 (변경 없음) ─────── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0 }}>지점별 운영 현황</h3>
              <span style={{ fontSize: 11, color: T.mutedSoft }}>오늘 기준</span>
            </div>
            <span onClick={() => navigate('/admin/hq/branches')} style={{ fontSize: 11, color: HQ.accent, fontWeight: 600, cursor: 'pointer' }}>지점 관리 →</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {branches.map((b) => (
              <Card key={b.code} pad={0} onClick={() => navigate('/admin/hq/branches')} style={{ overflow: 'hidden', cursor: 'pointer' }}>
                <div style={{ padding: '14px 16px', background: b.accentSoft, borderBottom: `1px solid ${T.borderSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: b.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                      { l: '수확', v: b.harvest > 0 ? Number(b.harvest.toFixed(1)).toLocaleString() : '—', u: b.harvest > 0 ? 'kg' : '' },
                      { l: '달성', v: b.harvestT > 0 ? `${Math.round(b.harvest / b.harvestT * 100)}` : '—', u: b.harvestT > 0 ? '%' : '' },
                      { l: 'TBM',  v: '—', u: '' },
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

        {/* ─────── ★ 신규: 지점별 수확량 비교(Y축 그리드+푸터 정리) + 승인 허브 ─────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>
                  이번 달 지점별 수확량
                  <span style={{ fontSize: 11, fontWeight: 500, color: T.mutedSoft, marginLeft: 8 }}>막대 클릭 → 작물별 추이</span>
                </h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
                  <span style={{ fontSize: 28, fontWeight: 700, color: T.text, letterSpacing: -0.6, lineHeight: 1 }}>{totalHarvest.toLocaleString()}</span>
                  <span style={{ fontSize: 13, color: T.mutedSoft, fontWeight: 500 }}>kg</span>
                  {totalTarget > 0 && <Pill tone="success">목표 대비 {Math.round(totalHarvest / totalTarget * 100)}%</Pill>}
                </div>
              </div>
              {selectedCrop && (
                <button onClick={() => setSelectedCrop(null)} style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px',
                  background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6,
                  fontSize: 11, fontWeight: 600, color: T.muted, cursor: 'pointer',
                }}>← 지점 비교로 돌아가기</button>
              )}
            </div>

            {selectedCrop ? (
              /* ── 추이 차트 (변경 없음, 기존 영역+선) ── */
              (() => {
                const crops = BRANCH_CROPS[selectedCrop.branch] || [];
                const isMain = crops[0] === selectedCrop.crop;
                const color = isMain
                  ? CROP_COLORS[selectedCrop.branch]?.main
                  : CROP_COLORS[selectedCrop.branch]?.sub;
                const branchName = D_BRANCH_META[selectedCrop.branch]?.name || selectedCrop.branch;
                const maxQty = Math.max(...trendData.map((d) => d.qty), 1);
                const hasData = trendData.some((d) => d.qty > 0);
                const W = 400, H = 80;
                const pts = trendData.map((d, i) => {
                  const x = (i / 29) * W;
                  const y = H - (d.qty / maxQty) * (H - 6);
                  return `${x.toFixed(1)},${y.toFixed(1)}`;
                }).join(' ');
                const totalThisMonth = trendData.reduce((s, d) => s + d.qty, 0);
                return (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <Dot c={color} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{branchName} · {selectedCrop.crop}</span>
                      <span style={{ fontSize: 11, color: T.mutedSoft }}>최근 30일 일별 추이</span>
                      <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: T.text }}>
                        {Number(totalThisMonth.toFixed(1)).toLocaleString()} kg
                      </span>
                    </div>
                    {hasData ? (
                      <div style={{ position: 'relative', height: 100, background: T.bg, borderRadius: 8, padding: '8px 4px 24px' }}>
                        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                          {[0, 0.5, 1].map((frac) => (
                            <line key={frac} x1={0} y1={H - frac * (H - 6)} x2={W} y2={H - frac * (H - 6)}
                              stroke={T.borderSoft} strokeWidth="0.5" />
                          ))}
                          <polyline points={`0,${H} ${pts} ${W},${H}`} fill={color} fillOpacity="0.12" stroke="none" />
                          <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
                          {trendData.map((d, i) => d.qty > 0 && (
                            <circle key={i} cx={(i / 29 * W).toFixed(1)} cy={(H - (d.qty / maxQty) * (H - 6)).toFixed(1)} r="2.5" fill={color} />
                          ))}
                        </svg>
                        <div style={{ position: 'absolute', bottom: 4, left: 4, right: 4, display: 'flex', justifyContent: 'space-between', fontSize: 9, color: T.mutedSoft }}>
                          <span>{trendData[0]?.date?.slice(5)}</span>
                          <span>{trendData[14]?.date?.slice(5)}</span>
                          <span>{trendData[29]?.date?.slice(5)}</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg, borderRadius: 8 }}>
                        <span style={{ fontSize: 12, color: T.mutedSoft }}>기간 내 수확 기록 없음</span>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              /* ── ★ 신규: 지점별 그룹 막대 (Y축 그리드 + 라벨 + 목표 서머리) ── */
              <div style={{ position: 'relative', paddingLeft: 44, paddingRight: 12, paddingTop: 24, paddingBottom: 12 }}>
                {/* Y축 그리드 + 라벨 */}
                <div style={{ position: 'absolute', left: 44, right: 12, top: 24, height: 220, pointerEvents: 'none' }}>
                  {Y_TICKS.map((v, idx) => {
                    const top = 220 - (idx / (Y_TICKS.length - 1)) * 220;
                    return (
                      <div key={idx} style={{
                        position: 'absolute', left: 0, right: 0, top,
                        borderTop: idx === 0 ? `1px solid ${T.border}` : `1px dashed ${T.borderSoft}`,
                      }}>
                        <span style={{ position: 'absolute', left: -38, top: -7, fontSize: 10, color: T.mutedSoft, fontWeight: 600 }}>
                          {v.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {/* 막대 그룹 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, height: 220, alignItems: 'flex-end', position: 'relative', zIndex: 1 }}>
                  {branches.map((b) => {
                    const cropMap = branchCropData[b.code] || {};
                    const crops = BRANCH_CROPS[b.code] || [];
                    const colors = CROP_COLORS[b.code] || { main: b.accent, sub: b.accentSoft };
                    return (
                      <div key={b.code} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 8, padding: '0 8px' }}>
                          {crops.map((crop, ci) => {
                            const qty = cropMap[crop] || 0;
                            const color = ci === 0 ? colors.main : ci === 1 ? colors.sub2 || colors.sub : colors.sub;
                            const heightPx = qty > 0 ? Math.max((qty / barMax) * 220, 8) : 0;
                            return (
                              <div key={crop} onClick={() => setSelectedCrop({ branch: b.code, crop })}
                                title={`${crop}: ${qty > 0 ? Number(qty.toFixed(1)).toLocaleString() : '—'} kg`}
                                style={{ flex: 1, maxWidth: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: qty > 0 ? T.text : T.mutedSoft, marginBottom: 4 }}>
                                  {qty > 0 ? Number(qty.toFixed(1)).toLocaleString() : '—'}
                                </div>
                                <div style={{
                                  width: '100%', height: heightPx,
                                  background: color, opacity: qty > 0 ? 0.92 : 0.18,
                                  borderRadius: '6px 6px 0 0',
                                  transition: 'filter 0.15s',
                                }} />
                                <div style={{ fontSize: 10, color: T.muted, fontWeight: 600, marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 56 }}>
                                  {crop}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ★ 신규: 지점 합계 서머리 (3컬럼) */}
            {!selectedCrop && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.borderSoft}` }}>
                {branches.map((b) => {
                  const pct = b.harvestT > 0 ? Math.round(b.harvest / b.harvestT * 100) : null;
                  const tone = pct === null ? 'muted' : pct >= 90 ? 'success' : pct >= 80 ? 'warning' : 'danger';
                  const tones = { success: T.success, warning: T.warning, danger: T.danger, muted: T.mutedSoft };
                  const softs = { success: T.successSoft, warning: T.warningSoft, danger: T.dangerSoft, muted: T.bg };
                  return (
                    <div key={b.code} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: b.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon d={icons.location} size={14} c="#fff" sw={2} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Dot c={b.accent} /> {b.name}
                        </div>
                        <div style={{ fontSize: 10, color: T.mutedSoft, marginTop: 2 }}>
                          {b.workers}명 · {(BRANCH_CROPS[b.code] || []).join(' · ')}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: T.text, letterSpacing: -0.3 }}>
                          {b.harvest > 0 ? Number(b.harvest.toFixed(1)).toLocaleString() : '—'} kg
                        </div>
                        <div style={{ marginTop: 3 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: softs[tone], color: tones[tone] }}>
                            {pct !== null ? `달성 ${pct}%` : '목표 미설정'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.borderSoft}`, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.mutedSoft }}>
              <span>전년 동월 대비 <span style={{ fontWeight: 700 }}>—</span></span>
              <span>작물별 상세 분석 →
                <span onClick={() => downloadCropReportExcel(branchCropData, trendData, selectedCrop)}
                  style={{ color: HQ.accent, fontWeight: 600, cursor: 'pointer', marginLeft: 4 }}>보고서 열기</span>
              </span>
            </div>
          </Card>

          {/* 승인 결재 (변경 없음) */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>승인 결재</h3>
                <Pill tone="danger">{pendingCount}</Pill>
              </div>
              <span onClick={() => navigate('/admin/hq/approvals')} style={{ fontSize: 11, color: HQ.accent, fontWeight: 600, cursor: 'pointer' }}>전체 →</span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, fontSize: 11, flexWrap: 'wrap' }}>
              {[
                { k: 'all',        l: '전체', n: pendingCount },
                { k: 'attendance', l: '근태', n: pendingCount },
                { k: 'budget',     l: '예산', n: 0 },
                { k: 'hr',         l: '인사', n: 0 },
                { k: 'material',   l: '자재', n: 0 },
              ].map((p) => {
                const on = approvalFilter === p.k;
                const disabled = p.n === 0 && p.k !== 'all' && p.k !== 'attendance';
                return (
                  <span key={p.k} onClick={disabled ? undefined : () => setApprovalFilter(p.k)} style={{
                    padding: '4px 9px', borderRadius: 6, fontWeight: 600,
                    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1,
                    background: on ? T.text : T.bg, color: on ? '#fff' : T.muted,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    {p.l}
                    <span style={{ fontSize: 9, padding: '0 5px', borderRadius: 999, background: on ? 'rgba(255,255,255,0.2)' : T.borderSoft, color: on ? '#fff' : T.muted }}>{p.n}</span>
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
                <div key={r.id} style={{ padding: '10px 12px', background: T.bg, borderRadius: 8, borderLeft: r.urgent ? `3px solid ${T.danger}` : '3px solid transparent' }}>
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
                    <button onClick={() => farmReview(r.id, false, currentUser?.id)} style={{ flex: 1, padding: '5px 0', borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, color: T.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>반려</button>
                    <button onClick={() => farmReview(r.id, true, currentUser?.id)} style={{ flex: 1, padding: '5px 0', borderRadius: 6, border: 0, background: HQ.accent, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>승인</button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ─────── ★ 삭제됨: 경영 지표 추이 카드 (CARD-FINANCE-TREND) ─────── */}
        {/* ─────── ★ 신규: 이슈 피드 + 공지 2단 레이아웃 ─────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* 지점 통합 이슈 피드 */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>전 지점 이상 신고</h3>
                <Pill tone="danger">{openIssues.length}</Pill>
              </div>
              <span onClick={() => navigate('/admin/hq/issues')} style={{ fontSize: 11, color: HQ.accent, fontWeight: 600, cursor: 'pointer' }}>전체 →</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {issueFeed.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: T.mutedSoft, fontSize: 12 }}>미해결 이슈 없음</div>
              ) : issueFeed.map((it, i) => {
                const sevTone = { critical: 'danger', warning: 'warning', info: 'info' }[it.severity];
                const sevBg = { critical: T.dangerSoft, warning: T.warningSoft, info: T.infoSoft }[it.severity];
                const sevBorder = { critical: T.danger, warning: T.warning, info: T.info }[it.severity];
                return (
                  <div key={i} onClick={() => navigate('/admin/hq/issues')} style={{ padding: '10px 12px', background: sevBg, borderRadius: 8, borderLeft: `3px solid ${sevBorder}`, cursor: 'pointer' }}>
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
              <span onClick={() => navigate('/admin/hq/notices')} style={{ fontSize: 11, color: HQ.accent, fontWeight: 600, cursor: 'pointer' }}>+ 새 공지</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {noticeItems.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: T.mutedSoft, fontSize: 12 }}>공지 없음</div>
              ) : noticeItems.map((n, i) => {
                const tones = { danger: T.danger, primary: T.primary, success: T.success, warning: T.warning, info: HQ.accent, muted: T.mutedSoft };
                const softs = { danger: T.dangerSoft, primary: T.primarySoft, success: T.successSoft, warning: T.warningSoft, info: HQ.accentSoft, muted: T.bg };
                return (
                  <div key={i} onClick={() => navigate('/admin/hq/notices')} style={{ padding: '10px 12px', background: T.bg, borderRadius: 8, borderLeft: n.pinned ? `3px solid ${T.danger}` : '3px solid transparent', cursor: 'pointer' }}>
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

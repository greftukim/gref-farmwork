import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { T, Icon, icons } from '../../design/primitives';
import { HQ } from '../../design/hq-shell';
import useEmployeeStore from '../../stores/employeeStore';
import useLeaveStore from '../../stores/leaveStore';
import useIssueStore from '../../stores/issueStore';
import useNoticeStore from '../../stores/noticeStore';
import useAuthStore from '../../stores/authStore';
import useAttendanceStore from '../../stores/attendanceStore';
import useHarvestStore from '../../stores/harvestStore';

// ─────────────────────────────────────────────────────────────────
// 모바일 관리자 — PC 대시보드 토큰(T / HQ 토큰)에 맞춰 정렬
//  · 색상 단일화: T.* / HQ.* 만 사용 (신규 토큰 없음)
//  · 지점 메타 = D_BRANCH_META: PC 와 동일 매핑
//  · BACKLOG fallback 그대로: HARVEST-TARGETS / TBM / APPROVAL-CATEGORY / NOTICE-READRATE
// ─────────────────────────────────────────────────────────────────

// PC 와 동일한 지점 메타 (모바일 카드 색상용)
const D_BRANCH_META = {
  busan:  { name: '부산LAB', accent: T.primary, accentSoft: T.primarySoft },
  jinju:  { name: '진주HUB', accent: T.success, accentSoft: T.successSoft },
  hadong: { name: '하동HUB', accent: T.warning, accentSoft: T.warningSoft },
};

// 모바일 전용 보조 (기존 MA 키 유지 → 신규는 T/HQ 로 연결)
const MA = {
  bg: T.bg,
  card: T.surface,
  text: T.text,
  muted: T.muted,
  mutedSoft: T.mutedSoft,
  border: T.border,
  divider: T.borderSoft,
  primary: T.primary,
  primaryDark: T.primaryDark,
  // 관리팀 액센트는 PC 와 동일하게 HQ.accent 사용
  teal: HQ.accent,
  tealDark: HQ.accentDark,
  blue: T.info,
  danger: T.danger,
  warn: T.warning,
  success: T.success,
};

// ─────── Shell ───────
const TAB_ROUTES = {
  home:    '/admin/m/home',
  approve: '/admin/m/approve',
  floor:   '/admin/m/floor',
  perf:    '/admin/m/perf',
  more:    '/admin/m/more',
};

function AdminMobileShell({ role = 'farm', active = 'home', children, title, showHeader = false, badge }) {
  const navigate = useNavigate();
  const accent = role === 'hq' ? HQ.accent : T.primary;
  const accentDark = role === 'hq' ? HQ.accentDark : T.primaryDark;
  const accentSoft = role === 'hq' ? HQ.accentSoft : T.primarySoft;
  const roleLabel = role === 'hq' ? '관리팀 · 본사' : '재배팀 · 부산LAB';
  const roleChip = role === 'hq' ? 'HQ' : '부산LAB';

  const tabs = [
    { id: 'home',    label: '홈',    d: icons.dashboard },
    { id: 'approve', label: '승인',  d: icons.check },
    { id: 'floor',   label: '현황',  d: icons.location },
    { id: 'perf',    label: '성과',  d: icons.chart },
    { id: 'more',    label: '더보기', d: icons.more },
  ];

  return (
    <div style={{ background: MA.bg, height: '100%', display: 'flex', flexDirection: 'column', fontFamily: 'Pretendard, system-ui', position: 'relative' }}>
      {showHeader && (
        <div style={{
          background: MA.card, borderBottom: `1px solid ${MA.border}`,
          padding: '12px 16px 14px', display: 'flex', alignItems: 'center', gap: 10,
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: MA.text, letterSpacing: -0.3 }}>{title}</div>
          <div style={{ flex: 1 }} />
          <div style={{ width: 32, height: 32, borderRadius: 8, background: MA.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <Icon d={icons.bell} size={15} c={MA.text} sw={2} />
            {badge && <span style={{ position: 'absolute', top: 5, right: 6, width: 7, height: 7, borderRadius: 999, background: MA.danger, border: '1.5px solid #fff' }} />}
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {children({ accent, accentDark, accentSoft, roleLabel, roleChip, role })}
      </div>

      {/* 하단 탭바 — PC 와 동일 borderRadius 8 / fontWeight 700 기준 */}
      <div style={{
        background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(18px)',
        borderTop: `1px solid ${MA.border}`,
        display: 'flex', padding: '6px 0 22px', flexShrink: 0,
      }}>
        {tabs.map(t => {
          const on = t.id === active;
          return (
            <div key={t.id} onClick={() => navigate(TAB_ROUTES[t.id])} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '6px 0', cursor: 'pointer', position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <Icon d={t.d} size={20} c={on ? accent : MA.mutedSoft} sw={on ? 2.2 : 1.8} />
              </div>
              <div style={{ fontSize: 10, fontWeight: on ? 700 : 500, color: on ? accent : MA.mutedSoft }}>{t.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────── 공용 위젯 (PC 카드 패턴 모바일 축소) ───────

// PC Card 와 동일 패턴 — 좌상단 3px 액센트 라인 옵션
const StatTile = ({ label, value, unit, sub, tone, accent }) => {
  const toneColor = {
    primary: accent, warning: MA.warn, danger: MA.danger,
    success: MA.success, info: MA.blue,
  }[tone] || MA.text;
  const toneSoft = {
    primary: accent + '15', warning: T.warningSoft, danger: T.dangerSoft,
    success: T.successSoft, info: T.infoSoft,
  }[tone] || MA.bg;
  return (
    <div style={{ background: MA.card, borderRadius: 8, padding: 12, flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden', border: `1px solid ${MA.border}` }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: toneColor }} />
      <div style={{ fontSize: 11, color: MA.muted, fontWeight: 600 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 6 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: MA.text, letterSpacing: -0.4, lineHeight: 1 }}>{value}</span>
        {unit && <span style={{ fontSize: 11, color: MA.mutedSoft, fontWeight: 500 }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 10, color: MA.mutedSoft, marginTop: 6 }}>{sub}</div>}
    </div>
  );
};

const CardBlock = ({ children, title, right, pad = 14, sub }) => (
  <div style={{ background: MA.card, borderRadius: 8, padding: pad, marginBottom: 12, border: `1px solid ${MA.border}` }}>
    {title && (
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: MA.text, letterSpacing: -0.2 }}>{title}</div>
          {sub && <div style={{ fontSize: 10, color: MA.mutedSoft, marginTop: 2 }}>{sub}</div>}
        </div>
        <div style={{ flex: 1 }} />
        {right}
      </div>
    )}
    {children}
  </div>
);

const Row = ({ left, right, sub, divider = true }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
    borderBottom: divider ? `1px solid ${MA.divider}` : 'none',
  }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: MA.text, letterSpacing: -0.2 }}>{left}</div>
      {sub && <div style={{ fontSize: 11, color: MA.muted, marginTop: 2 }}>{sub}</div>}
    </div>
    {right}
  </div>
);

// PC Pill 패턴 그대로 (borderRadius 4)
const Chip = ({ children, tone = 'default' }) => {
  const color = {
    danger:  { bg: T.dangerSoft,  fg: T.danger },
    warn:    { bg: T.warningSoft, fg: T.warning },
    warning: { bg: T.warningSoft, fg: T.warning },
    success: { bg: T.successSoft, fg: T.success },
    info:    { bg: HQ.accentSoft, fg: HQ.accent },
    primary: { bg: T.primarySoft, fg: T.primary },
    default: { bg: MA.bg, fg: MA.muted },
  }[tone] || { bg: MA.bg, fg: MA.muted };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 7px', borderRadius: 4,
      background: color.bg, color: color.fg, fontSize: 10, fontWeight: 700,
      letterSpacing: 0.2,
    }}>{children}</span>
  );
};

// PC Dot 패턴
const Dot = ({ c }) => <span style={{ width: 6, height: 6, borderRadius: 999, background: c, display: 'inline-block', flexShrink: 0 }} />;

// ═══════════════════════════════════════════════════════════════════
// ① 홈 — 재배팀 (지점장)
// ═══════════════════════════════════════════════════════════════════
function MobileAdminHomeFarm() {
  const employees      = useEmployeeStore((s) => s.employees);
  const fetchEmployees = useEmployeeStore((s) => s.fetchEmployees);
  const requests       = useLeaveStore((s) => s.requests);
  const fetchRequests  = useLeaveStore((s) => s.fetchRequests);
  const farmReview     = useLeaveStore((s) => s.farmReview);
  const issues         = useIssueStore((s) => s.issues);
  const fetchIssues    = useIssueStore((s) => s.fetchIssues);
  const currentUser    = useAuthStore((s) => s.currentUser);
  const records        = useAttendanceStore((s) => s.records);
  const fetchRecords   = useAttendanceStore((s) => s.fetchRecords);
  const harvestRecords = useHarvestStore((s) => s.records);
  const fetchHarvest   = useHarvestStore((s) => s.fetchCurrentMonth);

  useEffect(() => {
    fetchEmployees(); fetchRequests(); fetchIssues(); fetchRecords(); fetchHarvest();
  }, []);

  const branch = currentUser?.branch || 'busan';
  const today = new Date().toISOString().split('T')[0];

  const branchEmps = useMemo(() =>
    employees.filter((e) => e.branch === branch && e.isActive), [employees, branch]);

  const todayAtt = useMemo(() => {
    const empIds = new Set(branchEmps.map((e) => e.id));
    const recs = records.filter((r) => r.date === today && empIds.has(r.employeeId));
    return {
      checkedIn: recs.filter((r) => r.checkIn).length,
      late: recs.filter((r) => r.status === 'late').length,
      absent: branchEmps.length - recs.filter((r) => r.checkIn).length,
    };
  }, [records, branchEmps, today]);

  const pendingLeave = useMemo(() => {
    const empIds = new Set(branchEmps.map((e) => e.id));
    return requests.filter((r) => r.status === 'pending' && empIds.has(r.employeeId));
  }, [requests, branchEmps]);

  const openIssues = useMemo(() =>
    issues.filter((i) => !i.isResolved && branchEmps.some((e) => e.id === i.workerId)),
    [issues, branchEmps]);

  const urgentIssue = openIssues.find((i) => i.type === '병해충' || i.type === '설비고장') || openIssues[0];

  // 이번 주 일별 수확 (최근 7일)
  const weeklyHarvest = useMemo(() => {
    const empIds = new Set(branchEmps.map((e) => e.id));
    const now = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      const key = d.toISOString().split('T')[0];
      const total = harvestRecords
        .filter((r) => r.date === key && empIds.has(r.employee_id))
        .reduce((s, r) => s + Number(r.quantity || 0), 0);
      return Math.round(total * 10) / 10;
    });
  }, [harvestRecords, branchEmps]);

  const weeklyTotal = useMemo(() => weeklyHarvest.reduce((s, v) => s + v, 0), [weeklyHarvest]);

  const meta = D_BRANCH_META[branch] || D_BRANCH_META.busan;
  const mgrName = currentUser?.name || '—';
  const todayStr = (() => {
    const d = new Date();
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${days[d.getDay()]}`;
  })();

  return (
    <AdminMobileShell role="farm" active="home">
      {({ accent, accentDark, roleLabel }) => (
        <div>
          {/* 헤더 — PC TopBar 패턴(HQ칩 + 부제 + 큰 타이틀) 모바일 축소 */}
          <div style={{
            background: `linear-gradient(160deg, ${accent} 0%, ${accentDark} 100%)`,
            color: '#fff', padding: '18px 20px 80px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, opacity: 0.9, marginBottom: 4 }}>
                  <span style={{ padding: '2px 7px', borderRadius: 4, background: 'rgba(255,255,255,0.22)', fontWeight: 700, letterSpacing: 0.3 }}>FARM</span>
                  <span>{todayStr} · {roleLabel}</span>
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4 }}>안녕하세요, {mgrName}님</div>
              </div>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <Icon d={icons.bell} size={16} c="#fff" sw={2} />
                {openIssues.length > 0 && <span style={{ position: 'absolute', top: 5, right: 7, width: 8, height: 8, borderRadius: 999, background: '#FDE047', border: '1.5px solid #fff' }} />}
              </div>
            </div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>{meta.name} · 총 {branchEmps.length}명 관리</div>
          </div>

          {/* KPI 4칸 (오버랩) — PC KPI 카드와 같은 구조 */}
          <div style={{ padding: '0 14px', marginTop: -65, position: 'relative', zIndex: 2 }}>
            <div style={{ background: MA.card, borderRadius: 8, padding: 12, border: `1px solid ${MA.border}`, boxShadow: '0 10px 30px rgba(15,23,42,0.08)' }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <StatTile label="오늘 출근" value={todayAtt.checkedIn} unit={`/${branchEmps.length}`} sub={`결근 ${todayAtt.absent} · 지각 ${todayAtt.late}`} tone="success" accent={accent} />
                <StatTile label="진행 작업" value="—" sub="집계 없음" tone="primary" accent={accent} />
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <StatTile label="승인 대기" value={pendingLeave.length} sub="근태 신청" tone="warning" accent={accent} />
                <StatTile label="미해결 이슈" value={openIssues.length} sub={openIssues.length > 0 ? `긴급 ${openIssues.filter(i => i.type === '병해충' || i.type === '설비고장').length}건` : '이상 없음'} tone="danger" accent={accent} />
              </div>
            </div>
          </div>

          {/* 긴급 호출 — PC 이슈 카드 패턴(좌측 3px 액센트, dangerSoft 배경) */}
          {urgentIssue && (
            <div style={{ padding: '12px 14px 0' }}>
              <div style={{
                background: T.dangerSoft, borderRadius: 8, padding: '10px 12px',
                borderLeft: `3px solid ${MA.danger}`,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <Chip tone="danger">긴급</Chip>
                    <span style={{ fontSize: 11, fontWeight: 700, color: MA.muted }}>
                      {employees.find((e) => e.id === urgentIssue.workerId)?.name || '—'}
                    </span>
                    <span style={{ fontSize: 10, color: MA.mutedSoft, marginLeft: 'auto' }}>
                      {urgentIssue.createdAt ? new Date(urgentIssue.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: MA.text, fontWeight: 600 }}>{urgentIssue.type} · {urgentIssue.comment || '이상 신고'}</div>
                </div>
                <button style={{ padding: '6px 11px', borderRadius: 6, background: MA.danger, color: '#fff', border: 'none', fontSize: 11, fontWeight: 700 }}>응답</button>
              </div>
            </div>
          )}

          {/* 오늘 작업 진행 — BACKLOG: TASK-MOBILE-001 (taskStore 미연동, 플레이스홀더) */}
          <div style={{ padding: '12px 14px 0' }}>
            <CardBlock title="오늘 작업 진행" sub={`${meta.name} 기준 · 골별`} right={<span style={{ fontSize: 11, color: accent, fontWeight: 600 }}>전체 →</span>}>
              <div style={{ padding: 16, textAlign: 'center', background: MA.bg, borderRadius: 6 }}>
                <span style={{ fontSize: 12, color: MA.mutedSoft }}>작업 데이터 연동 준비 중</span>
              </div>
            </CardBlock>
          </div>

          {/* 빠른 실행 (4 그리드) */}
          <div style={{ padding: '0 14px' }}>
            <CardBlock title="빠른 실행">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {[
                  { l: '승인', d: icons.check, tone: accent },
                  { l: '공지 작성', d: icons.bell, tone: MA.blue },
                  { l: '평면도', d: icons.location, tone: HQ.accent },
                  { l: '생육 입력', d: icons.sprout, tone: MA.success },
                ].map((q, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '8px 4px', cursor: 'pointer' }}>
                    <div style={{ width: 42, height: 42, borderRadius: 8, background: `${q.tone}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon d={q.d} size={18} c={q.tone} sw={2.2} />
                    </div>
                    <div style={{ fontSize: 11, color: MA.text, fontWeight: 600 }}>{q.l}</div>
                  </div>
                ))}
              </div>
            </CardBlock>
          </div>

          {/* 이번 주 수확 — PC 막대차트 패턴 (50% 가이드 점선) */}
          <div style={{ padding: '0 14px 16px' }}>
            <CardBlock title="이번 주 수확" sub="목표 미설정" right={<Chip tone="success">실측</Chip>}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: MA.text, letterSpacing: -0.6, lineHeight: 1 }}>
                  {weeklyTotal > 0 ? Number(weeklyTotal.toFixed(1)).toLocaleString() : '—'}
                </span>
                <span style={{ fontSize: 13, color: MA.mutedSoft, fontWeight: 500 }}>kg</span>
              </div>
              <MiniBars data={weeklyHarvest} accent={accent} />
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
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 56, position: 'relative' }}>
      {/* 50% 가이드선 — PC Y축 패턴 */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderTop: `1px dashed ${T.borderSoft}` }} />
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative', zIndex: 1 }}>
          <div style={{ height: `${(v / max) * 100}%`, background: i === data.length - 1 ? accent : `${accent}55`, borderRadius: '3px 3px 0 0', minHeight: v > 0 ? 4 : 0 }} />
        </div>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// ② 홈 — 관리팀 (HQ) — PC Dashboard 와 동일 inline 헬퍼 패턴
// ═══════════════════════════════════════════════════════════════════
function MobileAdminHomeHQ() {
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

  const [period, setPeriod] = useState('월');

  useEffect(() => {
    fetchEmployees(); fetchRequests(); fetchIssues();
    fetchNotices(); fetchRecords(); fetchHarvest();
  }, []);

  const today = new Date().toISOString().split('T')[0];

  // PC Dashboard inline 헬퍼 그대로 차용
  const monthlyHarvestByEmp = useMemo(() => {
    const map = {};
    harvestRecords.forEach((r) => {
      map[r.employee_id] = (map[r.employee_id] || 0) + Number(r.quantity || 0);
    });
    return map;
  }, [harvestRecords]);

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

  const openIssues   = issues.filter((i) => !i.isResolved);
  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  const pendingLeave = useMemo(() =>
    requests.filter((r) => r.status === 'pending').slice(0, 3).map((r) => {
      const emp = employees.find((e) => e.id === r.employeeId);
      const bm = D_BRANCH_META[emp?.branch] || { name: emp?.branch || '—', accent: T.mutedSoft };
      return {
        id: r.id, branch: bm.name, bc: bm.accent, name: emp?.name || '—',
        type: r.type,
        detail: `${r.date}${r.reason ? ' · ' + r.reason.slice(0, 12) : ''}`,
        time: r.createdAt ? new Date(r.createdAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) + '일' : '—',
      };
    }), [requests, employees]);

  const issueFeed = useMemo(() =>
    openIssues.slice(0, 3).map((i) => {
      const emp = employees.find((e) => e.id === i.workerId);
      const bm = D_BRANCH_META[emp?.branch] || { name: '—', accent: T.mutedSoft };
      const sevMap = { '병해충': 'critical', '설비고장': 'critical', '작물이상': 'warning' };
      return {
        branch: bm.name, bc: bm.accent, severity: sevMap[i.type] || 'info',
        type: i.type, who: emp?.name || '—',
        time: i.createdAt ? new Date(i.createdAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) + '일' : '—',
        note: i.comment || '이상 신고',
      };
    }), [issues, employees]);

  const noticeItems = useMemo(() =>
    notices.slice(0, 3).map((n) => ({
      tag: n.priority === 'important' ? '전사 · 중요' : (n.authorTeam || '정책'),
      tone: n.priority === 'important' ? 'danger' : 'info',
      title: n.title,
      meta: `작성 ${new Date(n.createdAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}일`,
      pinned: n.priority === 'important',
    })), [notices]);

  const now = new Date();
  const todayStr = (() => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${days[now.getDay()]}`;
  })();

  return (
    <AdminMobileShell role="hq" active="home">
      {({ accent, accentDark, roleLabel }) => (
        <div>
          {/* 헤더 — PC HQTopBar 패턴(HQ칩 + 부제 + 타이틀) 모바일 축소 */}
          <div style={{
            background: `linear-gradient(160deg, ${accent} 0%, ${accentDark} 100%)`,
            color: '#fff', padding: '18px 20px 85px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, opacity: 0.9, marginBottom: 4 }}>
                  <span style={{ padding: '2px 7px', borderRadius: 4, background: 'rgba(255,255,255,0.22)', fontWeight: 700, letterSpacing: 0.3 }}>HQ</span>
                  <span>본사 · 다지점 통합</span>
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4 }}>안녕하세요, {currentUser?.name || '관리자'}님</div>
                <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4 }}>{now.getFullYear()}년 {now.getMonth() + 1}월 · 월간 운영 리포트</div>
              </div>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <Icon d={icons.bell} size={16} c="#fff" sw={2} />
                {openIssues.length > 0 && <span style={{ position: 'absolute', top: 5, right: 7, width: 8, height: 8, borderRadius: 999, background: '#FDE047', border: '1.5px solid #fff' }} />}
              </div>
            </div>
            {/* 기간 피커 — PC HQTopBar 패턴, 모바일 축소 */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 2, padding: 2,
              background: 'rgba(0,0,0,0.18)', borderRadius: 6, fontSize: 11, fontWeight: 600,
            }}>
              {['일', '주', '월', '분기'].map((p) => (
                <span key={p} onClick={() => setPeriod(p)} style={{
                  padding: '4px 10px', borderRadius: 4, cursor: 'pointer',
                  background: period === p ? '#fff' : 'transparent',
                  color: period === p ? accent : 'rgba(255,255,255,0.85)',
                }}>{p}</span>
              ))}
            </div>
          </div>

          {/* 전사 KPI 4칸 (오버랩) */}
          <div style={{ padding: '0 14px', marginTop: -70, position: 'relative', zIndex: 2 }}>
            <div style={{ background: MA.card, borderRadius: 8, padding: 12, border: `1px solid ${MA.border}`, boxShadow: '0 10px 30px rgba(15,23,42,0.08)' }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <StatTile
                  label="전사 가동률"
                  value={totalWorkers > 0 ? Math.round(totalCheckedIn / totalWorkers * 100) : 0}
                  unit="%"
                  sub={`${totalCheckedIn} / ${totalWorkers}명`}
                  tone="success" accent={accent}
                />
                <StatTile
                  label="월 수확량"
                  value={totalHarvest > 0 ? (totalHarvest / 1000).toFixed(1) : '—'}
                  unit={totalHarvest > 0 ? 't' : ''}
                  sub="목표 미설정"
                  tone="primary" accent={accent}
                />
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <StatTile label="월 인건비" value="—" sub="집계 없음" tone="warning" accent={accent} />
                <StatTile
                  label="미해결 이슈"
                  value={openIssues.length}
                  unit="건"
                  sub={openIssues.length > 0 ? `긴급 ${openIssues.filter(i => i.type === '병해충' || i.type === '설비고장').length}건` : '정상'}
                  tone="danger" accent={accent}
                />
              </div>
            </div>
          </div>

          {/* 지점별 운영 현황 — PC 카드 3개 → 모바일 세로 스택 */}
          <div style={{ padding: '14px 14px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: MA.text, letterSpacing: -0.2 }}>지점별 운영 현황</div>
                <div style={{ fontSize: 10, color: MA.mutedSoft, marginTop: 2 }}>오늘 기준</div>
              </div>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: accent, fontWeight: 600 }}>지점 관리 →</span>
            </div>
            {branches.map((b) => {
              return (
                <div key={b.code} style={{ background: MA.card, borderRadius: 8, marginBottom: 10, border: `1px solid ${MA.border}`, overflow: 'hidden' }}>
                  {/* PC 카드와 동일: 상단 accentSoft 배경 헤더 */}
                  <div style={{ padding: '10px 14px', background: b.accentSoft, borderBottom: `1px solid ${MA.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 6, background: b.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon d={icons.location} size={14} c="#fff" sw={2} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: MA.text, letterSpacing: -0.2 }}>{b.name}</div>
                      <div style={{ fontSize: 10, color: MA.mutedSoft, marginTop: 1 }}>{b.workers}명 · 지점장 {b.mgr}</div>
                    </div>
                    {b.status === 'alert' ? <Chip tone="warning">주의</Chip> : <Chip tone="success">정상</Chip>}
                  </div>
                  <div style={{ padding: 12 }}>
                    {/* 출근 진행바 — PC 패턴 그대로 */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: MA.muted }}>출근 현황</span>
                        <span style={{ fontSize: 11, color: MA.mutedSoft }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: MA.text, letterSpacing: -0.3 }}>{b.checkedIn}</span>
                          <span style={{ marginLeft: 3 }}> / {b.workers}명</span>
                        </span>
                      </div>
                      <div style={{ height: 5, background: MA.bg, borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ width: `${b.rate}%`, height: '100%', background: b.accent }} />
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 5, fontSize: 10, color: MA.mutedSoft }}>
                        <span>정상 <span style={{ color: MA.success, fontWeight: 700 }}>{b.checkedIn - b.late}</span></span>
                        <span>지각 <span style={{ color: MA.warn, fontWeight: 700 }}>{b.late}</span></span>
                        <span>미출근 <span style={{ color: MA.danger, fontWeight: 700 }}>{b.workers - b.checkedIn}</span></span>
                      </div>
                    </div>
                    {/* 3분할 통계 — PC 패턴 그대로 */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, paddingTop: 10, borderTop: `1px solid ${MA.divider}` }}>
                      {[
                        { l: '수확', v: b.harvest > 0 ? Number(b.harvest.toFixed(1)).toLocaleString() : '—', u: b.harvest > 0 ? 'kg' : '' },
                        { l: '달성', v: '—', u: '' },
                        { l: 'TBM', v: '—', u: '' },
                      ].map((s, i) => (
                        <div key={i}>
                          <div style={{ fontSize: 10, color: MA.mutedSoft, fontWeight: 600 }}>{s.l}</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: MA.text, letterSpacing: -0.3, marginTop: 2 }}>
                            {s.v}
                            <span style={{ fontSize: 10, color: MA.mutedSoft, fontWeight: 500, marginLeft: 1 }}>{s.u}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 지점별 수확량 비교 — PC Y그리드 + 그룹 막대 (모바일 축소) */}
          <div style={{ padding: '4px 14px 0' }}>
            <CardBlock title="이번 달 지점별 수확량" sub="kg · 막대 높이 = 이번 달 실적">
              <BranchBarsMobile branches={branches} />
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${MA.divider}`, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {branches.map((b) => (
                  <div key={b.code} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10 }}>
                    <Dot c={b.accent} />
                    <span style={{ fontWeight: 700, color: MA.text }}>{b.name}</span>
                    <span style={{ color: MA.mutedSoft }}>{b.harvest > 0 ? Number(b.harvest.toFixed(1)).toLocaleString() : '—'}kg</span>
                  </div>
                ))}
              </div>
            </CardBlock>
          </div>

          {/* 승인 결재 — PC 승인 허브 패턴 모바일 축소 */}
          <div style={{ padding: '0 14px' }}>
            <CardBlock title="승인 결재" right={<Chip tone="danger">{pendingCount}건 대기</Chip>}>
              {/* 카테고리 필터 — BACKLOG: APPROVAL-CATEGORY-001 (근태만 실데이터, 나머지 0건) */}
              <div style={{ display: 'flex', gap: 5, marginBottom: 10, overflowX: 'auto', paddingBottom: 2 }}>
                {[
                  { k: 'all',        l: '전체', n: pendingCount, on: true },
                  { k: 'attendance', l: '근태', n: pendingCount },
                  { k: 'budget',     l: '예산', n: 0 },
                  { k: 'hr',         l: '인사', n: 0 },
                  { k: 'material',   l: '자재', n: 0 },
                ].map((p) => {
                  const disabled = p.n === 0 && !p.on;
                  return (
                    <span key={p.k} style={{
                      padding: '4px 9px', borderRadius: 4, fontWeight: 600, fontSize: 11,
                      whiteSpace: 'nowrap',
                      background: p.on ? MA.text : MA.bg,
                      color: p.on ? '#fff' : disabled ? MA.mutedSoft : MA.muted,
                      opacity: disabled ? 0.5 : 1,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      {p.l}
                      <span style={{ fontSize: 9, padding: '0 5px', borderRadius: 999, background: p.on ? 'rgba(255,255,255,0.2)' : MA.divider }}>{p.n}</span>
                    </span>
                  );
                })}
              </div>
              {pendingLeave.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', color: MA.mutedSoft, fontSize: 12 }}>대기 중인 승인 요청 없음</div>
              ) : pendingLeave.map((r, i) => (
                <div key={r.id} style={{ padding: '10px 0', borderBottom: i < pendingLeave.length - 1 ? `1px solid ${MA.divider}` : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Dot c={r.bc} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: MA.muted }}>{r.branch}</span>
                    <span style={{ fontSize: 10, color: MA.mutedSoft }}>· {r.name}</span>
                    <Chip tone="primary">근태</Chip>
                    <span style={{ fontSize: 10, color: MA.mutedSoft, marginLeft: 'auto' }}>{r.time}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: MA.text }}>{r.type}</div>
                  <div style={{ fontSize: 11, color: MA.muted, marginTop: 1 }}>{r.detail}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button onClick={() => farmReview(r.id, false, currentUser?.id)} style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: `1px solid ${MA.border}`, background: MA.card, color: MA.muted, fontSize: 11, fontWeight: 600 }}>반려</button>
                    <button onClick={() => farmReview(r.id, true, currentUser?.id)} style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: 0, background: accent, color: '#fff', fontSize: 11, fontWeight: 700 }}>승인</button>
                  </div>
                </div>
              ))}
            </CardBlock>
          </div>

          {/* 전 지점 이슈 피드 — PC 이슈 카드 패턴 */}
          <div style={{ padding: '0 14px' }}>
            <CardBlock title="전 지점 이상 신고" right={<Chip tone="danger">{openIssues.length}건</Chip>}>
              {issueFeed.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', color: MA.mutedSoft, fontSize: 12 }}>미해결 이슈 없음</div>
              ) : issueFeed.map((it, i) => {
                const sevBg = { critical: T.dangerSoft, warning: T.warningSoft, info: HQ.accentSoft }[it.severity];
                const sevBorder = { critical: T.danger, warning: T.warning, info: HQ.accent }[it.severity];
                const sevTone = { critical: 'danger', warning: 'warning', info: 'info' }[it.severity];
                return (
                  <div key={i} style={{ padding: '10px 12px', background: sevBg, borderRadius: 6, borderLeft: `3px solid ${sevBorder}`, marginBottom: i < issueFeed.length - 1 ? 6 : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Dot c={it.bc} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: MA.muted }}>{it.branch}</span>
                      <Chip tone={sevTone}>{it.type}</Chip>
                      <span style={{ fontSize: 10, color: MA.mutedSoft, marginLeft: 'auto' }}>{it.time}</span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: MA.text }}>{it.who} — {it.note}</div>
                  </div>
                );
              })}
            </CardBlock>
          </div>

          {/* 공지 · 정책 — PC 공지 카드 패턴 */}
          <div style={{ padding: '0 14px 16px' }}>
            <CardBlock title="공지 · 정책 관리" right={<span style={{ fontSize: 11, color: accent, fontWeight: 600 }}>+ 새 공지</span>}>
              {noticeItems.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', color: MA.mutedSoft, fontSize: 12 }}>공지 없음</div>
              ) : noticeItems.map((n, i) => (
                <div key={i} style={{
                  padding: '10px 12px', background: MA.bg, borderRadius: 6,
                  borderLeft: n.pinned ? `3px solid ${T.danger}` : '3px solid transparent',
                  marginBottom: i < noticeItems.length - 1 ? 6 : 0,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Chip tone={n.tone}>{n.tag}</Chip>
                    {n.pinned && <Icon d="M10 2l2 5 5 1-4 4 1 6-5-3-5 3 1-6-4-4 5-1z" size={11} c={T.danger} />}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: MA.text, lineHeight: 1.35 }}>{n.title}</div>
                  <div style={{ fontSize: 10, color: MA.mutedSoft, marginTop: 3 }}>{n.meta}</div>
                </div>
              ))}
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${MA.divider}`, display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: MA.mutedSoft }}>활성 공지 <span style={{ color: MA.text, fontWeight: 700 }}>{notices.length}건</span></span>
                <span style={{ color: MA.mutedSoft }}>평균 열람률 <span style={{ fontWeight: 700 }}>—</span></span>
              </div>
            </CardBlock>
          </div>
        </div>
      )}
    </AdminMobileShell>
  );
}

// 지점별 수확량 비교 — Y그리드 + 단순 막대 (PC 동일 패턴 모바일 축소)
const BranchBarsMobile = ({ branches }) => {
  const max = Math.max(...branches.map((b) => b.harvest), 1);
  const niceMax = Math.ceil(max / 100) * 100;
  const ticks = [0, 0.5, 1].map((f) => Math.round(niceMax * f));
  const H = 130;
  return (
    <div style={{ position: 'relative', paddingLeft: 36, paddingTop: 4, paddingBottom: 4 }}>
      {/* Y라인 — PC Y축 그리드 패턴 */}
      <div style={{ position: 'absolute', left: 36, right: 0, top: 4, height: H, pointerEvents: 'none' }}>
        {ticks.map((v, idx) => {
          const top = H - (idx / (ticks.length - 1)) * H;
          return (
            <div key={idx} style={{
              position: 'absolute', left: 0, right: 0, top,
              borderTop: idx === 0 ? `1px solid ${MA.border}` : `1px dashed ${MA.divider}`,
            }}>
              <span style={{ position: 'absolute', left: -34, top: -6, fontSize: 9, color: MA.mutedSoft, fontWeight: 600 }}>
                {v.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', height: H, alignItems: 'flex-end', gap: 16, position: 'relative', zIndex: 1 }}>
        {branches.map((b) => {
          const h = niceMax > 0 ? (b.harvest / niceMax) * H : 0;
          return (
            <div key={b.code} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: b.harvest > 0 ? MA.text : MA.mutedSoft, marginBottom: 4 }}>
                {b.harvest > 0 ? Number(b.harvest.toFixed(1)).toLocaleString() : '—'}
              </div>
              <div style={{ width: '100%', maxWidth: 56, height: Math.max(h, b.harvest > 0 ? 4 : 0), background: b.accent, opacity: b.harvest > 0 ? 0.92 : 0.18, borderRadius: '6px 6px 0 0' }} />
              <div style={{ fontSize: 10, color: MA.muted, fontWeight: 600, marginTop: 6 }}>{b.name}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export {
  AdminMobileShell,
  MobileAdminHomeFarm,
  MobileAdminHomeHQ,
  MA, D_BRANCH_META,
  StatTile, CardBlock, Row, Chip, Dot, MiniBars,
};

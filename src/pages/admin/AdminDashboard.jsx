import React, { useMemo } from 'react';
import { Avatar, Card, Dot, Icon, Pill, T, TopBar, btnPrimary, btnSecondary, icons } from '../../design/primitives';
import useTaskStore from '../../stores/taskStore';
import useEmployeeStore from '../../stores/employeeStore';
import useAttendanceStore from '../../stores/attendanceStore';
import useLeaveStore from '../../stores/leaveStore';
import useOvertimeStore from '../../stores/overtimeStore';
import useIssueStore from '../../stores/issueStore';
import useNoticeStore from '../../stores/noticeStore';
import useCropStore from '../../stores/cropStore';
import useZoneStore from '../../stores/zoneStore';
import useCallStore from '../../stores/callStore';

// 기존 코드와 동일한 UTC 기준 (attendanceStore.checkIn과 일치)
const TODAY = new Date().toISOString().split('T')[0];

function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function timeAgo(iso) {
  if (!iso) return '';
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  if (m < 1440) return `${Math.floor(m / 60)}시간 전`;
  return `${Math.floor(m / 1440)}일 전`;
}

function fmtLeaveDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}/${d.getDate()} (${days[d.getDay()]})`;
}

const AVATAR_COLORS = ['indigo', 'emerald', 'amber', 'sky', 'rose', 'violet'];

// 관리자 대시보드 화면 — 프로페셔널 SaaS 스타일
function AdminDashboardScreen() {
  // ─── 스토어 구독 ───
  const tasks = useTaskStore((s) => s.tasks);
  const employees = useEmployeeStore((s) => s.employees);
  const records = useAttendanceStore((s) => s.records);
  const leaveRequests = useLeaveStore((s) => s.requests);
  const overtimeRequests = useOvertimeStore((s) => s.requests);
  const issues = useIssueStore((s) => s.issues);
  const notices = useNoticeStore((s) => s.notices);
  const crops = useCropStore((s) => s.crops);
  const zones = useZoneStore((s) => s.zones);
  const calls = useCallStore((s) => s.calls);

  // ─── 룩업 맵 ───
  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);
  const cropMap = useMemo(() => Object.fromEntries(crops.map((c) => [c.id, c])), [crops]);
  const zoneMap = useMemo(() => Object.fromEntries(zones.map((z) => [z.id, z])), [zones]);

  // ─── 파생 데이터 ───
  const todayRecords = useMemo(() => records.filter((r) => r.date === TODAY), [records]);
  const todayTasks = useMemo(() => tasks.filter((t) => t.date === TODAY), [tasks]);
  const activeEmp = useMemo(() => employees.filter((e) => e.isActive), [employees]);
  const pendingLeave = useMemo(() => leaveRequests.filter((r) => r.status === 'pending'), [leaveRequests]);
  const pendingOT = useMemo(() => overtimeRequests.filter((r) => r.status === 'pending'), [overtimeRequests]);
  const openIssues = useMemo(() => issues.filter((i) => !i.isResolved), [issues]);
  const unconfirmedCalls = useMemo(() => calls.filter((c) => !c.isConfirmed), [calls]);

  const checkedInCount = todayRecords.filter((r) => r.checkIn).length;
  const pendingCount = pendingLeave.length + pendingOT.length;

  // ─── KPI 배열 ───
  const kpis = [
    {
      label: '오늘 출근',
      value: checkedInCount,
      total: activeEmp.length || undefined,
      tone: 'success',
      sub: `출근율 ${activeEmp.length ? Math.round((checkedInCount / activeEmp.length) * 100) : 0}%`,
      trend: `${checkedInCount}명`,
    },
    {
      label: '진행중 작업',
      value: todayTasks.filter((t) => t.status === 'in_progress').length,
      total: todayTasks.length || undefined,
      tone: 'primary',
      sub: `완료 ${todayTasks.filter((t) => t.status === 'completed').length} · 대기 ${todayTasks.filter((t) => t.status === 'pending').length}`,
      trend: `${todayTasks.length ? Math.round((todayTasks.filter((t) => t.status === 'completed').length / todayTasks.length) * 100) : 0}%`,
    },
    {
      label: '승인 대기',
      value: pendingCount,
      tone: 'warning',
      sub: `휴가 ${pendingLeave.length} · 연장 ${pendingOT.length}`,
      trend: '신규',
    },
    {
      label: '이상 신고',
      value: openIssues.length,
      tone: 'danger',
      sub: '미해결',
      trend: unconfirmedCalls.length > 0 ? `긴급 ${unconfirmedCalls.length}` : '없음',
    },
  ];

  // ─── 오늘 작업 목록 ───
  const taskRows = useMemo(() => {
    const statusConvert = { pending: 'waiting', in_progress: 'active', completed: 'done' };
    const progressConvert = { pending: 0, in_progress: 50, completed: 100 };
    const items = todayTasks.slice(0, 8).map((t) => {
      const worker = empMap[t.workerId];
      const endTime = t.estimatedMinutes && t.assignedAt
        ? fmtTime(new Date(new Date(t.assignedAt).getTime() + t.estimatedMinutes * 60000).toISOString())
        : '—';
      return {
        crop: cropMap[t.cropId]?.name || '—',
        zone: [zoneMap[t.zoneId]?.name, t.rowRange].filter(Boolean).join(' ') || '—',
        type: t.taskType || t.title || '—',
        workers: worker ? [worker.name[0]] : [],
        progress: progressConvert[t.status] ?? 0,
        status: statusConvert[t.status] || 'waiting',
        time: `${fmtTime(t.assignedAt)}~${endTime}`,
      };
    });
    // 오늘 작업 없으면 fallback
    if (items.length === 0) return [
      { crop: '토마토', zone: 'A동 1-8열', type: '수확', workers: ['김', '이', '박'], progress: 85, status: 'active', time: '09:00~11:30' },
      { crop: '딸기', zone: 'B동 3-5열', type: '러너 정리', workers: ['최', '정'], progress: 60, status: 'active', time: '09:30~12:00' },
      { crop: '파프리카', zone: 'C동 전체', type: '병해충 예찰', workers: ['강'], progress: 100, status: 'done', time: '08:30~09:30' },
      { crop: '오이', zone: 'D동 1-4열', type: 'EC/pH 측정', workers: ['윤', '한'], progress: 0, status: 'waiting', time: '13:00~14:00' },
    ];
    return items;
  }, [todayTasks, empMap, cropMap, zoneMap]);

  // ─── 이상 신고 + 긴급 호출 ───
  const alertItems = useMemo(() => {
    const issueItems = openIssues.slice(0, 3).map((issue) => ({
      icon: icons.alert,
      color: T.danger,
      bg: T.dangerSoft,
      borderColor: T.danger,
      label: issue.type || '이상 신고',
      place: [zoneMap[issue.zoneId]?.name, empMap[issue.workerId]?.name].filter(Boolean).join(' · ') || '—',
      note: `${empMap[issue.workerId]?.name || '—'} — ${issue.comment || '이상이 신고되었습니다'}`,
      time: timeAgo(issue.createdAt),
    }));
    const callItems = unconfirmedCalls.slice(0, Math.max(0, 3 - issueItems.length)).map((call) => ({
      icon: icons.phone,
      color: T.warning,
      bg: T.warningSoft,
      borderColor: T.warning,
      label: call.type || '긴급 호출',
      place: empMap[call.workerId]?.name ? `${empMap[call.workerId].name} 호출` : '긴급 호출',
      note: `${empMap[call.workerId]?.name || '—'} — ${call.memo || '긴급 호출이 접수되었습니다'}`,
      time: timeAgo(call.createdAt),
    }));
    return [...issueItems, ...callItems];
  }, [openIssues, unconfirmedCalls, zoneMap, empMap]);

  const resolvedTodayCount = useMemo(
    () => issues.filter((i) => i.isResolved && i.createdAt?.startsWith(TODAY)).length,
    [issues]
  );

  // ─── 승인 대기 목록 ───
  const approvalRows = useMemo(() => {
    const leaves = pendingLeave.slice(0, 3).map((r, idx) => ({
      name: empMap[r.employeeId]?.name || '—',
      type: r.type || '휴가',
      detail: fmtLeaveDate(r.date),
      tag: '휴가',
      c: AVATAR_COLORS[idx % AVATAR_COLORS.length],
      id: r.id,
    }));
    const ots = pendingOT.slice(0, Math.max(0, 3 - leaves.length)).map((r, idx) => ({
      name: empMap[r.employeeId]?.name || '—',
      type: '연장근무',
      detail: `${r.hours}시간${r.minutes > 0 ? ` ${r.minutes}분` : ''}`,
      tag: '연장',
      c: AVATAR_COLORS[(leaves.length + idx) % AVATAR_COLORS.length],
      id: r.id,
    }));
    const merged = [...leaves, ...ots].slice(0, 3);
    // 승인 대기 없으면 fallback
    if (merged.length === 0) return [
      { name: '김민국', type: '연차', detail: '4/23 (수)', tag: '휴가', c: 'indigo' },
      { name: '박민식', type: '연장근무', detail: '오늘 2시간', tag: '연장', c: 'amber' },
      { name: '이강모', type: 'TBM 승인', detail: '반장 제출 대기', tag: 'TBM', c: 'emerald' },
    ];
    return merged;
  }, [pendingLeave, pendingOT, empMap]);

  // ─── 공지사항 목록 ───
  const noticeRows = useMemo(() => {
    const teamLabel = { farm: '재배팀', management: '관리팀' };
    const priorityMeta = { urgent: { tag: '중요', tone: 'danger' }, normal: { tag: '일반', tone: 'muted' } };
    const items = notices.slice(0, 4).map((n) => ({
      tag: priorityMeta[n.priority]?.tag || '일반',
      tone: priorityMeta[n.priority]?.tone || 'muted',
      title: n.title,
      meta: `${n.authorTeam ? (teamLabel[n.authorTeam] || n.authorTeam) : '전체 공지'} · ${timeAgo(n.createdAt)}`,
      pinned: n.priority === 'urgent',
    }));
    // 공지 없으면 fallback
    if (items.length === 0) return [
      { tag: '중요', tone: 'danger', title: '4월 23일 정기 안전교육 필참', meta: '전체 공지 · 2시간 전', pinned: true },
      { tag: '일정', tone: 'primary', title: '금주 토요일 출근조 3명 편성', meta: '재배팀 · 어제' },
      { tag: '알림', tone: 'success', title: '농약 창고 재고 입고 완료', meta: '자재팀 · 2일 전' },
      { tag: '일반', tone: 'muted', title: '5월 연차 사용 계획 제출 요청', meta: '인사 · 3일 전' },
    ];
    return items;
  }, [notices]);

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg }}>
      <TopBar
        subtitle="재배팀"
        title="2026년 4월 21일 화요일"
        actions={<>{btnSecondary('내보내기')}{btnPrimary('새 작업 등록', icons.plus)}</>}
      />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* KPI 4 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {kpis.map((k, i) => {
            const tones = { success: T.success, primary: T.primary, warning: T.warning, danger: T.danger };
            const softs = { success: T.successSoft, primary: T.primarySoft, warning: T.warningSoft, danger: T.dangerSoft };
            return (
              <Card key={i} pad={18} style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: tones[k.tone] }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <span style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>{k.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', background: softs[k.tone], color: tones[k.tone], borderRadius: 4 }}>{k.trend}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 36, fontWeight: 700, color: T.text, letterSpacing: -1, lineHeight: 1 }}>{k.value}</span>
                  {k.total && <span style={{ fontSize: 14, color: T.mutedSoft, fontWeight: 500 }}>/ {k.total}명</span>}
                </div>
                <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 8 }}>{k.sub}</div>
              </Card>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
          {/* 오늘 작업 진행 현황 */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>오늘 작업 진행 현황</h3>
                <p style={{ fontSize: 12, color: T.mutedSoft, margin: '2px 0 0' }}>작물별 배정된 작업의 실시간 상태</p>
              </div>
              <div style={{ display: 'flex', gap: 4, background: T.bg, padding: 3, borderRadius: 6, fontSize: 12 }}>
                {['오늘', '이번 주', '이번 달'].map((t, i) => (
                  <span key={t} style={{
                    padding: '5px 12px', borderRadius: 4, fontWeight: 600,
                    background: i === 0 ? T.surface : 'transparent',
                    color: i === 0 ? T.text : T.mutedSoft,
                    boxShadow: i === 0 ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    cursor: 'pointer',
                  }}>{t}</span>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {taskRows.map((t, i) => {
                const statusMap = {
                  active: { tone: 'primary', label: '진행중' },
                  done: { tone: 'success', label: '완료' },
                  waiting: { tone: 'muted', label: '대기' },
                };
                const s = statusMap[t.status];
                const barColor = t.status === 'done' ? T.success : t.status === 'active' ? T.primary : T.mutedSoft;
                return (
                  <div key={i} style={{
                    padding: '14px 16px', background: T.bg, borderRadius: 10,
                    display: 'flex', alignItems: 'center', gap: 16,
                  }}>
                    <div style={{ width: 60 }}>
                      <div style={{ fontSize: 11, color: T.mutedSoft, fontWeight: 600 }}>{t.time.split('~')[0]}</div>
                      <div style={{ fontSize: 10, color: T.mutedSoft }}>~{t.time.split('~')[1]}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{t.crop} · {t.type}</span>
                        <Pill tone={s.tone}>{s.label}</Pill>
                        <span style={{ fontSize: 11, color: T.mutedSoft }}>{t.zone}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, height: 6, background: T.borderSoft, borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ width: `${t.progress}%`, height: '100%', background: barColor, transition: 'width 0.4s' }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: T.muted, width: 32, textAlign: 'right' }}>{t.progress}%</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex' }}>
                      {t.workers.map((w, j) => (
                        <div key={j} style={{ marginLeft: j > 0 ? -8 : 0, border: `2px solid ${T.bg}`, borderRadius: 999 }}>
                          <Avatar name={w} size={26} c={['indigo', 'emerald', 'amber', 'slate'][j % 4]} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* 긴급 호출 · 이상 신고 (오늘 작업 진행 현황 옆) */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>긴급 호출 · 이상 신고</h3>
                <Pill tone="danger">{openIssues.length + unconfirmedCalls.length || 0}</Pill>
              </div>
              <span style={{ fontSize: 11, color: T.primary, fontWeight: 600, cursor: 'pointer' }}>모두 보기</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {alertItems.length > 0 ? alertItems.map((a, i) => (
                <div key={i} style={{ padding: 12, background: a.bg, borderLeft: `3px solid ${a.borderColor}`, borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Icon d={a.icon} size={12} c={a.color} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: a.color }}>{a.label}</span>
                    <span style={{ fontSize: 10, color: T.mutedSoft, marginLeft: 'auto' }}>{a.time}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{a.place}</div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{a.note}</div>
                </div>
              )) : (
                <div style={{ padding: 12, background: T.bg, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Dot c={T.success} />
                  <span style={{ fontSize: 11, color: T.mutedSoft }}>현재 미해결 신고 없음</span>
                </div>
              )}
              <div style={{ padding: 12, background: T.bg, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Dot c={T.mutedSoft} />
                <span style={{ fontSize: 11, color: T.mutedSoft }}>해결됨 · 오늘 {resolvedTodayCount}건</span>
              </div>
            </div>
          </Card>
        </div>

        {/* 하단 3단 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 0.9fr', gap: 20 }}>
          {/* 주간 성과 그래프 — Phase 2 연결 예정 */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>이번 주 작업 성과</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
                  <span style={{ fontSize: 30, fontWeight: 700, color: T.text, letterSpacing: -0.8, lineHeight: 1 }}>3,280</span>
                  <span style={{ fontSize: 13, color: T.mutedSoft, fontWeight: 500 }}>kg</span>
                  <Pill tone="success">▲ 12%</Pill>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 110, padding: '0 4px' }}>
              {[
                { d: '월', v: 45 }, { d: '화', v: 62 }, { d: '수', v: 58 },
                { d: '목', v: 78 }, { d: '금', v: 90, today: true }, { d: '토', v: 0 }, { d: '일', v: 0 },
              ].map((b, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%' }}>
                  <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                    <div style={{
                      width: '100%', height: `${b.v}%`,
                      background: b.today ? T.primary : b.v > 0 ? T.primarySoft : T.borderSoft,
                      borderRadius: '4px 4px 0 0',
                      border: b.today ? `1px solid ${T.primaryDark}` : 'none',
                    }} />
                  </div>
                  <span style={{ fontSize: 10, color: b.today ? T.primary : T.mutedSoft, fontWeight: b.today ? 700 : 500 }}>{b.d}</span>
                </div>
              ))}
            </div>
            <div style={{ paddingTop: 14, marginTop: 14, borderTop: `1px solid ${T.borderSoft}`, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.mutedSoft }}>
              <span>목표 대비 <span style={{ color: T.text, fontWeight: 700 }}>87%</span></span>
              <span style={{ color: T.primary, fontWeight: 600, cursor: 'pointer' }}>상세 분석 →</span>
            </div>
          </Card>

          {/* 승인 대기 */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>승인 대기</h3>
                <Pill tone="danger">{pendingCount}</Pill>
              </div>
              <span style={{ fontSize: 11, color: T.primary, fontWeight: 600, cursor: 'pointer' }}>모두 보기</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {approvalRows.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: T.bg, borderRadius: 8 }}>
                  <Avatar name={r.name} size={32} c={r.c} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {r.name}
                      <span style={{ fontSize: 10, fontWeight: 600, color: T.mutedSoft, padding: '1px 5px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 3 }}>{r.tag}</span>
                    </div>
                    <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 2 }}>{r.type} · {r.detail}</div>
                  </div>
                  <button style={{ width: 26, height: 26, borderRadius: 6, background: T.surface, border: `1px solid ${T.border}`, color: T.mutedSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Icon d={icons.x} size={12} sw={2.5} />
                  </button>
                  <button style={{ width: 26, height: 26, borderRadius: 6, background: T.primary, border: 0, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Icon d={icons.check} size={12} sw={2.5} c="#fff" />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* 공지사항 */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>공지사항</h3>
                <Pill tone="primary">{notices.length}</Pill>
              </div>
              <span style={{ fontSize: 11, color: T.primary, fontWeight: 600, cursor: 'pointer' }}>작성 +</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {noticeRows.map((n, i) => {
                const tones = { danger: T.danger, primary: T.primary, success: T.success, muted: T.mutedSoft };
                const softs = { danger: T.dangerSoft, primary: T.primarySoft, success: T.successSoft, muted: T.bg };
                return (
                  <div key={i} style={{
                    padding: '10px 12px', background: T.bg, borderRadius: 8,
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    borderLeft: n.pinned ? `3px solid ${T.danger}` : '3px solid transparent',
                  }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                      background: softs[n.tone], color: tones[n.tone], flexShrink: 0, marginTop: 1,
                    }}>{n.tag}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: T.text, lineHeight: 1.35, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {n.pinned && <Icon d="M10 2l2 5 5 1-4 4 1 6-5-3-5 3 1-6-4-4 5-1z" size={10} c={T.danger} />}
                        {n.title}
                      </div>
                      <div style={{ fontSize: 10, color: T.mutedSoft, marginTop: 3 }}>{n.meta}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* AI 제안 + 주간 스케줄 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
          <Card style={{ background: `linear-gradient(135deg, ${T.primarySoft}, #fff)`, border: `1px solid ${T.primarySoft}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: T.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>AI</div>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>재배 AI 제안</span>
              <Pill tone="primary">BETA</Pill>
            </div>
            <div style={{ fontSize: 13, color: T.text, lineHeight: 1.55, marginBottom: 12 }}>
              B동 딸기 구역 온도가 평년 대비 2.3℃ 높아요. <span style={{ color: T.primary, fontWeight: 600 }}>환기 강도 상향</span>을 권장합니다.
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {btnPrimary('적용하기')}
              {btnSecondary('자세히')}
            </div>
          </Card>

          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>이번 주 스케줄</h3>
              <span style={{ fontSize: 11, color: T.primary, fontWeight: 600, cursor: 'pointer' }}>전체 스케줄 →</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
              {['월 20', '화 21', '수 22', '목 23', '금 24', '토 25', '일 26'].map((d, i) => {
                const isToday = i === 1;
                const items = [
                  ['수확', 'TBM'],
                  ['수확', 'TBM', '예찰'],
                  ['수확', '적엽'],
                  ['수확', 'EC측정'],
                  ['수확', '방제'],
                  [],
                  [],
                ][i];
                return (
                  <div key={i} style={{
                    padding: 8, borderRadius: 8,
                    background: isToday ? T.primarySoft : T.bg,
                    border: isToday ? `1px solid ${T.primary}` : `1px solid transparent`,
                    minHeight: 92,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: isToday ? T.primary : T.muted, marginBottom: 6 }}>
                      {d}{isToday && <span style={{ marginLeft: 4, fontSize: 9 }}>오늘</span>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {items.map((t, j) => (
                        <div key={j} style={{
                          fontSize: 10, fontWeight: 600, padding: '3px 6px', borderRadius: 4,
                          background: isToday ? T.surface : T.surface,
                          color: T.text, border: `1px solid ${T.borderSoft}`,
                        }}>{t}</div>
                      ))}
                      {items.length === 0 && <div style={{ fontSize: 10, color: T.mutedSoft, padding: '3px 0' }}>휴무</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
export { AdminDashboardScreen };
export default AdminDashboardScreen;

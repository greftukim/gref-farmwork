import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { T, Dot, Icon, icons, Avatar, btnGhostStyle } from './primitives';
import useAuthStore from '../stores/authStore';
import useLeaveStore from '../stores/leaveStore';
import useIssueStore from '../stores/issueStore';
import useNoticeStore from '../stores/noticeStore';
import useEmployeeStore from '../stores/employeeStore';

// 관리팀(본사) 대시보드 — 다지점 통합 뷰
// 재배팀(지점) 뷰와 달리, 전 지점 KPI 비교 + 경영지표 + 승인허브 + 지점관리에 집중

// ─────── HQ 전용 색상 (재배팀 indigo와 구분, teal 액센트) ───────
const HQ = {
  accent: '#0D9488',
  accentDark: '#0F766E',
  accentSoft: '#F0FDFA',
  accentText: '#115E59',
};

// ─────── HQ Shell: 관리팀 전용 사이드바 + 상단바 ───────

function getActiveGroup(pathname) {
  if (pathname === '/admin/hq') return 'g-dashboard';
  if (pathname.startsWith('/admin/hq/performance')) return 'g-perf';
  if (pathname.startsWith('/admin/hq/finance')) return 'g-perf';
  if (pathname.startsWith('/admin/hq/employees')) return 'g-hr';
  if (pathname.startsWith('/admin/hq/leave')) return 'g-hr';
  if (pathname.startsWith('/admin/hq/growth')) return 'g-production';
  if (pathname.startsWith('/admin/hq/approvals')) return 'g-approvals';
  if (pathname.startsWith('/admin/hq/issues')) return 'g-ops';
  if (pathname.startsWith('/admin/hq/notices')) return 'g-policy';
  if (pathname.startsWith('/admin/hq/branches')) return 'g-branches';
  return 'g-dashboard';
}

const HQSidebar = ({ active = 'dashboard', onNavigate }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const currentUser = useAuthStore((s) => s.currentUser);
  const issues = useIssueStore((s) => s.issues);
  const openIssueCount = issues.filter((i) => !i.isResolved).length;
  const pendingLeaveCount = useLeaveStore((s) => s.requests.filter((r) => r.status === 'pending').length);

  const activeGroupId = getActiveGroup(location.pathname);

  const GROUPS = [
    {
      id: 'g-dashboard',
      label: '대시보드',
      items: [{ id: 'dashboard', label: '본사 대시보드', icon: icons.dashboard }],
    },
    {
      id: 'g-perf',
      label: '성과',
      items: [
        { id: 'finance', label: '경영 지표', icon: icons.chart },
        { id: 'performance', label: '성과 분석', icon: icons.chart },
      ],
    },
    {
      id: 'g-hr',
      label: '직원/근태 관리',
      items: [
        { id: 'employees', label: '전사 직원', icon: icons.users },
        { id: 'leave', label: '휴가 관리', icon: icons.calendar },
      ],
    },
    {
      id: 'g-production',
      label: '생산',
      items: [{ id: 'growth', label: '지점별 생육', icon: icons.sprout }],
    },
    {
      id: 'g-approvals',
      label: '승인 결재',
      items: [{ id: 'approvals', label: '승인 결재', icon: icons.check, badge: pendingLeaveCount || null }],
    },
    {
      id: 'g-ops',
      label: '운영/이슈',
      items: [{ id: 'issues', label: '이상 신고', icon: icons.alert, badge: openIssueCount || null }],
    },
    {
      id: 'g-policy',
      label: '공지/정책',
      items: [{ id: 'notice', label: '공지·정책', icon: icons.bell }],
    },
    {
      id: 'g-branches',
      label: '지점 관리',
      items: [{ id: 'branches', label: '지점 관리', icon: icons.location }],
      branches: [
        { n: '부산LAB', c: T.success },
        { n: '진주HUB', c: T.primary },
        { n: '하동HUB', c: T.warning },
      ],
    },
  ];

  return (
    <aside style={{
      width: 240, background: T.surface, borderRight: `1px solid ${T.border}`,
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      <div style={{ padding: '16px 20px 12px', borderBottom: `1px solid ${T.borderSoft}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: `linear-gradient(135deg, ${HQ.accent}, ${HQ.accentDark})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          }}>
            <Icon d={icons.sprout} size={16} sw={2} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, letterSpacing: -0.2 }}>FarmWork</div>
            <div style={{ fontSize: 10, color: HQ.accent, fontWeight: 700, letterSpacing: 0.4 }}>HQ · 관리팀</div>
          </div>
        </div>
      </div>

      {/* 팀 스위처 */}
      <div style={{ padding: '8px 12px 0' }}>
        <div style={{
          display: 'flex', background: T.bg, borderRadius: 8, padding: 3, fontSize: 11, fontWeight: 600,
        }}>
          <span style={{
            flex: 1, textAlign: 'center', padding: '5px 8px', borderRadius: 6,
            background: T.surface, color: T.text, boxShadow: '0 1px 2px rgba(15,23,42,0.08)',
          }}>관리팀</span>
          <span style={{ flex: 1, textAlign: 'center', padding: '5px 8px', color: T.mutedSoft }}>재배팀</span>
        </div>
      </div>

      {/* 메뉴 — 항상 펼침, 스크롤 없음 */}
      <nav style={{ padding: '6px 12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {GROUPS.map((g, gi) => {
          const isActiveGroup = g.id === activeGroupId;
          return (
            <div key={g.id} style={{ marginTop: gi === 0 ? 2 : 0 }}>
              {/* 그룹 레이블 — 구분용, 클릭 없음 */}
              <div style={{
                padding: '4px 8px 2px',
                fontSize: 9, fontWeight: 700, letterSpacing: 0.6,
                textTransform: 'uppercase', userSelect: 'none',
                color: isActiveGroup ? HQ.accent : T.mutedSoft,
              }}>
                {g.label}
              </div>

              {/* 하위 항목 — 항상 표시 */}
              {g.items.map((i) => {
                const on = i.id === active;
                return (
                  <div
                    key={i.id}
                    onClick={() => onNavigate && onNavigate(i.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 9,
                      padding: '5px 8px 5px 10px', borderRadius: 6, cursor: 'pointer',
                      background: on ? HQ.accentSoft : 'transparent',
                      color: on ? HQ.accentText : T.muted,
                      fontSize: 13, fontWeight: on ? 600 : 500,
                      marginBottom: 1,
                    }}
                    onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = T.bg; }}
                    onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Icon d={i.icon} size={14} sw={on ? 2.2 : 1.8} />
                    <span style={{ flex: 1 }}>{i.label}</span>
                    {i.badge && <span style={{
                      background: T.danger, color: '#fff', fontSize: 10, fontWeight: 700,
                      padding: '1px 6px', borderRadius: 999,
                    }}>{i.badge}</span>}
                  </div>
                );
              })}

              {g.branches && g.branches.map((b) => (
                <div
                  key={b.n}
                  onClick={() => navigate('/admin/hq/branches')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '4px 8px 4px 22px', borderRadius: 6, cursor: 'pointer',
                    color: T.muted, fontSize: 11, fontWeight: 500, marginBottom: 1,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = T.bg; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <Dot c={b.c} />
                  <span style={{ flex: 1 }}>{b.n}</span>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ opacity: 0.4 }}>
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              ))}
            </div>
          );
        })}
      </nav>

      {/* 하단 사용자 + 로그아웃 — 항상 보임 */}
      <div style={{ padding: '8px 12px 10px', borderTop: `1px solid ${T.borderSoft}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px 4px' }}>
          <Avatar name={currentUser?.name?.[0] || '관'} size={28} c="slate" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{currentUser?.name || '관리자'}</div>
            <div style={{ fontSize: 10, color: T.mutedSoft, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser?.username ? `@${currentUser.username}` : '관리자'}</div>
          </div>
        </div>
        <div
          onClick={async () => { await logout(); navigate('/login'); }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6, cursor: 'pointer', color: T.danger, fontSize: 12, fontWeight: 600 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = T.dangerSoft; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <Icon d={icons.logout} size={13} c={T.danger} sw={2} />
          <span>로그아웃</span>
        </div>
      </div>
    </aside>
  );
};

// ─────── HQTopBar — 기간 피커 + 알림 벨 드롭다운 ───────
const HQTopBar = ({ title, subtitle, actions, period, onPeriodChange }) => {
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  // 알림 소스 데이터
  const leaveRequests = useLeaveStore((s) => s.requests);
  const issues = useIssueStore((s) => s.issues);
  const notices = useNoticeStore((s) => s.notices);
  const employees = useEmployeeStore((s) => s.employees);

  // 알림 목록 집계
  const notifications = useMemo(() => {
    const items = [];
    leaveRequests
      .filter((r) => r.status === 'pending')
      .slice(0, 4)
      .forEach((r) => {
        const emp = employees.find((e) => e.id === r.employeeId);
        items.push({
          type: 'approval',
          title: `휴가 신청 대기 — ${emp?.name || '직원'}`,
          sub: r.date ? `${r.date} · ${r.type || '휴가'}` : r.type || '휴가',
          time: r.createdAt ? new Date(r.createdAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) + '일' : '—',
          link: '/admin/hq/approvals',
          ts: r.createdAt || '',
        });
      });
    issues
      .filter((i) => !i.isResolved)
      .slice(0, 3)
      .forEach((i) => {
        const emp = employees.find((e) => e.id === i.workerId);
        items.push({
          type: 'issue',
          title: `이상 신고 — ${i.type || '미분류'}`,
          sub: emp?.name ? `${emp.name} · 미해결` : '미해결',
          time: i.createdAt ? new Date(i.createdAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) + '일' : '—',
          link: '/admin/hq',
          ts: i.createdAt || '',
        });
      });
    notices.slice(0, 2).forEach((n) => {
      items.push({
        type: 'notice',
        title: n.title,
        sub: n.priority === 'important' ? '전사 중요 공지' : '공지',
        time: n.createdAt ? new Date(n.createdAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) + '일' : '—',
        link: '/admin/hq/notices',
        ts: n.createdAt || '',
      });
    });
    return items.sort((a, b) => (b.ts > a.ts ? 1 : -1));
  }, [leaveRequests, issues, notices, employees]);

  const unreadCount = notifications.length;

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const activePeriod = period || '월';
  const PERIODS = ['일', '주', '월', '분기'];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '20px 32px', borderBottom: `1px solid ${T.border}`, background: T.surface,
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: T.mutedSoft, marginBottom: 4 }}>
          <span style={{
            padding: '2px 8px', borderRadius: 4, background: HQ.accentSoft, color: HQ.accentText,
            fontWeight: 700, letterSpacing: 0.3,
          }}>HQ</span>
          <span>{subtitle}</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: -0.4, margin: 0 }}>{title}</h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

        {/* ── 기간 피커 (TASK 3: HQ-PERIOD-PICKER-001) ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: 3,
          background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12, fontWeight: 600,
        }}>
          {PERIODS.map((p) => {
            const on = p === activePeriod;
            return (
              <span key={p} onClick={() => onPeriodChange && onPeriodChange(p)} style={{
                padding: '5px 12px', borderRadius: 5,
                background: on ? T.surface : 'transparent',
                color: on ? T.text : T.mutedSoft,
                boxShadow: on ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer', transition: 'all 0.1s',
                userSelect: 'none',
              }}>{p}</span>
            );
          })}
        </div>

        {/* ── 알림 벨 드롭다운 ── */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setNotifOpen((v) => !v)}
            style={{ ...btnGhostStyle, background: notifOpen ? T.bg : 'transparent' }}
          >
            <Icon d={icons.bell} size={16} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 3, right: 3,
                minWidth: 16, height: 16, borderRadius: 999,
                background: T.danger, color: '#fff',
                fontSize: 9, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 3px', lineHeight: 1,
              }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
            {unreadCount === 0 && (
              <span style={{ position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: 999, background: T.danger }} />
            )}
          </button>

          {/* 알림 드롭다운 패널 */}
          {notifOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              width: 320, background: T.surface,
              border: `1px solid ${T.border}`, borderRadius: 12,
              boxShadow: '0 8px 24px rgba(15,23,42,0.12)', zIndex: 200,
            }}>
              {/* 헤더 */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px 10px', borderBottom: `1px solid ${T.borderSoft}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>알림</span>
                  {unreadCount > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 999,
                      background: T.dangerSoft, color: T.danger,
                    }}>{unreadCount}</span>
                  )}
                </div>
                <span onClick={() => setNotifOpen(false)} style={{ cursor: 'pointer', fontSize: 14, color: T.mutedSoft }}>✕</span>
              </div>

              {/* 알림 목록 */}
              <div style={{ maxHeight: 280, overflow: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 12, color: T.mutedSoft }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>🔔</div>
                    새 알림이 없습니다
                  </div>
                ) : notifications.map((n, i) => (
                  <div key={i}
                    onClick={() => { navigate(n.link); setNotifOpen(false); }}
                    style={{
                      padding: '11px 16px', cursor: 'pointer',
                      borderBottom: i < notifications.length - 1 ? `1px solid ${T.borderSoft}` : 'none',
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                    }}
                    onMouseEnter={(ev) => ev.currentTarget.style.background = T.bg}
                    onMouseLeave={(ev) => ev.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: n.type === 'approval' ? HQ.accentSoft : n.type === 'issue' ? T.warningSoft : T.primarySoft,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon d={n.type === 'approval' ? icons.check : n.type === 'issue' ? icons.alert : icons.bell}
                        size={14}
                        c={n.type === 'approval' ? HQ.accent : n.type === 'issue' ? T.warning : T.primary}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</div>
                      <div style={{ fontSize: 11, color: T.mutedSoft }}>{n.sub}</div>
                    </div>
                    <div style={{ fontSize: 10, color: T.mutedSoft, flexShrink: 0, marginTop: 2 }}>{n.time}</div>
                  </div>
                ))}
              </div>

              {/* 하단 전체 보기 */}
              <div style={{ padding: '10px 16px', borderTop: `1px solid ${T.borderSoft}` }}>
                <div onClick={() => { navigate('/admin/hq/approvals'); setNotifOpen(false); }}
                  style={{
                    textAlign: 'center', fontSize: 12, fontWeight: 600,
                    color: HQ.accent, cursor: 'pointer', padding: '4px 0',
                  }}>
                  전체 보기 →
                </div>
              </div>
            </div>
          )}
        </div>

        {actions}
      </div>
    </div>
  );
};

const HQShell = ({ active, children }) => (
  <div style={{ width: '100%', height: '100%', display: 'flex', fontFamily: 'Pretendard, system-ui', background: T.bg }}>
    <HQSidebar active={active} />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {children}
    </div>
  </div>
);

export { HQ, HQSidebar, HQTopBar, HQShell };

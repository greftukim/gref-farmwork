import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
const HQSidebar = ({ active = 'dashboard', onNavigate }) => {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const currentUser = useAuthStore((s) => s.currentUser);
  const items = [
    { id: 'dashboard', label: '본사 대시보드', icon: icons.dashboard },
    { id: 'branches', label: '지점 관리', icon: icons.location },
    { id: 'employees', label: '전사 직원', icon: icons.users },
    { id: 'performance', label: '작업자 성과', icon: icons.chart },
    { id: 'growth', label: '지점별 생육', icon: icons.sprout },
    { id: 'approvals', label: '승인 허브', icon: icons.check, badge: 12 },
    { id: 'finance', label: '경영 지표', icon: icons.chart },
    { id: 'notice', label: '공지 · 정책', icon: icons.bell },
    { id: 'settings', label: '시스템 설정', icon: icons.settings },
  ];
  return (
    <aside style={{
      width: 240, background: T.surface, borderRight: `1px solid ${T.border}`,
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${T.borderSoft}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `linear-gradient(135deg, ${HQ.accent}, ${HQ.accentDark})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          }}>
            <Icon d={icons.sprout} size={18} sw={2} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, letterSpacing: -0.2 }}>GREF Farm</div>
            <div style={{ fontSize: 10, color: HQ.accent, fontWeight: 700, letterSpacing: 0.4 }}>HQ · 관리팀</div>
          </div>
        </div>
      </div>

      {/* 팀 스위처 (관리팀 <-> 재배팀) */}
      <div style={{ padding: '12px 12px 0' }}>
        <div style={{
          display: 'flex', background: T.bg, borderRadius: 8, padding: 3, fontSize: 11, fontWeight: 600,
        }}>
          <span style={{
            flex: 1, textAlign: 'center', padding: '6px 8px', borderRadius: 6,
            background: T.surface, color: T.text, boxShadow: '0 1px 2px rgba(15,23,42,0.08)',
          }}>관리팀</span>
          <span style={{ flex: 1, textAlign: 'center', padding: '6px 8px', color: T.mutedSoft }}>재배팀</span>
        </div>
      </div>

      <nav style={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.mutedSoft, letterSpacing: 0.5, padding: '8px 12px 4px' }}>관리 메뉴</div>
        {items.map(i => {
          const on = i.id === active;
          return (
            <div key={i.id} onClick={() => onNavigate && onNavigate(i.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
              background: on ? HQ.accentSoft : 'transparent',
              color: on ? HQ.accentText : T.muted,
              fontSize: 13, fontWeight: on ? 600 : 500,
            }}>
              <Icon d={i.icon} size={16} sw={on ? 2.2 : 1.8} />
              <span style={{ flex: 1 }}>{i.label}</span>
              {i.badge && <span style={{
                background: T.danger, color: '#fff', fontSize: 10, fontWeight: 700,
                padding: '1px 6px', borderRadius: 999,
              }}>{i.badge}</span>}
            </div>
          );
        })}

        {/* 지점 퀵 스위처 */}
        <div style={{ fontSize: 10, fontWeight: 700, color: T.mutedSoft, letterSpacing: 0.5, padding: '16px 12px 4px' }}>지점 바로가기</div>
        {[
          { n: '부산LAB', c: T.success, active: true },
          { n: '진주HUB', c: T.primary },
          { n: '하동HUB', c: T.warning },
        ].map((b) => (
          <div key={b.n} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
            color: T.muted, fontSize: 12, fontWeight: 500,
          }}>
            <Dot c={b.c} />
            <span style={{ flex: 1 }}>{b.n}</span>
            <Icon d={<polyline points="9 18 15 12 9 6"/>} size={12} c={T.mutedSoft} />
          </div>
        ))}
      </nav>

      <div style={{ padding: 12, borderTop: `1px solid ${T.borderSoft}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px 4px' }}>
          <Avatar name={currentUser?.name?.[0] || '관'} size={32} c="slate" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{currentUser?.name || '관리자'}</div>
            <div style={{ fontSize: 11, color: T.mutedSoft, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser?.username ? `@${currentUser.username}` : '관리자'}</div>
          </div>
        </div>
        <div
          onClick={async () => { await logout(); navigate('/login'); }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 6, cursor: 'pointer', color: T.danger, fontSize: 12, fontWeight: 600 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = T.dangerSoft; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <Icon d={icons.logout} size={14} c={T.danger} sw={2} />
          <span>로그아웃</span>
        </div>
      </div>
    </aside>
  );
};

// ─────── HQTopBar — 알림 벨 드롭다운 + 전역 검색 + 기간 피커 ───────
const HQTopBar = ({ title, subtitle, actions, period, onPeriodChange }) => {
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const notifRef = useRef(null);
  const searchRef = useRef(null);

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

  // 검색 결과
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    const empMatches = employees
      .filter((e) => e.name?.toLowerCase().includes(q) || e.username?.toLowerCase().includes(q))
      .slice(0, 5);
    const noticeMatches = notices
      .filter((n) => n.title?.toLowerCase().includes(q))
      .slice(0, 3);
    return { empMatches, noticeMatches };
  }, [searchQuery, employees, notices]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const activePeriod = period || '월';
  const PERIODS = ['일', '주', '월', '분기'];

  const notifTypeIcon = { approval: icons.check, issue: '⚠', notice: icons.bell };
  const notifTypeColor = { approval: HQ.accent, issue: T.warning, notice: T.primary };

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

        {/* ── 전역 검색 (TASK 2: GLOBAL-SEARCH-001) ── */}
        <div ref={searchRef} style={{ position: 'relative' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', background: T.bg, border: `1px solid ${searchOpen ? HQ.accent : T.border}`,
            borderRadius: 8, width: 220, color: T.mutedSoft, fontSize: 13,
            transition: 'border-color 0.15s',
          }}>
            <Icon d={icons.search} size={14} />
            <input
              placeholder="직원, 공지 검색"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchOpen(e.target.value.trim().length > 0);
              }}
              onFocus={() => { if (searchQuery.trim()) setSearchOpen(true); }}
              style={{ flex: 1, border: 0, outline: 'none', background: 'transparent', fontSize: 13, color: T.text }}
            />
            {searchQuery ? (
              <span onClick={() => { setSearchQuery(''); setSearchOpen(false); }}
                style={{ cursor: 'pointer', fontSize: 14, color: T.mutedSoft, lineHeight: 1 }}>✕</span>
            ) : (
              <span style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 5px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, fontWeight: 600 }}>⌘K</span>
            )}
          </div>

          {/* 검색 결과 드롭다운 */}
          {searchOpen && searchResults && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
              background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10,
              boxShadow: '0 8px 24px rgba(15,23,42,0.12)', zIndex: 200,
              maxHeight: 320, overflow: 'auto',
            }}>
              {/* 직원 섹션 */}
              {searchResults.empMatches.length > 0 && (
                <div>
                  <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 700, color: T.mutedSoft, letterSpacing: 0.4 }}>
                    직원 ({searchResults.empMatches.length})
                  </div>
                  {searchResults.empMatches.map((e) => (
                    <div key={e.id} onClick={() => { navigate('/admin/hq/employees'); setSearchQuery(''); setSearchOpen(false); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 14px', cursor: 'pointer',
                      }}
                      onMouseEnter={(ev) => ev.currentTarget.style.background = T.bg}
                      onMouseLeave={(ev) => ev.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: 999, background: HQ.accentSoft,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, color: HQ.accentText, flexShrink: 0,
                      }}>{e.name?.[0] || '?'}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{e.name}</div>
                        <div style={{ fontSize: 10, color: T.mutedSoft }}>
                          {e.branch || '—'} · {e.role === 'farm_admin' ? '재배팀장' : e.role === 'worker' ? '작업자' : e.role}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* 공지 섹션 */}
              {searchResults.noticeMatches.length > 0 && (
                <div style={{ borderTop: searchResults.empMatches.length > 0 ? `1px solid ${T.borderSoft}` : 'none' }}>
                  <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 700, color: T.mutedSoft, letterSpacing: 0.4 }}>
                    공지 ({searchResults.noticeMatches.length})
                  </div>
                  {searchResults.noticeMatches.map((n, i) => (
                    <div key={i} onClick={() => { navigate('/admin/hq/notices'); setSearchQuery(''); setSearchOpen(false); }}
                      style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13, color: T.text }}
                      onMouseEnter={(ev) => ev.currentTarget.style.background = T.bg}
                      onMouseLeave={(ev) => ev.currentTarget.style.background = 'transparent'}
                    >
                      <Icon d={icons.bell} size={12} c={T.mutedSoft} style={{ marginRight: 6 }} />
                      {n.title}
                    </div>
                  ))}
                </div>
              )}
              {/* 결과 없음 */}
              {searchResults.empMatches.length === 0 && searchResults.noticeMatches.length === 0 && (
                <div style={{ padding: '20px 14px', textAlign: 'center', fontSize: 12, color: T.mutedSoft }}>
                  "{searchQuery}"에 대한 결과 없음
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── 알림 벨 드롭다운 (TASK 1: NOTIFICATION-DROPDOWN-001) ── */}
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

import React from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';

// GREF Farm — 프로페셔널 SaaS 디자인
// 디자인 토큰
const T = {
  // Neutrals — slate 기반
  bg: '#F7F8FA',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  borderSoft: '#EEF0F3',
  text: '#0F172A',
  muted: '#64748B',
  mutedSoft: '#94A3B8',
  // Primary — indigo
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  primarySoft: '#EEF2FF',
  primaryText: '#3730A3',
  // Semantic
  success: '#059669',
  successSoft: '#ECFDF5',
  warning: '#D97706',
  warningSoft: '#FFFBEB',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  info: '#0891B2',
  infoSoft: '#ECFEFF',
};

// ─────── 재사용 UI 프리미티브 ───────
const Card = ({ children, style = {}, pad = 20, onClick }) => (
  <div onClick={onClick} style={{
    background: T.surface, border: `1px solid ${T.border}`,
    borderRadius: 12, padding: pad, ...style,
  }}>{children}</div>
);

const Pill = ({ children, tone = 'muted', size = 'sm' }) => {
  const tones = {
    muted: { bg: '#F1F5F9', fg: T.muted },
    primary: { bg: T.primarySoft, fg: T.primaryText },
    success: { bg: T.successSoft, fg: T.success },
    warning: { bg: T.warningSoft, fg: T.warning },
    danger: { bg: T.dangerSoft, fg: T.danger },
    info: { bg: T.infoSoft, fg: T.info },
  };
  const c = tones[tone] || tones.muted;
  return <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: size === 'sm' ? '2px 8px' : '4px 10px',
    borderRadius: 999, background: c.bg, color: c.fg,
    fontSize: size === 'sm' ? 11 : 12, fontWeight: 600, whiteSpace: 'nowrap',
  }}>{children}</span>;
};

const Dot = ({ c }) => <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: 999, background: c }} />;

const Icon = ({ d, size = 16, c = 'currentColor', sw = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);

const icons = {
  dashboard: <><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></>,
  users: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
  clipboard: <><path d="M9 2h6a2 2 0 012 2v2H7V4a2 2 0 012-2z"/><rect x="5" y="6" width="14" height="16" rx="2"/></>,
  chart: <><path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-5"/></>,
  bell: <><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>,
  search: <><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></>,
  plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
  filter: <><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></>,
  more: <><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></>,
  down: <><polyline points="6 9 12 15 18 9"/></>,
  check: <><polyline points="20 6 9 17 4 12"/></>,
  x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
  leaf: <><path d="M11 20A7 7 0 019.8 6.1C15.5 5 17 4.48 19.2 2.96c1.4 9.3-3.6 15.8-8.2 17.04z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/></>,
  alert: <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
  clock: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>,
  logout: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
  phone: <><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></>,
  sprout: <><path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 00-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/></>,
  location: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></>,
  fingerprint: <><path d="M12 2C9.24 2 7 4.24 7 7"/><path d="M17 7c0-2.76-2.24-5-5-5"/><path d="M9 7v5.5c0 3 1 5 3 5.5M17 7v5.5"/></>,
  play: <><polygon points="5 3 19 12 5 21 5 3"/></>,
  stop: <><rect x="6" y="6" width="12" height="12"/></>,
  camera: <><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></>,
  menu: <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>,
  home: <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
  chat: <><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></>,
  target: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
  trending: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
};

// 원형 아바타 (이니셜)
const Avatar = ({ name = '김', size = 32, c = 'indigo' }) => {
  const colors = {
    indigo: [T.primarySoft, T.primaryText],
    emerald: [T.successSoft, T.success],
    amber: [T.warningSoft, T.warning],
    rose: [T.dangerSoft, T.danger],
    slate: ['#F1F5F9', '#475569'],
  };
  const [bg, fg] = colors[c] || colors.indigo;
  return <div style={{
    width: size, height: size, borderRadius: 999, background: bg, color: fg,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: size * 0.42, fontWeight: 700, flexShrink: 0,
  }}>{name[0]}</div>;
};

// ─────── 관리자 레이아웃 (공용) ───────
const Sidebar = ({ active = 'dashboard', onNavigate }) => {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const currentUser = useAuthStore((s) => s.currentUser);
  const items = [
    { id: 'dashboard', label: '대시보드', icon: icons.dashboard },
    { id: 'employees', label: '직원 관리', icon: icons.users },
    { id: 'schedule', label: '근무 관리', icon: icons.clock, badge: null },
    { id: 'leave', label: '휴가 관리', icon: icons.calendar, badge: 3 },
    { id: 'tasks', label: '작업 관리', icon: icons.clipboard },
    { id: 'floor', label: '실시간 평면도', icon: icons.map || icons.dashboard },
    { id: 'growth', label: '생육조사', icon: icons.sprout },
    { id: 'stats', label: '성과 분석', icon: icons.chart },
    { id: 'notice', label: '공지사항', icon: icons.bell },
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
            background: `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          }}>
            <Icon d={icons.sprout} size={18} sw={2} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, letterSpacing: -0.2 }}>FarmWork</div>
            <div style={{ fontSize: 11, color: T.mutedSoft }}>부산LAB · 온실</div>
          </div>
        </div>
      </div>
      <nav style={{ padding: 12, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.mutedSoft, letterSpacing: 0.5, padding: '8px 12px 4px' }}>메뉴</div>
        {items.map(i => {
          const on = i.id === active;
          return (
            <div key={i.id} onClick={() => onNavigate && onNavigate(i.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
              background: on ? T.primarySoft : 'transparent',
              color: on ? T.primaryText : T.muted,
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

const TopBar = ({ title, subtitle, actions }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 32px', borderBottom: `1px solid ${T.border}`, background: T.surface,
  }}>
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: T.mutedSoft, marginBottom: 4 }}>
        <span>대시보드</span>
        <span>·</span>
        <span style={{ color: T.muted }}>{subtitle}</span>
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: -0.4, margin: 0 }}>{title}</h1>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button style={btnGhostStyle}>
        <Icon d={icons.bell} size={16} />
        <span style={{ position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: 999, background: T.danger }} />
      </button>
      {actions}
    </div>
  </div>
);

const btnGhostStyle = {
  position: 'relative', width: 36, height: 36, borderRadius: 8,
  background: T.bg, border: `1px solid ${T.border}`, color: T.muted,
  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
};

const btnPrimary = (label, iconD, onClick) => (
  <button onClick={onClick} style={{
    display: 'inline-flex', alignItems: 'center', gap: 6,
    height: 36, padding: '0 14px', borderRadius: 8,
    background: T.primary, color: '#fff', border: 0,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(79,70,229,0.25)',
  }}>
    {iconD && <Icon d={iconD} size={14} c="#fff" sw={2.2} />}
    {label}
  </button>
);

const btnSecondary = (label, iconD, onClick) => (
  <button onClick={onClick} style={{
    display: 'inline-flex', alignItems: 'center', gap: 6,
    height: 36, padding: '0 14px', borderRadius: 8,
    background: T.surface, color: T.text, border: `1px solid ${T.border}`,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  }}>
    {iconD && <Icon d={iconD} size={14} c={T.muted} sw={2} />}
    {label}
  </button>
);

export { T, Card, Pill, Dot, Icon, icons, Avatar, Sidebar, TopBar, btnPrimary, btnSecondary, btnGhostStyle };

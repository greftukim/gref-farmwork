import React from 'react';
import { useNavigate } from 'react-router-dom';
import { T, Dot, Icon, icons, Avatar, btnGhostStyle } from './primitives';
import useAuthStore from '../stores/authStore';

// 관리팀(본사) 대시보드 — 다지점 통합 뷰
// 재배팀(지점) 뷰와 달리, 전 지점 KPI 비교 + 경영지표 + 승인허브 + 지점관리에 집중

// ─────── HQ 전용 색상 (재배팀 indigo와 구분, teal 액센트) ───────
const HQ = {
  accent: '#0D9488',       // teal-600
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
        <div onClick={async () => { await logout(); navigate('/login'); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', cursor: 'pointer' }}>
          <Avatar name={currentUser?.name?.[0] || '관'} size={32} c="slate" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{currentUser?.name || '관리자'}</div>
            <div style={{ fontSize: 11, color: T.mutedSoft, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser?.email || 'admin@gref.co.kr'}</div>
          </div>
          <Icon d={icons.logout} size={16} c={T.mutedSoft} />
        </div>
      </div>
    </aside>
  );
};

const HQTopBar = ({ title, subtitle, actions }) => (
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
      {/* 기간 피커 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4, padding: 3,
        background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12, fontWeight: 600,
      }}>
        {['일', '주', '월', '분기'].map((p, i) => (
          <span key={p} style={{
            padding: '5px 12px', borderRadius: 5,
            background: i === 2 ? T.surface : 'transparent',
            color: i === 2 ? T.text : T.mutedSoft,
            boxShadow: i === 2 ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            cursor: 'pointer',
          }}>{p}</span>
        ))}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', background: T.bg, border: `1px solid ${T.border}`,
        borderRadius: 8, width: 220, color: T.mutedSoft, fontSize: 13,
      }}>
        <Icon d={icons.search} size={14} />
        <span>검색</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 5px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, fontWeight: 600 }}>⌘K</span>
      </div>
      <button style={btnGhostStyle}>
        <Icon d={icons.bell} size={16} />
        <span style={{ position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: 999, background: T.danger }} />
      </button>
      {actions}
    </div>
  </div>
);

const HQShell = ({ active, children }) => (
  <div style={{ width: '100%', height: '100%', display: 'flex', fontFamily: 'Pretendard, system-ui', background: T.bg }}>
    <HQSidebar active={active} />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {children}
    </div>
  </div>
);

export { HQ, HQSidebar, HQTopBar, HQShell };

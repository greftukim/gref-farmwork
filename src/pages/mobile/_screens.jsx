import React from 'react';
import { T, Icon, icons, Pill, Avatar } from '../../design/primitives';

// 작업자 모바일 앱 — 홈 + 출퇴근
function MobileHomeScreen() {
  return (
    <div style={{ background: '#F2F2F7', height: '100%', overflow: 'auto', fontFamily: '-apple-system, Pretendard, system-ui' }}>
      {/* 상단 그린 헤더 */}
      <div style={{
        background: `linear-gradient(160deg, ${T.primary} 0%, ${T.primaryDark} 100%)`,
        color: '#fff', padding: '20px 20px 90px', marginTop: -1,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 13, opacity: 0.8 }}>2026년 4월 21일 화요일</div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.4, marginTop: 2 }}>안녕하세요, 김민국님</div>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 999, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <Icon d={icons.bell} size={18} c="#fff" sw={2} />
            <span style={{ position: 'absolute', top: 9, right: 11, width: 7, height: 7, borderRadius: 999, background: '#FDE047', border: '1.5px solid #fff' }} />
          </div>
        </div>
        <div style={{ fontSize: 13, opacity: 0.85 }}>A동 · 토마토 재배 · 반장</div>
      </div>

      {/* 출퇴근 카드 (오버랩) */}
      <div style={{ padding: '0 16px', marginTop: -70, position: 'relative', zIndex: 2 }}>
        <div style={{
          background: '#fff', borderRadius: 18, padding: 20,
          boxShadow: '0 10px 30px rgba(15,23,42,0.1), 0 2px 6px rgba(15,23,42,0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 12, color: T.mutedSoft, fontWeight: 600 }}>오늘 근무</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 3 }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: T.text, letterSpacing: -0.6 }}>02:45</span>
                <span style={{ fontSize: 13, color: T.muted }}>/ 8시간</span>
              </div>
            </div>
            <div style={{
              padding: '6px 12px', borderRadius: 999, background: T.successSoft,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: T.success, animation: 'p 1.5s infinite' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: T.success }}>근무중</span>
            </div>
          </div>

          {/* 시간 기록 */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1, padding: 12, background: T.bg, borderRadius: 10 }}>
              <div style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 600 }}>출근</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginTop: 3 }}>08:00</div>
              <div style={{ fontSize: 10, color: T.success, marginTop: 2 }}>정시 출근</div>
            </div>
            <div style={{ flex: 1, padding: 12, background: T.bg, borderRadius: 10 }}>
              <div style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 600 }}>퇴근 예정</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.mutedSoft, marginTop: 3 }}>17:00</div>
              <div style={{ fontSize: 10, color: T.mutedSoft, marginTop: 2 }}>— · —</div>
            </div>
          </div>

          {/* 출근 / 퇴근 버튼 */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{
              flex: 1, padding: '14px 0', borderRadius: 12, border: `1px solid ${T.border}`,
              background: T.surface, color: T.mutedSoft,
              fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              출근
              <span style={{ fontSize: 11, color: T.success, fontWeight: 600 }}>✓ 08:00</span>
            </button>
            <button style={{
              flex: 1, padding: '14px 0', borderRadius: 12, border: 0,
              background: T.danger, color: '#fff',
              fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: '0 4px 12px rgba(220,38,38,0.3)',
            }}>
              <Icon d={icons.logout} size={16} c="#fff" sw={2} />
              퇴근
            </button>
          </div>
          <div style={{ fontSize: 11, color: T.mutedSoft, textAlign: 'center', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Icon d={icons.location} size={11} c={T.success} sw={2} />
            A동 온실 내 · GPS 확인됨
          </div>
        </div>
      </div>

      {/* 오늘 내 작업 */}
      <div style={{ padding: '20px 16px 8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, padding: '0 4px' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0 }}>오늘 내 작업</h3>
          <span style={{ fontSize: 12, color: T.primary, fontWeight: 600 }}>전체 보기</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { t: '토마토 수확 · A동 1-8열', time: '09:00~11:30', status: 'progress', progress: 85, tone: T.success, team: 3 },
            { t: '적엽 작업 · A동 9-12열', time: '13:00~14:30', status: 'next', tone: T.info, team: 2 },
            { t: '수확물 정리 · 선별실', time: '15:00~17:00', status: 'plan', tone: T.mutedSoft, team: 4 },
          ].map((w, i) => (
            <div key={i} style={{
              background: '#fff', borderRadius: 14, padding: 14,
              borderLeft: `3px solid ${w.tone}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text, lineHeight: 1.3 }}>{w.t}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <span style={{ fontSize: 11, color: T.muted, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Icon d={icons.clock} size={11} /> {w.time}
                    </span>
                    <span style={{ fontSize: 11, color: T.muted }}>· 팀 {w.team}명</span>
                  </div>
                </div>
                {w.status === 'progress' && <Pill tone="success">진행중</Pill>}
                {w.status === 'next' && <Pill tone="info">다음</Pill>}
                {w.status === 'plan' && <Pill tone="muted">예정</Pill>}
              </div>
              {w.progress && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ height: 5, background: T.borderSoft, borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${w.progress}%`, height: '100%', background: w.tone }} />
                  </div>
                  <div style={{ fontSize: 10, color: T.mutedSoft, marginTop: 4, fontWeight: 600 }}>{w.progress}% 완료</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 빠른 작업 */}
      <div style={{ padding: '12px 16px 8px' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: '8px 4px 10px' }}>빠른 기능</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[
            { l: '작업 보고', icon: icons.clipboard, c: T.primary },
            { l: '생육 조사', icon: icons.leaf, c: T.success },
            { l: '이상 신고', icon: icons.alert, c: T.danger },
            { l: '휴가 신청', icon: icons.calendar, c: T.info },
          ].map((b, i) => (
            <div key={i} style={{
              background: '#fff', borderRadius: 14, padding: '14px 6px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${b.c}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon d={b.icon} size={18} c={b.c} sw={2} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.text }}>{b.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 공지 */}
      <div style={{ padding: '16px 16px 20px' }}>
        <div style={{
          background: '#fff', borderRadius: 14, padding: 14,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: T.warningSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon d={icons.bell} size={18} c={T.warning} sw={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 2 }}>이번 주 TBM 시간 변경</div>
            <div style={{ fontSize: 11, color: T.mutedSoft, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>4/22(수)부터 08:00 → 07:50 시작</div>
          </div>
          <Icon d={<polyline points="9 18 15 12 9 6" />} size={16} c={T.mutedSoft} />
        </div>
      </div>

      {/* 이상 신고 플로팅 버튼 */}
      <button style={{
        position: 'fixed', bottom: 96, right: 20,
        width: 56, height: 56, borderRadius: 999, border: 0,
        background: T.danger, color: '#fff',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 1, cursor: 'pointer', zIndex: 10,
        boxShadow: '0 6px 16px rgba(220,38,38,0.4), 0 2px 4px rgba(220,38,38,0.2)',
      }}>
        <Icon d={icons.alert} size={18} c="#fff" sw={2.2} />
        <span style={{ fontSize: 9, fontWeight: 700 }}>신고</span>
      </button>

      {/* 하단 네비 */}
      <div style={{
        position: 'sticky', bottom: 0,
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        background: '#fff', borderTop: `1px solid ${T.borderSoft}`,
        padding: '8px 0 24px',
      }}>
        {[
          { l: '홈', icon: icons.dashboard, on: true },
          { l: '작업', icon: icons.clipboard },
          { l: '근태', icon: icons.calendar },
          { l: '내 정보', icon: icons.settings },
        ].map((n, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 0', color: n.on ? T.primary : T.mutedSoft }}>
            <Icon d={n.icon} size={20} sw={n.on ? 2.2 : 1.8} c={n.on ? T.primary : T.mutedSoft} />
            <span style={{ fontSize: 10, fontWeight: n.on ? 700 : 500 }}>{n.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 출퇴근 전용 화면 — 위치 기반 원탭 체크
function MobileCheckInScreen() {
  return (
    <div style={{ background: '#F2F2F7', height: '100%', fontFamily: '-apple-system, Pretendard, system-ui', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      {/* 헤더 */}
      <div style={{ padding: '16px 20px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: T.surface, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon d={<polyline points="15 18 9 12 15 6" />} size={16} c={T.text} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>출퇴근</div>
      </div>

      {/* 오늘 요약 배너 */}
      <div style={{ padding: '0 16px 8px' }}>
        <div style={{
          background: `linear-gradient(135deg, ${T.primary} 0%, ${T.primaryDark} 100%)`,
          color: '#fff', padding: 18, borderRadius: 16,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: 999, background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ position: 'absolute', top: 30, right: 40, width: 60, height: 60, borderRadius: 999, background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 600 }}>오늘 · 4월 21일 화요일</div>
            <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: -1.5, marginTop: 4, fontFamily: 'ui-monospace, monospace' }}>10:45</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12 }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: '#FDE047', animation: 'p 1.5s infinite' }} />
              <span style={{ opacity: 0.9 }}>근무중 · 2시간 45분째</span>
            </div>
          </div>
        </div>
      </div>

      {/* 출근/퇴근 카드 */}
      <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* 출근 완료 */}
        <div style={{
          background: T.surface, borderRadius: 14, padding: 16,
          borderLeft: `3px solid ${T.success}`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: T.successSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon d={icons.check} size={22} c={T.success} sw={2.4} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: T.mutedSoft, fontWeight: 600 }}>출근</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginTop: 1 }}>08:00 <span style={{ fontSize: 12, color: T.success, fontWeight: 600, marginLeft: 4 }}>· 정시</span></div>
            <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon d={icons.location} size={10} /> A동 온실 · GPS 인증됨
            </div>
          </div>
          <Pill tone="success">완료</Pill>
        </div>

        {/* 퇴근 대기 — 큰 버튼 */}
        <div style={{ background: T.surface, borderRadius: 14, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: T.mutedSoft, fontWeight: 600 }}>퇴근</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginTop: 2 }}>예정 17:00</div>
            </div>
            <Pill tone="muted">대기</Pill>
          </div>

          {/* 위치 확인 바 */}
          <div style={{
            padding: '10px 12px', background: T.successSoft, borderRadius: 10,
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
          }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: T.success, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon d={icons.location} size={16} c="#fff" sw={2.2} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.success }}>근무지 반경 내 위치함</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>온실 A동에서 12m · 정확도 5m</div>
            </div>
            <Icon d={icons.check} size={16} c={T.success} sw={2.5} />
          </div>

          <button style={{
            width: '100%', padding: '16px 0', borderRadius: 12, border: 0,
            background: `linear-gradient(180deg, ${T.danger} 0%, #B91C1C 100%)`,
            color: '#fff', fontSize: 16, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 12px rgba(220,38,38,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
            cursor: 'pointer',
          }}>
            <Icon d={icons.logout} size={20} c="#fff" sw={2.2} />
            퇴근 체크하기
          </button>
          <div style={{ fontSize: 11, color: T.mutedSoft, textAlign: 'center', marginTop: 8 }}>
            버튼을 눌러 현재 위치에서 퇴근을 보고하세요
          </div>
        </div>
      </div>

      {/* 주간 요약 */}
      <div style={{ padding: '12px 16px' }}>
        <div style={{ background: T.surface, borderRadius: 14, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>이번 주 근무 기록</div>
            <span style={{ fontSize: 11, color: T.primary, fontWeight: 600 }}>전체 보기</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
            {[
              { d: '월', n: 20, h: '8h', ok: true },
              { d: '화', n: 21, h: '-', today: true },
              { d: '수', n: 22, h: '-', upcoming: true },
              { d: '목', n: 23, h: '-', upcoming: true },
              { d: '금', n: 24, h: '-', upcoming: true },
              { d: '토', n: 25, h: '휴', off: true },
              { d: '일', n: 26, h: '휴', off: true },
            ].map((d, i) => (
              <div key={i} style={{
                padding: '8px 4px', borderRadius: 8, textAlign: 'center',
                background: d.today ? T.primary : d.ok ? T.successSoft : d.off ? T.bg : T.bg,
                color: d.today ? '#fff' : d.ok ? T.success : d.off ? T.mutedSoft : T.mutedSoft,
                border: d.upcoming ? `1px dashed ${T.border}` : 'none',
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, opacity: d.today ? 0.9 : 0.7 }}>{d.d}</div>
                <div style={{ fontSize: 14, fontWeight: 700, margin: '3px 0' }}>{d.n}</div>
                <div style={{ fontSize: 9, fontWeight: 600 }}>{d.h}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.borderSoft}`, fontSize: 11, color: T.mutedSoft }}>
            <span>이번 주 누적 <strong style={{ color: T.text, fontWeight: 700 }}>10시간 45분</strong></span>
            <span>목표 40시간</span>
          </div>
        </div>
      </div>

      {/* 최근 기록 */}
      <div style={{ padding: '0 16px 20px' }}>
        <div style={{ background: T.surface, borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 10 }}>최근 5일 기록</div>
          {[
            { d: '4/20 월', io: '08:02 / 17:10', h: '8h 08m', ok: true },
            { d: '4/19 일', io: '—', h: '휴무', off: true },
            { d: '4/18 금', io: '07:55 / 17:05', h: '8h 10m', ok: true },
            { d: '4/17 목', io: '08:15 / 17:00', h: '7h 45m', late: true },
            { d: '4/16 수', io: '08:00 / 18:30', h: '9h 30m', ot: true },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: i > 0 ? `1px solid ${T.borderSoft}` : 'none' }}>
              <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, width: 60 }}>{r.d}</div>
              <div style={{ fontSize: 12, color: T.text, flex: 1, fontFamily: 'ui-monospace, monospace' }}>{r.io}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {r.late && <Pill tone="warning">지각</Pill>}
                {r.ot && <Pill tone="info">연장</Pill>}
                <span style={{ fontSize: 12, fontWeight: 700, color: r.ok ? T.success : r.off ? T.mutedSoft : r.late ? T.warning : T.info }}>{r.h}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────── 작업 탭 ───────
function MobileTasksScreen() {
  const tabs = ['오늘', '이번 주', '지난 작업'];
  return (
    <div style={{ background: '#F2F2F7', height: '100%', fontFamily: '-apple-system, Pretendard, system-ui', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      {/* 헤더 */}
      <div style={{ background: T.surface, padding: '16px 20px 0', borderBottom: `1px solid ${T.borderSoft}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: -0.4 }}>작업</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon d={icons.filter} size={16} c={T.muted} />
            </div>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon d={icons.calendar} size={16} c={T.muted} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          {tabs.map((t, i) => (
            <div key={t} style={{
              padding: '10px 0', fontSize: 13, fontWeight: 700,
              color: i === 0 ? T.primary : T.mutedSoft,
              borderBottom: i === 0 ? `2px solid ${T.primary}` : '2px solid transparent',
            }}>{t}{i === 0 && <span style={{ marginLeft: 4, fontSize: 10, color: T.primary }}>3</span>}</div>
          ))}
        </div>
      </div>

      {/* 요약 */}
      <div style={{ padding: '14px 16px 8px', display: 'flex', gap: 8 }}>
        {[
          { l: '완료', v: 0, c: T.success, sub: '0h' },
          { l: '진행', v: 1, c: T.primary, sub: '2h 45m' },
          { l: '대기', v: 2, c: T.mutedSoft, sub: '5h 30m' },
        ].map(k => (
          <div key={k.l} style={{ flex: 1, background: T.surface, borderRadius: 12, padding: 12, borderTop: `3px solid ${k.c}` }}>
            <div style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 700 }}>{k.l}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: -0.4, marginTop: 2 }}>{k.v}</div>
            <div style={{ fontSize: 10, color: T.mutedSoft, marginTop: 2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* 진행중 작업 — 확장 카드 */}
      <div style={{ padding: '8px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.mutedSoft, letterSpacing: 0.3, padding: '6px 4px' }}>진행중 · 1건</div>
        <div style={{
          background: T.surface, borderRadius: 16, padding: 16,
          borderLeft: `3px solid ${T.success}`,
          boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: T.success, background: T.successSoft, padding: '3px 7px', borderRadius: 4 }}>토마토</span>
            <Pill tone="success">진행중</Pill>
            <span style={{ marginLeft: 'auto', fontSize: 10, color: T.mutedSoft }}>#T-0421-01</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text, lineHeight: 1.3 }}>토마토 수확 · A동 1-8열</div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Icon d={icons.clock} size={12} /> 09:00 ~ 11:30</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Icon d={icons.location} size={12} /> A동</span>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
              <span style={{ color: T.muted, fontWeight: 600 }}>진행률</span>
              <span style={{ color: T.success, fontWeight: 700 }}>85%</span>
            </div>
            <div style={{ height: 6, background: T.borderSoft, borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: '85%', height: '100%', background: T.success }} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.borderSoft}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ display: 'flex' }}>
                {['김', '이', '박'].map((n, i) => (
                  <div key={i} style={{ marginLeft: i > 0 ? -6 : 0, border: `2px solid ${T.surface}`, borderRadius: 999 }}>
                    <Avatar name={n} size={24} c={['indigo', 'emerald', 'amber'][i]} />
                  </div>
                ))}
              </div>
              <span style={{ fontSize: 11, color: T.mutedSoft }}>팀 3명</span>
            </div>
            <button style={{
              padding: '8px 16px', borderRadius: 8, border: 0,
              background: T.primary, color: '#fff', fontSize: 12, fontWeight: 700,
            }}>보고하기</button>
          </div>
        </div>
      </div>

      {/* 대기 작업 */}
      <div style={{ padding: '12px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.mutedSoft, letterSpacing: 0.3, padding: '6px 4px' }}>오늘 예정 · 2건</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { crop: '토마토', cropC: T.danger, t: '적엽 작업 · A동 9-12열', time: '13:00~14:30', dur: '1h 30m' },
            { crop: '공통', cropC: T.info, t: '수확물 정리 · 선별실', time: '15:00~17:00', dur: '2h' },
          ].map((w, i) => (
            <div key={i} style={{
              background: T.surface, borderRadius: 12, padding: 14,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ width: 4, alignSelf: 'stretch', background: w.cropC, borderRadius: 999 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: w.cropC, background: `${w.cropC}15`, padding: '2px 6px', borderRadius: 3 }}>{w.crop}</span>
                  <span style={{ fontSize: 11, color: T.mutedSoft }}>{w.time}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text, lineHeight: 1.3 }}>{w.t}</div>
                <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 3 }}>예상 {w.dur}</div>
              </div>
              <Icon d={<polyline points="9 18 15 12 9 6" />} size={16} c={T.mutedSoft} />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ─────── 근태 탭 ───────
function MobileAttendanceScreen() {
  const stats = [
    { l: '이번 달 근무', v: '168', u: '시간', sub: '21일 출근' },
    { l: '연차 잔여', v: '8.5', u: '일', sub: '15일 중 6.5일 사용' },
    { l: '연장 근무', v: '14', u: '시간', sub: '이번 달' },
  ];
  return (
    <div style={{ background: '#F2F2F7', height: '100%', fontFamily: '-apple-system, Pretendard, system-ui', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      <div style={{ background: T.surface, padding: '16px 20px 12px' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: -0.4 }}>근태</div>
        <div style={{ fontSize: 13, color: T.mutedSoft, marginTop: 2 }}>2026년 4월 · 김민국</div>
      </div>

      {/* 월 요약 KPI */}
      <div style={{ padding: '14px 16px 8px', display: 'flex', gap: 8 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ flex: 1, background: T.surface, borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 700 }}>{s.l}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 4 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: -0.5 }}>{s.v}</span>
              <span style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 500 }}>{s.u}</span>
            </div>
            <div style={{ fontSize: 10, color: T.mutedSoft, marginTop: 2, lineHeight: 1.3 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* 휴가 신청 배너 */}
      <div style={{ padding: '6px 16px 12px' }}>
        <div style={{
          background: `linear-gradient(135deg, ${T.primary} 0%, ${T.primaryDark} 100%)`,
          borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', gap: 12,
          color: '#fff', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -15, right: -10, width: 80, height: 80, borderRadius: 999, background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <Icon d={icons.calendar} size={18} c="#fff" sw={2} />
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>휴가 신청하기</div>
            <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>연차 · 반차 · 특별휴가</div>
          </div>
          <Icon d={<polyline points="9 18 15 12 9 6" />} size={16} c="#fff" />
        </div>
      </div>

      {/* 월 캘린더 */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ background: T.surface, borderRadius: 14, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>4월 근무 현황</div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, fontSize: 10 }}>‹</button>
              <button style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, fontSize: 10 }}>›</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
            {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
              <div key={d} style={{ fontSize: 10, fontWeight: 700, color: i === 0 ? T.danger : i === 6 ? T.primary : T.mutedSoft, textAlign: 'center', padding: '4px 0' }}>{d}</div>
            ))}
            {Array.from({ length: 30 }).map((_, i) => {
              const day = i - 2;
              const isValid = day >= 1 && day <= 30;
              const statusMap = {
                1: 'work', 2: 'work', 3: 'work', 4: 'off', 5: 'off',
                6: 'work', 7: 'work', 8: 'work', 9: 'late', 10: 'work', 11: 'off', 12: 'off',
                13: 'work', 14: 'work', 15: 'leave', 16: 'work', 17: 'late', 18: 'work', 19: 'off',
                20: 'work', 21: 'today', 22: 'plan', 23: 'plan', 24: 'plan', 25: 'off', 26: 'off',
                27: 'plan', 28: 'plan', 29: 'plan', 30: 'plan',
              };
              const st = statusMap[day];
              const colors = {
                work: { bg: T.successSoft, fg: T.success },
                late: { bg: T.warningSoft, fg: T.warning },
                leave: { bg: T.primarySoft, fg: T.primary },
                off: { bg: T.bg, fg: T.mutedSoft },
                plan: { bg: 'transparent', fg: T.mutedSoft, dashed: true },
                today: { bg: T.primary, fg: '#fff' },
              };
              const c = colors[st] || { bg: 'transparent', fg: T.mutedSoft };
              return (
                <div key={i} style={{
                  aspectRatio: '1', padding: 3, borderRadius: 6, textAlign: 'center',
                  background: c.bg,
                  border: c.dashed ? `1px dashed ${T.border}` : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: c.fg,
                }}>
                  {isValid && day}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.borderSoft}`, fontSize: 10, color: T.muted, flexWrap: 'wrap' }}>
            {[
              { l: '정상', c: T.success },
              { l: '지각', c: T.warning },
              { l: '휴가', c: T.primary },
              { l: '예정', c: T.mutedSoft },
            ].map(l => (
              <span key={l.l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: `${l.c}40`, border: `1px solid ${l.c}` }} />
                {l.l}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 내 신청 이력 */}
      <div style={{ padding: '0 16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 4px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.mutedSoft, letterSpacing: 0.3 }}>내 신청 이력</div>
          <span style={{ fontSize: 11, color: T.primary, fontWeight: 600 }}>전체 보기</span>
        </div>
        <div style={{ background: T.surface, borderRadius: 12, overflow: 'hidden' }}>
          {[
            { type: '연차', detail: '4/23 (수) · 1일', status: 'pending', date: '어제' },
            { type: '오전반차', detail: '4/15 (화) · 0.5일', status: 'approved', date: '4/10' },
            { type: '연장근무', detail: '4/10 (목) · 2시간', status: 'approved', date: '4/10' },
            { type: '연차', detail: '4/3~4/4 · 2일', status: 'rejected', date: '3/28' },
          ].map((r, i) => {
            const sm = {
              pending: { tone: 'warning', l: '승인 대기' },
              approved: { tone: 'success', l: '승인됨' },
              rejected: { tone: 'danger', l: '반려' },
            }[r.status];
            return (
              <div key={i} style={{
                padding: '12px 14px',
                borderBottom: i < 3 ? `1px solid ${T.borderSoft}` : 'none',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{r.type}</span>
                    <Pill tone={sm.tone}>{sm.l}</Pill>
                  </div>
                  <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 3 }}>{r.detail}</div>
                </div>
                <div style={{ fontSize: 10, color: T.mutedSoft }}>{r.date}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────── 내 정보 탭 ───────
function MobileProfileScreen() {
  return (
    <div style={{ background: '#F2F2F7', height: '100%', fontFamily: '-apple-system, Pretendard, system-ui', overflow: 'auto' }}>
      {/* 프로필 헤더 */}
      <div style={{
        background: `linear-gradient(160deg, ${T.primaryDark} 0%, ${T.primary} 100%)`,
        color: '#fff', padding: '20px 20px 70px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: 999, background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'absolute', bottom: 20, right: -20, width: 100, height: 100, borderRadius: 999, background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, position: 'relative' }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>내 정보</div>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon d={icons.settings} size={16} c="#fff" sw={2} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 999,
            background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 700, color: '#fff', border: '2px solid rgba(255,255,255,0.3)',
          }}>김</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4 }}>김민국</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 3 }}>GF-001 · 반장</div>
            <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>A동 토마토 재배 · 2023.03.15 입사</div>
          </div>
        </div>
      </div>

      {/* 메뉴 리스트 */}
      <div style={{ padding: '32px 16px 8px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.mutedSoft, letterSpacing: 0.3, padding: '4px 4px 8px' }}>계정</div>
        <div style={{ background: T.surface, borderRadius: 14, overflow: 'hidden' }}>
          {[
            { icon: icons.users, l: '개인정보 수정', sub: '연락처, 비상연락망' },
            { icon: icons.clipboard, l: '계약 정보', sub: '정규직 · 주 5일' },
            { icon: icons.leaf, l: '담당 작물 · 구역', sub: 'A동 토마토' },
          ].map((m, i, arr) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px',
              borderBottom: i < arr.length - 1 ? `1px solid ${T.borderSoft}` : 'none',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: T.primarySoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon d={m.icon} size={16} c={T.primary} sw={2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{m.l}</div>
                <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 2 }}>{m.sub}</div>
              </div>
              <Icon d={<polyline points="9 18 15 12 9 6" />} size={14} c={T.mutedSoft} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '8px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.mutedSoft, letterSpacing: 0.3, padding: '4px 4px 8px' }}>알림 · 설정</div>
        <div style={{ background: T.surface, borderRadius: 14, overflow: 'hidden' }}>
          {[
            { icon: icons.bell, l: '알림 설정', toggle: true, on: true },
            { icon: icons.location, l: '위치 서비스', toggle: true, on: true, sub: '출퇴근 인증용' },
            { icon: icons.phone, l: '비상 호출 연락망', sub: '관리자 · 안전팀' },
          ].map((m, i, arr) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px',
              borderBottom: i < arr.length - 1 ? `1px solid ${T.borderSoft}` : 'none',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon d={m.icon} size={16} c={T.muted} sw={2} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{m.l}</div>
                {m.sub && <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 2 }}>{m.sub}</div>}
              </div>
              {m.toggle ? (
                <div style={{
                  width: 40, height: 24, borderRadius: 999,
                  background: m.on ? T.success : T.border,
                  position: 'relative', transition: 'background 0.2s',
                }}>
                  <div style={{
                    position: 'absolute', top: 2, left: m.on ? 18 : 2,
                    width: 20, height: 20, borderRadius: 999, background: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </div>
              ) : <Icon d={<polyline points="9 18 15 12 9 6" />} size={14} c={T.mutedSoft} />}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '8px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.mutedSoft, letterSpacing: 0.3, padding: '4px 4px 8px' }}>지원</div>
        <div style={{ background: T.surface, borderRadius: 14, overflow: 'hidden' }}>
          {[
            { l: '공지사항', sub: '새 공지 1건', badge: 1 },
            { l: '사용 가이드' },
            { l: '문의하기' },
            { l: '버전 정보', detail: 'v2.4.1' },
          ].map((m, i, arr) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px',
              borderBottom: i < arr.length - 1 ? `1px solid ${T.borderSoft}` : 'none',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {m.l}
                  {m.badge && <span style={{ background: T.danger, color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 999 }}>{m.badge}</span>}
                </div>
                {m.sub && <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 2 }}>{m.sub}</div>}
              </div>
              {m.detail && <span style={{ fontSize: 12, color: T.mutedSoft, fontFamily: 'ui-monospace, monospace' }}>{m.detail}</span>}
              {!m.detail && <Icon d={<polyline points="9 18 15 12 9 6" />} size={14} c={T.mutedSoft} />}
            </div>
          ))}
        </div>
      </div>

      {/* 로그아웃 */}
      <div style={{ padding: '16px 16px 24px' }}>
        <button style={{
          width: '100%', padding: '13px 0', borderRadius: 12,
          background: T.surface, border: `1px solid ${T.border}`,
          color: T.danger, fontSize: 13, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <Icon d={icons.logout} size={15} c={T.danger} sw={2} />
          로그아웃
        </button>
      </div>
    </div>
  );
}

export { MobileHomeScreen, MobileCheckInScreen, MobileTasksScreen, MobileAttendanceScreen, MobileProfileScreen };

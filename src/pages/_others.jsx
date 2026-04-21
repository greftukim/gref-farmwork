import React, { useMemo } from 'react';
import { Avatar, Card, Dot, Icon, Pill, T, TopBar, btnPrimary, btnSecondary, icons } from '../design/primitives';
import useEmployeeStore from '../stores/employeeStore';

const ROLE_KO = { farm_admin: '지점장', supervisor: '반장', worker: '작업자', hr_admin: 'HR', master: '총괄', general: '총괄' };

// 직원 관리 + 근무 관리 + 휴가 관리 + 작업 관리 + 로그인
function EmployeesScreen() {
  const employees = useEmployeeStore((s) => s.employees);

  const rows = useMemo(() => employees.map((e) => ({
    name: e.name,
    no: e.employeeNumber || '-',
    role: ROLE_KO[e.role] || e.role || '-',
    status: e.isActive ? 'active' : 'inactive',
    crop: '-',
    join: e.hireDate ? e.hireDate.replace(/-/g, '.') : '-',
    tel: e.phone || '-',
    lead: e.isTeamLeader || false,
  })), [employees]);

  const activeCount = employees.filter((e) => e.isActive).length;
  const inactiveCount = employees.filter((e) => !e.isActive).length;
  const todayStr = new Date().toISOString().split('T')[0];
  const in30Str = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0];
  const expiringCount = employees.filter((e) => e.contractEnd && e.contractEnd >= todayStr && e.contractEnd <= in30Str).length;

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg }}>
      <TopBar subtitle="인사 관리" title="직원 관리" actions={<>{btnSecondary('엑셀 내보내기')}{btnPrimary('직원 등록', icons.plus)}</>} />
      <div style={{ padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { l: '전체 직원', v: employees.length, sub: `재직 ${activeCount}명 · 비활성 ${inactiveCount}명` },
            { l: '재직중', v: activeCount, sub: '출근 가능' },
            { l: '비활성', v: inactiveCount, sub: '' },
            { l: '계약 만료 임박', v: expiringCount, sub: '30일 이내', tone: 'warning' },
          ].map((k, i) => (
            <Card key={i} pad={16}>
              <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginBottom: 6 }}>{k.l}</div>
              <div style={{ fontSize: 30, fontWeight: 700, color: k.tone === 'warning' ? T.warning : T.text, letterSpacing: -0.8, lineHeight: 1 }}>{k.v}<span style={{ fontSize: 14, color: T.mutedSoft, fontWeight: 500, marginLeft: 4 }}>명</span></div>
              <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 6 }}>{k.sub}</div>
            </Card>
          ))}
        </div>

        <Card pad={0}>
          {/* 툴바 */}
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.borderSoft}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, width: 280, fontSize: 13, color: T.mutedSoft }}>
              <Icon d={icons.search} size={14} />
              <span>이름, 사번 검색</span>
            </div>
            {['전체', '재배', '관리', '기타'].map((t, i) => (
              <span key={t} style={{
                fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                background: i === 0 ? T.primarySoft : 'transparent',
                color: i === 0 ? T.primaryText : T.muted,
              }}>{t}</span>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              {btnSecondary('필터', icons.filter)}
            </div>
          </div>
          {/* 테이블 */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: T.bg }}>
                {['직원', '사번', '직무', '담당 작물', '입사일', '연락처', '상태', ''].map((h, i) => (
                  <th key={i} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 700, color: T.mutedSoft, letterSpacing: 0.3, borderBottom: `1px solid ${T.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: T.mutedSoft, fontSize: 13 }}>데이터가 없습니다</td></tr>
              ) : rows.map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${T.borderSoft}` }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={r.name} size={32} c={['indigo', 'emerald', 'amber', 'slate', 'rose'][i % 5]} />
                      <div>
                        <div style={{ fontWeight: 700, color: T.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {r.name}
                          {r.lead && <Pill tone="primary">반장</Pill>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: T.muted, fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{r.no}</td>
                  <td style={{ padding: '12px 16px', color: T.text }}>{r.role}</td>
                  <td style={{ padding: '12px 16px', color: T.muted }}>{r.crop}</td>
                  <td style={{ padding: '12px 16px', color: T.muted, fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{r.join}</td>
                  <td style={{ padding: '12px 16px', color: T.muted, fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{r.tel}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {r.status === 'active' && <Pill tone="success"><Dot c={T.success} />재직중</Pill>}
                    {r.status === 'leave' && <Pill tone="warning"><Dot c={T.warning} />휴직</Pill>}
                    {r.status === 'inactive' && <Pill tone="muted"><Dot c={T.mutedSoft} />비활성</Pill>}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <Icon d={icons.more} size={16} c={T.mutedSoft} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: T.mutedSoft, fontSize: 12 }}>
            <span>총 {employees.length}명 중 1-{rows.length}명</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {['이전', '1', '2', '3', '다음'].map((p, i) => (
                <span key={i} style={{
                  padding: '5px 10px', borderRadius: 5, fontSize: 12, cursor: 'pointer',
                  background: p === '1' ? T.primary : T.surface,
                  color: p === '1' ? '#fff' : T.muted,
                  border: `1px solid ${p === '1' ? T.primary : T.border}`,
                }}>{p}</span>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─────── 근무 관리 (주간 타임라인) ───────
function ScheduleScreen() {
  const workers = [
    { name: '김민국', lead: true, c: 'indigo' },
    { name: '이강모', c: 'emerald' },
    { name: '박민식', c: 'slate' },
    { name: '최수진', c: 'rose' },
    { name: '정하은', c: 'amber' },
    { name: '강민준', c: 'indigo' },
  ];
  const hours = ['08', '09', '10', '11', '12', '13', '14', '15', '16', '17'];
  const bars = [
    [{ s: 0, e: 0.2, t: 'TBM', tone: 'primary' }, { s: 0.5, e: 3.3, t: '토마토 수확 · A동', tone: 'success' }, { s: 4, e: 5.5, t: '적엽', tone: 'info' }, { s: 5.5, e: 9, t: '수확 정리', tone: 'success' }],
    [{ s: 0, e: 0.2, t: 'TBM', tone: 'primary' }, { s: 0.5, e: 4, t: '딸기 수확 · B동', tone: 'danger' }, { s: 5, e: 9, t: '러너 정리', tone: 'warning' }],
    [{ s: 0, e: 4, t: '관리 업무', tone: 'muted' }, { s: 5, e: 9, t: '회의 · 보고서', tone: 'muted' }],
    [{ s: 0, e: 9, t: '연차', tone: 'warningSolid' }],
    [{ s: 0, e: 0.2, t: 'TBM', tone: 'primary' }, { s: 0.5, e: 3, t: 'EC/pH 측정', tone: 'info' }, { s: 3.5, e: 7, t: '오이 수확', tone: 'success' }],
    [{ s: 0, e: 0.2, t: 'TBM', tone: 'primary' }, { s: 0.5, e: 4, t: '토마토 수확 · A동', tone: 'success' }, { s: 5, e: 9, t: '병해충 예찰', tone: 'info' }],
  ];
  const toneBg = {
    primary: { bg: T.primarySoft, fg: T.primaryText, bar: T.primary },
    success: { bg: T.successSoft, fg: T.success, bar: T.success },
    info: { bg: T.infoSoft, fg: T.info, bar: T.info },
    warning: { bg: T.warningSoft, fg: T.warning, bar: T.warning },
    danger: { bg: T.dangerSoft, fg: T.danger, bar: T.danger },
    muted: { bg: '#F1F5F9', fg: T.muted, bar: T.mutedSoft },
    warningSolid: { bg: T.warning, fg: '#fff', bar: T.warning },
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg }}>
      <TopBar subtitle="근태" title="근무 관리" actions={<>{btnSecondary('출퇴근 기록')}{btnPrimary('스케줄 등록', icons.plus)}</>} />
      <div style={{ padding: 24 }}>
        {/* 주 선택 바 */}
        <Card pad={16} style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                <button style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, cursor: 'pointer' }}>‹</button>
                <button style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, cursor: 'pointer' }}>›</button>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>4월 20일 — 4월 26일</div>
                <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 2 }}>2026년 17주차</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4, background: T.bg, padding: 3, borderRadius: 6 }}>
              {['일간', '주간', '월간'].map((t, i) => (
                <span key={t} style={{
                  padding: '6px 14px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: i === 1 ? T.surface : 'transparent',
                  color: i === 1 ? T.text : T.mutedSoft,
                  boxShadow: i === 1 ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}>{t}</span>
              ))}
            </div>
          </div>
        </Card>

        {/* 오늘 (화요일) 타임라인 */}
        <Card pad={0}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.borderSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>4월 21일 화요일 타임라인</div>
              <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 2 }}>08:00 ~ 17:00 · 점심 12:00~13:00</div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 11, color: T.muted }}>
              {[
                { l: 'TBM', c: T.primary }, { l: '수확', c: T.success }, { l: '측정', c: T.info }, { l: '정리', c: T.warning }, { l: '이상', c: T.danger },
              ].map(l => (
                <span key={l.l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: l.c }} />
                  {l.l}
                </span>
              ))}
            </div>
          </div>
          {/* 시간 헤더 */}
          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', background: T.bg, borderBottom: `1px solid ${T.borderSoft}` }}>
            <div style={{ padding: '10px 16px', fontSize: 11, color: T.mutedSoft, fontWeight: 700 }}>작업자</div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${hours.length}, 1fr)`, position: 'relative' }}>
              {hours.map((h, i) => (
                <div key={i} style={{
                  fontSize: 11, color: T.mutedSoft, fontWeight: 600, padding: '10px 0',
                  borderLeft: i > 0 ? `1px solid ${T.borderSoft}` : 'none',
                  textAlign: 'left', paddingLeft: 6,
                }}>{h}:00</div>
              ))}
            </div>
          </div>

          {/* 행 */}
          {workers.map((w, wi) => (
            <div key={wi} style={{ display: 'grid', gridTemplateColumns: '180px 1fr', borderBottom: wi < workers.length - 1 ? `1px solid ${T.borderSoft}` : 'none' }}>
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={w.name} size={30} c={w.c} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text, display: 'flex', alignItems: 'center', gap: 5 }}>
                    {w.name}
                    {w.lead && <Pill tone="primary">반장</Pill>}
                  </div>
                </div>
              </div>
              <div style={{ position: 'relative', height: 52 }}>
                {/* 세로 그리드 라인 */}
                {hours.map((_, i) => (
                  <div key={i} style={{ position: 'absolute', left: `${(i / hours.length) * 100}%`, top: 0, bottom: 0, width: 1, background: T.borderSoft }} />
                ))}
                {/* 점심 */}
                <div style={{ position: 'absolute', left: `${(4 / hours.length) * 100}%`, width: `${(1 / hours.length) * 100}%`, top: 0, bottom: 0, background: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.025), rgba(0,0,0,0.025) 4px, transparent 4px, transparent 8px)' }} />
                {/* 지금 */}
                <div style={{ position: 'absolute', left: `${(2.7 / hours.length) * 100}%`, top: 0, bottom: 0, width: 2, background: T.danger, zIndex: 2 }}>
                  {wi === 0 && <div style={{ position: 'absolute', top: -8, left: -12, fontSize: 9, fontWeight: 700, color: '#fff', background: T.danger, padding: '2px 5px', borderRadius: 3, whiteSpace: 'nowrap' }}>NOW 10:45</div>}
                </div>
                {/* 작업 블록 */}
                {bars[wi].map((b, bi) => {
                  const tn = toneBg[b.tone];
                  return (
                    <div key={bi} style={{
                      position: 'absolute',
                      left: `calc(${(b.s / hours.length) * 100}% + 2px)`,
                      width: `calc(${((b.e - b.s) / hours.length) * 100}% - 4px)`,
                      top: 8, bottom: 8,
                      background: tn.bg, color: tn.fg,
                      borderLeft: `3px solid ${tn.bar}`,
                      borderRadius: 4,
                      padding: '4px 8px',
                      fontSize: 11, fontWeight: 600,
                      display: 'flex', alignItems: 'center',
                      overflow: 'hidden', whiteSpace: 'nowrap',
                    }}>{b.t}</div>
                  );
                })}
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ─────── 휴가 관리 (승인 + 캘린더) ───────
function LeaveScreen() {
  const pending = [
    { name: '김민국', type: '연차', dates: '4/23 (수)', days: 1, reason: '개인 사정', remain: 8, c: 'indigo' },
    { name: '박민식', type: '오전반차', dates: '4/22 (화)', days: 0.5, reason: '병원 방문', remain: 12, c: 'slate' },
    { name: '정하은', type: '연차', dates: '4/28~4/30', days: 3, reason: '가족 여행', remain: 10, c: 'amber' },
  ];
  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg }}>
      <TopBar subtitle="근태" title="휴가 관리" actions={<>{btnSecondary('휴가 현황 엑셀')}{btnPrimary('휴가 등록', icons.plus)}</>} />
      <div style={{ padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { l: '승인 대기', v: 3, tone: 'warning', sub: '평균 처리: 2시간' },
            { l: '이번 달 휴가', v: 12, sub: '연차 8 · 반차 4' },
            { l: '오늘 휴무', v: 1, sub: '최수진 (연차)' },
            { l: '평균 소진율', v: '42%', sub: '연차 기준' },
          ].map((k, i) => (
            <Card key={i} pad={16}>
              <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginBottom: 6 }}>{k.l}</div>
              <div style={{ fontSize: 30, fontWeight: 700, color: k.tone === 'warning' ? T.warning : T.text, letterSpacing: -0.8, lineHeight: 1 }}>{k.v}</div>
              <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 6 }}>{k.sub}</div>
            </Card>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 20 }}>
          {/* 승인 대기 */}
          <Card pad={0}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.borderSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>승인 대기</h3>
                <Pill tone="danger">3</Pill>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {pending.map((r, i) => (
                <div key={i} style={{ padding: 16, borderBottom: i < pending.length - 1 ? `1px solid ${T.borderSoft}` : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <Avatar name={r.name} size={36} c={r.c} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 2 }}>잔여 연차 {r.remain}일</div>
                    </div>
                    <Pill tone={r.type === '연차' ? 'primary' : 'info'}>{r.type}</Pill>
                  </div>
                  <div style={{ padding: 12, background: T.bg, borderRadius: 8, marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                      <span style={{ color: T.muted }}>기간</span>
                      <span style={{ color: T.text, fontWeight: 700 }}>{r.dates} · {r.days}일</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: T.muted }}>사유</span>
                      <span style={{ color: T.text }}>{r.reason}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={{ flex: 1, padding: '9px 0', border: `1px solid ${T.border}`, background: T.surface, borderRadius: 7, fontSize: 13, fontWeight: 600, color: T.muted, cursor: 'pointer' }}>반려</button>
                    <button style={{ flex: 2, padding: '9px 0', border: 0, background: T.primary, borderRadius: 7, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>승인</button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 팀 캘린더 */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>팀 휴가 캘린더</h3>
                <p style={{ fontSize: 11, color: T.mutedSoft, margin: '2px 0 0' }}>4월 2026</p>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, cursor: 'pointer', fontSize: 12 }}>‹</button>
                <button style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, cursor: 'pointer', fontSize: 12 }}>›</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                <div key={d} style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? T.danger : i === 6 ? T.primary : T.mutedSoft, textAlign: 'center', padding: '6px 0' }}>{d}</div>
              ))}
              {Array.from({ length: 30 }).map((_, i) => {
                const day = i - 2;
                const isValid = day >= 1 && day <= 30;
                const isToday = day === 21;
                const leaves = {
                  5: [{ n: '김', c: 'indigo' }],
                  18: [{ n: '최', c: 'rose' }, { n: '정', c: 'amber' }],
                  21: [{ n: '최', c: 'rose' }],
                  22: [{ n: '박', c: 'slate' }],
                  23: [{ n: '김', c: 'indigo' }],
                  28: [{ n: '정', c: 'amber' }],
                  29: [{ n: '정', c: 'amber' }],
                  30: [{ n: '정', c: 'amber' }],
                }[day] || [];
                const dow = i % 7;
                return (
                  <div key={i} style={{
                    minHeight: 60, padding: 5, borderRadius: 6,
                    background: isToday ? T.primarySoft : isValid ? T.bg : 'transparent',
                    border: isToday ? `1px solid ${T.primary}` : `1px solid transparent`,
                  }}>
                    {isValid && (
                      <>
                        <div style={{ fontSize: 11, fontWeight: 700, color: isToday ? T.primary : dow === 0 ? T.danger : dow === 6 ? T.primary : T.text, marginBottom: 3 }}>{day}</div>
                        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                          {leaves.map((l, j) => <Avatar key={j} name={l.n} size={16} c={l.c} />)}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.borderSoft}`, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.mutedSoft }}>
              <span>이번 달 총 <strong style={{ color: T.text }}>12건</strong>의 휴가</span>
              <span style={{ color: T.primary, cursor: 'pointer', fontWeight: 600 }}>월 리포트 →</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─────── 작업 관리 (계획 + 배정 보드) ───────
function TasksScreen() {
  const columns = [
    { id: 'plan', label: '계획', count: 4, c: T.mutedSoft },
    { id: 'assigned', label: '배정 완료', count: 3, c: T.info },
    { id: 'progress', label: '진행중', count: 3, c: T.primary },
    { id: 'done', label: '완료', count: 5, c: T.success },
  ];
  const cards = {
    plan: [
      { t: 'D동 오이 EC/pH 측정', crop: '오이', zone: 'D동 1-4열', due: '13:00', prio: 'normal' },
      { t: 'C동 파프리카 적엽', crop: '파프리카', zone: 'C동 5-8열', due: '14:00', prio: 'high' },
      { t: 'B동 딸기 러너 정리', crop: '딸기', zone: 'B동 2-3열', due: '15:00', prio: 'normal' },
      { t: '시설 점검 (환기창)', crop: '시설', zone: 'A동', due: '16:00', prio: 'low' },
    ],
    assigned: [
      { t: 'A동 토마토 수분작업', crop: '토마토', zone: 'A동 전체', workers: ['강', '윤'], due: '11:00' },
      { t: 'B동 딸기 병해충 예찰', crop: '딸기', zone: 'B동 1-5열', workers: ['최'], due: '12:00' },
      { t: 'TBM 미팅 (반장)', crop: '공통', zone: '회의실', workers: ['김'], due: '08:00' },
    ],
    progress: [
      { t: 'A동 토마토 수확', crop: '토마토', zone: 'A동 1-8열', workers: ['김', '이', '박'], progress: 85, started: '09:00' },
      { t: 'B동 딸기 수확', crop: '딸기', zone: 'B동 3-5열', workers: ['최', '정'], progress: 60, started: '09:30' },
      { t: 'A동 유인·결속', crop: '토마토', zone: 'A동 9-12열', workers: ['한'], progress: 30, started: '10:00' },
    ],
    done: [
      { t: 'C동 파프리카 병해충 예찰', workers: ['강'], completed: '09:30' },
      { t: 'TBM 미팅 반장 승인', workers: ['김'], completed: '08:15' },
      { t: 'A동 EC/pH 측정', workers: ['윤'], completed: '09:00' },
      { t: '아침 안전 점검', workers: ['박'], completed: '07:50' },
      { t: 'B동 유인', workers: ['정'], completed: '08:45' },
    ],
  };
  const cropColor = { 토마토: T.danger, 딸기: T.primary, 파프리카: T.warning, 오이: T.success, 시설: T.mutedSoft, 공통: T.info };

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg }}>
      <TopBar subtitle="농작업" title="작업 관리" actions={<>{btnSecondary('작업 계획 달력')}{btnPrimary('새 작업 배정', icons.plus)}</>} />
      <div style={{ padding: 24 }}>
        {/* 필터 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.mutedSoft }}>필터</span>
          {[
            { l: '오늘', on: true }, { l: '모든 작물' }, { l: '모든 구역' }, { l: '우선순위: 전체' },
          ].map(f => (
            <span key={f.l} style={{
              fontSize: 12, fontWeight: 600, padding: '7px 12px', borderRadius: 6, cursor: 'pointer',
              background: f.on ? T.primarySoft : T.surface,
              color: f.on ? T.primaryText : T.muted,
              border: `1px solid ${f.on ? T.primarySoft : T.border}`,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {f.l} <Icon d={icons.down} size={11} />
            </span>
          ))}
          <div style={{ marginLeft: 'auto', fontSize: 12, color: T.mutedSoft }}>15건의 작업 · 4/21 (화)</div>
        </div>

        {/* 칸반 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {columns.map(col => (
            <div key={col.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: col.c }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{col.label}</span>
                  <span style={{ fontSize: 11, color: T.mutedSoft, fontWeight: 600 }}>{col.count}</span>
                </div>
                <Icon d={icons.plus} size={14} c={T.mutedSoft} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {cards[col.id].map((c, i) => (
                  <div key={i} style={{
                    background: T.surface, border: `1px solid ${T.border}`,
                    borderRadius: 10, padding: 12,
                    borderLeft: c.crop ? `3px solid ${cropColor[c.crop] || T.mutedSoft}` : `3px solid ${T.success}`,
                  }}>
                    {c.crop && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: cropColor[c.crop], background: T.bg, padding: '2px 6px', borderRadius: 4 }}>{c.crop}</span>
                        {c.prio === 'high' && <Pill tone="danger">긴급</Pill>}
                        {c.prio === 'low' && <Pill tone="muted">낮음</Pill>}
                      </div>
                    )}
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6, lineHeight: 1.4 }}>{c.t}</div>
                    {c.zone && <div style={{ fontSize: 11, color: T.mutedSoft, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icon d={icons.location} size={11} /> {c.zone}
                    </div>}
                    {c.progress !== undefined && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ height: 4, background: T.borderSoft, borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ width: `${c.progress}%`, height: '100%', background: T.primary }} />
                        </div>
                        <div style={{ fontSize: 10, color: T.mutedSoft, marginTop: 3, fontWeight: 600 }}>{c.progress}% · 시작 {c.started}</div>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex' }}>
                        {(c.workers || []).map((w, j) => (
                          <div key={j} style={{ marginLeft: j > 0 ? -6 : 0, border: `2px solid ${T.surface}`, borderRadius: 999 }}>
                            <Avatar name={w} size={22} c={['indigo', 'emerald', 'amber', 'slate'][j % 4]} />
                          </div>
                        ))}
                        {!c.workers && <span style={{ fontSize: 10, color: T.mutedSoft, fontStyle: 'italic' }}>미배정</span>}
                      </div>
                      <span style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 600 }}>
                        {c.due && `마감 ${c.due}`}
                        {c.completed && `✓ ${c.completed}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────── 로그인 페이지 ───────
function LoginScreen() {
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex',
      background: T.bg, fontFamily: 'Pretendard, system-ui',
    }}>
      {/* 좌측 브랜드 패널 */}
      <div style={{
        flex: 1.1, background: `linear-gradient(135deg, ${T.primaryDark} 0%, ${T.primary} 50%, #6366F1 100%)`,
        padding: '48px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* 배경 패턴 */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.1) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.08) 0%, transparent 40%)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 0 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon d={icons.sprout} size={20} c="#fff" sw={2} />
            </div>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>GREF Farm</span>
          </div>
        </div>
        <div style={{ position: 'relative', color: '#fff' }}>
          <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.75, letterSpacing: 1, marginBottom: 16 }}>SMART GREENHOUSE · HR</div>
          <h1 style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.2, letterSpacing: -1, margin: 0, marginBottom: 20 }}>
            온실에서 사람까지,<br />
            한 화면에서 관리하세요.
          </h1>
          <p style={{ fontSize: 14, opacity: 0.85, lineHeight: 1.6, margin: 0, maxWidth: 380 }}>
            출근 기록, 작업 배정, 생육 조사, 이상 신고까지 — 현장의 모든 흐름을 실시간으로 확인합니다.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 40, maxWidth: 380 }}>
            {[
              { v: '20', l: '작업자' },
              { v: '4', l: '재배 작물' },
              { v: '3.2t', l: '주간 수확' },
            ].map((s, i) => (
              <div key={i} style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.1)', borderRadius: 10, backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>{s.v}</div>
                <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: 'relative', fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
          © 2026 GREF · 대한제강 자회사
        </div>
      </div>

      {/* 우측 로그인 폼 */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: T.text, letterSpacing: -0.4, margin: 0 }}>로그인</h2>
            <p style={{ fontSize: 13, color: T.muted, margin: '6px 0 0' }}>GREF Farm 인력관리 시스템에 접속합니다</p>
          </div>
          {/* 탭 */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 24, background: T.bg, padding: 4, borderRadius: 8 }}>
            {[
              { l: '관리자', on: true, icon: icons.settings },
              { l: '작업자', icon: icons.users },
            ].map((t, i) => (
              <div key={i} style={{
                flex: 1, padding: '9px 0', textAlign: 'center', borderRadius: 6,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: t.on ? T.surface : 'transparent',
                color: t.on ? T.text : T.mutedSoft,
                boxShadow: t.on ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <Icon d={t.icon} size={14} c={t.on ? T.primary : T.mutedSoft} />
                {t.l}
              </div>
            ))}
          </div>
          {[
            { label: '아이디', placeholder: 'admin', val: 'admin' },
            { label: '비밀번호', placeholder: '••••••••', val: '••••••••', pwd: true },
          ].map((f, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 6, display: 'block' }}>{f.label}</label>
              <div style={{
                display: 'flex', alignItems: 'center', padding: '0 14px',
                background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, height: 42,
              }}>
                <span style={{ fontSize: 14, color: T.text, flex: 1 }}>{f.val}</span>
                {f.pwd && <Icon d={<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />} size={16} c={T.mutedSoft} />}
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0 24px', fontSize: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.muted, cursor: 'pointer' }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, background: T.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon d={icons.check} size={11} c="#fff" sw={3} />
              </div>
              로그인 유지
            </label>
            <a style={{ color: T.primary, fontWeight: 600, cursor: 'pointer' }}>비밀번호 찾기</a>
          </div>
          <button style={{
            width: '100%', height: 44, borderRadius: 8, border: 0,
            background: T.primary, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(79,70,229,0.3)',
          }}>로그인</button>
          <div style={{ textAlign: 'center', fontSize: 11, color: T.mutedSoft, marginTop: 24 }}>
            작업자는 모바일 앱에서도 접속 가능합니다 · v2.4.1
          </div>
        </div>
      </div>
    </div>
  );
}
export { EmployeesScreen, LeaveScreen, LoginScreen, ScheduleScreen, TasksScreen };

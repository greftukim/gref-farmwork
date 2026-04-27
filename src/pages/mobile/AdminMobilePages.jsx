import React, { useMemo, useEffect, useState } from 'react';
import { T, Icon, icons } from '../../design/primitives';
import { HQ } from '../../design/hq-shell';
import {
  AdminMobileShell, MA, D_BRANCH_META,
  StatTile, CardBlock, Chip, Dot,
} from './AdminMobile';
import useAuthStore from '../../stores/authStore';
import useEmployeeStore from '../../stores/employeeStore';
import useLeaveStore from '../../stores/leaveStore';
import useIssueStore from '../../stores/issueStore';
import useAttendanceStore from '../../stores/attendanceStore';
import { usePerformanceData } from '../../hooks/usePerformanceData';
import { useFloorData } from '../../hooks/useFloorData';
import { GreenhousePlan, FloorCtx } from '../FloorPlan';

// ─── 헬퍼 ────────────────────────────────────────────────────────────
const LEAVE_LABEL = {
  annual: '연차 휴가', sick: '병가', personal: '개인 사정',
  special: '특별 휴가', half: '반차',
};
const leaveLabel = (t) => LEAVE_LABEL[t] || t || '휴가';

const W_KO = ['일', '월', '화', '수', '목', '금', '토'];
const fmtDate = (s) => {
  if (!s) return '—';
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} (${W_KO[d.getDay()]})`;
};

const daysBetween = (s, e) => {
  if (!s || !e) return 1;
  return Math.max(1, Math.round((new Date(e) - new Date(s)) / 86400000) + 1);
};

const relTime = (ts) => {
  if (!ts) return '—';
  const d = Date.now() - new Date(ts).getTime();
  if (d < 60000) return '방금';
  if (d < 3600000) return `${Math.floor(d / 60000)}분 전`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}시간 전`;
  return `${Math.floor(d / 86400000)}일 전`;
};

// ═══════════════════════════════════════════════════════════
// ③ 승인 탭 — leaveStore 실 데이터 + Tinder 카드 스택
// ═══════════════════════════════════════════════════════════
function MobileApprovalScreen({ role = 'farm' }) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const employees = useEmployeeStore((s) => s.employees);
  const requests = useLeaveStore((s) => s.requests);
  const fetchRequests = useLeaveStore((s) => s.fetchRequests);
  const farmReview = useLeaveStore((s) => s.farmReview);

  useEffect(() => {
    if (currentUser) fetchRequests(currentUser);
  }, [currentUser]);

  const pending = useMemo(
    () => requests.filter((r) => r.status === 'pending'),
    [requests],
  );

  const getEmp = (id) => employees.find((e) => e.id === id);

  const buildCardData = (req) => {
    if (!req) return null;
    const emp = getEmp(req.employeeId);
    const meta = D_BRANCH_META[emp?.branch] || { name: emp?.branch || '—', accent: MA.muted, accentSoft: MA.bg };
    return {
      type: leaveLabel(req.leaveType),
      who: emp?.name || '—',
      roleLabel: emp?.role === 'farm_admin' ? '지점장' : '작업자',
      branch: meta.name,
      meta,
      date: `${fmtDate(req.startDate)} — ${fmtDate(req.endDate)}`,
      days: daysBetween(req.startDate, req.endDate),
      reason: req.reason || '—',
      balance: { used: 5, total: 15 },
      submitted: relTime(req.createdAt),
    };
  };

  const topData = buildCardData(pending[0]);
  const stack2Data = buildCardData(pending[1]);
  const stack3Data = buildCardData(pending[2]);

  const handleAction = (approved) => {
    if (!pending[0] || !currentUser) return;
    farmReview(pending[0].id, approved, currentUser.id);
  };

  return (
    <AdminMobileShell role={role} active="approve">
      {({ accent }) => (
        <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* 헤더 */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: MA.text, letterSpacing: -0.4 }}>승인 대기</div>
              <div style={{ fontSize: 12, color: MA.muted, marginTop: 2 }}>
                {pending.length > 0 ? `${pending.length}건 남음 · 스와이프로 빠른 처리` : '대기 중인 승인 없음'}
              </div>
            </div>
            <div style={{ flex: 1 }} />
            <button style={{
              padding: '7px 11px', borderRadius: 9, background: MA.card,
              border: `1px solid ${MA.border}`, fontSize: 11, fontWeight: 600,
              color: MA.text, display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <Icon d={icons.filter} size={12} c={MA.text} sw={2} />
              필터
            </button>
          </div>

          {/* APPROVAL-CATEGORY-001: 예산/인사/자재 카테고리 미구현 — 휴가만 활성 */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
            <span style={{
              padding: '6px 12px', borderRadius: 999, whiteSpace: 'nowrap',
              background: MA.text, color: '#fff', fontSize: 12, fontWeight: 600,
            }}>{`전체 ${pending.length}`}</span>
            <span style={{
              padding: '6px 12px', borderRadius: 999, whiteSpace: 'nowrap',
              background: MA.card, color: MA.muted, fontSize: 12, fontWeight: 600,
              border: `1px solid ${MA.border}`,
            }}>{`휴가 ${pending.length}`}</span>
            {/* APPROVAL-CATEGORY-001 fallback: 카테고리 미구현 → 비활성 */}
            {['예산', '인사', '자재'].map((c) => (
              <span key={c} style={{
                padding: '6px 12px', borderRadius: 999, whiteSpace: 'nowrap',
                background: MA.card, color: MA.mutedSoft, fontSize: 12, fontWeight: 600,
                border: `1px solid ${MA.border}`, opacity: 0.5,
              }}>{`${c} 0`}</span>
            ))}
          </div>

          {/* 카드 스택 */}
          {pending.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              height: 300, gap: 10,
            }}>
              <Icon d={icons.check} size={36} c={MA.success} sw={1.5} />
              <div style={{ fontSize: 16, fontWeight: 700, color: MA.text }}>모두 처리 완료</div>
              <div style={{ fontSize: 12, color: MA.muted }}>대기 중인 승인 요청이 없습니다</div>
            </div>
          ) : (
            <>
              <div style={{ position: 'relative', height: 410, marginTop: 4 }}>
                {stack3Data && <ApprovalCard stackIdx={2} data={stack3Data} accent={accent} />}
                {stack2Data && <ApprovalCard stackIdx={1} data={stack2Data} accent={accent} />}
                <ApprovalCard stackIdx={0} accent={accent} data={topData} />
              </div>

              {/* 액션 버튼 */}
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '10px 30px', marginTop: 2 }}>
                <button
                  onClick={() => handleAction(false)}
                  style={{
                    width: 52, height: 52, borderRadius: 999, border: `2px solid ${MA.danger}`,
                    background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(220,38,38,0.15)',
                  }}>
                  <Icon d={icons.x} size={22} c={MA.danger} sw={2.4} />
                </button>
                <button style={{
                  width: 44, height: 44, borderRadius: 999, border: `1.5px solid ${MA.border}`,
                  background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon d={icons.chat} size={18} c={MA.muted} sw={2} />
                </button>
                <button
                  onClick={() => handleAction(true)}
                  style={{
                    width: 52, height: 52, borderRadius: 999, border: 'none',
                    background: MA.success, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
                  }}>
                  <Icon d={icons.check} size={22} c="#fff" sw={2.6} />
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: MA.mutedSoft, padding: '0 22px' }}>
                <span>← 반려</span>
                <span>댓글</span>
                <span>승인 →</span>
              </div>
            </>
          )}
        </div>
      )}
    </AdminMobileShell>
  );
}

const ApprovalCard = ({ data, stackIdx = 0, accent }) => {
  const isTop = stackIdx === 0;
  const scale = 1 - stackIdx * 0.04;
  const offsetY = stackIdx * 8;
  const opacity = 1 - stackIdx * 0.25;

  const toneByType = (t) => {
    if (!t) return { bg: T.primarySoft, fg: T.primary, label: '휴가' };
    if (t.includes('휴가') || t.includes('연차') || t.includes('반차')) return { bg: T.infoSoft, fg: T.info, label: '휴가' };
    if (t.includes('병가')) return { bg: T.dangerSoft, fg: T.danger, label: '병가' };
    if (t.includes('개인')) return { bg: T.primarySoft, fg: T.primary, label: '개인' };
    return { bg: T.successSoft, fg: T.success, label: '특별' };
  };

  const tone = toneByType(data?.type);
  const meta = data?.meta || { accent: MA.muted, accentSoft: MA.bg };

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: MA.card, borderRadius: 8,
      boxShadow: isTop
        ? '0 20px 40px rgba(15,23,42,0.15), 0 4px 10px rgba(15,23,42,0.08)'
        : '0 6px 20px rgba(15,23,42,0.08)',
      padding: isTop ? 20 : 0,
      transform: `scale(${scale}) translateY(${offsetY}px)`,
      opacity,
      zIndex: 10 - stackIdx,
      overflow: 'hidden',
    }}>
      {!isTop || !data ? null : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ padding: '4px 10px', borderRadius: 999, background: tone.bg, color: tone.fg, fontSize: 11, fontWeight: 700 }}>{tone.label}</span>
            <Dot c={meta.accent} />
            <span style={{ fontSize: 11, color: MA.muted }}>{data.branch}</span>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: MA.mutedSoft }}>{data.submitted}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 999, background: meta.accent, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 700, letterSpacing: -0.3,
            }}>{data.who.charAt(0)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: MA.text, letterSpacing: -0.3 }}>{data.who}</div>
              <div style={{ fontSize: 11, color: MA.muted, marginTop: 2 }}>{data.roleLabel}</div>
            </div>
          </div>

          <div style={{ height: 1, background: MA.divider, margin: '0 -20px 14px' }} />

          <div style={{ fontSize: 20, fontWeight: 700, color: MA.text, letterSpacing: -0.4, marginBottom: 4 }}>{data.type}</div>
          <div style={{ fontSize: 13, color: MA.text, fontWeight: 600, marginBottom: 12 }}>{data.date}</div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <div style={{ flex: 1, background: MA.bg, borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 10, color: MA.mutedSoft, fontWeight: 600 }}>신청 일수</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: MA.text, marginTop: 2 }}>
                {data.days}<span style={{ fontSize: 11, color: MA.muted, fontWeight: 600, marginLeft: 3 }}>일</span>
              </div>
            </div>
            <div style={{ flex: 1, background: MA.bg, borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 10, color: MA.mutedSoft, fontWeight: 600 }}>잔여 연차</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: MA.text, marginTop: 2 }}>
                {data.balance.total - data.balance.used}
                <span style={{ fontSize: 11, color: MA.muted, fontWeight: 600, marginLeft: 3 }}>/ {data.balance.total}</span>
              </div>
            </div>
          </div>

          <div style={{ background: MA.bg, borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: MA.mutedSoft, fontWeight: 600, marginBottom: 4 }}>사유</div>
            <div style={{ fontSize: 12, color: MA.text, lineHeight: 1.55 }}>{data.reason}</div>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
            background: T.successSoft, borderRadius: 8,
          }}>
            <Icon d={icons.check} size={12} c={MA.success} sw={2.4} />
            <span style={{ fontSize: 11, color: MA.success, fontWeight: 600 }}>동일 기간 다른 휴가 겹치지 않음</span>
          </div>
        </>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// ④ 평면도 탭 — MOBILE-FLOOR-001 resolved (세션 74-C)
// ═══════════════════════════════════════════════════════════
function MobileFloorScreen({ role = 'farm' }) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const records = useAttendanceStore((s) => s.records);
  const fetchRecords = useAttendanceStore((s) => s.fetchRecords);
  const employees = useEmployeeStore((s) => s.employees);
  const { data: floorData, loading: floorLoading } = useFloorData();
  const [houseIdx, setHouseIdx] = useState(0);
  const [selectedGol, setSelectedGol] = useState(null);

  useEffect(() => {
    if (currentUser) fetchRecords(currentUser);
  }, [currentUser]);

  const today = new Date().toISOString().split('T')[0];
  const branch = currentUser?.branch;

  const todayStats = useMemo(() => {
    const branchEmps = employees.filter((e) => e.isActive && (!branch || e.branch === branch));
    const todayRecs = records.filter((r) => r.date === today);
    const checkedInIds = new Set(todayRecs.filter((r) => r.checkIn).map((r) => r.employeeId));
    return {
      total: branchEmps.length,
      present: branchEmps.filter((e) => checkedInIds.has(e.id)).length,
      absent: branchEmps.filter((e) => !checkedInIds.has(e.id)).length,
    };
  }, [records, employees, today, branch]);

  const { HOUSE_CONFIG } = floorData;
  const house = HOUSE_CONFIG[houseIdx]?.id ?? HOUSE_CONFIG[0]?.id;

  return (
    <AdminMobileShell role={role} active="floor">
      {({ accent }) => (
        <div style={{ padding: '12px 14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: MA.text, letterSpacing: -0.4 }}>작업 현황</div>
              <div style={{ fontSize: 12, color: MA.muted, marginTop: 2 }}>오늘 출근 기준</div>
            </div>
            <div style={{ flex: 1 }} />
            <div style={{
              padding: '5px 10px', borderRadius: 999, background: T.successSoft,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <Dot c={MA.success} />
              <span style={{ fontSize: 10, color: MA.success, fontWeight: 700 }}>실시간</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            <StatTile label="출근" value={String(todayStats.present)} sub="명 출근 완료" tone="success" accent={accent} />
            <StatTile label="미출근" value={String(todayStats.absent)} sub="명 미확인" tone="warning" accent={accent} />
            <StatTile label="전체" value={String(todayStats.total)} sub="명 재적" tone="primary" accent={accent} />
          </div>

          <CardBlock title="평면도 현황">
            {floorLoading ? (
              <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 13, color: MA.muted }}>로딩 중...</div>
            ) : !HOUSE_CONFIG.length ? (
              <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 13, color: MA.muted }}>데이터가 없습니다</div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 6, padding: '8px 0 4px', overflowX: 'auto' }}>
                  {HOUSE_CONFIG.map((h, i) => (
                    <button key={h.id} onClick={() => { setHouseIdx(i); setSelectedGol(null); }} style={{
                      padding: '5px 12px', borderRadius: 999, border: 0, cursor: 'pointer',
                      background: i === houseIdx ? accent : MA.bg,
                      color: i === houseIdx ? '#fff' : MA.muted,
                      fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
                    }}>{h.label}</button>
                  ))}
                </div>
                <FloorCtx.Provider value={floorData}>
                  <GreenhousePlan house={house} onSelectGol={setSelectedGol} selectedGol={selectedGol} />
                </FloorCtx.Provider>
              </>
            )}
          </CardBlock>
        </div>
      )}
    </AdminMobileShell>
  );
}

// ═══════════════════════════════════════════════════════════
// ⑤ 성과 탭 — usePerformanceData 실 데이터 연결
// MOBILE-PERF-001: resolved (세션 73-C)
// ═══════════════════════════════════════════════════════════
const PERF_PERIODS = ['일', '주', '월', '분기'];

function MobilePerfScreen({ role = 'farm' }) {
  const [periodIdx, setPeriodIdx] = useState(1);

  const dateFrom = useMemo(() => {
    const now = new Date();
    if (periodIdx === 0) return now.toISOString().split('T')[0];
    if (periodIdx === 1) {
      const day = now.getDay();
      const mon = new Date(now);
      mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      return mon.toISOString().split('T')[0];
    }
    if (periodIdx === 2) {
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    }
    return null;
  }, [periodIdx]);

  const { workers, loading } = usePerformanceData(dateFrom, null);

  const top5 = useMemo(
    () => [...workers].sort((a, b) => b.harvestPct - a.harvestPct).slice(0, 5),
    [workers],
  );

  const branchAvg = useMemo(() => {
    const map = {};
    for (const w of workers) {
      if (!map[w.branch]) map[w.branch] = { sum: 0, cnt: 0 };
      map[w.branch].sum += w.harvestPct;
      map[w.branch].cnt += 1;
    }
    return Object.fromEntries(
      Object.entries(map).map(([b, d]) => [b, d.cnt > 0 ? Math.round(d.sum / d.cnt) : 0]),
    );
  }, [workers]);

  return (
    <AdminMobileShell role={role} active="perf">
      {({ accent }) => (
        <div style={{ padding: '12px 14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: MA.text, letterSpacing: -0.4 }}>작업자 성과</div>
              <div style={{ fontSize: 12, color: MA.muted, marginTop: 2 }}>수확량 기준 정규화 (평균=100)</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto' }}>
            {PERF_PERIODS.map((t, i) => (
              <span
                key={t}
                onClick={() => setPeriodIdx(i)}
                style={{
                  padding: '6px 14px', borderRadius: 999, cursor: 'pointer',
                  background: i === periodIdx ? MA.text : MA.card,
                  color: i === periodIdx ? '#fff' : MA.muted,
                  fontSize: 12, fontWeight: 700,
                  border: i === periodIdx ? 'none' : `1px solid ${MA.border}`,
                  userSelect: 'none',
                }}
              >{t}</span>
            ))}
          </div>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 999,
                border: `3px solid ${accent}`, borderTopColor: 'transparent',
                animation: 'spin 0.8s linear infinite',
              }} />
            </div>
          ) : workers.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 240, gap: 10 }}>
              <Icon d={icons.chart} size={36} c={MA.mutedSoft} sw={1.5} />
              <div style={{ fontSize: 15, fontWeight: 700, color: MA.text }}>성과 데이터 없음</div>
              <div style={{ fontSize: 12, color: MA.muted }}>선택한 기간에 수확 기록이 없습니다</div>
            </div>
          ) : (
            <>
              <CardBlock title={`수확량 Top ${top5.length}`} pad={0}>
                {top5.map((p, i) => {
                  const branchMeta = D_BRANCH_META[p.branch] || { accent: MA.muted, name: p.branch };
                  const rankBg = i === 0 ? T.warningSoft : i === 1 ? T.mutedSoft : i === 2 ? '#FED7AA' : MA.bg;
                  const rankFg = i === 0 ? T.warning : i === 1 ? MA.muted : i === 2 ? '#C2410C' : MA.mutedSoft;
                  const delta = p.harvestPct - 100;
                  return (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: i < top5.length - 1 ? `1px solid ${MA.divider}` : 'none' }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: rankBg, color: rankFg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 800, flexShrink: 0,
                      }}>{i + 1}</div>
                      <Dot c={branchMeta.accent} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: MA.text, letterSpacing: -0.2 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: MA.muted, marginTop: 1 }}>{branchMeta.name} · {p.crop}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, justifyContent: 'flex-end' }}>
                          <span style={{ fontSize: 18, fontWeight: 700, color: MA.text, letterSpacing: -0.3 }}>{p.harvestPct}</span>
                          <span style={{ fontSize: 11, color: MA.muted, fontWeight: 600 }}>%</span>
                        </div>
                        <span style={{ fontSize: 10, color: delta >= 0 ? MA.success : MA.danger, fontWeight: 700 }}>
                          {delta >= 0 ? '+' : ''}{delta}%p
                        </span>
                      </div>
                    </div>
                  );
                })}
              </CardBlock>

              <div style={{ height: 14 }} />

              <CardBlock title="지점별 평균 수확량">
                {Object.entries(D_BRANCH_META).map(([key, meta], i, arr) => {
                  const avg = branchAvg[key] || 0;
                  return (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < arr.length - 1 ? `1px solid ${MA.divider}` : 'none' }}>
                      <Dot c={meta.accent} />
                      <div style={{ fontSize: 13, fontWeight: 600, color: MA.text, width: 60 }}>{meta.name}</div>
                      <div style={{ flex: 1, height: 6, background: MA.bg, borderRadius: 999, overflow: 'hidden', position: 'relative' }}>
                        <div style={{ width: `${Math.min(avg, 200) / 200 * 100}%`, height: '100%', background: avg >= 110 ? MA.success : avg >= 90 ? accent : MA.warn, borderRadius: 999 }} />
                        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: MA.mutedSoft }} />
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: MA.text, width: 40, textAlign: 'right' }}>{avg > 0 ? `${avg}%` : '—'}</div>
                    </div>
                  );
                })}
              </CardBlock>
            </>
          )}
        </div>
      )}
    </AdminMobileShell>
  );
}

// ═══════════════════════════════════════════════════════════
// ⑥ 더보기 탭 — 8그룹 메뉴 + 실 store 건수
// ═══════════════════════════════════════════════════════════
function MobileMoreScreen({ role = 'farm' }) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const employees = useEmployeeStore((s) => s.employees);
  const requests = useLeaveStore((s) => s.requests);
  const issues = useIssueStore((s) => s.issues);

  const isHQ = role === 'hq';

  const activeCount = useMemo(
    () => employees.filter((e) => e.isActive).length,
    [employees],
  );
  const pendingLeaves = useMemo(
    () => requests.filter((r) => r.status === 'pending').length,
    [requests],
  );
  const unresolvedIssues = useMemo(
    () => issues.filter((i) => i.status !== 'resolved').length,
    [issues],
  );

  const name = currentUser?.name || (isHQ ? '관리팀' : '지점장');
  const roleDisplay = isHQ ? '관리팀 · 본사' : `재배팀 · ${currentUser?.branch ? (D_BRANCH_META[currentUser.branch]?.name || '부산LAB') : '부산LAB'}`;

  return (
    <AdminMobileShell role={role} active="more">
      {({ accent, roleLabel }) => (
        <div style={{ padding: '12px 14px 16px' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: MA.text, letterSpacing: -0.4, marginBottom: 14 }}>더보기</div>

          {/* 프로필 카드 */}
          <div style={{ background: MA.card, borderRadius: 8, padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14, border: `1px solid ${MA.border}` }}>
            <div style={{
              width: 52, height: 52, borderRadius: 999, background: accent, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 700, letterSpacing: -0.3,
            }}>{name.charAt(0)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: MA.text }}>{name}</div>
              <div style={{ fontSize: 12, color: MA.muted, marginTop: 2 }}>{roleDisplay}</div>
            </div>
            <Icon d={icons.down} size={16} c={MA.mutedSoft} sw={2} />
          </div>

          {/* 그룹 1: 대시보드 */}
          <MenuSection label="대시보드">
            <MoreRow l="본사 대시보드" d={icons.dashboard} tone={isHQ ? HQ.accent : accent} divider={false} />
          </MenuSection>

          {/* 그룹 2: 성과 */}
          <MenuSection label="성과">
            <MoreRow l="경영 지표" d={icons.chart} tone={MA.blue} />
            <MoreRow l="성과 분석" d={icons.target} tone={accent} divider={false} />
          </MenuSection>

          {/* 그룹 3: 직원/근태 관리 */}
          <MenuSection label="직원/근태 관리">
            <MoreRow l={isHQ ? '전사 직원' : '지점 직원 관리'} d={icons.users} tone={accent} badge={activeCount > 0 ? `${activeCount}` : null} />
            <MoreRow l="휴가 관리" d={icons.calendar} tone={MA.blue} badge={pendingLeaves > 0 ? `${pendingLeaves}` : null} divider={false} />
          </MenuSection>

          {/* 그룹 4: 생산 */}
          <MenuSection label="생산">
            <MoreRow l="지점별 생육" d={icons.leaf} tone={MA.success} divider={false} />
          </MenuSection>

          {/* 그룹 5: 승인 결재 */}
          <MenuSection label="승인 결재">
            <MoreRow l="승인 결재" d={icons.clipboard} tone={accent} badge={pendingLeaves > 0 ? `${pendingLeaves}` : null} divider={false} />
          </MenuSection>

          {/* 그룹 6: 운영/이슈 */}
          <MenuSection label="운영/이슈">
            <MoreRow l="이상 신고" d={icons.alert} tone={MA.danger} badge={unresolvedIssues > 0 ? `${unresolvedIssues}` : null} divider={false} />
          </MenuSection>

          {/* 그룹 7: 공지/정책 */}
          <MenuSection label="공지/정책">
            <MoreRow l="공지·정책" d={icons.bell} tone={MA.blue} divider={false} />
          </MenuSection>

          {/* 그룹 8: 지점 관리 */}
          <MenuSection label="지점 관리">
            <MoreRow l="지점 관리" d={icons.location} tone={accent} divider={false} />
          </MenuSection>

          {/* 앱 설정 */}
          <MenuSection label="설정">
            <MoreRow l="푸시 알림 설정" d={icons.bell} tone={MA.muted} toggle />
            <MoreRow l="도움말 / 문의" d={icons.chat} tone={MA.muted} />
            <MoreRow l="앱 정보 · v1.0.0" d={icons.target} tone={MA.muted} />
            <MoreRow l="로그아웃" d={icons.logout} tone={MA.danger} divider={false} />
          </MenuSection>
        </div>
      )}
    </AdminMobileShell>
  );
}

const MenuSection = ({ label, children }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ fontSize: 11, color: MA.mutedSoft, fontWeight: 700, padding: '0 4px 6px', letterSpacing: 0.5 }}>{label.toUpperCase()}</div>
    <div style={{ background: MA.card, borderRadius: 8, padding: '2px 14px', border: `1px solid ${MA.border}` }}>
      {children}
    </div>
  </div>
);

const MoreRow = ({ l, d, tone, badge, right, toggle, divider = true }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
    borderBottom: divider ? `1px solid ${MA.divider}` : 'none',
  }}>
    <div style={{ width: 32, height: 32, borderRadius: 8, background: `${tone}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon d={d} size={15} c={tone} sw={2} />
    </div>
    <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: MA.text, letterSpacing: -0.2 }}>{l}</div>
    {badge && <span style={{ padding: '3px 8px', borderRadius: 999, background: `${MA.danger}18`, color: MA.danger, fontSize: 10, fontWeight: 700 }}>{badge}</span>}
    {right && <span style={{ fontSize: 12, color: MA.muted }}>{right}</span>}
    {toggle && (
      <div style={{ width: 36, height: 22, borderRadius: 999, background: MA.primary, position: 'relative' }}>
        <div style={{ width: 18, height: 18, borderRadius: 999, background: '#fff', position: 'absolute', top: 2, right: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
      </div>
    )}
    {!toggle && !right && <Icon d={icons.down} size={14} c={MA.mutedSoft} sw={2} />}
  </div>
);

// ═══════════════════════════════════════════════════════════
// ⑦ 알림 인박스 — Case Z' Option 1
// NOTIFICATION-STORE-001: 퍼시스턴트 알림 이력 store 미존재
//   notificationStore는 toast 전용 (6~10초 자동 소멸)
//   → leaveStore(pending) + issueStore(미해결)로 조합
// ═══════════════════════════════════════════════════════════
function MobileInboxScreen({ role = 'farm' }) {
  const employees = useEmployeeStore((s) => s.employees);
  const requests = useLeaveStore((s) => s.requests);
  const issues = useIssueStore((s) => s.issues);

  const issueItems = useMemo(
    () =>
      issues
        .filter((i) => i.status !== 'resolved')
        .slice(0, 3)
        .map((i) => {
          const meta = D_BRANCH_META[i.branch] || { name: i.branch || '—', accent: MA.danger };
          return {
            d: icons.alert,
            tone: MA.danger,
            title: i.title || '이상 신고',
            sub: `미해결 · ${meta.name}`,
            time: relTime(i.createdAt),
            unread: true,
          };
        }),
    [issues],
  );

  const approvalItems = useMemo(
    () =>
      requests
        .filter((r) => r.status === 'pending')
        .slice(0, 5)
        .map((r) => {
          const emp = employees.find((e) => e.id === r.employeeId);
          const meta = D_BRANCH_META[emp?.branch] || { name: emp?.branch || '—', accent: MA.blue };
          return {
            d: icons.clipboard,
            tone: MA.blue,
            title: `${leaveLabel(r.leaveType)} 신청 · ${emp?.name || '—'}`,
            sub: `${fmtDate(r.startDate)} ~ ${fmtDate(r.endDate)} · ${meta.name}`,
            time: relTime(r.createdAt),
            unread: true,
          };
        }),
    [requests, employees],
  );

  const totalCount = issueItems.length + approvalItems.length;

  return (
    <AdminMobileShell role={role} active="home" showHeader title="알림" badge={totalCount > 0}>
      {() => (
        <div style={{ padding: '0 0 16px' }}>
          <div style={{ padding: '10px 14px 8px', display: 'flex', gap: 6, overflowX: 'auto' }}>
            <span style={{
              padding: '6px 12px', borderRadius: 999, whiteSpace: 'nowrap',
              background: MA.text, color: '#fff', fontSize: 12, fontWeight: 700,
            }}>{`전체 ${totalCount}`}</span>
            <span style={{
              padding: '6px 12px', borderRadius: 999, whiteSpace: 'nowrap',
              background: MA.card, color: MA.muted, fontSize: 12, fontWeight: 700,
              border: `1px solid ${MA.border}`,
            }}>{`이슈 ${issueItems.length}`}</span>
            <span style={{
              padding: '6px 12px', borderRadius: 999, whiteSpace: 'nowrap',
              background: MA.card, color: MA.muted, fontSize: 12, fontWeight: 700,
              border: `1px solid ${MA.border}`,
            }}>{`승인 ${approvalItems.length}`}</span>
          </div>

          <div style={{ padding: '0 14px' }}>
            {totalCount === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 240, gap: 10 }}>
                <Icon d={icons.bell} size={36} c={MA.mutedSoft} sw={1.5} />
                <div style={{ fontSize: 16, fontWeight: 700, color: MA.text }}>새 알림 없음</div>
                <div style={{ fontSize: 12, color: MA.muted }}>미해결 이슈나 대기 중인 승인이 없습니다</div>
              </div>
            ) : (
              <>
                {issueItems.length > 0 && (
                  <InboxGroup label="미해결 이슈" items={issueItems} />
                )}
                {approvalItems.length > 0 && (
                  <InboxGroup label="승인 요청" items={approvalItems} />
                )}
              </>
            )}
          </div>
        </div>
      )}
    </AdminMobileShell>
  );
}

const InboxGroup = ({ label, items }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ fontSize: 11, color: MA.mutedSoft, fontWeight: 700, padding: '6px 4px', letterSpacing: 0.5 }}>{label.toUpperCase()}</div>
    <div style={{ background: MA.card, borderRadius: 8, padding: '2px 14px', border: `1px solid ${MA.border}` }}>
      {items.map((r, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0',
          borderBottom: i < items.length - 1 ? `1px solid ${MA.divider}` : 'none',
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8, background: `${r.tone}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            position: 'relative',
          }}>
            <Icon d={r.d} size={15} c={r.tone} sw={2.2} />
            {r.unread && <span style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: 999, background: MA.danger, border: '2px solid #fff' }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: r.unread ? 700 : 600, color: MA.text, letterSpacing: -0.2 }}>{r.title}</div>
            <div style={{ fontSize: 11, color: MA.muted, marginTop: 2 }}>{r.sub}</div>
          </div>
          <div style={{ fontSize: 10, color: MA.mutedSoft, fontWeight: 600, flexShrink: 0 }}>{r.time}</div>
        </div>
      ))}
    </div>
  </div>
);

export {
  MobileApprovalScreen,
  MobileFloorScreen,
  MobilePerfScreen,
  MobileMoreScreen,
  MobileInboxScreen,
};

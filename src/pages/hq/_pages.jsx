import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { T, Card, Pill, Dot, Icon, icons, Avatar, btnPrimary, btnSecondary } from '../../design/primitives';
import { HQ } from '../../design/hq-shell';
import useEmployeeStore from '../../stores/employeeStore';
import useLeaveStore from '../../stores/leaveStore';
import useAuthStore from '../../stores/authStore';
import useAttendanceStore from '../../stores/attendanceStore';
import useNoticeStore from '../../stores/noticeStore';
import useHarvestStore from '../../stores/harvestStore';
import { supabase } from '../../lib/supabase';
import EmployeeDetailModal from '../../components/employees/EmployeeDetailModal';
import EmployeeEditModal from '../../components/employees/EmployeeEditModal';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts';

// ─────── 지점 메타 (코드 → 표시명·색상) ───────
const BRANCH_META = {
  busan:        { name: '부산LAB',  dot: T.primary,   avatar: 'blue' },
  jinju:        { name: '진주HUB',  dot: T.success,   avatar: 'emerald' },
  hadong:       { name: '하동HUB',  dot: T.warning,   avatar: 'amber' },
  headquarters: { name: '총괄본사', dot: T.text,      avatar: 'slate' },
  management:   { name: '관리팀',   dot: HQ.accent,   avatar: 'slate' },
  seedlab:      { name: 'Seed LAB', dot: T.mutedSoft, avatar: 'slate' },
};
const HQ_BRANCHES = ['headquarters', 'management', 'seedlab'];
const ROLE_LABEL = { master: '총괄', hr_admin: '인사관리', farm_admin: '관리자', worker: '작업자' };
const hireDisplay = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, '0')}`;
};

// 관리팀(HQ) 나머지 5개 페이지
// ① 승인 허브  ② 지점 관리  ③ 전사 직원  ④ 공지·정책  ⑤ 경영 지표

// ─────── 공통 페이지 헤더 ───────
const HQPageHeader = ({ subtitle, title, actions, tabs, activeTab, onTab }) => (
  <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
    <div style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: T.mutedSoft, marginBottom: 4 }}>
          <span style={{ padding: '2px 8px', borderRadius: 4, background: HQ.accentSoft, color: HQ.accentText, fontWeight: 700, letterSpacing: 0.3 }}>HQ</span>
          <span>{subtitle}</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: -0.4, margin: 0 }}>{title}</h1>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>{actions}</div>
    </div>
    {tabs && (
      <div style={{ display: 'flex', gap: 0, padding: '0 32px', borderTop: `1px solid ${T.borderSoft}` }}>
        {tabs.map(t => {
          const on = activeTab === t.id;
          return (
            <button key={t.id} onClick={() => onTab && onTab(t.id)} style={{
              padding: '12px 16px', border: 0, background: 'transparent', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, color: on ? HQ.accent : T.mutedSoft,
              borderBottom: on ? `2px solid ${HQ.accent}` : '2px solid transparent',
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: -1,
            }}>
              {t.label}
              {t.count !== undefined && <span style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 999,
                background: on ? HQ.accentSoft : T.bg,
                color: on ? HQ.accentText : T.mutedSoft, fontWeight: 700,
              }}>{t.count}</span>}
            </button>
          );
        })}
      </div>
    )}
  </div>
);

// ═══════════════════════════════════════════════════════════
// ① 승인 허브 (전체 페이지)
// ═══════════════════════════════════════════════════════════
function HQApprovalsScreen() {
  const [tab, setTab] = useState('pending');
  const [selected, setSelected] = useState(new Set());
  const [filter, setFilter] = useState({ branch: 'all', type: 'all' });

  const requests = useLeaveStore((s) => s.requests);
  const fetchRequests = useLeaveStore((s) => s.fetchRequests);
  const farmReview = useLeaveStore((s) => s.farmReview);
  const employees = useEmployeeStore((s) => s.employees);
  const fetchEmployees = useEmployeeStore((s) => s.fetchEmployees);
  const currentUser = useAuthStore((s) => s.currentUser);

  useEffect(() => {
    fetchRequests();
    if (employees.length === 0) fetchEmployees();
  }, []);

  const pending  = requests.filter(r => r.status === 'pending');
  const approved = requests.filter(r => r.status === 'approved');
  const rejected = requests.filter(r => r.status === 'rejected');

  const urgentCount = pending.filter(r => r.createdAt && Date.now() - new Date(r.createdAt) > 3 * 60 * 60 * 1000).length;
  const reviewed = requests.filter(r => r.status !== 'pending' && r.farmReviewedAt && r.createdAt);
  const avgH = reviewed.length > 0
    ? `${(reviewed.reduce((s, r) => s + (new Date(r.farmReviewedAt) - new Date(r.createdAt)), 0) / reviewed.length / 3600000).toFixed(1)}h`
    : '—';

  const tabItems = useMemo(() => {
    const source = tab === 'approved' ? approved : tab === 'rejected' ? rejected : pending;
    return source.map(r => {
      const emp = employees.find(e => e.id === r.employeeId);
      const bm = BRANCH_META[emp?.branch] || { name: emp?.branch || '—', dot: T.mutedSoft };
      return {
        id: r.id,
        branch: bm.name,
        bc: bm.dot,
        name: emp?.name || '—',
        role: ROLE_LABEL[emp?.role] || '작업자',
        tag: '근태',
        tagTone: 'primary',
        type: r.type,
        detail: `${r.date}${r.reason ? ' · ' + r.reason : ''}`,
        amount: '',
        time: r.createdAt ? new Date(r.createdAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) + '일' : '—',
        urgent: false,
      };
    });
  }, [requests, employees, tab]);

  let filtered = tabItems;
  if (filter.branch !== 'all') filtered = filtered.filter(i => i.branch === filter.branch);
  if (filter.type !== 'all') filtered = filtered.filter(i => i.tag === filter.type);

  const toggle = (id) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };
  const toggleAll = () => setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(i => i.id)));

  const handleApprove = async (id) => {
    await farmReview(id, true, currentUser?.id);
    setSelected(s => { const n = new Set(s); n.delete(id); return n; });
  };
  const handleReject = async (id) => {
    await farmReview(id, false, currentUser?.id);
    setSelected(s => { const n = new Set(s); n.delete(id); return n; });
  };
  const handleBatchApprove = async () => {
    for (const id of selected) await farmReview(id, true, currentUser?.id);
    setSelected(new Set());
  };
  const handleBatchReject = async () => {
    for (const id of selected) await farmReview(id, false, currentUser?.id);
    setSelected(new Set());
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <HQPageHeader
        subtitle="본사 · 지점장 요청 관리"
        title="승인 허브"
        actions={<>
          {btnSecondary('내보내기', icons.chart, () => alert('승인 내역 내보내기 기능 준비 중입니다.'))}
          {/* BACKLOG: HQ-APPROVAL-EXPORT-001 */}
          {btnPrimary('규칙 설정', icons.settings, () => alert('승인 규칙 설정 기능 준비 중입니다.'))}
          {/* BACKLOG: HQ-APPROVAL-RULE-001 */}
        </>}
        tabs={[
          { id: 'pending',  label: '대기 중', count: pending.length },
          { id: 'approved', label: '승인됨',  count: approved.length },
          { id: 'rejected', label: '반려',    count: rejected.length },
          { id: 'rules',    label: '승인 규칙' },
        ]}
        activeTab={tab}
        onTab={setTab}
      />

      <div style={{ flex: 1, overflow: 'auto', padding: 24, background: T.bg, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* 요약 KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { l: '대기 중', v: pending.length, sub: `승인됨 ${approved.length} · 반려 ${rejected.length}`, tone: T.warning, bg: T.warningSoft },
            { l: '긴급', v: urgentCount, sub: '3시간 이상 경과 기준', tone: T.danger, bg: T.dangerSoft },
            { l: '이번 주 승인액', v: '—', sub: '집계 없음', tone: HQ.accent, bg: HQ.accentSoft },
            { l: '평균 처리 시간', v: avgH, sub: reviewed.length > 0 ? `${reviewed.length}건 기준` : '데이터 없음', tone: T.success, bg: T.successSoft },
          ].map((k, i) => (
            <Card key={i} pad={16} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon d={icons.check} size={18} c={k.tone} sw={2.4} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>{k.l}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: T.text, letterSpacing: -0.3, marginTop: 2 }}>{k.v}</div>
                <div style={{ fontSize: 10, color: T.mutedSoft, marginTop: 1 }}>{k.sub}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* 필터 + 선택 액션 */}
        <Card pad={0}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.borderSoft}`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.muted }}>지점:</span>
            {['all', '부산LAB', '진주HUB', '하동HUB'].map(b => {
              const on = filter.branch === b;
              return (
                <button key={b} onClick={() => setFilter({ ...filter, branch: b })} style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${on ? HQ.accent : T.border}`,
                  background: on ? HQ.accentSoft : T.surface,
                  color: on ? HQ.accentText : T.muted,
                }}>{b === 'all' ? '전체' : b}</button>
              );
            })}
            <span style={{ width: 1, height: 16, background: T.border, margin: '0 4px' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: T.muted }}>유형:</span>
            {['all', '근태', '예산', '인사', '자재'].map(t => {
              const on = filter.type === t;
              return (
                <button key={t} onClick={() => setFilter({ ...filter, type: t })} style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${on ? HQ.accent : T.border}`,
                  background: on ? HQ.accentSoft : T.surface,
                  color: on ? HQ.accentText : T.muted,
                }}>{t === 'all' ? '전체' : t}</button>
              );
            })}

            {selected.size > 0 && (
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{selected.size}건 선택됨</span>
                <button onClick={handleBatchReject} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, color: T.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>일괄 반려</button>
                <button onClick={handleBatchApprove} style={{ padding: '6px 12px', borderRadius: 6, border: 0, background: HQ.accent, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>일괄 승인</button>
              </div>
            )}
          </div>

          {/* 테이블 */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: T.bg, borderBottom: `1px solid ${T.border}` }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.muted, width: 40 }}>
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} style={{ cursor: 'pointer' }} />
                </th>
                <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.muted }}>지점/요청자</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.muted }}>유형</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.muted }}>내용</th>
                <th style={{ padding: '10px 8px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: T.muted }}>금액</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.muted }}>경과</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: T.muted, width: 180 }}>액션</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: T.mutedSoft, fontSize: 12 }}>해당 조건의 승인 요청 없음</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} style={{
                  borderBottom: `1px solid ${T.borderSoft}`,
                  background: selected.has(r.id) ? HQ.accentSoft : 'transparent',
                }}>
                  <td style={{ padding: '12px 16px' }}>
                    <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} style={{ cursor: 'pointer' }} />
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Dot c={r.bc} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{r.branch}</div>
                        <div style={{ fontSize: 11, color: T.mutedSoft }}>{r.name} · {r.role}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <Pill tone={r.tagTone} size="sm">{r.tag}</Pill>
                      {r.urgent && <Pill tone="danger" size="sm">긴급</Pill>}
                    </div>
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{r.type}</div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{r.detail}</div>
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: T.text }}>{r.amount || '—'}</td>
                  <td style={{ padding: '12px 8px', fontSize: 11, color: T.mutedSoft }}>{r.time}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    {tab === 'pending' ? (
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button onClick={() => handleReject(r.id)} style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, color: T.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>반려</button>
                        <button onClick={() => handleApprove(r.id)} style={{ padding: '5px 12px', borderRadius: 6, border: 0, background: HQ.accent, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>승인</button>
                        <button style={{ padding: '5px 8px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, color: T.mutedSoft, fontSize: 11, cursor: 'pointer' }}>⋯</button>
                      </div>
                    ) : (
                      <Pill tone={tab === 'approved' ? 'success' : 'danger'} size="sm">{tab === 'approved' ? '승인됨' : '반려됨'}</Pill>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ② 지점 관리
// ═══════════════════════════════════════════════════════════
function HQBranchesScreen() {
  const navigate = useNavigate();
  const employees = useEmployeeStore((s) => s.employees);
  const fetchEmployees = useEmployeeStore((s) => s.fetchEmployees);
  const records = useAttendanceStore((s) => s.records);
  const fetchRecords = useAttendanceStore((s) => s.fetchRecords);
  const harvestRecords = useHarvestStore((s) => s.records);
  const fetchHarvest = useHarvestStore((s) => s.fetchCurrentMonth);
  const [branchTargets, setBranchTargets] = useState({});

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (employees.length === 0) fetchEmployees();
    fetchRecords();
    fetchHarvest();
    supabase
      .from('branches')
      .select('code, monthly_harvest_target_kg')
      .then(({ data }) => {
        if (!data) return;
        const map = {};
        data.forEach((r) => { map[r.code] = Number(r.monthly_harvest_target_kg) || 0; });
        setBranchTargets(map);
      });
  }, []);

  // employee_id → 이번 달 수확량 합계 (harvestStore.records 기반)
  const monthlyHarvestByEmp = useMemo(() => {
    const map = {};
    harvestRecords.forEach((r) => {
      map[r.employee_id] = (map[r.employee_id] || 0) + Number(r.quantity || 0);
    });
    return map;
  }, [harvestRecords]);

  const bwc = (code) => employees.filter(e => e.branch === code && e.isActive).length;

  const branchMgr = (code) =>
    employees.find(e => e.branch === code && e.role === 'farm_admin' && e.isActive)?.name || '—';

  const branchRate = (code) => {
    const workers = bwc(code);
    if (workers === 0) return 0;
    const empIds = new Set(employees.filter(e => e.branch === code && e.isActive).map(e => e.id));
    const checkedIn = records.filter(r => r.date === today && empIds.has(r.employeeId) && r.checkIn).length;
    return Math.round(checkedIn / workers * 100);
  };

  const branchHarvest = (code) => {
    const empIds = new Set(employees.filter(e => e.branch === code && e.isActive).map(e => e.id));
    return [...empIds].reduce((sum, id) => sum + (monthlyHarvestByEmp[id] || 0), 0);
  };

  const BRANCH_DISPLAY = {
    busan:  { name: '부산LAB', short: 'BL', accent: T.primary,  accentSoft: T.primarySoft,  avatarC: 'blue' },
    jinju:  { name: '진주HUB', short: 'JJ', accent: T.success,  accentSoft: T.successSoft,  avatarC: 'emerald' },
    hadong: { name: '하동HUB', short: 'HD', accent: T.warning,  accentSoft: T.warningSoft,  avatarC: 'amber' },
  };

  const branches = ['busan', 'jinju', 'hadong'].map(code => {
    const d = BRANCH_DISPLAY[code];
    const workers = bwc(code);
    const mgr = branchMgr(code);
    const rate = branchRate(code);
    const harvest = branchHarvest(code);
    return {
      code, name: d.name, short: d.short, mgr, phone: '—', address: '—',
      workers, rate, harvest, harvestT: branchTargets[code] || 0,
      crops: '—', area: '—',
      accent: d.accent, accentSoft: d.accentSoft, avatarC: d.avatarC,
      status: rate < 80 && workers > 0 ? 'alert' : 'active',
    };
  });

  const totalHarvest = Object.values(monthlyHarvestByEmp).reduce((s, v) => s + v, 0);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <HQPageHeader
        subtitle="본사 · 다지점 운영"
        title="지점 관리"
        actions={<>
          {btnSecondary('지도로 보기', icons.location, () => alert('지점 지도 기능 준비 중입니다.'))}
          {/* BACKLOG: HQ-BRANCH-MAP-001 */}
          {btnPrimary('지점 추가', icons.plus, () => alert('지점 추가 기능 준비 중입니다.'))}
          {/* BACKLOG: HQ-BRANCH-ADD-001 */}
        </>}
      />
      <div style={{ flex: 1, overflow: 'auto', padding: 24, background: T.bg, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* 전사 요약 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { l: '운영 지점', v: branches.length, u: '개', sub: '부산·진주·하동' },
            { l: '총 재배면적', v: '—', u: '', sub: '집계 없음' },
            { l: '총 인원', v: branches.reduce((s, b) => s + b.workers, 0), u: '명', sub: `${branches.map(b => `${b.name} ${b.workers}`).join(' · ')}` },
            { l: '월 수확량', v: totalHarvest.toLocaleString(), u: 'kg', sub: '집계 기준: 이번 달' },
          ].map((k, i) => (
            <Card key={i} pad={16}>
              <div style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>{k.l}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: T.text, letterSpacing: -0.5 }}>{k.v}</span>
                <span style={{ fontSize: 12, color: T.mutedSoft }}>{k.u}</span>
              </div>
              <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 4 }}>{k.sub}</div>
            </Card>
          ))}
        </div>

        {/* 지점 카드 그리드 (상세) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {branches.map(b => (
            <Card key={b.code} pad={0} style={{ overflow: 'hidden' }}>
              {/* 헤더 */}
              <div style={{
                padding: '16px 20px', background: b.accentSoft, borderBottom: `1px solid ${T.borderSoft}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10, background: b.accent, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, letterSpacing: 0.5,
                  }}>{b.short}</div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: T.text, letterSpacing: -0.3 }}>{b.name}</div>
                    <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 2 }}>직원 {b.workers}명 재직 중</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {b.status === 'alert' ? <Pill tone="warning">주의</Pill> : <Pill tone="success">정상</Pill>}
                  <button onClick={() => navigate(`/admin/hq/branches/${b.code}`)} style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, color: T.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>상세 →</button>
                  {/* BACKLOG: HQ-BRANCH-DETAIL-001 */}
                </div>
              </div>

              {/* 바디 */}
              <div style={{ padding: 20 }}>
                {/* 지점장 카드 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: T.bg, borderRadius: 8, marginBottom: 14 }}>
                  <Avatar name={b.mgr !== '—' ? b.mgr[0] : '?'} size={40} c={b.avatarC} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{b.mgr}</span>
                      <Pill tone="muted" size="sm">지점장</Pill>
                    </div>
                    <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 2 }}>{b.phone}</div>
                  </div>
                  <button style={{ padding: '6px 10px', borderRadius: 6, border: 0, background: HQ.accent, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>연락</button>
                </div>

                {/* 정보 그리드 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  {[
                    { l: '주소', v: b.address, full: true },
                    { l: '재배 작물', v: b.crops, full: true },
                    { l: '재배 면적', v: b.area },
                    { l: '직원 수', v: `${b.workers}명` },
                  ].map((row, i) => (
                    <div key={i} style={{ gridColumn: row.full ? '1 / -1' : undefined, paddingBottom: 8, borderBottom: `1px solid ${T.borderSoft}` }}>
                      <div style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 700, letterSpacing: 0.3 }}>{row.l}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginTop: 2 }}>{row.v}</div>
                    </div>
                  ))}
                </div>

                {/* 지표 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[
                    { l: '출근률', v: b.rate, u: '%' },
                    { l: '수확', v: b.harvest.toLocaleString(), u: 'kg' },
                    { l: '달성', v: b.harvestT > 0 ? Math.round(b.harvest / b.harvestT * 100) : '—', u: b.harvestT > 0 ? '%' : '' },
                  ].map((s, i) => (
                    <div key={i} style={{ padding: 10, background: T.bg, borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 600 }}>{s.l}</div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: T.text, letterSpacing: -0.3, marginTop: 2 }}>
                        {s.v}<span style={{ fontSize: 11, color: T.mutedSoft, fontWeight: 500, marginLeft: 1 }}>{s.u}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}

          {/* 지점 추가 카드 */}
          <Card pad={0} style={{
            overflow: 'hidden', border: `2px dashed ${T.border}`, background: 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: 300, cursor: 'pointer',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, background: T.bg, margin: '0 auto',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon d={icons.plus} size={22} c={HQ.accent} sw={2.4} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginTop: 12 }}>새 지점 추가</div>
              <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 4 }}>지점명, 주소, 지점장 정보 등록</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ③ 전사 직원
// ═══════════════════════════════════════════════════════════
function HQEmployeesScreen() {
  const [tab, setTab] = useState('all');
  const [empTypeFilter, setEmpTypeFilter] = useState('전체');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editEmployee, setEditEmployee] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const employees = useEmployeeStore((s) => s.employees);
  const fetchEmployees = useEmployeeStore((s) => s.fetchEmployees);

  const branchNameMap = Object.fromEntries(Object.entries(BRANCH_META).map(([k, v]) => [k, v.name]));

  useEffect(() => { fetchEmployees(); }, []);

  const tabFiltered = useMemo(() => {
    let base = employees;
    if (tab === 'busan')       base = employees.filter(e => e.branch === 'busan');
    else if (tab === 'jinju')  base = employees.filter(e => e.branch === 'jinju');
    else if (tab === 'hadong') base = employees.filter(e => e.branch === 'hadong');
    else if (tab === 'hq')     base = employees.filter(e => HQ_BRANCHES.includes(e.branch));
    if (empTypeFilter === '정규') base = base.filter(e => e.isActive && !e.contractEndDate);
    else if (empTypeFilter === '계약') base = base.filter(e => e.isActive && e.contractEndDate);
    else if (empTypeFilter === '임시') base = base.filter(e => !e.isActive);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      base = base.filter(e =>
        e.name?.toLowerCase().includes(q) ||
        e.phone?.includes(q)
      );
    }
    return base;
  }, [employees, tab, empTypeFilter, searchQuery]);

  const totalActive  = employees.filter(e => e.isActive).length;
  const busanCount   = employees.filter(e => e.branch === 'busan').length;
  const jinjuCount   = employees.filter(e => e.branch === 'jinju').length;
  const hadongCount  = employees.filter(e => e.branch === 'hadong').length;
  const hqCount      = employees.filter(e => HQ_BRANCHES.includes(e.branch)).length;
  const regularCount = employees.filter(e => e.isActive && !e.contractEndDate).length;
  const contractCount = employees.filter(e => e.isActive && e.contractEndDate).length;
  const empNow = new Date();
  const empThisMonth = `${empNow.getFullYear()}-${String(empNow.getMonth()+1).padStart(2,'0')}`;
  const newHireCount = employees.filter(e => e.hireDate?.startsWith(empThisMonth)).length;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <HQPageHeader
        subtitle="본사 · 전 지점 통합"
        title="전사 직원"
        actions={<>
          {btnSecondary('CSV 내보내기', icons.chart, () => alert('직원 CSV 내보내기 기능 준비 중입니다.'))}
          {/* BACKLOG: HQ-EMP-CSV-001 */}
          {btnPrimary('직원 추가', icons.plus, () => alert('직원 추가 기능 준비 중입니다.'))}
          {/* BACKLOG: HQ-EMP-ADD-001 */}
        </>}
        tabs={[
          { id: 'all',    label: '전체',   count: employees.length },
          { id: 'busan',  label: '부산LAB', count: busanCount },
          { id: 'jinju',  label: '진주HUB', count: jinjuCount },
          { id: 'hadong', label: '하동HUB', count: hadongCount },
          { id: 'hq',     label: '본사',   count: hqCount },
        ]}
        activeTab={tab}
        onTab={setTab}
      />
      <div style={{ flex: 1, overflow: 'auto', padding: 24, background: T.bg, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { l: '총 인원', v: employees.length, u: '명', sub: `활성 ${totalActive} · 비활성 ${employees.length - totalActive}` },
            { l: '정규직', v: regularCount, u: '명', sub: totalActive > 0 ? `${Math.round(regularCount/totalActive*100)}%` : '—' },
            { l: '계약직', v: contractCount, u: '명', sub: totalActive > 0 ? `${Math.round(contractCount/totalActive*100)}%` : '—' },
            { l: '이번 달 입사', v: newHireCount, u: '명', sub: '이번 달 기준' },
          ].map((k, i) => (
            <Card key={i} pad={16}>
              <div style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>{k.l}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: T.text, letterSpacing: -0.5 }}>{k.v}</span>
                <span style={{ fontSize: 12, color: T.mutedSoft }}>{k.u}</span>
              </div>
              <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 4 }}>{k.sub}</div>
            </Card>
          ))}
        </div>

        {/* 검색/필터 바 + 테이블 */}
        <Card pad={0}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.borderSoft}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, flex: 1, maxWidth: 320 }}>
              <Icon d={icons.search} size={14} c={T.mutedSoft} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="이름, 연락처로 검색"
                style={{ flex: 1, border: 0, outline: 'none', background: 'transparent', fontSize: 12, color: T.text }}
              />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['전체', '정규', '계약', '임시'].map((t) => {
                const on = empTypeFilter === t;
                return (
                  <button key={t} onClick={() => setEmpTypeFilter(t)} style={{
                    padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    border: `1px solid ${on ? HQ.accent : T.border}`,
                    background: on ? HQ.accentSoft : T.surface,
                    color: on ? HQ.accentText : T.muted,
                  }}>{t}</button>
                );
              })}
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: T.bg, borderBottom: `1px solid ${T.border}` }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.muted }}>직원</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.muted }}>지점</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.muted }}>연락처</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.muted }}>직책</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.muted }}>고용형태</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.muted }}>입사일</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.muted }}>상태</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: T.muted, width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {tabFiltered.map((e) => {
                const bm = BRANCH_META[e.branch] || { name: e.branch || '—', dot: T.mutedSoft, avatar: 'slate' };
                const roleLabel = e.jobTitle || ROLE_LABEL[e.role] || e.role;
                const isAdmin = e.role === 'farm_admin' || e.role === 'hr_admin' || e.role === 'master';
                const typeLabel = e.jobType === 'admin' ? '관리자' : '작업자';
                const typeTone  = e.jobType === 'admin' ? 'primary' : 'muted';
                return (
                  <tr key={e.id} style={{ borderBottom: `1px solid ${T.borderSoft}` }}>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={e.name[0]} size={32} c={bm.avatar} />
                        <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{e.name}</div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.text, fontWeight: 500 }}>
                        <Dot c={bm.dot} />{bm.name}
                      </div>
                    </td>
                    <td style={{ padding: '10px 8px', fontSize: 12, color: T.muted, fontVariantNumeric: 'tabular-nums' }}>
                      {e.phone || '—'}
                    </td>
                    <td style={{ padding: '10px 8px', fontSize: 12, color: T.muted }}>
                      {isAdmin ? <Pill tone="primary" size="sm">{roleLabel}</Pill> : roleLabel}
                    </td>
                    <td style={{ padding: '10px 8px', fontSize: 12, color: T.muted }}>
                      <Pill tone={typeTone} size="sm">{typeLabel}</Pill>
                    </td>
                    <td style={{ padding: '10px 8px', fontSize: 12, color: T.muted }}>{hireDisplay(e.hireDate)}</td>
                    <td style={{ padding: '10px 8px' }}>
                      {e.isActive ? <Pill tone="success" size="sm">재직</Pill> : <Pill tone="danger" size="sm">비활성</Pill>}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      <button onClick={() => setSelectedEmployee(e)} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, color: T.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>상세</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ padding: '12px 16px', borderTop: `1px solid ${T.borderSoft}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: T.mutedSoft }}>
            <span>총 {tabFiltered.length}명</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {['←', '1', '2', '3', '4', '5', '6', '→'].map((p, i) => (
                <span key={i} style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  background: p === '1' ? HQ.accent : T.surface,
                  color: p === '1' ? '#fff' : T.muted,
                  border: p === '1' ? 'none' : `1px solid ${T.border}`,
                }}>{p}</span>
              ))}
            </div>
          </div>
        </Card>
      </div>
      {selectedEmployee && (
        <EmployeeDetailModal
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          onEdit={(e) => setEditEmployee(e)}
          branchNameMap={branchNameMap}
        />
      )}
      {editEmployee && (
        <EmployeeEditModal
          employee={editEmployee}
          onClose={() => setEditEmployee(null)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ④ 공지 · 정책
// ═══════════════════════════════════════════════════════════
function HQNoticesScreen() {
  const [tab, setTab] = useState('active');
  const rawNotices = useNoticeStore((s) => s.notices);
  const fetchNotices = useNoticeStore((s) => s.fetchNotices);
  const addNotice = useNoticeStore((s) => s.addNotice);
  const currentUser = useAuthStore((s) => s.currentUser);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [noticeForm, setNoticeForm] = useState({ title: '', body: '', priority: 'normal' });
  const [noticeSaving, setNoticeSaving] = useState(false);

  useEffect(() => { fetchNotices(); }, []);

  // notices 테이블: title/body/priority/author_team/created_at만 있음
  // 열람률/만료일/대상 → DB 미지원, BACKLOG HQ-NOTICES-META-001
  const noticeMap = { important: { tag: '전사 · 중요', tone: 'danger' }, normal: { tag: '정책', tone: 'info' } };
  const noticeNow = new Date();
  const noticeThisMonth = `${noticeNow.getFullYear()}-${String(noticeNow.getMonth()+1).padStart(2,'0')}`;
  const importantCount = rawNotices.filter(n => n.priority === 'important').length;
  const thisMonthNoticeCount = rawNotices.filter(n => n.createdAt?.startsWith(noticeThisMonth)).length;

  const notices = rawNotices.map(n => ({
    id: n.id,
    tag: noticeMap[n.priority]?.tag || n.authorTeam || '정책',
    tone: noticeMap[n.priority]?.tone || 'info',
    pinned: n.priority === 'important',
    title: n.title,
    body: n.body || '—',
    author: n.authorTeam || '—',
    target: '전 직원',
    read: 0, readPct: 0,
    date: new Date(n.createdAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }),
    expires: '상시',
  }));

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <HQPageHeader
        subtitle="본사 · 공지사항 및 사내 정책"
        title="공지 · 정책"
        actions={<>{btnSecondary('열람 리포트', icons.chart)}{btnPrimary('새 공지 작성', icons.plus, () => { setNoticeForm({ title: '', body: '', priority: 'normal' }); setShowNoticeModal(true); })}</>}
        tabs={[
          { id: 'active', label: '활성', count: notices.length },
          { id: 'scheduled', label: '예약됨', count: 0 },
          { id: 'expired', label: '만료', count: 0 },
          { id: 'templates', label: '템플릿' },
        ]}
        activeTab={tab}
        onTab={setTab}
      />
      <div style={{ flex: 1, overflow: 'auto', padding: 24, background: T.bg, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* 요약 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { l: '활성 공지', v: notices.length, u: '건', tone: HQ.accent, bg: HQ.accentSoft },
            { l: '중요/필참', v: importantCount, u: '건', tone: T.danger, bg: T.dangerSoft },
            { l: '평균 열람률', v: '—', u: '', tone: T.success, bg: T.successSoft, sub: '집계 없음' },
            { l: '이달 발행', v: thisMonthNoticeCount, u: '건', tone: T.text, bg: T.bg },
          ].map((k, i) => (
            <Card key={i} pad={16} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon d={icons.bell} size={18} c={k.tone} sw={2.2} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>{k.l}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 2 }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: T.text, letterSpacing: -0.3 }}>{k.v}</span>
                  <span style={{ fontSize: 11, color: T.mutedSoft }}>{k.u}</span>
                </div>
                {k.sub && <div style={{ fontSize: 10, color: T.mutedSoft, marginTop: 1 }}>{k.sub}</div>}
              </div>
            </Card>
          ))}
        </div>

        {/* 공지 리스트 (카드 형태) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notices.map(n => {
            const tones = { danger: T.danger, primary: T.primary, success: T.success, warning: T.warning, info: HQ.accent };
            const softs = { danger: T.dangerSoft, primary: T.primarySoft, success: T.successSoft, warning: T.warningSoft, info: HQ.accentSoft };
            return (
              <Card key={n.id} pad={0} style={{
                overflow: 'hidden',
                borderLeft: n.pinned ? `4px solid ${T.danger}` : undefined,
              }}>
                <div style={{ padding: 16, display: 'flex', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: softs[n.tone], color: tones[n.tone] }}>{n.tag}</span>
                      {n.pinned && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: T.danger }}>
                          <Icon d="M10 2l2 5 5 1-4 4 1 6-5-3-5 3 1-6-4-4 5-1z" size={10} c={T.danger} />
                          고정
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: T.mutedSoft, marginLeft: 'auto' }}>작성 {n.date} · 만료 {n.expires}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>{n.title}</div>
                    <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5, marginBottom: 10 }}>{n.body}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: T.mutedSoft }}>
                      <span>작성 <span style={{ color: T.text, fontWeight: 600 }}>{n.author}</span></span>
                      <span>·</span>
                      <span>대상 <span style={{ color: T.text, fontWeight: 600 }}>{n.target}</span></span>
                    </div>
                  </div>

                  {/* 열람 현황 */}
                  <div style={{ width: 200, paddingLeft: 16, borderLeft: `1px solid ${T.borderSoft}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: T.muted }}>열람률</span>
                      <span style={{ fontSize: 18, fontWeight: 700, color: T.text, letterSpacing: -0.3 }}>{n.readPct}%</span>
                    </div>
                    <div style={{ height: 6, background: T.borderSoft, borderRadius: 999, overflow: 'hidden', marginBottom: 4 }}>
                      <div style={{
                        width: `${n.readPct}%`, height: '100%',
                        background: n.readPct >= 90 ? T.success : n.readPct >= 70 ? T.warning : T.danger,
                      }} />
                    </div>
                    <div style={{ fontSize: 10, color: T.mutedSoft }}>{n.read} / — 명 읽음</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      <button style={{ flex: 1, padding: '5px 0', borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, color: T.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>수정</button>
                      <button style={{ flex: 1, padding: '5px 0', borderRadius: 6, border: 0, background: HQ.accent, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>재알림</button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 새 공지 작성 모달 */}
      {showNoticeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: T.text, margin: 0 }}>새 공지 작성</h2>
              <button onClick={() => setShowNoticeModal(false)} style={{ width: 28, height: 28, borderRadius: 6, border: 0, background: 'transparent', cursor: 'pointer', color: T.mutedSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon d={icons.x} size={14} c={T.mutedSoft} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 6 }}>우선순위</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[{ v: 'normal', l: '일반' }, { v: 'important', l: '중요' }, { v: 'urgent', l: '긴급' }].map(p => {
                    const on = noticeForm.priority === p.v;
                    const toneColor = p.v === 'urgent' ? T.danger : p.v === 'important' ? T.warning : T.muted;
                    const toneBg = p.v === 'urgent' ? T.dangerSoft : p.v === 'important' ? T.warningSoft : '#F1F5F9';
                    return (
                      <button key={p.v} onClick={() => setNoticeForm({ ...noticeForm, priority: p.v })} style={{
                        flex: 1, height: 34, borderRadius: 7, cursor: 'pointer',
                        border: on ? `1.5px solid ${toneColor}` : `1px solid ${T.border}`,
                        background: on ? toneBg : T.surface,
                        color: on ? toneColor : T.muted,
                        fontSize: 12, fontWeight: 700,
                      }}>{p.l}</button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 6 }}>제목</label>
                <input
                  value={noticeForm.title}
                  onChange={e => setNoticeForm({ ...noticeForm, title: e.target.value })}
                  placeholder="공지 제목을 입력하세요"
                  style={{ width: '100%', height: 40, padding: '0 12px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, color: T.text, boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 6 }}>내용</label>
                <textarea
                  value={noticeForm.body}
                  onChange={e => setNoticeForm({ ...noticeForm, body: e.target.value })}
                  placeholder="공지 내용을 입력하세요"
                  rows={5}
                  style={{ width: '100%', padding: '10px 12px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, color: T.text, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={() => setShowNoticeModal(false)} style={{ flex: 1, height: 42, borderRadius: 9, border: `1px solid ${T.border}`, background: T.surface, color: T.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>취소</button>
              <button
                disabled={!noticeForm.title.trim() || noticeSaving}
                onClick={async () => {
                  if (!noticeForm.title.trim()) return;
                  setNoticeSaving(true);
                  await addNotice({ title: noticeForm.title.trim(), body: noticeForm.body.trim(), priority: noticeForm.priority, createdBy: currentUser?.id, authorTeam: '관리팀' });
                  setNoticeSaving(false);
                  setShowNoticeModal(false);
                }}
                style={{ flex: 2, height: 42, borderRadius: 9, border: 0, background: !noticeForm.title.trim() ? T.borderSoft : HQ.accent, color: !noticeForm.title.trim() ? T.mutedSoft : '#fff', fontSize: 13, fontWeight: 700, cursor: noticeForm.title.trim() ? 'pointer' : 'default' }}
              >
                {noticeSaving ? '등록 중...' : '공지 등록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ⑤ 경영 지표
// ═══════════════════════════════════════════════════════════
function HQFinanceScreen() {
  const [period, setPeriod] = useState('YTD');
  const [monthlyData, setMonthlyData] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [harvestRecords, setHarvestRecords] = useState([]);

  useEffect(() => {
    async function load() {
      const [{ data: m }, { data: b }, { data: h }] = await Promise.all([
        supabase.from('finance_monthly').select('*, branches(name, code)').order('year,month'),
        supabase.from('finance_budgets').select('*, branches(name, code)'),
        supabase.from('harvest_records').select('date, quantity'),
      ]);
      setMonthlyData(m || []);
      setBudgets(b || []);
      setHarvestRecords(h || []);
      setLoading(false);
    }
    load();
  }, []);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentQuarter = Math.ceil(currentMonth / 3);

  const filteredData = useMemo(() => {
    if (!monthlyData.length) return [];
    switch (period) {
      case 'MTD':
        return monthlyData.filter(r => r.year === currentYear && r.month === currentMonth);
      case 'QTD': {
        const q1 = (currentQuarter - 1) * 3 + 1;
        return monthlyData.filter(r => r.year === currentYear && r.month >= q1 && r.month <= currentQuarter * 3);
      }
      case 'YTD':
        return monthlyData.filter(r => r.year === currentYear && r.month <= currentMonth);
      case '2025':
        return monthlyData.filter(r => r.year === 2025);
      default:
        return monthlyData;
    }
  }, [monthlyData, period, currentYear, currentMonth, currentQuarter]);

  const totalRevenue = filteredData.reduce((s, r) => s + (r.revenue || 0), 0);
  const totalLabor   = filteredData.reduce((s, r) => s + (r.labor_cost || 0), 0);
  const totalCost    = filteredData.reduce((s, r) =>
    s + (r.labor_cost || 0) + (r.material_cost || 0) + (r.energy_cost || 0) +
    (r.maintenance_cost || 0) + (r.training_cost || 0) + (r.other_cost || 0), 0);
  const profitRate   = totalRevenue > 0
    ? ((totalRevenue - totalCost) / totalRevenue * 100).toFixed(1)
    : '—';

  const budgetYear = period === '2025' ? 2025 : currentYear;
  const laborBudget = budgets
    .filter(b => b.category === 'labor' && b.year === budgetYear)
    .reduce((s, b) => s + (b.budget_amount || 0), 0);
  const laborExecPct = laborBudget > 0 ? Math.round(totalLabor / laborBudget * 100) : null;

  // kg당 생산원가: filteredData 기간과 동일한 년/월의 harvest_records 합산
  const totalHarvestKg = useMemo(() => {
    const yearMonths = new Set(filteredData.map(r => `${r.year}-${r.month}`));
    return harvestRecords
      .filter(r => {
        const d = new Date(r.date);
        return yearMonths.has(`${d.getFullYear()}-${d.getMonth() + 1}`);
      })
      .reduce((s, r) => s + Number(r.quantity || 0), 0);
  }, [filteredData, harvestRecords]);
  const costPerKg = totalHarvestKg > 0 ? Math.round(totalCost / totalHarvestKg) : null;

  // 월별 차트 데이터 (전체 monthlyData 기반, 지점 합산)
  const monthlyChartData = useMemo(() => {
    const map = {};
    monthlyData.forEach(r => {
      const k = `${r.year}-${String(r.month).padStart(2, '0')}`;
      if (!map[k]) map[k] = { key: k, label: `${r.month}월`, revenue: 0, labor: 0 };
      map[k].revenue += (r.revenue || 0);
      map[k].labor += (r.labor_cost || 0);
    });
    return Object.values(map)
      .sort((a, b) => (a.key < b.key ? -1 : 1))
      .map(d => ({ ...d, revenue: Math.round(d.revenue / 10000), labor: Math.round(d.labor / 10000) }));
  }, [monthlyData]);

  // 지점별 수익성 (filteredData 기반)
  const branchProfitData = useMemo(() => {
    const META = {
      busan:  { name: '부산LAB', c: T.primary },
      jinju:  { name: '진주HUB', c: T.success },
      hadong: { name: '하동HUB', c: T.warning },
    };
    const map = {};
    filteredData.forEach(r => {
      const code = r.branches?.code;
      if (!code) return;
      if (!map[code]) map[code] = { code, name: r.branches?.name || META[code]?.name || code, revenue: 0, cost: 0, c: META[code]?.c || T.mutedSoft };
      map[code].revenue += (r.revenue || 0);
      map[code].cost += (r.labor_cost || 0) + (r.material_cost || 0) + (r.energy_cost || 0)
        + (r.maintenance_cost || 0) + (r.training_cost || 0) + (r.other_cost || 0);
    });
    return Object.values(map).map(b => ({
      ...b,
      profit: b.revenue > 0 ? ((b.revenue - b.cost) / b.revenue * 100).toFixed(1) : '0.0',
      costPct: b.revenue > 0 ? (b.cost / b.revenue * 100).toFixed(1) : '100.0',
    }));
  }, [filteredData]);

  // 비용 구조 (filteredData 기반)
  const costStructureData = useMemo(() => {
    const totals = {
      labor:       filteredData.reduce((s, r) => s + (r.labor_cost || 0), 0),
      material:    filteredData.reduce((s, r) => s + (r.material_cost || 0), 0),
      energy:      filteredData.reduce((s, r) => s + (r.energy_cost || 0), 0),
      maintenance: filteredData.reduce((s, r) => s + (r.maintenance_cost || 0), 0),
      training:    filteredData.reduce((s, r) => s + (r.training_cost || 0), 0),
      other:       filteredData.reduce((s, r) => s + (r.other_cost || 0), 0),
    };
    const total = Object.values(totals).reduce((s, v) => s + v, 0);
    const CATS = [
      { key: 'labor',       name: '인건비',    color: HQ.accent    },
      { key: 'material',    name: '자재·농약', color: T.warning    },
      { key: 'energy',      name: '에너지',    color: T.success    },
      { key: 'maintenance', name: '유지보수',  color: T.info       },
      { key: 'training',    name: '교육·안전', color: T.primary    },
      { key: 'other',       name: '기타',      color: T.mutedSoft  },
    ];
    return CATS
      .map(c => ({ ...c, value: totals[c.key], pct: total > 0 ? (totals[c.key] / total * 100).toFixed(1) : '0.0' }))
      .filter(d => d.value > 0);
  }, [filteredData]);

  // 예산 집행률 (filteredData 비용 vs budgets)
  const budgetExecData = useMemo(() => {
    const CATS = [
      { key: 'labor',       label: '인건비' },
      { key: 'material',    label: '자재·농약' },
      { key: 'energy',      label: '에너지 (전력·난방)' },
      { key: 'maintenance', label: '시설 유지보수' },
      { key: 'training',    label: '교육·안전' },
    ];
    const usedMap = {
      labor:       filteredData.reduce((s, r) => s + (r.labor_cost || 0), 0),
      material:    filteredData.reduce((s, r) => s + (r.material_cost || 0), 0),
      energy:      filteredData.reduce((s, r) => s + (r.energy_cost || 0), 0),
      maintenance: filteredData.reduce((s, r) => s + (r.maintenance_cost || 0), 0),
      training:    filteredData.reduce((s, r) => s + (r.training_cost || 0), 0),
    };
    const bMap = {};
    budgets.filter(b => b.year === budgetYear).forEach(b => {
      bMap[b.category] = (bMap[b.category] || 0) + (b.budget_amount || 0);
    });
    return CATS.map(({ key, label }) => {
      const used = usedMap[key] || 0;
      const budget = bMap[key] || 0;
      const pct = budget > 0 ? Math.round(used / budget * 100) : null;
      const over = pct !== null && pct > 100;
      const tone = pct === null ? T.mutedSoft : over ? T.danger : pct > 80 ? T.warning : T.success;
      return { label, used, budget, pct, tone, over };
    });
  }, [filteredData, budgets, budgetYear]);

  const kpiCards = loading
    ? [
        { l: '누적 수확액',   v: '…', u: '', sub: '로딩 중…', tone: T.success,   bg: T.successSoft, trend: '…' },
        { l: '누적 인건비',   v: '…', u: '', sub: '로딩 중…', tone: T.warning,   bg: T.warningSoft, trend: '…' },
        { l: '영업 이익률',   v: '…', u: '', sub: '로딩 중…', tone: HQ.accent,   bg: HQ.accentSoft, trend: '…' },
        { l: 'kg당 생산원가', v: '—', u: '', sub: 'Phase 2 예정', tone: T.mutedSoft, bg: T.borderSoft, trend: 'P2' },
      ]
    : [
        {
          l: '누적 수확액',
          v: totalRevenue >= 100000000
            ? (totalRevenue / 100000000).toFixed(1)
            : Math.round(totalRevenue / 10000).toLocaleString(),
          u: totalRevenue >= 100000000 ? '억원' : '만원',
          sub: `${filteredData.length}개월 합산 매출`,
          tone: T.success, bg: T.successSoft,
          trend: totalRevenue >= 100000000
            ? `${(totalRevenue / 100000000).toFixed(1)}억`
            : `${Math.round(totalRevenue / 10000).toLocaleString()}만`,
        },
        {
          l: '누적 인건비',
          v: Math.round(totalLabor / 10000).toLocaleString(),
          u: '만원',
          sub: laborExecPct !== null
            ? `예산 ${Math.round(laborBudget / 10000).toLocaleString()}만원 · ${laborExecPct}%`
            : '예산 미등록',
          tone: T.warning, bg: T.warningSoft,
          trend: `${Math.round(totalLabor / 10000).toLocaleString()}만`,
        },
        {
          l: '영업 이익률',
          v: profitRate,
          u: profitRate !== '—' ? '%' : '',
          sub: totalRevenue > 0
            ? `수익 ${Math.round((totalRevenue - totalCost) / 10000).toLocaleString()}만원`
            : '데이터 없음',
          tone: HQ.accent, bg: HQ.accentSoft,
          trend: profitRate !== '—' ? `${profitRate}%` : '—',
        },
        {
          l: 'kg당 생산원가',
          v: costPerKg !== null ? costPerKg.toLocaleString() : '—',
          u: costPerKg !== null ? '원/kg' : '',
          sub: costPerKg !== null
            ? `총 ${Math.round(totalHarvestKg).toLocaleString()}kg 기준`
            : '수확 데이터 없음',
          tone: T.info, bg: T.infoSoft,
          trend: costPerKg !== null ? `${costPerKg.toLocaleString()}원` : '—',
        },
      ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <HQPageHeader
        subtitle="본사 · 재무 및 운영 지표"
        title="경영 지표"
        actions={
          <>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 0, padding: 3,
              background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12, fontWeight: 600,
            }}>
              {['MTD', 'QTD', 'YTD', '2025'].map(p => {
                const on = period === p;
                return (
                  <button key={p} onClick={() => setPeriod(p)} style={{
                    padding: '5px 12px', borderRadius: 5, border: 0, cursor: 'pointer',
                    background: on ? T.surface : 'transparent', color: on ? T.text : T.mutedSoft,
                    boxShadow: on ? '0 1px 2px rgba(0,0,0,0.06)' : 'none', fontWeight: 600,
                  }}>{p}</button>
                );
              })}
            </div>
            {btnSecondary('PDF 내보내기', icons.chart, () => alert('재무 PDF 내보내기 기능 준비 중입니다.'))}
            {/* BACKLOG: HQ-FINANCE-PDF-EXPORT-001 */}
          </>
        }
      />
      <div style={{ flex: 1, overflow: 'auto', padding: 24, background: T.bg, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* 핵심 KPI — Phase 1: 수확액/인건비/이익률 실데이터, kg당 원가 Phase 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {kpiCards.map((k, i) => (
            <Card key={i} pad={18} style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.tone }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>{k.l}</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', background: k.bg, color: k.tone, borderRadius: 4 }}>{k.trend}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: T.text, letterSpacing: -0.8, lineHeight: 1 }}>{k.v}</span>
                <span style={{ fontSize: 13, color: T.mutedSoft, fontWeight: 500 }}>{k.u}</span>
              </div>
              <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 8 }}>{k.sub}</div>
            </Card>
          ))}
        </div>

        {/* 2단 차트 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* 수확액 vs 인건비 */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>월별 수확액 vs 인건비</h3>
                <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 11 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: HQ.accent, display: 'inline-block' }} />
                    <span style={{ color: T.muted, fontWeight: 600 }}>수확액</span>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 10, height: 2, background: T.warning, display: 'inline-block' }} />
                    <span style={{ color: T.muted, fontWeight: 600 }}>인건비</span>
                  </span>
                </div>
              </div>
            </div>
            <div style={{ height: 186 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyChartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.borderSoft} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: T.mutedSoft }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}억` : `${v}만`}
                    tick={{ fontSize: 10, fill: T.mutedSoft }} axisLine={false} tickLine={false}
                  />
                  <Tooltip
                    formatter={(v, name) => [`${v.toLocaleString()}만원`, name === 'revenue' ? '수확액' : '인건비']}
                    contentStyle={{ fontSize: 11, borderRadius: 6, border: `1px solid ${T.border}` }}
                  />
                  <Bar dataKey="revenue" fill={HQ.accent} radius={[3, 3, 0, 0]} maxBarSize={32} opacity={0.85} />
                  <Line dataKey="labor" stroke={T.warning} strokeWidth={2} dot={{ r: 3, fill: T.warning, strokeWidth: 0 }} strokeDasharray="4 3" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* 지점별 수익성 */}
          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0, marginBottom: 16 }}>지점별 수익성 ({period})</h3>
            {branchProfitData.length === 0 ? (
              <div style={{ textAlign: 'center', color: T.mutedSoft, fontSize: 12, padding: 24 }}>해당 기간 데이터 없음</div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {branchProfitData.map((b) => {
                    const revDisplay = b.revenue >= 100000000
                      ? `${(b.revenue / 100000000).toFixed(1)}억`
                      : `${Math.round(b.revenue / 10000).toLocaleString()}만`;
                    const costPctNum = parseFloat(b.costPct);
                    return (
                      <div key={b.code}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Dot c={b.c} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{b.name}</span>
                            <span style={{ fontSize: 11, color: T.mutedSoft }}>수익 {revDisplay}</span>
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{b.profit}%</span>
                        </div>
                        <div style={{ height: 24, background: T.bg, borderRadius: 6, overflow: 'hidden', display: 'flex' }}>
                          <div style={{ width: `${Math.min(costPctNum, 100)}%`, background: `${T.warning}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: T.warning, fontWeight: 700 }}>원가 {b.costPct}%</div>
                          <div style={{ flex: 1, background: `${b.c}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: T.text, fontWeight: 700 }}>이익 {b.profit}%</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.borderSoft}`, fontSize: 11, color: T.muted, lineHeight: 1.6 }}>
                  <strong style={{ color: T.text }}>인사이트:</strong>{' '}
                  {(() => {
                    const top = branchProfitData.reduce((a, b) => parseFloat(a.costPct) > parseFloat(b.costPct) ? a : b, branchProfitData[0]);
                    return parseFloat(top.costPct) > 70
                      ? `${top.name}의 원가율이 ${top.costPct}%로 가장 높음.`
                      : '전 지점 원가율 양호.';
                  })()}
                </div>
              </>
            )}
          </Card>
        </div>

        {/* 비용 구조 + 예산 집행률 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
          {/* 비용 구조 (도넛) */}
          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0, marginBottom: 16 }}>비용 구조</h3>
            {costStructureData.length === 0 ? (
              <div style={{ textAlign: 'center', color: T.mutedSoft, fontSize: 12, padding: 24 }}>데이터 없음</div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 120, height: 120, flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={costStructureData} cx="50%" cy="50%" innerRadius={32} outerRadius={52}
                        dataKey="value" paddingAngle={2} startAngle={90} endAngle={-270}>
                        {costStructureData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip
                        formatter={(v) => [`${Math.round(v / 10000).toLocaleString()}만원`]}
                        contentStyle={{ fontSize: 10, borderRadius: 6, border: `1px solid ${T.border}` }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11 }}>
                  {costStructureData.map((d) => {
                    const amt = d.value >= 100000000
                      ? `${(d.value / 100000000).toFixed(2)}억`
                      : `${Math.round(d.value / 10000).toLocaleString()}만`;
                    return (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Dot c={d.color} />
                        <span style={{ flex: 1, color: T.muted }}>{d.name}</span>
                        <span style={{ fontWeight: 700, color: T.text }}>{d.pct}%</span>
                        <span style={{ color: T.mutedSoft, width: 50, textAlign: 'right' }}>{amt}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          {/* 예산 집행률 (예산 항목별) */}
          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0, marginBottom: 16 }}>예산 집행률 ({period})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {budgetExecData.map((row) => (
                <div key={row.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{row.label}</span>
                      {row.over && <Pill tone="danger" size="sm">초과</Pill>}
                    </div>
                    <span style={{ fontSize: 11, color: T.mutedSoft }}>
                      {row.budget > 0 ? (
                        <>
                          <span style={{ fontWeight: 700, color: T.text }}>{Math.round(row.used / 10000).toLocaleString()}</span>
                          {' '}/ {Math.round(row.budget / 10000).toLocaleString()}만원
                          {row.pct !== null && <span style={{ marginLeft: 6, color: row.tone, fontWeight: 700 }}>{row.pct}%</span>}
                        </>
                      ) : (
                        <span>{Math.round(row.used / 10000).toLocaleString()}만원 (예산 미등록)</span>
                      )}
                    </span>
                  </div>
                  <div style={{ height: 8, background: T.borderSoft, borderRadius: 999, overflow: 'hidden', position: 'relative' }}>
                    <div style={{
                      width: row.pct !== null ? `${Math.min(row.pct, 100)}%` : '0%',
                      height: '100%', background: row.tone,
                    }} />
                    {row.over && (
                      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 3, background: T.danger }} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ⑥ 이상 신고 — HQ-ISSUE-PAGE-001
// ─────────────────────────────────────────────────────────────
const TYPE_META = {
  병해충:  { tone: 'danger',  color: T.danger,  soft: T.dangerSoft  },
  시설이상: { tone: 'warning', color: T.warning, soft: T.warningSoft },
  작물이상: { tone: 'info',    color: T.info,    soft: T.infoSoft    },
  기타:    { tone: 'default', color: T.muted,   soft: T.bg          },
};

const fmtAgo = (iso) => {
  if (!iso) return '';
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 60) return `${m}분 전`;
  if (m < 1440) return `${Math.floor(m / 60)}시간 전`;
  return `${Math.floor(m / 1440)}일 전`;
};

function HQIssuesScreen() {
  const currentUser   = useAuthStore((s) => s.currentUser);
  const employees     = useEmployeeStore((s) => s.employees);
  const [issues, setIssues]   = useState([]);
  const [zones, setZones]     = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('open');
  const [resolving, setResolving] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [{ data: issueData }, { data: zoneData }] = await Promise.all([
        supabase.from('issues').select('*').order('created_at', { ascending: false }),
        supabase.from('zones').select('id, name'),
      ]);
      if (issueData) setIssues(issueData.map((r) => ({
        id: r.id, workerId: r.worker_id, zoneId: r.zone_id,
        type: r.type, comment: r.comment, isResolved: r.is_resolved,
        resolvedBy: r.resolved_by, createdAt: r.created_at,
      })));
      if (zoneData) setZones(Object.fromEntries(zoneData.map((z) => [z.id, z.name])));
      setLoading(false);
    }
    load();
  }, []);

  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);

  const counts = useMemo(() => ({
    open: issues.filter((i) => !i.isResolved).length,
    resolved: issues.filter((i) => i.isResolved).length,
    total: issues.length,
    병해충: issues.filter((i) => !i.isResolved && i.type === '병해충').length,
  }), [issues]);

  const displayed = useMemo(() => {
    if (filter === 'open') return issues.filter((i) => !i.isResolved);
    if (filter === 'resolved') return issues.filter((i) => i.isResolved);
    return issues;
  }, [issues, filter]);

  const handleResolve = async (id) => {
    setResolving(id);
    const { data } = await supabase.from('issues').update({
      is_resolved: true,
      resolved_by: currentUser?.id,
      resolved_at: new Date().toISOString(),
    }).eq('id', id).select().single();
    if (data) setIssues((prev) => prev.map((i) => i.id === id ? { ...i, isResolved: true } : i));
    setResolving(null);
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, minWidth: 0 }}>
      <HQPageHeader subtitle="안전 · 이상 관리" title="전 지점 이상 신고" />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* KPI 카드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { l: '미해결', v: counts.open, tone: T.danger, soft: T.dangerSoft },
            { l: '해결됨', v: counts.resolved, tone: T.success, soft: T.successSoft },
            { l: '전체', v: counts.total, tone: HQ.accent, soft: HQ.accentSoft },
            { l: '병해충 미해결', v: counts.병해충, tone: T.warning, soft: T.warningSoft },
          ].map((k, i) => (
            <Card key={i} pad={18} style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.tone }} />
              <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginBottom: 14 }}>{k.l}</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: T.text, letterSpacing: -1, lineHeight: 1 }}>{k.v}</div>
              <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 8 }}>건</div>
            </Card>
          ))}
        </div>

        {/* 목록 카드 */}
        <Card pad={0}>
          <div style={{
            padding: '14px 20px', borderBottom: `1px solid ${T.borderSoft}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {[['open', '미해결'], ['resolved', '해결됨'], ['all', '전체']].map(([v, l]) => {
                const on = filter === v;
                return (
                  <span key={v} onClick={() => setFilter(v)} style={{
                    padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: on ? HQ.accentSoft : 'transparent',
                    color: on ? HQ.accentText : T.mutedSoft,
                    boxShadow: on ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  }}>{l}</span>
                );
              })}
            </div>
            <span style={{ fontSize: 12, color: T.mutedSoft }}>{displayed.length}건</span>
          </div>

          {loading ? (
            <div style={{ padding: 60, textAlign: 'center', color: T.mutedSoft, fontSize: 13 }}>로딩 중...</div>
          ) : displayed.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: T.mutedSoft, fontSize: 13 }}>
              {filter === 'open' ? '미해결 이슈 없음' : '신고 내역이 없습니다'}
            </div>
          ) : displayed.map((it, idx) => {
            const emp = empMap[it.workerId];
            const branch = emp ? (BRANCH_META[emp.branch] || { name: emp.branch, dot: T.muted }) : null;
            const tm = TYPE_META[it.type] || TYPE_META['기타'];
            return (
              <div key={it.id} style={{
                padding: '16px 20px',
                borderTop: idx ? `1px solid ${T.borderSoft}` : 'none',
                borderLeft: it.type === '병해충' && !it.isResolved ? `3px solid ${T.danger}` : '3px solid transparent',
                background: it.type === '병해충' && !it.isResolved ? 'rgba(220,38,38,0.02)' : T.surface,
                display: 'flex', alignItems: 'flex-start', gap: 14,
                opacity: it.isResolved ? 0.65 : 1,
              }}>
                <Avatar name={emp?.name?.[0] || '?'} color={it.isResolved ? 'slate' : 'rose'} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                      background: tm.soft, color: tm.color,
                    }}>{it.type}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{emp?.name || '알 수 없음'}</span>
                    {branch && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Dot c={branch.dot} />
                        <span style={{ fontSize: 11, color: T.muted }}>{branch.name}</span>
                      </span>
                    )}
                    {zones[it.zoneId] && (
                      <span style={{ fontSize: 11, color: T.mutedSoft }}>· {zones[it.zoneId]}</span>
                    )}
                    <span style={{ fontSize: 11, color: T.mutedSoft, marginLeft: 'auto' }}>{fmtAgo(it.createdAt)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>{it.comment || '—'}</div>
                </div>
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {it.isResolved ? (
                    <Pill tone="success"><Dot c={T.success} />해결됨</Pill>
                  ) : (
                    <button
                      onClick={() => handleResolve(it.id)}
                      disabled={resolving === it.id}
                      style={{
                        height: 30, padding: '0 14px', borderRadius: 6, border: 0,
                        background: resolving === it.id ? T.borderSoft : T.success,
                        color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      }}>
                      {resolving === it.id ? '처리 중…' : '해결 완료'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}

export { HQPageHeader, HQApprovalsScreen, HQBranchesScreen, HQEmployeesScreen, HQFinanceScreen, HQNoticesScreen, HQIssuesScreen };

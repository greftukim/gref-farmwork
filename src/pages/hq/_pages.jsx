import React, { useState, useMemo } from 'react';
import { HQ } from '../../design/hq-shell';
import { Avatar, Card, Dot, Icon, Pill, T, btnPrimary, btnSecondary, icons } from '../../design/primitives';
import useLeaveStore from '../../stores/leaveStore';
import useOvertimeStore from '../../stores/overtimeStore';
import useEmployeeStore from '../../stores/employeeStore';
import useAuthStore from '../../stores/authStore';

// 관리팀(HQ) 나머지 5개 페이지
// ① 승인 허브  ② 지점 관리  ③ 전사 직원  ④ 공지·정책  ⑤ 경영 지표

// ─────── 공유 상수 / 헬퍼 ───────
const BRANCH_KO = { busan: '부산LAB', jinju: '진주HUB', hadong: '하동HUB' };
const BRANCH_COLOR = { busan: T.primary, jinju: T.success, hadong: T.warning };
const ROLE_SHORT = { farm_admin: '지점장', supervisor: '반장', worker: '작업자', hr_admin: 'HR', master: '총괄', general: '총괄' };
const LEAVE_TYPE_KO = { 연차: '연차 신청', 오전반차: '오전 반차 신청', 오후반차: '오후 반차 신청', 출장: '출장 신청', 대휴: '대휴 신청' };
const CONTRACT_KO = { regular: '정규', contract: '계약', temporary: '임시', temp: '임시' };
const CONTRACT_TONE = { 정규: 'success', 계약: 'info', 임시: 'muted' };
const FARM_BRANCHES = ['busan', 'jinju', 'hadong'];

function timeAgoHQ(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 172800) return '어제';
  return `${Math.floor(diff / 86400)}일 전`;
}

const STATIC_PENDING = [
  { id: 's1', _kind: 'static', status: 'pending', branch: '하동HUB', bc: T.warning, name: '최책임', role: '지점장', tag: '예산', tagTone: 'warning', type: '설비 구매 요청', detail: '환기팬 2대 (B동, C동 각 1대)', amount: '480만원', time: '42분 전', urgent: true },
  { id: 's2', _kind: 'static', status: 'pending', branch: '진주HUB', bc: T.success, name: '박지점', role: '지점장', tag: '인사', tagTone: 'info', type: '신규 작업자 등록', detail: '임시 3명 · 5/1 ~ 5/31', amount: '', time: '1시간 전', urgent: false },
  { id: 's3', _kind: 'static', status: 'pending', branch: '부산LAB', bc: T.primary, name: '김재배', role: '지점장', tag: '자재', tagTone: 'success', type: '농약 재고 발주', detail: '토마토 응애용 살충제 10L', amount: '120만원', time: '2시간 전', urgent: false },
  { id: 's4', _kind: 'static', status: 'pending', branch: '진주HUB', bc: T.success, name: '박지점', role: '지점장', tag: '예산', tagTone: 'warning', type: '비료 추가 발주', detail: '유박비료 500kg', amount: '340만원', time: '4시간 전', urgent: false },
  { id: 's5', _kind: 'static', status: 'pending', branch: '부산LAB', bc: T.primary, name: '김재배', role: '지점장', tag: '인사', tagTone: 'info', type: '계약직 재계약', detail: '홍길순, 김영수 · 7/1 시행', amount: '', time: '5시간 전', urgent: false },
  { id: 's6', _kind: 'static', status: 'pending', branch: '하동HUB', bc: T.warning, name: '최책임', role: '지점장', tag: '자재', tagTone: 'success', type: '포장재 발주', detail: '방울토마토용 500g 박스 2000개', amount: '210만원', time: '어제', urgent: false },
];

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
  const [approvalError, setApprovalError] = useState(null);

  const currentUser = useAuthStore(s => s.currentUser);
  const leaveRequests = useLeaveStore(s => s.requests);
  const farmReview = useLeaveStore(s => s.farmReview);
  const otRequests = useOvertimeStore(s => s.requests);
  const approveOT = useOvertimeStore(s => s.approveRequest);
  const rejectOT = useOvertimeStore(s => s.rejectRequest);
  const employees = useEmployeeStore(s => s.employees);

  const empMap = useMemo(() => Object.fromEntries(employees.map(e => [e.id, e])), [employees]);

  const realItems = useMemo(() => {
    const leaveItems = leaveRequests.map(r => {
      const emp = empMap[r.employeeId] || {};
      return {
        id: `leave_${r.id}`, _id: r.id, _kind: 'leave',
        status: r.status,
        branch: BRANCH_KO[emp.branch] || '—',
        bc: BRANCH_COLOR[emp.branch] || T.text,
        name: emp.name || '—',
        role: ROLE_SHORT[emp.role] || '직원',
        tag: '근태', tagTone: 'primary',
        type: LEAVE_TYPE_KO[r.type] || '휴가 신청',
        detail: r.date ? `${r.date.slice(5).replace('-', '/')} · ${r.reason || r.type || ''}` : '',
        amount: '',
        time: timeAgoHQ(r.createdAt),
        urgent: false,
      };
    });
    const otItems = otRequests.map(r => {
      const emp = empMap[r.employeeId] || {};
      const totalMin = (r.hours || 0) * 60 + (r.minutes || 0);
      const hStr = totalMin >= 60 ? `${Math.floor(totalMin / 60)}시간` : '';
      const mStr = totalMin % 60 ? ` ${totalMin % 60}분` : '';
      return {
        id: `ot_${r.id}`, _id: r.id, _kind: 'ot',
        status: r.status,
        branch: BRANCH_KO[emp.branch] || '—',
        bc: BRANCH_COLOR[emp.branch] || T.text,
        name: emp.name || '—',
        role: ROLE_SHORT[emp.role] || '직원',
        tag: '근태', tagTone: 'primary',
        type: '연장근무 승인',
        detail: r.date ? `${r.date.slice(5).replace('-', '/')} · ${hStr}${mStr}` : '',
        amount: '',
        time: timeAgoHQ(r.createdAt),
        urgent: false,
      };
    });
    return [...leaveItems, ...otItems];
  }, [leaveRequests, otRequests, empMap]);

  const pendingItems = [...realItems.filter(i => i.status === 'pending'), ...STATIC_PENDING];
  const approvedItems = realItems.filter(i => i.status === 'approved');
  const rejectedItems = realItems.filter(i => i.status === 'rejected');
  const urgentCount = pendingItems.filter(i => i.urgent).length;

  const tabItems = tab === 'pending' ? pendingItems : tab === 'approved' ? approvedItems : tab === 'rejected' ? rejectedItems : [];

  let filtered = tabItems;
  if (filter.branch !== 'all') filtered = filtered.filter(i => i.branch === filter.branch);
  if (filter.type !== 'all') filtered = filtered.filter(i => i.tag === filter.type);

  const toggle = (id) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };
  const toggleAll = () => setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(i => i.id)));

  const handleApprove = async (item) => {
    if (item._kind === 'static') return;
    setApprovalError(null);
    if (item._kind === 'leave') {
      const ok = await farmReview(item._id, true, currentUser?.id);
      if (!ok) setApprovalError('권한 없음 또는 서버 오류. 마스터 계정으로 로그인하세요.');
    } else if (item._kind === 'ot') {
      const { error } = await approveOT(item._id, currentUser?.id);
      if (error) setApprovalError('권한 없음 또는 서버 오류. 마스터 계정으로 로그인하세요.');
    }
  };

  const handleReject = async (item) => {
    if (item._kind === 'static') return;
    setApprovalError(null);
    if (item._kind === 'leave') {
      const ok = await farmReview(item._id, false, currentUser?.id);
      if (!ok) setApprovalError('권한 없음 또는 서버 오류. 마스터 계정으로 로그인하세요.');
    } else if (item._kind === 'ot') {
      const { error } = await rejectOT(item._id, currentUser?.id);
      if (error) setApprovalError('권한 없음 또는 서버 오류. 마스터 계정으로 로그인하세요.');
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <HQPageHeader
        subtitle="본사 · 지점장 요청 관리"
        title="승인 허브"
        actions={<>{btnSecondary('내보내기', icons.chart)}{btnPrimary('규칙 설정', icons.settings)}</>}
        tabs={[
          { id: 'pending', label: '대기 중', count: pendingItems.length },
          { id: 'approved', label: '승인됨', count: approvedItems.length },
          { id: 'rejected', label: '반려', count: rejectedItems.length },
          { id: 'rules', label: '승인 규칙' },
        ]}
        activeTab={tab}
        onTab={setTab}
      />

      <div style={{ flex: 1, overflow: 'auto', padding: 24, background: T.bg, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* 요약 KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { l: '대기 중', v: pendingItems.length, sub: `긴급 ${urgentCount}건 포함`, tone: T.warning, bg: T.warningSoft },
            { l: '긴급', v: urgentCount, sub: urgentCount > 0 ? '즉시 처리 필요' : '없음', tone: T.danger, bg: T.dangerSoft },
            { l: '이번 주 승인액', v: '1,840만원', sub: '예산 대비 22%', tone: HQ.accent, bg: HQ.accentSoft },
            { l: '평균 처리 시간', v: '3.2h', sub: '▼ 전주 대비 -0.4h', tone: T.success, bg: T.successSoft },
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

        {approvalError && (
          <div style={{ padding: '10px 14px', background: T.dangerSoft, borderRadius: 8, fontSize: 12, color: T.danger, fontWeight: 600 }}>
            {approvalError}
          </div>
        )}

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
                <button style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, color: T.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>일괄 반려</button>
                <button style={{ padding: '6px 12px', borderRadius: 6, border: 0, background: HQ.accent, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>일괄 승인</button>
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
              {filtered.map(r => (
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
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button onClick={() => handleReject(r)} style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, color: T.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>반려</button>
                      <button onClick={() => handleApprove(r)} style={{ padding: '5px 12px', borderRadius: 6, border: 0, background: HQ.accent, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>승인</button>
                      <button style={{ padding: '5px 8px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, color: T.mutedSoft, fontSize: 11, cursor: 'pointer' }}>⋯</button>
                    </div>
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
  const branches = [
    { code: 'busan', name: '부산LAB', short: 'BL', mgr: '김재배', phone: '051-***-1234', address: '부산광역시 강서구 녹산산업로', workers: 20, rate: 90, harvest: 1240, harvestT: 1200, crops: '토마토 · 딸기 · 파프리카', area: '12,400㎡', accent: T.primary, accentSoft: T.primarySoft, status: 'active', est: '2021.03', lastVisit: '4/15' },
    { code: 'jinju', name: '진주HUB', short: 'JJ', mgr: '박지점', phone: '055-***-5678', address: '경상남도 진주시 문산읍', workers: 14, rate: 93, harvest: 980, harvestT: 1100, crops: '오이 · 애호박', area: '8,200㎡', accent: T.success, accentSoft: T.successSoft, status: 'active', est: '2023.05', lastVisit: '4/08' },
    { code: 'hadong', name: '하동HUB', short: 'HD', mgr: '최책임', phone: '055-***-9012', address: '경상남도 하동군 악양면', workers: 12, rate: 83, harvest: 760, harvestT: 950, crops: '방울토마토 · 고추', area: '6,800㎡', accent: T.warning, accentSoft: T.warningSoft, status: 'alert', est: '2024.02', lastVisit: '3/28' },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <HQPageHeader
        subtitle="본사 · 다지점 운영"
        title="지점 관리"
        actions={<>{btnSecondary('지도로 보기', icons.location)}{btnPrimary('지점 추가', icons.plus)}</>}
      />
      <div style={{ flex: 1, overflow: 'auto', padding: 24, background: T.bg, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* 전사 요약 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { l: '운영 지점', v: 3, u: '개', sub: '본사 1 + 지점 2' },
            { l: '총 재배면적', v: '27,400', u: '㎡', sub: '약 8,300평' },
            { l: '총 인원', v: 46, u: '명', sub: '지점장 3 + 작업자 43' },
            { l: '월 수확량', v: '2,980', u: 'kg', sub: '목표 3,250kg · 92%' },
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
                    <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 2 }}>설립 {b.est} · 최근 방문 {b.lastVisit}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {b.status === 'alert' ? <Pill tone="warning">주의</Pill> : <Pill tone="success">정상</Pill>}
                  <button style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, color: T.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>상세 →</button>
                </div>
              </div>

              {/* 바디 */}
              <div style={{ padding: 20 }}>
                {/* 지점장 카드 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: T.bg, borderRadius: 8, marginBottom: 14 }}>
                  <Avatar name={b.mgr[0]} size={40} c={b.code === 'busan' ? 'blue' : b.code === 'jinju' ? 'emerald' : 'amber'} />
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
                    { l: '달성', v: Math.round(b.harvest / b.harvestT * 100), u: '%' },
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
  const employees = useEmployeeStore(s => s.employees);

  const ROLE_KO_FULL = { farm_admin: '지점장', supervisor: '반장', worker: '작업자', hr_admin: 'HR 관리', master: '총괄', general: '총괄' };
  const AVATAR_COLOR = { busan: 'blue', jinju: 'emerald', hadong: 'amber' };

  const busanCount = employees.filter(e => e.branch === 'busan').length;
  const jinjuCount = employees.filter(e => e.branch === 'jinju').length;
  const hadongCount = employees.filter(e => e.branch === 'hadong').length;
  const hqCount = employees.filter(e => !FARM_BRANCHES.includes(e.branch)).length;

  const tabFiltered = employees.filter(e => {
    if (tab === 'all') return true;
    if (tab === 'hq') return !FARM_BRANCHES.includes(e.branch);
    return e.branch === tab;
  });

  const activeCount = employees.filter(e => e.isActive !== false).length;
  const leaveCount = employees.filter(e => e.isActive === false).length;
  const regularCount = employees.filter(e => e.contractType === 'regular').length;
  const nonRegularCount = employees.length - regularCount;

  const fmtJoined = (d) => {
    if (!d) return '—';
    const s = String(d);
    return s.length >= 7 ? s.slice(0, 7).replace('-', '.') : s;
  };

  const page = tabFiltered.slice(0, 10);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <HQPageHeader
        subtitle="본사 · 전 지점 통합"
        title="전사 직원"
        actions={<>{btnSecondary('CSV 내보내기', icons.chart)}{btnPrimary('직원 추가', icons.plus)}</>}
        tabs={[
          { id: 'all', label: '전체', count: employees.length },
          { id: 'busan', label: '부산LAB', count: busanCount },
          { id: 'jinju', label: '진주HUB', count: jinjuCount },
          { id: 'hadong', label: '하동HUB', count: hadongCount },
          { id: 'hq', label: '본사', count: hqCount },
        ]}
        activeTab={tab}
        onTab={setTab}
      />
      <div style={{ flex: 1, overflow: 'auto', padding: 24, background: T.bg, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { l: '총 인원', v: employees.length, u: '명', sub: `활성 ${activeCount} · 비활성 ${leaveCount}` },
            { l: '정규직', v: regularCount, u: '명', sub: employees.length > 0 ? `${Math.round(regularCount / employees.length * 100)}%` : '—' },
            { l: '계약/임시', v: nonRegularCount, u: '명', sub: employees.length > 0 ? `${Math.round(nonRegularCount / employees.length * 100)}%` : '—' },
            { l: '이번 달 입사', v: 4, u: '명', sub: '퇴사 1건' },
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
              <span style={{ fontSize: 12, color: T.mutedSoft }}>이름, 연락처로 검색</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['전체', '정규', '계약', '임시'].map((t, i) => (
                <button key={t} style={{
                  padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${i === 0 ? HQ.accent : T.border}`,
                  background: i === 0 ? HQ.accentSoft : T.surface,
                  color: i === 0 ? HQ.accentText : T.muted,
                }}>{t}</button>
              ))}
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: T.bg, borderBottom: `1px solid ${T.border}` }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.muted }}>직원</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.muted }}>지점</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.muted }}>직책</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.muted }}>고용형태</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.muted }}>입사일</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.muted }}>상태</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: T.muted, width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {page.map((e, i) => {
                const branchKo = BRANCH_KO[e.branch] || (e.branch ? e.branch : '본사');
                const bc = BRANCH_COLOR[e.branch] || T.text;
                const roleKo = ROLE_KO_FULL[e.role] || e.role || '직원';
                const contractKo = CONTRACT_KO[e.contractType] || e.contractType || '—';
                const contractTone = CONTRACT_TONE[contractKo] || 'muted';
                const avatarColor = AVATAR_COLOR[e.branch] || 'slate';
                const isActive = e.isActive !== false;
                return (
                  <tr key={e.id || i} style={{ borderBottom: `1px solid ${T.borderSoft}` }}>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={(e.name || '?')[0]} size={32} c={avatarColor} />
                        <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{e.name}</div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.text, fontWeight: 500 }}>
                        <Dot c={bc} />{branchKo}
                      </div>
                    </td>
                    <td style={{ padding: '10px 8px', fontSize: 12, color: T.muted }}>
                      {e.role === 'master' || e.role === 'farm_admin' ? <Pill tone="primary" size="sm">{roleKo}</Pill> : roleKo}
                    </td>
                    <td style={{ padding: '10px 8px', fontSize: 12, color: T.muted }}>
                      <Pill tone={contractTone} size="sm">{contractKo}</Pill>
                    </td>
                    <td style={{ padding: '10px 8px', fontSize: 12, color: T.muted }}>{fmtJoined(e.hireDate)}</td>
                    <td style={{ padding: '10px 8px' }}>
                      {isActive ? <Pill tone="success" size="sm">재직</Pill> : <Pill tone="warning" size="sm">휴직</Pill>}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      <button style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, color: T.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>상세</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ padding: '12px 16px', borderTop: `1px solid ${T.borderSoft}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: T.mutedSoft }}>
            <span>총 {tabFiltered.length}명 중 1-{Math.min(10, tabFiltered.length)}</span>
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
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ④ 공지 · 정책
// ═══════════════════════════════════════════════════════════
function HQNoticesScreen() {
  const [tab, setTab] = useState('active');

  const notices = [
    { id: 1, tag: '전사 · 중요', tone: 'danger', pinned: true, title: '5월 안전교육 이수 필참 안내', body: '5월 1주차 중으로 안전교육을 이수해주세요. 미이수 시...', author: '이대한 · 총괄', target: '전 직원 60명', read: 42, readPct: 70, date: '4/18', expires: '5/07' },
    { id: 2, tag: '정책', tone: 'info', title: '2026년 연차 사용 가이드라인 개정', body: '연차 사용 정책이 일부 개정되었습니다. 붙임 문서를 확인...', author: '이대한 · 총괄', target: '전 직원 60명', read: 58, readPct: 97, date: '4/10', expires: '상시' },
    { id: 3, tag: '부산LAB', tone: 'primary', title: '금주 토요일 출근조 편성', body: '4/27(토) 수확 피크 대응을 위해 출근조를 편성합니다.', author: '김재배 · 부산LAB', target: '부산LAB 20명', read: 18, readPct: 90, date: '4/21', expires: '4/27' },
    { id: 4, tag: '하동HUB', tone: 'warning', title: '설비 점검일 연기', body: '예정되어 있던 환기 설비 점검이 1주일 연기됩니다.', author: '최책임 · 하동HUB', target: '하동HUB 12명', read: 8, readPct: 67, date: '4/19', expires: '5/02' },
    { id: 5, tag: '정책', tone: 'info', title: '업무용 메신저 사용 수칙', body: '사내 메신저 사용 시 유의사항 안내드립니다.', author: '이대한 · 총괄', target: '전 직원 60명', read: 60, readPct: 100, date: '3/28', expires: '상시' },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <HQPageHeader
        subtitle="본사 · 공지사항 및 사내 정책"
        title="공지 · 정책"
        actions={<>{btnSecondary('열람 리포트', icons.chart)}{btnPrimary('새 공지 작성', icons.plus)}</>}
        tabs={[
          { id: 'active', label: '활성', count: 8 },
          { id: 'scheduled', label: '예약됨', count: 2 },
          { id: 'expired', label: '만료', count: 24 },
          { id: 'templates', label: '템플릿' },
        ]}
        activeTab={tab}
        onTab={setTab}
      />
      <div style={{ flex: 1, overflow: 'auto', padding: 24, background: T.bg, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* 요약 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { l: '활성 공지', v: 8, u: '건', tone: HQ.accent, bg: HQ.accentSoft },
            { l: '중요/필참', v: 3, u: '건', tone: T.danger, bg: T.dangerSoft, sub: '미열람 18명' },
            { l: '평균 열람률', v: 83, u: '%', tone: T.success, bg: T.successSoft, sub: '목표 90%' },
            { l: '이달 발행', v: 14, u: '건', tone: T.text, bg: T.bg, sub: '전월 대비 +3' },
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
                    <div style={{ fontSize: 10, color: T.mutedSoft }}>{n.read} / {n.target.match(/\d+/)?.[0]}명 읽음</div>
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
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ⑤ 경영 지표
// ═══════════════════════════════════════════════════════════
function HQFinanceScreen() {
  const [period, setPeriod] = useState('YTD');
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
            {btnSecondary('PDF 내보내기', icons.chart)}
          </>
        }
      />
      <div style={{ flex: 1, overflow: 'auto', padding: 24, background: T.bg, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* 핵심 KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { l: '누적 수확액', v: '4.2', u: '억원', sub: '▲ 전년 대비 +18%', tone: T.success, bg: T.successSoft, trend: '+18%' },
            { l: '누적 인건비', v: '8,420', u: '만원', sub: '예산 9,200만원 · 91%', tone: T.warning, bg: T.warningSoft, trend: '−3.2%' },
            { l: '영업 이익률', v: 23.4, u: '%', sub: '▲ 전분기 대비 +2.1%p', tone: HQ.accent, bg: HQ.accentSoft, trend: '+2.1%p' },
            { l: 'kg당 생산원가', v: '2,740', u: '원', sub: '▼ 6% 개선', tone: T.success, bg: T.successSoft, trend: '▼ 6%' },
          ].map((k, i) => (
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
                    <span style={{ width: 10, height: 2, background: HQ.accent }} />
                    <span style={{ color: T.muted, fontWeight: 600 }}>수확액</span>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 10, height: 2, background: T.warning }} />
                    <span style={{ color: T.muted, fontWeight: 600 }}>인건비</span>
                  </span>
                </div>
              </div>
            </div>
            <div style={{ height: 180 }}>
              <svg viewBox="0 0 420 180" width="100%" height="180" preserveAspectRatio="none">
                {[0, 45, 90, 135, 180].map((y, i) => <line key={i} x1="0" y1={y} x2="420" y2={y} stroke={T.borderSoft} strokeWidth="1" />)}
                <path d="M 0,120 L 60,105 L 120,90 L 180,72 L 240,62 L 300,50 L 360,38 L 420,32 L 420,180 L 0,180 Z" fill={HQ.accentSoft} />
                <path d="M 0,120 L 60,105 L 120,90 L 180,72 L 240,62 L 300,50 L 360,38 L 420,32" fill="none" stroke={HQ.accent} strokeWidth="2.5" />
                <path d="M 0,128 L 60,122 L 120,115 L 180,108 L 240,102 L 300,92 L 360,82 L 420,76" fill="none" stroke={T.warning} strokeWidth="2" strokeDasharray="4 3" />
                <circle cx="420" cy="32" r="4" fill={HQ.accent} stroke="#fff" strokeWidth="2" />
                <circle cx="420" cy="76" r="4" fill={T.warning} stroke="#fff" strokeWidth="2" />
              </svg>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.mutedSoft, marginTop: 6 }}>
              {['10월', '11월', '12월', '1월', '2월', '3월', '4월'].map(m => <span key={m}>{m}</span>)}
            </div>
          </Card>

          {/* 지점별 수익성 */}
          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0, marginBottom: 16 }}>지점별 수익성 (YTD)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { name: '부산LAB', c: T.primary, revenue: '1.8억', cost: '58%', profit: 42 },
                { name: '진주HUB', c: T.success, revenue: '1.4억', cost: '62%', profit: 38 },
                { name: '하동HUB', c: T.warning, revenue: '1.0억', cost: '71%', profit: 29 },
              ].map((b) => (
                <div key={b.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Dot c={b.c} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{b.name}</span>
                      <span style={{ fontSize: 11, color: T.mutedSoft }}>수익 {b.revenue}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{b.profit}%</span>
                  </div>
                  <div style={{ height: 24, background: T.bg, borderRadius: 6, overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: b.cost, background: `${T.warning}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: T.warning, fontWeight: 700 }}>원가 {b.cost}</div>
                    <div style={{ flex: 1, background: `${b.c}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: T.text, fontWeight: 700 }}>이익 {b.profit}%</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.borderSoft}`, fontSize: 11, color: T.muted, lineHeight: 1.6 }}>
              <strong style={{ color: T.text }}>인사이트:</strong> 하동HUB의 원가율이 71%로 높음. 2025년 설립된 신규 지점 특성 반영. 2026년 하반기 정상화 목표.
            </div>
          </Card>
        </div>

        {/* 비용 구조 + 예산 집행률 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
          {/* 비용 구조 (도넛) */}
          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0, marginBottom: 16 }}>비용 구조</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <svg width="120" height="120" viewBox="0 0 42 42">
                <circle cx="21" cy="21" r="15.915" fill="none" stroke={T.borderSoft} strokeWidth="4" />
                <circle cx="21" cy="21" r="15.915" fill="none" stroke={HQ.accent} strokeWidth="4"
                  strokeDasharray="46 100" strokeDashoffset="25" transform="rotate(-90 21 21)" />
                <circle cx="21" cy="21" r="15.915" fill="none" stroke={T.warning} strokeWidth="4"
                  strokeDasharray="22 100" strokeDashoffset="-21" transform="rotate(-90 21 21)" />
                <circle cx="21" cy="21" r="15.915" fill="none" stroke={T.success} strokeWidth="4"
                  strokeDasharray="18 100" strokeDashoffset="-43" transform="rotate(-90 21 21)" />
                <circle cx="21" cy="21" r="15.915" fill="none" stroke={T.mutedSoft} strokeWidth="4"
                  strokeDasharray="14 100" strokeDashoffset="-61" transform="rotate(-90 21 21)" />
                <text x="21" y="20" fontSize="4" fill={T.text} textAnchor="middle" fontWeight="700">총 비용</text>
                <text x="21" y="25" fontSize="3" fill={T.mutedSoft} textAnchor="middle">3.22억</text>
              </svg>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11 }}>
                {[
                  { l: '인건비', v: '46%', c: HQ.accent, amt: '1.48억' },
                  { l: '자재·농약', v: '22%', c: T.warning, amt: '0.71억' },
                  { l: '에너지', v: '18%', c: T.success, amt: '0.58억' },
                  { l: '기타', v: '14%', c: T.mutedSoft, amt: '0.45억' },
                ].map((i) => (
                  <div key={i.l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Dot c={i.c} />
                    <span style={{ flex: 1, color: T.muted }}>{i.l}</span>
                    <span style={{ fontWeight: 700, color: T.text }}>{i.v}</span>
                    <span style={{ color: T.mutedSoft, width: 50, textAlign: 'right' }}>{i.amt}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* 예산 집행률 */}
          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0, marginBottom: 16 }}>예산 집행률 (YTD)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { l: '인건비', used: 1480, budget: 1600, tone: T.success },
                { l: '자재·농약', used: 710, budget: 750, tone: T.warning },
                { l: '에너지 (전력·난방)', used: 580, budget: 540, tone: T.danger, over: true },
                { l: '시설 유지보수', used: 240, budget: 400, tone: T.success },
                { l: '교육·안전', used: 120, budget: 200, tone: T.success },
              ].map((row) => {
                const pct = Math.round(row.used / row.budget * 100);
                return (
                  <div key={row.l}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{row.l}</span>
                        {row.over && <Pill tone="danger" size="sm">초과</Pill>}
                      </div>
                      <span style={{ fontSize: 11, color: T.mutedSoft }}>
                        <span style={{ fontWeight: 700, color: T.text }}>{row.used.toLocaleString()}</span> / {row.budget.toLocaleString()}만원
                        <span style={{ marginLeft: 6, color: row.tone, fontWeight: 700 }}>{pct}%</span>
                      </span>
                    </div>
                    <div style={{ height: 8, background: T.borderSoft, borderRadius: 999, overflow: 'hidden', position: 'relative' }}>
                      <div style={{
                        width: `${Math.min(pct, 100)}%`, height: '100%',
                        background: row.tone,
                      }} />
                      {pct > 100 && (
                        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 3, background: T.danger }} />
                      )}
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
export { HQApprovalsScreen, HQBranchesScreen, HQEmployeesScreen, HQFinanceScreen, HQNoticesScreen };

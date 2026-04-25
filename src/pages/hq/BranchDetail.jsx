import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { T, Card, Pill, Dot, Icon, icons, Avatar, btnSecondary } from '../../design/primitives';
import { HQPageHeader } from './_pages';
import useEmployeeStore from '../../stores/employeeStore';
import useHarvestStore from '../../stores/harvestStore';
import useSafetyCheckStore from '../../stores/safetyCheckStore';
import { supabase } from '../../lib/supabase';

const BRANCH_META = {
  busan:  { name: '부산LAB', accent: T.primary,  accentSoft: T.primarySoft,  short: 'BL', avatarC: 'blue' },
  jinju:  { name: '진주HUB', accent: T.success,  accentSoft: T.successSoft,  short: 'JJ', avatarC: 'emerald' },
  hadong: { name: '하동HUB', accent: T.warning,  accentSoft: T.warningSoft,  short: 'HD', avatarC: 'amber' },
};

const won = (v) => {
  if (!v) return '—';
  const n = Number(v);
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억원`;
  if (n >= 10000) return `${Math.round(n / 10000).toLocaleString()}만원`;
  return `${n.toLocaleString()}원`;
};

export function HQBranchDetailScreen() {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const meta = BRANCH_META[branchId];

  const employees = useEmployeeStore((s) => s.employees);
  const fetchEmployees = useEmployeeStore((s) => s.fetchEmployees);
  const harvestRecords = useHarvestStore((s) => s.records);
  const fetchHarvest = useHarvestStore((s) => s.fetchCurrentMonth);
  const fetchByDate = useSafetyCheckStore((s) => s.fetchByDate);

  const [branchTarget, setBranchTarget] = useState(0);
  const [finance, setFinance] = useState(null);
  const [todayChecks, setTodayChecks] = useState([]);

  // 교훈 77: toISOString() UTC 날짜 금지 — 로컬 날짜 직접 포매팅
  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }, []);

  useEffect(() => {
    if (employees.length === 0) fetchEmployees();
    fetchHarvest();

    // branches 목표 + finance_monthly 순차 로드 (branch UUID 필요)
    supabase
      .from('branches')
      .select('id, monthly_harvest_target_kg')
      .eq('code', branchId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setBranchTarget(Number(data.monthly_harvest_target_kg) || 0);
        const now = new Date();
        supabase
          .from('finance_monthly')
          .select('revenue, labor_cost, material_cost, energy_cost, maintenance_cost')
          .eq('branch_id', data.id)
          .eq('year', now.getFullYear())
          .eq('month', now.getMonth() + 1)
          .maybeSingle()
          .then(({ data: fin }) => { if (fin) setFinance(fin); });
      });

    fetchByDate(today).then(setTodayChecks).catch(console.error);
  }, [branchId, today]);

  const workers = useMemo(
    () => employees.filter(e => e.branch === branchId && e.isActive && e.role === 'worker'),
    [employees, branchId]
  );

  const harvestKg = useMemo(() => {
    const empIds = new Set(workers.map(e => e.id));
    return harvestRecords
      .filter(r => empIds.has(r.employee_id))
      .reduce((s, r) => s + Number(r.quantity || 0), 0);
  }, [workers, harvestRecords]);

  const harvestRate = branchTarget > 0 ? Math.round(harvestKg / branchTarget * 100) : null;

  const tbmDone = todayChecks.filter(c => workers.some(w => w.id === c.workerId)).length;
  const tbmRate = workers.length > 0 ? Math.round(tbmDone / workers.length * 100) : 0;

  // 작업자별 오늘 TBM 상태
  const checkMap = useMemo(
    () => Object.fromEntries(todayChecks.map(c => [c.workerId, c])),
    [todayChecks]
  );

  if (!meta) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted }}>
        알 수 없는 지점 코드입니다.
      </div>
    );
  }

  const mgr = employees.find(e => e.branch === branchId && e.role === 'farm_admin' && e.isActive);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <HQPageHeader
        subtitle="지점 관리 › 상세"
        title={meta.name}
        actions={btnSecondary('목록으로', icons.chevronLeft, () => navigate('/admin/hq/branches'))}
      />

      <div style={{ flex: 1, overflow: 'auto', padding: 24, background: T.bg, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* KPI 4개 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { l: '활성 인원', v: workers.length, u: '명', sub: `${meta.name} 작업자`, tone: meta.accent },
            {
              l: '이번 달 수확',
              v: harvestKg > 0 ? harvestKg.toLocaleString() : '—',
              u: harvestKg > 0 ? 'kg' : '',
              sub: harvestRate !== null ? `목표 달성률 ${harvestRate}%` : `목표 ${branchTarget.toLocaleString()} kg`,
              tone: harvestRate !== null && harvestRate >= 100 ? T.success : meta.accent,
            },
            {
              l: '오늘 TBM 완료율',
              v: tbmRate,
              u: '%',
              sub: `${tbmDone} / ${workers.length}명 완료`,
              tone: tbmRate >= 80 ? T.success : tbmRate >= 50 ? T.warning : T.danger,
            },
            {
              l: '이번 달 수익',
              v: finance ? won(finance.revenue) : '—',
              u: '',
              sub: finance ? `인건비 ${won(finance.labor_cost)}` : '데이터 로딩 중',
              tone: T.primary,
            },
          ].map((k, i) => (
            <Card key={i} pad={20} style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.tone }} />
              <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginBottom: 12 }}>{k.l}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: T.text, letterSpacing: -0.8, lineHeight: 1 }}>{k.v}</span>
                {k.u && <span style={{ fontSize: 12, color: T.mutedSoft, fontWeight: 600 }}>{k.u}</span>}
              </div>
              <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 8 }}>{k.sub}</div>
            </Card>
          ))}
        </div>

        {/* 지점장 정보 */}
        {mgr && (
          <Card pad={16} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar name={mgr.name} color={meta.avatarC} size={44} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{mgr.name}</span>
                <Pill tone="muted" size="sm">지점장</Pill>
              </div>
              <div style={{ fontSize: 12, color: T.mutedSoft }}>{mgr.phone || '연락처 미등록'}</div>
            </div>
            <div style={{ fontSize: 12, color: T.muted }}>{meta.name}</div>
          </Card>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>

          {/* 작업자 현황 */}
          <Card pad={0}>
            <div style={{
              padding: '14px 20px', borderBottom: `1px solid ${T.borderSoft}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>작업자 현황</span>
              <span style={{ fontSize: 11, color: T.mutedSoft }}>총 {workers.length}명</span>
            </div>
            <div style={{ maxHeight: 320, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: T.bg, textAlign: 'left', color: T.mutedSoft, fontSize: 11, fontWeight: 700, letterSpacing: 0.3 }}>
                    <th style={{ padding: '8px 20px' }}>이름</th>
                    <th style={{ padding: '8px 12px' }}>직종</th>
                    <th style={{ padding: '8px 12px' }}>이번 달 수확</th>
                    <th style={{ padding: '8px 20px', textAlign: 'right' }}>오늘 TBM</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.map((w, i) => {
                    const emp_harvest = harvestRecords
                      .filter(r => r.employee_id === w.id)
                      .reduce((s, r) => s + Number(r.quantity || 0), 0);
                    const chk = checkMap[w.id];
                    return (
                      <tr key={w.id} style={{ borderTop: i ? `1px solid ${T.borderSoft}` : 'none' }}>
                        <td style={{ padding: '10px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Avatar name={w.name} color={meta.avatarC} size={26} />
                            <span style={{ fontWeight: 600, color: T.text, fontSize: 12 }}>{w.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', color: T.muted, fontSize: 11 }}>{w.jobType || '—'}</td>
                        <td style={{ padding: '10px 12px', color: T.text, fontFamily: 'ui-monospace,monospace', fontSize: 12 }}>
                          {emp_harvest > 0 ? `${emp_harvest.toLocaleString()} kg` : '—'}
                        </td>
                        <td style={{ padding: '10px 20px', textAlign: 'right' }}>
                          {chk
                            ? chk.status === 'approved'
                              ? <Pill tone="success"><Dot c={T.success} />승인</Pill>
                              : <Pill tone="info"><Dot c={T.info} />제출</Pill>
                            : <Pill tone="warning"><Dot c={T.warning} />미점검</Pill>}
                        </td>
                      </tr>
                    );
                  })}
                  {workers.length === 0 && (
                    <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: T.mutedSoft, fontSize: 12 }}>작업자가 없습니다</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* 이번 달 재무 요약 */}
          <Card pad={0}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.borderSoft}`, fontSize: 13, fontWeight: 700, color: T.text }}>
              이번 달 재무 요약
            </div>
            {finance ? (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { l: '수익', v: won(finance.revenue), tone: T.success },
                  { l: '인건비', v: won(finance.labor_cost), tone: T.warning },
                  { l: '자재·농약', v: won(finance.material_cost), tone: T.muted },
                  { l: '에너지', v: won(finance.energy_cost), tone: T.muted },
                  { l: '시설 유지', v: won(finance.maintenance_cost), tone: T.muted },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 4 ? `1px solid ${T.borderSoft}` : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Dot c={row.tone} />
                      <span style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>{row.l}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{row.v}</span>
                  </div>
                ))}
                {finance.revenue > 0 && (
                  <div style={{
                    marginTop: 4, padding: '10px 12px', background: T.primarySoft, borderRadius: 8,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{ fontSize: 12, color: T.primaryText, fontWeight: 600 }}>이익률</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: T.primaryText }}>
                      {Math.round((finance.revenue - finance.labor_cost - finance.material_cost - (finance.energy_cost || 0) - (finance.maintenance_cost || 0)) / finance.revenue * 100)}%
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: 24, textAlign: 'center', color: T.mutedSoft, fontSize: 12 }}>재무 데이터 없음</div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

// 지점별 성과 — /admin/branch-stats
import React, { useEffect, useMemo, useState } from 'react';
import { Avatar, Card, T, TopBar } from '../../design/primitives';
import { usePerformanceData } from '../../hooks/usePerformanceData';
import useEmployeeStore from '../../stores/employeeStore';
import useHarvestStore from '../../stores/harvestStore';
import { supabase } from '../../lib/supabase';

const BRANCHES = ['busan', 'jinju', 'hadong'];
const BRANCH_LABEL = { busan: '부산LAB', jinju: '진주HUB', hadong: '하동HUB' };
const BRANCH_COLOR = { busan: '#4F46E5', jinju: '#059669', hadong: '#D97706' };

export default function BranchStatsPage() {
  const employees = useEmployeeStore((s) => s.employees);
  const { workers, loading } = usePerformanceData();
  const harvestRecords = useHarvestStore((s) => s.records);
  const fetchHarvest = useHarvestStore((s) => s.fetchCurrentMonth);
  const [branchTargets, setBranchTargets] = useState({});

  useEffect(() => {
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

  const monthlyHarvestByBranch = useMemo(() => {
    const map = {};
    harvestRecords.forEach((r) => {
      const emp = employees.find((e) => e.id === r.employee_id);
      if (!emp?.branch) return;
      map[emp.branch] = (map[emp.branch] || 0) + Number(r.quantity || 0);
    });
    return map;
  }, [harvestRecords, employees]);

  const branchStats = useMemo(() => {
    return BRANCHES.map((br) => {
      const headcount = employees.filter((e) => e.branch === br && e.role === 'worker' && e.isActive).length;
      const brWorkers = workers.filter((w) => w.branch === br);
      const avgPct = brWorkers.length
        ? Math.round(brWorkers.reduce((s, w) => s + w.harvestPct, 0) / brWorkers.length)
        : 0;
      const totalWeekly = brWorkers.reduce((s, w) => s + w.stemsWeek, 0);
      const monthlyHarvest = monthlyHarvestByBranch[br] || 0;
      const targetKg = branchTargets[br] || 0;
      const achievePct = targetKg > 0 ? Math.round(monthlyHarvest / targetKg * 100) : null;
      return { branch: br, headcount, avgPct, totalWeekly, count: brWorkers.length, monthlyHarvest, targetKg, achievePct };
    });
  }, [employees, workers, monthlyHarvestByBranch, branchTargets]);

  const maxPct = Math.max(...branchStats.map((b) => b.avgPct), 1);
  const maxWeekly = Math.max(...branchStats.map((b) => b.totalWeekly), 1);

  if (loading) {
    return (
      <div style={{ flex: 1, overflow: 'auto', background: T.bg, minWidth: 0 }}>
        <TopBar subtitle="분석" title="지점별 성과" />
        <div style={{ padding: 60, textAlign: 'center', color: T.mutedSoft }}>로딩 중...</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, minWidth: 0 }}>
      <TopBar subtitle="분석" title="지점별 성과" />
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* 지점별 KPI 카드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {branchStats.map((b) => (
            <Card key={b.branch} pad={0} style={{ overflow: 'hidden' }}>
              <div style={{ height: 4, background: BRANCH_COLOR[b.branch] }} />
              <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.borderSoft}` }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{BRANCH_LABEL[b.branch]}</div>
                <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 2 }}>활성 작업자 {b.headcount}명</div>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { l: '평균 성과율', v: b.avgPct, unit: '%' },
                  { l: '주간 수확량 합계', v: b.totalWeekly, unit: 'kg/주' },
                  { l: '이번 달 달성률', v: b.achievePct !== null ? b.achievePct : '—', unit: b.achievePct !== null ? '%' : '' },
                ].map((m) => (
                  <div key={m.l}>
                    <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, marginBottom: 4 }}>{m.l}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                      <span style={{ fontSize: 28, fontWeight: 700, color: T.text, letterSpacing: -0.5, lineHeight: 1, fontFamily: 'ui-monospace,monospace' }}>{m.v}</span>
                      <span style={{ fontSize: 12, color: T.mutedSoft, fontWeight: 500 }}>{m.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {/* 평균 성과율 비교 */}
        <Card pad={0}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.borderSoft}`, fontSize: 13, fontWeight: 700, color: T.text }}>평균 성과율 비교</div>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {branchStats.map((b) => {
              const barPct = maxPct ? Math.round((b.avgPct / maxPct) * 100) : 0;
              return (
                <div key={b.branch} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 60px', gap: 12, alignItems: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{BRANCH_LABEL[b.branch]}</div>
                  <div style={{ height: 8, background: T.bg, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${barPct}%`, height: '100%', background: BRANCH_COLOR[b.branch], borderRadius: 4, transition: 'width 0.4s' }} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: 'ui-monospace,monospace', textAlign: 'right' }}>{b.avgPct}%</div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* 주간 수확량 비교 */}
        <Card pad={0}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.borderSoft}`, fontSize: 13, fontWeight: 700, color: T.text }}>주간 수확량 비교</div>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {branchStats.map((b) => {
              const barPct = maxWeekly ? Math.round((b.totalWeekly / maxWeekly) * 100) : 0;
              return (
                <div key={b.branch} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px', gap: 12, alignItems: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{BRANCH_LABEL[b.branch]}</div>
                  <div style={{ height: 8, background: T.bg, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${barPct}%`, height: '100%', background: BRANCH_COLOR[b.branch], borderRadius: 4, transition: 'width 0.4s' }} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: 'ui-monospace,monospace', textAlign: 'right' }}>{b.totalWeekly}<span style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 400, marginLeft: 2 }}>kg/주</span></div>
                </div>
              );
            })}
          </div>
        </Card>

      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { HQ } from '../../design/hq-shell';
import { Card, Pill, T, btnSecondary, icons } from '../../design/primitives';
import { supabase } from '../../lib/supabase';

// HQ 지점별 생육 비교 위젯 — 3개 지점 × 작물 × 건전도/편차

// 정적 fallback — 실데이터 로드 실패 시 표시
const HQ_GR_DATA = {
  branches: [
    {
      id: 'b1', name: '부산LAB', crops: [
        { name: '토마토', health: 92, dev: +2, week: 8, plants: 8, open: 1 },
        { name: '딸기', health: 88, dev: -4, week: 6, plants: 6, open: 0 },
        { name: '파프리카', health: 84, dev: -9, week: 10, plants: 6, open: 2 },
      ],
    },
    {
      id: 'b2', name: '진주HUB', crops: [
        { name: '오이', health: 94, dev: +3, week: 5, plants: 8, open: 0 },
        { name: '애호박', health: 91, dev: +1, week: 7, plants: 6, open: 1 },
      ],
    },
    {
      id: 'b3', name: '하동HUB', crops: [
        { name: '방울토마토', health: 89, dev: -2, week: 9, plants: 8, open: 1 },
        { name: '고추', health: 78, dev: -12, week: 11, plants: 6, open: 3 },
      ],
    },
  ],
};

// ─── 상수 ───────────────────────────────────────────────
const BRANCH_IDS = ['busan', 'jinju', 'hadong'];
const BRANCH_NAMES_MAP = { busan: '부산LAB', jinju: '진주HUB', hadong: '하동HUB' };
const SEASON_START = '2026-01-11'; // 생육 조사 시작일
const PRIMARY_METRIC = '개화 화방 높이'; // standard_curves metric_key: flowerClusterH

function computeWeek(dateStr) {
  if (!dateStr) return 1;
  const days = Math.round((new Date(dateStr) - new Date(SEASON_START)) / (7 * 24 * 3600 * 1000));
  return Math.max(1, days + 1);
}

function HQGrowthCompareScreen() {
  const [grBranches, setGrBranches] = useState(HQ_GR_DATA.branches);

  useEffect(() => {
    async function load() {
      const [scRes, gsRes, empRes] = await Promise.all([
        supabase.from('standard_curves').select('*, crops(name)').eq('season', '2026').eq('metric_key', 'flowerClusterH'),
        supabase.from('growth_surveys').select('id, survey_date, crop_id, worker_id, measurements, crops(id, name)').order('survey_date', { ascending: false }),
        supabase.from('employees').select('id, branch'),
      ]);
      if (scRes.error || gsRes.error || empRes.error) return;

      // 직원 ID → 지점 코드
      const empBranch = Object.fromEntries((empRes.data ?? []).map(e => [e.id, e.branch]));

      // 표준 곡선: 작물명 → 주차 → 목표값
      const sc = {};
      for (const row of scRes.data ?? []) {
        const cn = row.crops?.name;
        if (!cn) continue;
        if (!sc[cn]) sc[cn] = {};
        sc[cn][row.week] = Number(row.target_value);
      }

      // 지점 × 작물별 조사 그룹화
      const byBC = {};
      for (const s of gsRes.data ?? []) {
        const branch = empBranch[s.worker_id];
        const cropName = s.crops?.name;
        if (!branch || !cropName) continue;
        const key = `${branch}__${cropName}`;
        if (!byBC[key]) byBC[key] = { branch, crop: cropName, surveys: [] };
        byBC[key].surveys.push(s);
      }

      // 지점별 작물 집계 계산
      const result = BRANCH_IDS.map((code) => {
        const branchName = BRANCH_NAMES_MAP[code];
        const entries = Object.values(byBC).filter(e => e.branch === code);

        if (entries.length === 0) {
          return {
            id: code, name: branchName,
            crops: [{ name: '데이터 없음', health: null, dev: null, week: null, plants: 0, open: 0, noData: true }],
          };
        }

        const crops = entries.map(({ crop, surveys }) => {
          const latestDate = surveys[0]?.survey_date;
          const weekNum = computeWeek(latestDate);
          const latestSurveys = surveys.filter(s => s.survey_date === latestDate);
          const plants = latestSurveys.length;

          const vals = latestSurveys
            .map(s => { const m = (s.measurements ?? []).find(m => m.name === PRIMARY_METRIC); return m ? Number(m.value) : null; })
            .filter(v => v !== null);
          const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;

          const targetWeek = Math.min(weekNum, 12);
          const target = sc[crop]?.[targetWeek] ?? null;
          const dev = avg !== null && target !== null
            ? Math.round((avg - target) / target * 100)
            : null;
          const health = dev !== null
            ? Math.min(100, Math.max(60, Math.round(90 - Math.abs(dev) * 1.5)))
            : null;

          return { name: crop, health, dev, week: weekNum, plants, open: 0, noData: dev === null };
        });

        return { id: code, name: branchName, crops };
      });

      setGrBranches(result);
    }
    load();
  }, []);

  const toneByDev = (d) => d == null ? T.mutedSoft : Math.abs(d) <= 3 ? T.success : Math.abs(d) <= 8 ? T.warning : T.danger;
  const toneByHealth = (h) => h == null ? T.mutedSoft : h >= 90 ? T.success : h >= 80 ? T.warning : T.danger;

  // 집계 (null 제외)
  const validCrops = grBranches.flatMap(b => b.crops.filter(c => !c.noData));
  const totalPlants = validCrops.reduce((s, c) => s + c.plants, 0);
  const totalOpen = grBranches.reduce((s, b) => s + b.crops.reduce((a, c) => a + (c.open || 0), 0), 0);
  const avgHealth = validCrops.length > 0
    ? Math.round(validCrops.reduce((s, c) => s + c.health, 0) / validCrops.length)
    : 0;
  const criticalCount = validCrops.filter(c => Math.abs(c.dev) > 8 || c.health < 80).length;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '20px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: T.mutedSoft, marginBottom: 4 }}>
              <span style={{ padding: '2px 8px', borderRadius: 4, fontWeight: 700, background: `${HQ.accent}22`, color: HQ.accent }}>관리팀</span>
              <span>전사 · 생육 비교</span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: -0.4, margin: 0 }}>지점별 생육 현황</h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {btnSecondary('CSV', icons.chart)}
            {btnSecondary('주간 리포트', icons.clipboard)}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 24, background: T.bg, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { l: '평균 건전도', v: avgHealth, u: '%', sub: '전사 가중평균', tone: toneByHealth(avgHealth) },
            { l: '추적 표식주', v: totalPlants, u: '주', sub: `${grBranches.length}개 지점`, tone: T.text },
            { l: '주의 필요', v: criticalCount, u: '건', sub: '편차 초과 또는 건전도 하락', tone: criticalCount > 0 ? T.warning : T.success },
            { l: '미조치 이상', v: totalOpen, u: '건', sub: '전사 합계', tone: totalOpen > 0 ? T.danger : T.success },
          ].map((k, i) => (
            <Card key={i} pad={18}>
              <div style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>{k.l}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 8 }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: k.tone, letterSpacing: -0.6, fontVariantNumeric: 'tabular-nums' }}>{k.v}</span>
                <span style={{ fontSize: 12, color: T.mutedSoft, fontWeight: 500 }}>{k.u}</span>
              </div>
              <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 4 }}>{k.sub}</div>
            </Card>
          ))}
        </div>

        {/* 지점별 카드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {grBranches.map(b => {
            const validBCrops = b.crops.filter(c => c.health != null);
            const bAvg = validBCrops.length > 0
              ? Math.round(validBCrops.reduce((a, c) => a + c.health, 0) / validBCrops.length)
              : null;
            return (
              <Card key={b.id} pad={0}>
                <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.borderSoft}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>{b.name}</h3>
                    <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 2 }}>{b.crops.filter(c => !c.noData).length}개 작물 · {b.crops.reduce((a, c) => a + c.plants, 0)}주 추적</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: toneByHealth(bAvg), letterSpacing: -0.4, fontVariantNumeric: 'tabular-nums' }}>
                      {bAvg != null ? bAvg : '—'}<span style={{ fontSize: 11, color: T.mutedSoft, marginLeft: 2 }}>{bAvg != null ? '%' : ''}</span>
                    </div>
                    <div style={{ fontSize: 10, color: T.mutedSoft }}>건전도</div>
                  </div>
                </div>
                <div>
                  {b.crops.map(c => (
                    <div key={c.name} style={{ padding: '12px 16px', borderBottom: `1px solid ${T.borderSoft}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{c.name}</span>
                          {c.week != null && <span style={{ fontSize: 10, color: T.mutedSoft }}>작기 {c.week}주차</span>}
                          {c.open > 0 && <Pill tone="danger" size="sm">이상 {c.open}</Pill>}
                          {c.noData && <span style={{ fontSize: 10, color: T.mutedSoft }}>· 편차 데이터 없음</span>}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: toneByDev(c.dev), fontVariantNumeric: 'tabular-nums' }}>
                          {c.dev != null ? `${c.dev >= 0 ? '+' : ''}${c.dev}%` : '—'}
                        </span>
                      </div>
                      {/* 건전도 바 */}
                      <div style={{ position: 'relative', height: 4, background: T.borderSoft, borderRadius: 999 }}>
                        <div style={{ position: 'absolute', left: 0, top: 0, width: `${c.health ?? 0}%`, height: '100%', background: toneByHealth(c.health), borderRadius: 999 }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.mutedSoft, marginTop: 4 }}>
                        <span>건전도 {c.health != null ? `${c.health}%` : '—'}</span>
                        <span>표식주 {c.plants}주</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: '10px 16px', background: T.bg }}>
                  <button style={{ width: '100%', padding: '7px 0', borderRadius: 6, border: 0, background: T.surface, color: T.primary, fontSize: 11, fontWeight: 700, cursor: 'pointer', borderTop: `1px solid ${T.borderSoft}` }}>
                    지점 상세 보기 →
                  </button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* 작물×지점 편차 매트릭스 */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>작물 × 지점 편차 매트릭스</h3>
              <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 2 }}>목표 곡선 대비 현재 주차 실측값 편차</div>
            </div>
            <div style={{ display: 'flex', gap: 10, fontSize: 10, color: T.mutedSoft }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: T.success }} />±3% 이내</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: T.warning }} />±8%</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: T.danger }} />초과</span>
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: T.bg, borderBottom: `1px solid ${T.border}` }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: T.muted }}>지점</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: T.muted }}>작물</th>
                <th style={{ padding: '10px 10px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: T.muted }}>작기</th>
                <th style={{ padding: '10px 10px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: T.muted }}>표식주</th>
                <th style={{ padding: '10px 10px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: T.muted }}>건전도</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: T.muted, minWidth: 200 }}>목표 대비 편차</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: T.muted }}>이상</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: T.muted, width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {grBranches.flatMap(b => b.crops.map(c => ({ b: b.name, ...c }))).map((row, i) => {
                const devPct = row.dev != null ? Math.min(Math.abs(row.dev) / 15 * 50, 50) : 0;
                const tone = toneByDev(row.dev);
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.borderSoft}` }}>
                    <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: T.text }}>{row.b}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: T.text }}>{row.name}</td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', fontSize: 12, color: T.muted, fontVariantNumeric: 'tabular-nums' }}>{row.week != null ? `${row.week}주` : '—'}</td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', fontSize: 12, color: T.muted, fontVariantNumeric: 'tabular-nums' }}>{row.plants}</td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: toneByHealth(row.health), fontVariantNumeric: 'tabular-nums' }}>{row.health != null ? `${row.health}%` : '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {row.dev != null ? (
                        <div style={{ position: 'relative', height: 18, background: T.bg, borderRadius: 4 }}>
                          <span style={{ position: 'absolute', left: '50%', top: 0, width: 1, height: '100%', background: T.mutedSoft }} />
                          <div style={{
                            position: 'absolute', top: 3, height: 12,
                            left: row.dev >= 0 ? '50%' : `${50 - devPct}%`,
                            width: `${devPct}%`,
                            background: tone, borderRadius: 3,
                          }} />
                          <span style={{
                            position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                            [row.dev >= 0 ? 'right' : 'left']: 6,
                            fontSize: 10, fontWeight: 700, color: T.text,
                          }}>{row.dev >= 0 ? '+' : ''}{row.dev}%</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: T.mutedSoft }}>데이터 없음</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      {row.open > 0
                        ? <Pill tone="danger" size="sm">{row.open}건</Pill>
                        : <span style={{ fontSize: 11, color: T.mutedSoft }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <button style={{ padding: '4px 10px', borderRadius: 5, border: `1px solid ${T.border}`, background: T.surface, color: T.muted, fontSize: 11, cursor: 'pointer' }}>→</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        {/* 주의 필요 알림 */}
        <Card style={{ borderLeft: `3px solid ${T.warning}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ fontSize: 24 }}>⚠</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0, marginBottom: 6 }}>주의 필요 — 지난주 대비 편차 확대</h3>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.8 }}>
                <li><strong style={{ color: T.text }}>하동HUB · 고추</strong> — 편차 −12%, 건전도 78%. 야간 기온 하강 영향 추정. 재배팀 확인 권장.</li>
                <li><strong style={{ color: T.text }}>부산LAB · 파프리카</strong> — 편차 −9%, 미조치 이상 2건. 화방 높이 부진.</li>
              </ul>
            </div>
            <button style={{ padding: '8px 14px', borderRadius: 7, border: 0, background: T.warning, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>지점 알림 발송</button>
          </div>
        </Card>
      </div>
    </div>
  );
}
export { HQGrowthCompareScreen, HQ_GR_DATA };

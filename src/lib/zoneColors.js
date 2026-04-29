// 트랙 76-A-1 v2: zones.name → 색 매핑 단일 소스
// BACKLOG: TASK-ZONE-COLORS-001
// D10/D11 자연 매핑: A동=1cmp(인디고) / B동=2cmp(틸) / C동=3cmp(주황) / D동=4cmp(빨강)
// 디자인 산출물 v4 컬러 그대로 차용

export const ZONES = {
  'A동': { label: 'A동', line: '#4F46E5', pillBg: '#EEF2FF', pillFg: '#3730A3', dot: '#4F46E5' },
  'B동': { label: 'B동', line: '#0D9488', pillBg: '#CCFBF1', pillFg: '#115E59', dot: '#0D9488' },
  'C동': { label: 'C동', line: '#D97706', pillBg: '#FEF3C7', pillFg: '#92400E', dot: '#D97706' },
  'D동': { label: 'D동', line: '#DC2626', pillBg: '#FEE2E2', pillFg: '#991B1B', dot: '#DC2626' },
  'other': { label: '기타', line: '#94A3B8', pillBg: '#F1F5F9', pillFg: '#64748B', dot: '#94A3B8' },
};

export const ZONE_NAMES = ['A동', 'B동', 'C동', 'D동'];

// task → zone 라벨 도출
// 76-A-2 fetch 결과: tasks.zone_id로 조인되어 task.zones?.name 또는 task.zone?.name 형태
export function getZone(task) {
  const name = task?.zones?.name ?? task?.zone?.name ?? null;
  return ZONES[name] ?? ZONES.other;
}

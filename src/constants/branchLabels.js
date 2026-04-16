/**
 * Branch 상수 중앙 관리
 *
 * 6개 지점 정합 (세션 17 UI-A):
 * - busan → 부산LAB (실 농장 + GPS)
 * - jinju → 진주HUB (실 농장 + GPS)
 * - hadong → 하동HUB (실 농장 + GPS 미등록, BRANCHES-LOCATION-001)
 * - headquarters → 총괄본사 (본사, GPS 미사용)
 * - management → 관리팀 (관리, GPS 미사용)
 * - seedlab → Seed LAB (연구, GPS 미사용)
 *
 * 연관 마이그레이션: 20260416_track_j_branches_seed_fix.sql (b07cbc3)
 */

export const BRANCH_LABEL = {
  busan: '부산LAB',
  jinju: '진주HUB',
  hadong: '하동HUB',
  headquarters: '총괄본사',
  management: '관리팀',
  seedlab: 'Seed LAB',
};

export const BRANCH_OPTIONS = [
  { value: 'busan', label: '부산LAB' },
  { value: 'jinju', label: '진주HUB' },
  { value: 'hadong', label: '하동HUB' },
  { value: 'headquarters', label: '총괄본사' },
  { value: 'management', label: '관리팀' },
  { value: 'seedlab', label: 'Seed LAB' },
];

export const BRANCH_ORDER = [
  'busan', 'jinju', 'hadong', 'headquarters', 'management', 'seedlab', '',
];

// NULL fallback 라벨 (UI 표시용, 메타 §4.2 (ii) '—' 채택)
export const BRANCH_NULL_FALLBACK = '—';

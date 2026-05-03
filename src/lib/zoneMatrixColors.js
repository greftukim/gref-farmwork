// 트랙 77 후속 U18 — 작업 매트릭스 동별 색상 (시안 매트릭스 전용)
// G77-YY: zoneColors.js (76-A 자산) 보존을 위해 별 파일로 분리.
//   기존 zoneColors는 동 이름(A동/B동/C동/D동) 기반 인디고/틸/주황/빨강 매핑 — 다른 페이지에서 사용 중.
//   본 파일은 작업 매트릭스 전용 시안 색상(빨강/노랑/초록/파랑) — index 기반 cycle.
//
// 시안: 운영 채팅방 합의 (1동→4동 예시 4색, 5+ 동은 cycle)

const MATRIX_PALETTE = [
  // 1동 빨강
  { soft: '#FCEBEB', strong: '#791F1F', text: '#791F1F', border: '#F1C7C7' },
  // 2동 노랑
  { soft: '#FAEEDA', strong: '#854F0B', text: '#854F0B', border: '#F0D9B0' },
  // 3동 초록
  { soft: '#EAF3DE', strong: '#27500A', text: '#27500A', border: '#CFE3B6' },
  // 4동 파랑
  { soft: '#E6F1FB', strong: '#0C447C', text: '#0C447C', border: '#BCD7F0' },
];

/**
 * zone index 기반 색상 cycle.
 * @param {number} index - zone 정렬 순서 (0-based)
 * @returns {{soft, strong, text, border}}
 */
export function getMatrixZoneColor(index) {
  if (typeof index !== 'number' || index < 0) {
    return MATRIX_PALETTE[0];
  }
  return MATRIX_PALETTE[index % MATRIX_PALETTE.length];
}

/**
 * zone 객체 + zones 배열을 받아 정렬 위치로 색상 반환.
 * created_at 또는 name 정렬 가정 (zoneStore의 fetchZones는 created_at 정렬).
 */
export function getMatrixZoneColorByZone(zone, zones) {
  if (!zone || !Array.isArray(zones)) return MATRIX_PALETTE[0];
  const idx = zones.findIndex((z) => z.id === zone.id);
  return getMatrixZoneColor(idx >= 0 ? idx : 0);
}

export const MATRIX_PALETTE_LENGTH = MATRIX_PALETTE.length;

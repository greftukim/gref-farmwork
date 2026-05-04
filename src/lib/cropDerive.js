// [TRACK77-U21] 작업의 작물 자동 derive
// zone_id + date → 활성 zone_crops 매칭 → crop_id 자동 추론
// 사용자 결정: 다중 매칭 시 가장 최근 started_at 1건 선택
//
// G77-LLL-1 영향: 기존 crops 테이블 재사용 → name 필드 직접 사용 (displayName 미존재)

/**
 * zone_id + date 기반 활성 작기 매칭
 * @param {Array} zoneCrops - useZoneCropStore의 작기 목록 (camelCase)
 *   activeOnly=true 상태일 수 있어, ended_at 비교는 본 함수가 한 번 더 검증
 * @param {string} zoneId
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @returns {{ cropId: string|null, zoneCrop: Object|null, matched: number }}
 */
export function deriveCropForTask(zoneCrops, zoneId, dateStr) {
  if (!Array.isArray(zoneCrops) || !zoneId || !dateStr) {
    return { cropId: null, zoneCrop: null, matched: 0 };
  }
  const matches = zoneCrops.filter((zc) => {
    if (zc.zoneId !== zoneId) return false;
    if (zc.startedAt && zc.startedAt > dateStr) return false;
    if (zc.endedAt && zc.endedAt < dateStr) return false;
    return true;
  });
  if (matches.length === 0) {
    return { cropId: null, zoneCrop: null, matched: 0 };
  }
  const sorted = matches.slice().sort((a, b) => {
    const sa = a.startedAt || '';
    const sb = b.startedAt || '';
    return sb.localeCompare(sa);
  });
  const top = sorted[0];
  return {
    cropId: top.cropId,
    zoneCrop: top,
    matched: matches.length,
  };
}

/**
 * 사용자 표시용 라벨
 * @param {Object} result - deriveCropForTask 결과
 * @param {Array} crops - useCropStore.crops (fallback용)
 * @returns {string}
 */
export function formatDerivedCropLabel(result, crops) {
  if (!result?.zoneCrop) return '없음 — 온실 정보 탭에서 작기 등록 필요';
  const zc = result.zoneCrop;
  // U20 zoneCropStore의 join: zc.crops = { id, name, category, isActive }
  const cropName =
    zc.crops?.name
    || (crops || []).find((c) => c.id === zc.cropId)?.name
    || '미분류';
  const parts = [cropName];
  if (zc.cultivar) parts.push(zc.cultivar);
  if (zc.seasonLabel) parts.push(zc.seasonLabel);
  let label = parts.length === 1 ? parts[0] : `${parts[0]} (${parts.slice(1).join(', ')})`;
  if (result.matched > 1) {
    label += ` · 다중 작기 ${result.matched}건 중 최근`;
  }
  return label;
}

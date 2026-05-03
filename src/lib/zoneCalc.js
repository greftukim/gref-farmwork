// 트랙 77 후속 U20 — 재식밀도 산식 (사용자 제공 엑셀 추종)
// 4단계 중 1+2단계 (P0+P1). 자재 소요량(P2)/발주(P3)는 별 트랙.
//
// 1단계: 온실 물리 구조 → 면적 derive (zone_specs 입력)
// 2단계: 식재 정보 + 1단계 → 재식밀도 derive (zone_crops 입력)

/**
 * 1단계: 온실 물리 구조 → 면적 / 평수
 * @param {Object} spec - zone_specs row (camelCase)
 * @returns {{ greenhouseLength, greenhouseWidth, greenhouseArea, corridorArea, cultivationArea, areaPyeong, bayLengthM, bayCount }}
 */
export function calculateZoneArea(spec) {
  if (!spec) return null;
  const bayLengthM = num(spec.bayLengthM);
  const bayCount = num(spec.bayCount);
  const bayWidthM = num(spec.bayWidthM);
  const bayWidthCount = num(spec.bayWidthCount);
  const corridorWidthM = num(spec.corridorWidthM);
  const corridorCount = num(spec.corridorCount);

  const greenhouseLength = bayLengthM * bayCount;
  const greenhouseWidth = bayWidthM * bayWidthCount;
  const greenhouseArea = greenhouseLength * greenhouseWidth;
  const corridorArea = corridorWidthM * greenhouseLength * corridorCount;
  const cultivationArea = greenhouseArea - corridorArea;
  const areaPyeong = greenhouseArea / 3.3054;

  return {
    bayLengthM,
    bayCount,
    bayWidthM,
    bayWidthCount,
    corridorWidthM,
    corridorCount,
    greenhouseLength,
    greenhouseWidth,
    greenhouseArea,
    corridorArea,
    cultivationArea,
    areaPyeong,
  };
}

/**
 * 2단계: 식재 정보 + 1단계 → 재식밀도
 * @param {Object} zoneCrop - zone_crops row (camelCase)
 * @param {Object} zoneArea - calculateZoneArea() 결과
 * @returns {{ slabsPerRow, totalPlants, plantingDensity, slabVolumeL, mediumVolumePerM2, totalRows }}
 */
export function calculatePlantingDensity(zoneCrop, zoneArea) {
  if (!zoneCrop || !zoneArea) return null;

  const rowsPerBay = num(zoneCrop.rowsPerBay);
  const slabLengthCm = num(zoneCrop.slabLengthCm);
  const slabWidthCm = num(zoneCrop.slabWidthCm);
  const slabHeightCm = num(zoneCrop.slabHeightCm);
  const plantsPerSlab = num(zoneCrop.plantsPerSlab);
  const slabGapCm = num(zoneCrop.slabGapCm);

  const bayLengthCm = zoneArea.bayLengthM * 100;
  const slabUnitCm = slabLengthCm + slabGapCm;
  const slabsPerRow = slabUnitCm > 0 ? Math.ceil(bayLengthCm / slabUnitCm) : 0;
  // 1동(zone) = 1 spec 가정 (G77-SSS) — bay_count 동수 전체에 동일 row 적용
  const totalRows = rowsPerBay * num(zoneArea.bayCount);
  const totalPlants = slabsPerRow * totalRows * plantsPerSlab;
  const plantingDensity = zoneArea.cultivationArea > 0
    ? totalPlants / zoneArea.cultivationArea
    : 0;
  const slabVolumeCm3 = slabLengthCm * slabWidthCm * slabHeightCm;
  const slabVolumeL = slabVolumeCm3 / 1000;
  const totalSlabs = slabsPerRow * totalRows;
  const mediumVolumePerM2 = zoneArea.cultivationArea > 0
    ? (slabVolumeL * totalSlabs) / zoneArea.cultivationArea
    : 0;

  return {
    slabsPerRow,
    totalRows,
    totalSlabs,
    totalPlants,
    plantingDensity,
    slabVolumeL,
    mediumVolumePerM2,
  };
}

function num(v) {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * 산식 박제 (footer 표시용)
 */
export const FORMULA_NOTES = {
  zoneArea: [
    '온실 길이 = 베이 길이(m) × 베이 동수',
    '온실 폭 = 베이 폭(m) × 폭 동수',
    '온실 면적 = 온실 길이 × 온실 폭',
    '통로 면적 = 통로 폭(m) × 온실 길이 × 통로 동수',
    '실 재배면적 = 온실 면적 − 통로 면적',
    '평수 = 온실 면적 ÷ 3.3054',
  ],
  density: [
    '1줄당 슬라브 = ROUNDUP(베이 길이(cm) ÷ (슬라브 길이 + 슬라브 간격))',
    '총 줄수 = 줄수/베이 × 베이 동수',
    '총 식재수량 = 1줄당 슬라브 × 총 줄수 × 작물수/슬라브',
    '재식밀도(주/m²) = 총 식재수량 ÷ 실 재배면적',
    '슬라브 볼륨(L) = (길이 × 폭 × 높이 cm³) ÷ 1000',
    '배지볼륨(L/m²) = 슬라브 볼륨 × 총 슬라브 ÷ 실 재배면적',
  ],
};

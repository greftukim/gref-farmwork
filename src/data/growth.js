import { T } from '../design/primitives';

// 생육조사 — 데이터셋 + 표준곡선
// 주 1회 (고정 요일) · 표식주(標識株) 단위 · 이상 시 사진만

// ─────── 작물별 조사 항목 스키마 ───────
// key: 저장 키 | label: 표시명 | unit | step | type(number|derived) | formula(derived)
const GROWTH_SCHEMA = {
  '토마토': [
    { key: 'weeklyGrowth',    label: '주간 생장길이', unit: 'cm', step: 0.1 },
    { key: 'leafLen',         label: '엽장',         unit: 'cm', step: 0.1 },
    { key: 'leafWid',         label: '엽폭',         unit: 'cm', step: 0.1 },
    { key: 'leafPerStem',     label: '줄기당 엽수',   unit: '장', step: 1 },
    { key: 'stemDia',         label: '줄기 굵기',    unit: 'mm', step: 0.1 },
    { key: 'flowerClusterH',  label: '개화 화방의 높이', unit: 'cm', step: 0.1 },
    { key: 'flowerClusterLen',label: '개화 화방의 길이', unit: 'cm', step: 0.1 },
    { key: 'flowerCount',     label: '개화 화방',    unit: '개', step: 1 },
    { key: 'fruitSetCluster', label: '착과 화방',    unit: '개', step: 1 },
    { key: 'harvestCluster',  label: '수확 화방',    unit: '개', step: 1 },
    { key: 'totalFruit',      label: '총 과일 수',   unit: '개', step: 1 },
  ],
  '오이': [
    { key: 'weeklyGrowth',    label: '주간 생장길이', unit: 'cm', step: 0.1 },
    { key: 'leafLen',         label: '엽장',         unit: 'cm', step: 0.1 },
    { key: 'leafWid',         label: '엽폭',         unit: 'cm', step: 0.1 },
    { key: 'leafRatio',       label: '엽장/엽폭',    unit: '',   type: 'derived', formula: (r) => r.leafWid ? (r.leafLen / r.leafWid).toFixed(2) : '-' },
    { key: 'leafCount',       label: '엽수',         unit: '장', step: 1 },
    { key: 'stemDia',         label: '줄기 굵기',    unit: 'mm', step: 0.1 },
    { key: 'flowerClusterH',  label: '개화화방의 높이', unit: 'cm', step: 0.1 },
    { key: 'flowerClusterLen',label: '개화화방의 길이', unit: 'cm', step: 0.1 },
    { key: 'flowerCluster',   label: '개화화방 수',   unit: '개', step: 1 },
    { key: 'fruitSetCluster', label: '착과화방 수',   unit: '개', step: 1 },
    { key: 'harvestCluster',  label: '수확화방 수',   unit: '개', step: 1 },
    { key: 'totalFruit',      label: '과일 수',      unit: '개', step: 1 },
  ],
  '파프리카': [
    { key: 'weeklyGrowth',    label: '주간 생장길이', unit: 'cm', step: 0.1 },
    { key: 'leafLen',         label: '엽장',         unit: 'cm', step: 0.1 },
    { key: 'leafWid',         label: '엽폭',         unit: 'cm', step: 0.1 },
    { key: 'leafPerStem',     label: '줄기당 엽수',   unit: '장', step: 1 },
    { key: 'stemDia',         label: '줄기 굵기',    unit: 'mm', step: 0.1 },
    { key: 'flowerClusterH',  label: '개화 화방의 높이', unit: 'cm', step: 0.1 },
    { key: 'flowerClusterLen',label: '개화 화방의 길이', unit: 'cm', step: 0.1 },
    { key: 'flowerCount',     label: '개화 화방',    unit: '개', step: 1 },
    { key: 'fruitSetCluster', label: '착과 화방',    unit: '개', step: 1 },
    { key: 'harvestCluster',  label: '수확 화방',    unit: '개', step: 1 },
    { key: 'totalFruit',      label: '총 과일 수',   unit: '개', step: 1 },
  ],
};

// ─────── 표준 곡선 (주차별 목표값) ───────
// TODO: 실제 품종/작기별 값으로 교체. 현재는 12주차 작기 기준 예시값.
const STANDARD_CURVE = {
  '토마토': {
    weeklyGrowth:     [18, 20, 22, 24, 25, 26, 26, 25, 24, 23, 22, 20],
    leafLen:          [28, 32, 35, 37, 38, 39, 39, 38, 37, 36, 35, 34],
    leafWid:          [24, 27, 29, 31, 32, 32, 32, 31, 30, 30, 29, 28],
    leafPerStem:      [14, 16, 18, 20, 22, 23, 24, 24, 24, 23, 22, 22],
    stemDia:          [10.0, 10.8, 11.4, 11.8, 12.0, 12.0, 11.8, 11.6, 11.4, 11.2, 11.0, 10.8],
    flowerClusterH:   [95, 110, 125, 140, 155, 170, 185, 200, 215, 230, 245, 260],
    flowerClusterLen: [12, 13, 14, 15, 15, 16, 16, 16, 15, 15, 14, 14],
    flowerCount:      [2, 3, 3, 4, 4, 5, 5, 5, 4, 4, 3, 3],
    fruitSetCluster:  [1, 2, 3, 4, 5, 6, 7, 7, 7, 6, 5, 4],
    harvestCluster:   [0, 0, 0, 1, 2, 3, 4, 5, 6, 6, 6, 6],
    totalFruit:       [4, 10, 18, 28, 40, 54, 68, 82, 95, 106, 115, 122],
  },
  '오이': {
    weeklyGrowth:     [22, 26, 28, 30, 31, 32, 32, 31, 30, 28, 26, 24],
    leafLen:          [20, 23, 25, 27, 28, 28, 28, 27, 26, 26, 25, 24],
    leafWid:          [22, 25, 27, 29, 30, 30, 29, 28, 28, 27, 26, 25],
    leafCount:        [16, 20, 24, 28, 32, 35, 37, 37, 36, 34, 32, 30],
    stemDia:          [9.0, 9.6, 10.0, 10.4, 10.6, 10.6, 10.4, 10.2, 10.0, 9.8, 9.6, 9.4],
    flowerClusterH:   [60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280],
    flowerClusterLen: [6, 7, 8, 8, 9, 9, 9, 8, 8, 7, 7, 6],
    flowerCluster:    [3, 5, 7, 9, 11, 12, 12, 11, 10, 9, 8, 7],
    fruitSetCluster:  [2, 4, 6, 8, 10, 11, 11, 10, 9, 8, 7, 6],
    harvestCluster:   [0, 1, 2, 4, 6, 8, 10, 10, 10, 9, 8, 7],
    totalFruit:       [2, 6, 12, 20, 30, 42, 55, 66, 76, 84, 90, 95],
  },
  '파프리카': {
    weeklyGrowth:     [15, 17, 19, 21, 22, 22, 22, 21, 20, 19, 18, 16],
    leafLen:          [22, 25, 27, 29, 30, 30, 30, 29, 28, 27, 26, 25],
    leafWid:          [18, 21, 23, 25, 26, 26, 26, 25, 24, 23, 22, 21],
    leafPerStem:      [12, 15, 17, 19, 21, 22, 22, 22, 21, 20, 19, 18],
    stemDia:          [11.0, 11.8, 12.4, 12.8, 13.0, 13.0, 12.8, 12.6, 12.4, 12.2, 12.0, 11.8],
    flowerClusterH:   [70, 85, 100, 115, 130, 145, 160, 175, 190, 205, 220, 235],
    flowerClusterLen: [8, 9, 10, 10, 11, 11, 11, 10, 10, 9, 9, 8],
    flowerCount:      [3, 4, 5, 6, 6, 7, 7, 6, 6, 5, 4, 4],
    fruitSetCluster:  [1, 2, 3, 4, 5, 6, 7, 7, 6, 5, 5, 4],
    harvestCluster:   [0, 0, 0, 1, 2, 3, 4, 5, 5, 5, 4, 4],
    totalFruit:       [3, 8, 15, 24, 34, 45, 56, 66, 74, 80, 85, 88],
  },
};

// ─────── 표식주 데이터 (부산LAB 예시) ───────
// 현재 주차 = 18주 (작기 기준 8주차 추적 중)
const GR_DATA = {
  currentWeek: 8,      // 작기 내 주차 (표준곡선 인덱스)
  calendarWeek: '18주', // 연도 주차
  date: '2026-04-28',
  nextSurvey: '2026-05-05 (화)',
  branches: [
    { id: 'busan',  name: '부산LAB',  c: T.primary, crops: ['토마토', '딸기', '파프리카'] },
    { id: 'jinju',  name: '진주HUB',  c: T.success, crops: ['오이', '애호박'] },
    { id: 'hadong', name: '하동HUB',  c: T.warning, crops: ['방울토마토', '고추'] },
  ],
  crops: [
    {
      id: 'tomato', name: '토마토', bedCount: 24, totalPlants: 4800, surveyPlants: 24,
      health: 96, deviation: +4,  // +는 목표 초과 (성장 빠름), -는 부족
      lastSurvey: '2026-04-28',
      summary: { weeklyGrowth: 27, flowerClusterH: 202, fruitSetCluster: 7, totalFruit: 85, stemDia: 11.8 },
    },
    {
      id: 'strawberry', name: '딸기', bedCount: 12, totalPlants: 3600, surveyPlants: 18,
      health: 88, deviation: -3,
      lastSurvey: '2026-04-28',
      summary: { weeklyGrowth: 8, flowerClusterH: 32, fruitSetCluster: 4, totalFruit: 22, stemDia: 4.5 },
    },
    {
      id: 'paprika', name: '파프리카', bedCount: 18, totalPlants: 3600, surveyPlants: 18,
      health: 82, deviation: -8,
      lastSurvey: '2026-04-28', warn: true,
      summary: { weeklyGrowth: 18, flowerClusterH: 160, fruitSetCluster: 5, totalFruit: 58, stemDia: 12.4 },
    },
  ],
  // 표식주 — 한 작물에 고정 N개체 추적
  markerPlants: [
    // 토마토 8주
    { id: 'T-A-01', crop: '토마토', bed: 'A-01', row: 'N-1', no: 3, start: '2026-03-03', health: 'good', last: { weeklyGrowth: 28, leafLen: 39, leafWid: 32, leafPerStem: 24, stemDia: 12.0, flowerClusterH: 205, flowerClusterLen: 16, flowerCount: 5, fruitSetCluster: 7, harvestCluster: 5, totalFruit: 88 } },
    { id: 'T-A-02', crop: '토마토', bed: 'A-01', row: 'N-1', no: 15, start: '2026-03-03', health: 'good', last: { weeklyGrowth: 26, leafLen: 38, leafWid: 31, leafPerStem: 23, stemDia: 11.7, flowerClusterH: 198, flowerClusterLen: 15, flowerCount: 5, fruitSetCluster: 7, harvestCluster: 5, totalFruit: 82 } },
    { id: 'T-A-03', crop: '토마토', bed: 'A-02', row: 'N-3', no: 7, start: '2026-03-03', health: 'warn', note: '화방 길이 미달 · 경고', last: { weeklyGrowth: 20, leafLen: 34, leafWid: 28, leafPerStem: 20, stemDia: 11.0, flowerClusterH: 180, flowerClusterLen: 12, flowerCount: 3, fruitSetCluster: 5, harvestCluster: 3, totalFruit: 64 } },
    { id: 'T-A-04', crop: '토마토', bed: 'A-03', row: 'N-4', no: 12, start: '2026-03-03', health: 'good', last: { weeklyGrowth: 27, leafLen: 39, leafWid: 32, leafPerStem: 24, stemDia: 12.0, flowerClusterH: 210, flowerClusterLen: 16, flowerCount: 5, fruitSetCluster: 8, harvestCluster: 5, totalFruit: 92 } },
    { id: 'T-A-05', crop: '토마토', bed: 'A-04', row: 'N-6', no: 2, start: '2026-03-03', health: 'good', last: { weeklyGrowth: 25, leafLen: 37, leafWid: 31, leafPerStem: 23, stemDia: 11.8, flowerClusterH: 198, flowerClusterLen: 15, flowerCount: 4, fruitSetCluster: 6, harvestCluster: 4, totalFruit: 78 } },
    { id: 'T-A-06', crop: '토마토', bed: 'A-05', row: 'N-7', no: 9, start: '2026-03-03', health: 'good', last: { weeklyGrowth: 26, leafLen: 38, leafWid: 31, leafPerStem: 24, stemDia: 11.9, flowerClusterH: 201, flowerClusterLen: 16, flowerCount: 5, fruitSetCluster: 7, harvestCluster: 5, totalFruit: 86 } },
    { id: 'T-B-01', crop: '토마토', bed: 'B-01', row: 'S-1', no: 5, start: '2026-03-03', health: 'warn', note: '줄기 굵기 미달', last: { weeklyGrowth: 22, leafLen: 35, leafWid: 29, leafPerStem: 21, stemDia: 10.8, flowerClusterH: 188, flowerClusterLen: 14, flowerCount: 4, fruitSetCluster: 6, harvestCluster: 4, totalFruit: 72 } },
    { id: 'T-B-02', crop: '토마토', bed: 'B-02', row: 'S-3', no: 11, start: '2026-03-03', health: 'good', last: { weeklyGrowth: 28, leafLen: 40, leafWid: 33, leafPerStem: 25, stemDia: 12.1, flowerClusterH: 212, flowerClusterLen: 17, flowerCount: 6, fruitSetCluster: 8, harvestCluster: 6, totalFruit: 95 } },
  ],
  // 8주치 시계열 (표식주 평균)
  timeseries: {
    '토마토': Array.from({ length: 8 }, (_, i) => ({
      week: i + 1,
      label: `${i + 1}주차`,
      weeklyGrowth: [19, 21, 23, 25, 25, 26, 27, 27][i],
      leafLen:      [28, 31, 34, 36, 37, 38, 38, 39][i],
      flowerClusterH: [92, 108, 122, 138, 154, 172, 188, 202][i],
      fruitSetCluster: [1, 2, 3, 4, 5, 6, 7, 7][i],
      totalFruit:   [4, 10, 18, 28, 40, 55, 70, 85][i],
      stemDia:      [9.8, 10.6, 11.2, 11.6, 11.8, 11.9, 11.9, 11.8][i],
    })),
  },
  // 이상 기록
  incidents: [
    { id: 'i1', d: '2026-04-25', plant: 'T-A-03', crop: '토마토', type: '생육부진', note: '화방 길이 목표 대비 75%. 야간 기온 영향 추정.', photos: 2, reporter: '김반장', status: 'open' },
    { id: 'i2', d: '2026-04-22', plant: 'P-C-08', crop: '파프리카', type: '병해', note: '반점 세균병 의심 — 3개체 격리', photos: 4, reporter: '이반장', status: 'resolved' },
    { id: 'i3', d: '2026-04-20', plant: 'T-B-01', crop: '토마토', type: '생리장해', note: '하엽 황변 진행', photos: 1, reporter: '김반장', status: 'monitoring' },
  ],
};
export { GROWTH_SCHEMA, GR_DATA, STANDARD_CURVE };

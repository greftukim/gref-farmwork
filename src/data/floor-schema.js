// ═══════════════════════════════════════════════════════════
// 온실 평면도 + QR 추적 시스템 — 데이터
// 부산LAB 4개 동 (1cmp, 2cmp, 3cmp, 4cmp)
// ═══════════════════════════════════════════════════════════

// ─────── 동 구조 ───────
// cmp1/2: 거터 10 + 골 10 (오른쪽 끝 거터 바깥에도 골)
//   구조: [골10][거터10][골9][거터9]...[골1][거터1][골0*] ← 복도는 왼쪽
//   단, 맨 오른쪽 1번 거터 오른쪽에도 골 있음
// cmp3: 거터 8 + 골 7 (거터 사이만)
// cmp4: 행잉거터 20 + 골 19 (거터 사이만)
//
// 골 번호 규칙: 복도에서 바라봤을 때 왼쪽부터 10→1 (거터와 동일 방향)
// QR: 각 골마다 앞(F), 뒤(B) 2개

const HOUSE_CROPS = {
  '1cmp': '토마토',
  '2cmp': '토마토',
  '3cmp': '딸기',
  '4cmp': '파프리카',
};

const HOUSE_CONFIG = [
  { id: '1cmp', name: '1cmp', gutters: 10, gols: 10, hasRightGol: true, crop: '토마토' },
  { id: '2cmp', name: '2cmp', gutters: 10, gols: 10, hasRightGol: true, crop: '토마토' },
  { id: '3cmp', name: '3cmp', gutters: 8,  gols: 7,  hasRightGol: false, crop: '딸기' },
  { id: '4cmp', name: '4cmp', gutters: 20, gols: 19, hasRightGol: false, crop: '파프리카', hanging: true },
];

// ─────── 작업자 20명 (이미 정의된 패턴 재사용) ───────
const WORKERS_MAP = [
  { id: 'w01', name: '김민국', role: '반장', color: '#4F46E5' },
  { id: 'w02', name: '박서연', role: '정규직', color: '#059669' },
  { id: 'w03', name: '이준호', role: '정규직', color: '#D97706' },
  { id: 'w04', name: '정다은', role: '정규직', color: '#DC2626' },
  { id: 'w05', name: '최우진', role: '계약직', color: '#0891B2' },
  { id: 'w06', name: '강시아', role: '정규직', color: '#7C3AED' },
  { id: 'w07', name: '윤재현', role: '계약직', color: '#DB2777' },
  { id: 'w08', name: '임하늘', role: '정규직', color: '#CA8A04' },
  { id: 'w09', name: '한지우', role: '파트', color: '#14B8A6' },
  { id: 'w10', name: '조민아', role: '정규직', color: '#F97316' },
  { id: 'w11', name: '배현수', role: '계약직', color: '#8B5CF6' },
  { id: 'w12', name: '서윤아', role: '파트', color: '#10B981' },
];

const TASK_TYPES = {
  // speedSecPerM: 작업 표준속도 (한쪽 거터 1m 처리에 걸리는 초)
  //  * 골당 한쪽 거터 길이 20m 기준
  pruning:   { label: '적엽',   color: '#10B981', abbr: '적엽',   speedSecPerM: 38 }, // 20m ≈ 12.5분
  training:  { label: '유인',   color: '#3B82F6', abbr: '유인',   speedSecPerM: 48 }, // 20m ≈ 16분
  harvest:   { label: '수확',   color: '#F59E0B', abbr: '수확',   speedSecPerM: 30 }, // 20m ≈ 10분
  sorting:   { label: '선별',   color: '#8B5CF6', abbr: '선별',   speedSecPerM: 42 },
  planting:  { label: '정식',   color: '#EC4899', abbr: '정식',   speedSecPerM: 55 },
};

// 골 실물 길이 (m) — 한쪽 거터 기준
const GOL_LENGTH_M = 20;

// 작업자별 개인 속도 계수 (1.0 = 표준, 0.85 = 15% 더 빠름, 1.15 = 느림)
const WORKER_SPEED_FACTOR = {
  w01: 0.92, w02: 0.95, w03: 1.00, w04: 1.08, w05: 1.05,
  w06: 0.98, w07: 1.12, w08: 0.90, w09: 1.15, w10: 0.88,
  w11: 1.02, w12: 1.10,
};

// 거터 방향: 골 앞(F) = 복도 쪽 = bottom, 골 뒤(B) = 끝 = top
// 한쪽 거터 완료 후 반대쪽 거터는 뒤→앞으로 돌아옴
// scanPattern:
//  - F만 찍힘: 앞→뒤 이동 중 (오른쪽 거터부터 가정)
//  - F→B: 오른쪽 거터 완료, 왼쪽 거터 뒤→앞 이동 중
//  - F→B→F(again): 양쪽 모두 완료

// ─────── 골 상태 시뮬레이션 ───────
// progress: 0 (미작업) | 50 (반 완료) | 100 (완료)
// lastScan: 마지막 QR 스캔 위치 ('F' | 'B' | null)
// currentWorker: 현재 작업자 id | null
// taskType: 현재 작업 유형 | null
// hasIssue: 이상 신고 여부

// 현장 스냅샷 — 10:25 기준
const FIELD_STATE = {
  timestamp: '2026-04-21 10:25',
  gols: [
    // 1cmp (10개 골) — 적엽 작업 배정됨, 현재 4명 작업중
    { house: '1cmp', gol: 1,  progress: 100, lastScan: 'F-again', currentWorker: null, taskType: null, completedAt: '10:12', completedBy: 'w02' },
    { house: '1cmp', gol: 2,  progress: 100, lastScan: 'F-again', currentWorker: null, taskType: null, completedAt: '09:58', completedBy: 'w03' },
    { house: '1cmp', gol: 3,  progress: 50,  lastScan: 'B', currentWorker: null, taskType: null, scanHistory: [{at: '09:40', side: 'F', by: 'w02'}, {at: '10:08', side: 'B', by: 'w02'}] },
    { house: '1cmp', gol: 4,  progress: 50,  lastScan: 'F', currentWorker: 'w04', taskType: 'pruning', startedAt: '10:18', hasIssue: false },
    { house: '1cmp', gol: 5,  progress: 0,   lastScan: 'F', currentWorker: 'w05', taskType: 'pruning', startedAt: '10:22', hasIssue: false },
    { house: '1cmp', gol: 6,  progress: 50,  lastScan: 'F', currentWorker: 'w06', taskType: 'pruning', startedAt: '10:15', hasIssue: true, issueNote: '3번 거터 중간 황화 개체 발견', pausedAt: '10:20', pauseReason: '휴식', pauseTotalMin: 5 },
    { house: '1cmp', gol: 7,  progress: 0,   lastScan: 'F', currentWorker: 'w07', taskType: 'pruning', startedAt: '10:20', hasIssue: false },
    { house: '1cmp', gol: 8,  progress: 0,   lastScan: null, currentWorker: null, taskType: null },
    { house: '1cmp', gol: 9,  progress: 0,   lastScan: null, currentWorker: null, taskType: null },
    { house: '1cmp', gol: 10, progress: 0,   lastScan: null, currentWorker: null, taskType: null },

    // 2cmp (10개 골) — 유인 작업, 2명
    { house: '2cmp', gol: 1,  progress: 100, lastScan: 'F-again', currentWorker: null, taskType: null, completedAt: '09:45', completedBy: 'w08' },
    { house: '2cmp', gol: 2,  progress: 50,  lastScan: 'F', currentWorker: 'w08', taskType: 'training', startedAt: '10:10', hasIssue: false, pausedAt: null, pauseTotalMin: 8, pauseHistory: [{from: '10:16', to: '10:24', reason: '휴식'}] },
    { house: '2cmp', gol: 3,  progress: 0,   lastScan: 'F', currentWorker: 'w09', taskType: 'training', startedAt: '10:22', hasIssue: false },
    { house: '2cmp', gol: 4,  progress: 0,   lastScan: null, currentWorker: null, taskType: null },
    { house: '2cmp', gol: 5,  progress: 0,   lastScan: null, currentWorker: null, taskType: null },
    { house: '2cmp', gol: 6,  progress: 0,   lastScan: null, currentWorker: null, taskType: null },
    { house: '2cmp', gol: 7,  progress: 0,   lastScan: null, currentWorker: null, taskType: null },
    { house: '2cmp', gol: 8,  progress: 0,   lastScan: null, currentWorker: null, taskType: null },
    { house: '2cmp', gol: 9,  progress: 0,   lastScan: null, currentWorker: null, taskType: null },
    { house: '2cmp', gol: 10, progress: 0,   lastScan: null, currentWorker: null, taskType: null },

    // 3cmp (7개 골) — 딸기 수확, 3명
    { house: '3cmp', gol: 1, progress: 100, lastScan: 'F-again', currentWorker: null, taskType: null, completedAt: '10:00', completedBy: 'w10' },
    { house: '3cmp', gol: 2, progress: 100, lastScan: 'F-again', currentWorker: null, taskType: null, completedAt: '10:18', completedBy: 'w10' },
    { house: '3cmp', gol: 3, progress: 50,  lastScan: 'F', currentWorker: 'w10', taskType: 'harvest', startedAt: '10:20', hasIssue: false },
    { house: '3cmp', gol: 4, progress: 50,  lastScan: 'B', currentWorker: null, taskType: null, scanHistory: [{at: '09:30', side: 'F', by: 'w11'}, {at: '10:02', side: 'B', by: 'w11'}] },
    { house: '3cmp', gol: 5, progress: 0,   lastScan: 'F', currentWorker: 'w11', taskType: 'harvest', startedAt: '10:15', hasIssue: false },
    { house: '3cmp', gol: 6, progress: 0,   lastScan: 'F', currentWorker: 'w12', taskType: 'harvest', startedAt: '10:12', hasIssue: false },
    { house: '3cmp', gol: 7, progress: 0,   lastScan: null, currentWorker: null, taskType: null },

    // 4cmp (19개 골) — 정식 작업 완료 후 휴식 중
    ...Array.from({ length: 19 }, (_, i) => ({
      house: '4cmp', gol: i + 1,
      progress: i < 8 ? 100 : i < 12 ? 50 : 0,
      lastScan: i < 8 ? 'F-again' : i < 12 ? 'B' : null,
      currentWorker: null,
      taskType: null,
      completedAt: i < 8 ? '08:45' : null,
    })),
  ],
};

// ─────── 배정된 작업 (현재 진행중 태스크) ───────
const ACTIVE_ASSIGNMENTS = [
  { id: 'a1', house: '1cmp', taskType: 'pruning', workers: ['w04', 'w05', 'w06', 'w07'], startAt: '10:00', plannedEnd: '12:30', gols: 10, completedGols: 2 },
  { id: 'a2', house: '2cmp', taskType: 'training', workers: ['w08', 'w09'], startAt: '10:00', plannedEnd: '13:00', gols: 10, completedGols: 1 },
  { id: 'a3', house: '3cmp', taskType: 'harvest', workers: ['w10', 'w11', 'w12'], startAt: '09:00', plannedEnd: '11:30', gols: 7, completedGols: 2 },
];

// ─────── 오늘의 스캔 히스토리 (타임라인용) ───────
const SCAN_HISTORY = [
  { at: '08:45', house: '4cmp', gol: 1, side: 'F', by: 'w02', type: 'start' },
  { at: '08:48', house: '4cmp', gol: 2, side: 'F', by: 'w03', type: 'start' },
  { at: '09:02', house: '4cmp', gol: 1, side: 'B', by: 'w02', type: 'half' },
  { at: '09:10', house: '4cmp', gol: 3, side: 'F', by: 'w02', type: 'switch' },
  { at: '09:15', house: '4cmp', gol: 1, side: 'F', by: 'w04', type: 'complete' },
  { at: '09:30', house: '3cmp', gol: 4, side: 'F', by: 'w11', type: 'start' },
  { at: '09:40', house: '1cmp', gol: 3, side: 'F', by: 'w02', type: 'start' },
  { at: '09:45', house: '2cmp', gol: 1, side: 'F', by: 'w08', type: 'complete' },
  { at: '09:58', house: '1cmp', gol: 2, side: 'F', by: 'w03', type: 'complete' },
  { at: '10:00', house: '3cmp', gol: 1, side: 'F', by: 'w10', type: 'complete' },
  { at: '10:02', house: '3cmp', gol: 4, side: 'B', by: 'w11', type: 'half' },
  { at: '10:08', house: '1cmp', gol: 3, side: 'B', by: 'w02', type: 'half' },
  { at: '10:10', house: '2cmp', gol: 2, side: 'F', by: 'w08', type: 'start' },
  { at: '10:12', house: '1cmp', gol: 1, side: 'F', by: 'w02', type: 'complete' },
  { at: '10:12', house: '3cmp', gol: 6, side: 'F', by: 'w12', type: 'start' },
  { at: '10:15', house: '1cmp', gol: 6, side: 'F', by: 'w06', type: 'start' },
  { at: '10:15', house: '3cmp', gol: 5, side: 'F', by: 'w11', type: 'start' },
  { at: '10:18', house: '1cmp', gol: 4, side: 'F', by: 'w04', type: 'start' },
  { at: '10:18', house: '3cmp', gol: 2, side: 'F', by: 'w10', type: 'complete' },
  { at: '10:20', house: '1cmp', gol: 7, side: 'F', by: 'w07', type: 'start' },
  { at: '10:20', house: '3cmp', gol: 3, side: 'F', by: 'w10', type: 'start' },
  { at: '10:22', house: '1cmp', gol: 5, side: 'F', by: 'w05', type: 'start' },
  { at: '10:22', house: '2cmp', gol: 3, side: 'F', by: 'w09', type: 'start' },
];

// ─────── QR 인벤토리 ───────
// QR 코드 ID: {house}-{gol}-{F|B}  (예: 1cmp-05-F)
const QR_INVENTORY = [
  { id: '1cmp-01-F', house: '1cmp', gol: 1, side: 'F', status: 'active', issuedAt: '2025-12-15', lastScanAt: '10:12' },
  { id: '1cmp-01-B', house: '1cmp', gol: 1, side: 'B', status: 'active', issuedAt: '2025-12-15', lastScanAt: '09:55' },
  { id: '1cmp-04-F', house: '1cmp', gol: 4, side: 'F', status: 'active', issuedAt: '2025-12-15', lastScanAt: '10:18' },
  { id: '1cmp-04-B', house: '1cmp', gol: 4, side: 'B', status: 'active', issuedAt: '2025-12-15', lastScanAt: '08:02 (4/18)' },
  { id: '2cmp-07-F', house: '2cmp', gol: 7, side: 'F', status: 'damaged', issuedAt: '2025-12-15', lastScanAt: '3일 전', note: '비닐 찢어짐 · 재발급 필요' },
  { id: '3cmp-02-B', house: '3cmp', gol: 2, side: 'B', status: 'lost',    issuedAt: '2025-12-15', lastScanAt: '7일 전', note: '분실 신고 · 재발급 대기' },
  { id: '4cmp-15-F', house: '4cmp', gol: 15, side: 'F', status: 'retired', issuedAt: '2024-11-20', note: '24년 작기 종료 · 폐기' },
];

// 상태별 카운트
const QR_TOTALS = {
  total: 1 * 2 * (HOUSE_CONFIG[0].gols + HOUSE_CONFIG[1].gols + HOUSE_CONFIG[2].gols + HOUSE_CONFIG[3].gols), // 앞+뒤 × 전체 골
  active: 88,
  damaged: 3,
  lost: 2,
  retired: 1,
};

export {
  HOUSE_CONFIG, HOUSE_CROPS, WORKERS_MAP, TASK_TYPES,
  FIELD_STATE, ACTIVE_ASSIGNMENTS, SCAN_HISTORY,
  QR_INVENTORY, QR_TOTALS,
  GOL_LENGTH_M, WORKER_SPEED_FACTOR,
};

// store 구독 미존재 패턴 감사 (교훈 93)
// useXxxStore((s) => s.key) 에서 key가 해당 store에 없는 경우 출력
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const STORES_DIR = path.join(ROOT, 'src', 'stores');
const PAGES_DIR = path.join(ROOT, 'src', 'pages');

// store 파일별 정의된 최상위 state/action 키 추출
function extractStoreKeys(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const keys = new Set();
  // create((set, get) => ({ KEY: ..., }) 패턴
  const stateBlock = content.match(/create\(\s*(?:\([^)]*\))\s*=>\s*\(\{([\s\S]*)\}\)\)/);
  if (stateBlock) {
    const body = stateBlock[1];
    // 최상위 키: 줄 시작 or { 직후 "key:"
    const keyMatches = body.matchAll(/^\s{2}(\w+)\s*:/gm);
    for (const m of keyMatches) keys.add(m[1]);
  }
  return keys;
}

// store 이름 → 파일 매핑
const STORE_MAP = {
  useEmployeeStore: 'employeeStore.js',
  useAttendanceStore: 'attendanceStore.js',
  useLeaveStore: 'leaveStore.js',
  useOvertimeStore: 'overtimeStore.js',
  useTaskStore: 'taskStore.js',
  useIssueStore: 'issueStore.js',
  useNoticeStore: 'noticeStore.js',
  useBranchStore: 'branchStore.js',
  useHarvestStore: 'harvestStore.js',
  useSafetyCheckStore: 'safetyCheckStore.js',
  useAuthStore: 'authStore.js',
  useChatStore: 'chatStore.js',
  useDailyWorkLogStore: 'dailyWorkLogStore.js',
};

const storeKeys = {};
for (const [storeName, storeFile] of Object.entries(STORE_MAP)) {
  const filePath = path.join(STORES_DIR, storeFile);
  if (fs.existsSync(filePath)) {
    storeKeys[storeName] = extractStoreKeys(filePath);
  }
}

// 페이지 파일 탐색
function walkDir(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkDir(full));
    else if (entry.name.endsWith('.jsx') || entry.name.endsWith('.js')) files.push(full);
  }
  return files;
}

const pageFiles = walkDir(PAGES_DIR);

let found = 0, missing = 0;
const missingList = [];

for (const file of pageFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const [storeName, keys] of Object.entries(storeKeys)) {
      // 패턴: useXxxStore((s) => s.key) 또는 useXxxStore(state => state.key)
      const re = new RegExp(`${storeName}\\(\\s*(?:\\([^)]*\\)|\\w+)\\s*=>\\s*(?:\\([^)]*\\)|\\w+)\\.([a-zA-Z_][a-zA-Z0-9_]*)`, 'g');
      let m;
      while ((m = re.exec(line)) !== null) {
        const key = m[1];
        found++;
        if (keys.size > 0 && !keys.has(key)) {
          const entry = `  ❌ ${rel}:${i+1} — ${storeName}((s) => s.${key}) [MISSING]`;
          missingList.push(entry);
          missing++;
        }
      }
    }
  }
}

console.log('=== store 구독 미존재 패턴 감사 (교훈 93) ===\n');
if (missingList.length === 0) {
  console.log('✅ 미존재 구독 0건 — 모두 정상');
} else {
  console.log(`❌ 미존재 구독 ${missing}건:\n`);
  missingList.forEach(l => console.log(l));
}
console.log(`\n합계: 총 ${found}건 확인, 미존재 ${missing}건`);

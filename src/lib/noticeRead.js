// 공지 읽음 처리 — localStorage 기반 (트랙 77 U4, G77-F)
// 의도: DB notices.read_by 컬럼 미존재(noticeStore.js:40 주석 참조).
//   → 다중 디바이스 동기화는 향후 별도 라운드 (notice_reads 테이블 + RLS).
//   → 본 라운드는 디바이스별 localStorage 영속 처리로 BottomNav 빨간점 안정화.
//
// 키 스키마: `notices_read_<userId>` → JSON 배열 (notice_id 문자열 목록)

const KEY = (userId) => `notices_read_${userId || 'anon'}`;

export const getReadIds = (userId) => {
  if (!userId) return new Set();
  try {
    const raw = localStorage.getItem(KEY(userId));
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
};

export const markReadLocal = (noticeId, userId) => {
  if (!noticeId || !userId) return;
  try {
    const set = getReadIds(userId);
    if (set.has(noticeId)) return;
    set.add(noticeId);
    localStorage.setItem(KEY(userId), JSON.stringify([...set]));
  } catch {
    // localStorage 사용 불가(SSR/시크릿모드 한계) — silent fail
  }
};

export const getUnreadCount = (notices, userId) => {
  if (!Array.isArray(notices) || !userId) return 0;
  const readIds = getReadIds(userId);
  return notices.filter((n) => n?.id && !readIds.has(n.id)).length;
};

export const isRead = (noticeId, userId) => {
  if (!noticeId || !userId) return false;
  return getReadIds(userId).has(noticeId);
};

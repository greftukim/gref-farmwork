/**
 * TBM 위험 템플릿 매칭 유틸 (순수함수, 동기)
 * 결정적 정렬용 해시 — 보안용 아님, djb2 기반
 */

function djb2(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * 위험 템플릿 매칭 + 결정적 셔플 후 상위 5건 반환
 * @param {Array} templates - snakeToCamel 변환된 템플릿 배열 [{id, cropId, taskKeyword, riskFactor, mitigation, ...}]
 * @param {string[]} taskTitles - 오늘 배정된 작업 title 배열
 * @param {string} workerId - 작업자 UUID
 * @param {string} date - YYYY-MM-DD
 * @returns {Array<{id, riskFactor, mitigation}>} 최대 5건
 */
export function matchRiskTemplates(templates, taskTitles, workerId, date) {
  const titles = (taskTitles || []).map((t) => t.toLowerCase());

  const matched = templates.filter((tpl) => {
    if (!tpl.taskKeyword) return true;
    if (titles.length === 0) return false;
    const kw = tpl.taskKeyword.toLowerCase();
    return titles.some((title) => title.includes(kw));
  });

  const hashed = matched.map((tpl) => ({
    tpl,
    hash: djb2(date + workerId + tpl.id),
  }));

  hashed.sort((a, b) => a.hash - b.hash);

  return hashed.slice(0, 5).map(({ tpl }) => ({
    id: tpl.id,
    riskFactor: tpl.riskFactor,
    mitigation: tpl.mitigation,
  }));
}

// 수동 테스트:
// const templates = [
//   {id: 'aaa', taskKeyword: '적엽', riskFactor: 'x', mitigation: 'y'},
//   {id: 'bbb', taskKeyword: null, riskFactor: 'z', mitigation: 'w'},
//   {id: 'ccc', taskKeyword: '수확', riskFactor: 'a', mitigation: 'b'},
// ];
// matchRiskTemplates(templates, ['토마토 적엽'], 'worker1', '2026-04-11')
// 기대: 적엽 매칭(id=aaa) + 공통(id=bbb), 수확(ccc)은 제외. 2건 반환.

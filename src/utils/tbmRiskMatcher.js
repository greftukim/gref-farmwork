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
 * @param {string[]} cropIds - 대상 작물 UUID 배열 (빈 배열이면 공통만)
 * @param {string[]} taskTitles - 오늘 배정된 작업 title 배열
 * @param {string} workerId - 작업자 UUID
 * @param {string} date - YYYY-MM-DD
 * @returns {Array<{id, riskFactor, mitigation}>} 최대 5건
 */
export function matchRiskTemplates(templates, cropIds, taskTitles, workerId, date) {
  const ids = cropIds || [];
  const titles = (taskTitles || []).map((t) => t.toLowerCase());

  const matched = templates.filter((tpl) => {
    if (tpl.cropId !== null && !ids.includes(tpl.cropId)) return false;
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
//   {id: 'aaa', cropId: 'crop-tomato', taskKeyword: '적엽', riskFactor: 'x', mitigation: 'y'},
//   {id: 'bbb', cropId: null, taskKeyword: null, riskFactor: 'z', mitigation: 'w'},
//   {id: 'ccc', cropId: 'crop-cucumber', taskKeyword: '수확', riskFactor: 'a', mitigation: 'b'},
// ];
// matchRiskTemplates(templates, ['crop-tomato', 'crop-cucumber'], ['토마토 적엽', '오이 유인'], 'worker1', '2026-04-11')
// 기대: 토마토 적엽(aaa) + 공통(bbb) + 오이 수확은 keyword '수확'이 title에 없으므로 제외. 2건 반환.

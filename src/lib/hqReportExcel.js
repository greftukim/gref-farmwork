import * as XLSX from 'xlsx';

const BRANCH_NAME = { busan: '부산LAB', jinju: '진주HUB', hadong: '하동HUB' };

export function downloadHQReportExcel(branches, totalWorkers, totalCheckedIn, totalHarvest) {
  const today = new Date().toISOString().slice(0, 10);
  const wb = XLSX.utils.book_new();

  // 시트 1: 지점별 현황
  const branchRows = [
    ['지점코드', '지점명', '직원수', '출근수', '출근률(%)', '월수확량(kg)', '목표(kg)', '달성률(%)'],
    ...branches.map(b => [
      b.code,
      b.name,
      b.workers,
      b.checkedIn ?? '—',
      b.rate,
      b.harvest,
      b.harvestT || 0,
      b.harvestT > 0 ? Math.round(b.harvest / b.harvestT * 100) : '—',
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(branchRows), '지점별현황');

  // 시트 2: 전사 KPI
  const kpiRows = [
    ['기준일', '총직원수', '총출근수', '전사가동률(%)', '총수확량(kg)'],
    [today, totalWorkers, totalCheckedIn, totalWorkers > 0 ? Math.round(totalCheckedIn / totalWorkers * 100) : 0, totalHarvest],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(kpiRows), '전사KPI');

  XLSX.writeFile(wb, `gref_HQ리포트_${today}.xlsx`);
}

export function downloadCropReportExcel(branchCropData, trendData, selectedCrop) {
  const today = new Date().toISOString().slice(0, 10);
  const wb = XLSX.utils.book_new();

  // 시트 1: 지점×작물 교차표
  const allCrops = [...new Set(
    Object.values(branchCropData).flatMap(d => Object.keys(d))
  )].sort();
  const crossRows = [
    ['지점', ...allCrops],
    ...Object.entries(branchCropData).map(([code, crops]) => [
      BRANCH_NAME[code] || code,
      ...allCrops.map(c => crops[c] ? Math.round(crops[c] * 10) / 10 : 0),
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(crossRows), '지점×작물');

  // 시트 2: 선택 작물 30일 추이 (selectedCrop 있을 때만)
  if (trendData && trendData.length > 0 && selectedCrop) {
    const branchLabel = BRANCH_NAME[selectedCrop.branch] || selectedCrop.branch;
    const trendRows = [
      [`${branchLabel} — ${selectedCrop.crop} 최근 30일 추이`],
      ['날짜', '수확량(kg)'],
      ...trendData.map(d => [d.date, d.qty]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(trendRows), '30일추이');
  }

  XLSX.writeFile(wb, `gref_작물보고서_${today}.xlsx`);
}

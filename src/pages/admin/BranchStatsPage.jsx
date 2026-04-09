import Card from '../../components/common/Card';

export default function BranchStatsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-900">지점별 성과</h1>
      <Card accent="gray" className="p-8">
        <div className="flex flex-col items-center justify-center text-center py-8">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-base font-semibold text-gray-700 mb-1">준비 중</p>
          <p className="text-sm text-gray-500">이 페이지는 Phase 5에서 구현 예정입니다</p>
        </div>
      </Card>
    </div>
  );
}

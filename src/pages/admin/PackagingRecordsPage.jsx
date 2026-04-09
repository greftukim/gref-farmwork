import Card from '../../components/common/Card';

export default function PackagingRecordsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-900">포장 실적</h1>
      <Card accent="gray" className="p-8">
        <div className="flex flex-col items-center justify-center text-center py-8">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <p className="text-base font-semibold text-gray-700 mb-1">준비 중</p>
          <p className="text-sm text-gray-500">이 페이지는 Phase 4에서 구현 예정입니다</p>
        </div>
      </Card>
    </div>
  );
}

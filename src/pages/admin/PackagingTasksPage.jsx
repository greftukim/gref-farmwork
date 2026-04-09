import Card from '../../components/common/Card';

export default function PackagingTasksPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-900">포장 작업 지시</h1>
      <Card accent="gray" className="p-8">
        <div className="flex flex-col items-center justify-center text-center py-8">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-base font-semibold text-gray-700 mb-1">준비 중</p>
          <p className="text-sm text-gray-500">이 페이지는 Phase 4에서 구현 예정입니다</p>
        </div>
      </Card>
    </div>
  );
}

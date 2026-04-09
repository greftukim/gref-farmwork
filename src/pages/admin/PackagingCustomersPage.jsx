import Card from '../../components/common/Card';

export default function PackagingCustomersPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-900">출하처 관리</h1>
      <Card accent="gray" className="p-8">
        <div className="flex flex-col items-center justify-center text-center py-8">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className="text-base font-semibold text-gray-700 mb-1">준비 중</p>
          <p className="text-sm text-gray-500">이 페이지는 Phase 4에서 구현 예정입니다</p>
        </div>
      </Card>
    </div>
  );
}

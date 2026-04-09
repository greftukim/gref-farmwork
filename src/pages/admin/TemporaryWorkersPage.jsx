import Card from '../../components/common/Card';

export default function TemporaryWorkersPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-900">일용직/시급제 관리</h1>
      <Card accent="gray" className="p-8">
        <div className="flex flex-col items-center justify-center text-center py-8">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <p className="text-base font-semibold text-gray-700 mb-1">준비 중</p>
          <p className="text-sm text-gray-500">이 페이지는 Phase 3에서 구현 예정입니다</p>
        </div>
      </Card>
    </div>
  );
}

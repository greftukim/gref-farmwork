import { useEffect, useState } from 'react';
import useAuthStore from '../../stores/authStore';
import useDailyWorkLogStore from '../../stores/dailyWorkLogStore';
import { isFarmAdmin } from '../../lib/permissions';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import DailyWorkLogFormModal from '../../components/dailyWorkLogs/DailyWorkLogFormModal';
import { downloadDailyExcel } from '../../lib/dailyWorkLogExcel';

const BRANCH_OPTIONS = [
  { value: 'busan', label: '부산LAB' },
  { value: 'jinju', label: '진주' },
  { value: 'hadong', label: '하동' },
];
const BRANCH_LABEL = { busan: '부산LAB', jinju: '진주', hadong: '하동' };

// [TEMP-DECISION-1] payment_status 2단계. 박민식·김민국 답 수신 시 옵션 확장
const PAYMENT_LABEL = { pending: '미지급', paid: '지급완료' };

function formatWon(n) {
  if (n == null) return '—';
  return n.toLocaleString('ko-KR') + '원';
}

function formatTime(t) {
  // 교훈 3: Supabase TIME 컬럼 → 'HH:MM:SS'. input에는 slice(0,5)
  if (!t) return '—';
  return String(t).slice(0, 5);
}

export default function DailyWorkLogsPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const logs      = useDailyWorkLogStore((s) => s.logs);
  const loading   = useDailyWorkLogStore((s) => s.loading);
  const error     = useDailyWorkLogStore((s) => s.error);
  const fetchByDate = useDailyWorkLogStore((s) => s.fetchByDate);
  const deleteLog   = useDailyWorkLogStore((s) => s.deleteLog);
  const clearError  = useDailyWorkLogStore((s) => s.clearError);

  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate]     = useState(todayStr);
  const [selectedBranch, setSelectedBranch] = useState(
    isFarmAdmin(currentUser) ? currentUser.branch : 'busan'
  );
  const effectiveBranch = isFarmAdmin(currentUser) ? currentUser.branch : selectedBranch;

  // 모달 상태
  const [createOpen, setCreateOpen]   = useState(false);
  const [editTarget, setEditTarget]   = useState(null); // log 객체
  const [deleteTarget, setDeleteTarget] = useState(null); // log id
  const [deleting, setDeleting]       = useState(false);

  useEffect(() => {
    fetchByDate(selectedDate, effectiveBranch);
  }, [selectedDate, effectiveBranch, fetchByDate]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await deleteLog(deleteTarget);
    setDeleting(false);
    setDeleteTarget(null);
  };

  const totalDailyWage = logs.reduce((sum, l) => sum + (l.dailyWage || 0), 0);

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-bold text-gray-900">일용직/시급제 임금 장부</h1>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="md"
            disabled={logs.length === 0}
            title={logs.length === 0 ? '조회된 데이터가 없습니다' : '현재 날짜 데이터를 엑셀로 다운로드'}
            onClick={() =>
              downloadDailyExcel(logs, {
                branchLabel: BRANCH_LABEL[effectiveBranch] || effectiveBranch,
                dateLabel: selectedDate,
              })
            }
            className="active:scale-[0.98]"
          >
            엑셀 다운로드
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="active:scale-[0.98]">
            + 등록
          </Button>
        </div>
      </div>

      {/* 필터 행 */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[44px]"
        />
        {isFarmAdmin(currentUser) ? (
          <span className="text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded-lg min-h-[44px] flex items-center">
            {BRANCH_LABEL[currentUser.branch] || currentUser.branch}
          </span>
        ) : (
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[44px]"
          >
            {BRANCH_OPTIONS.map((b) => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>
        )}
      </div>

      {/* 에러 배너 */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-600 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={clearError} className="ml-2 text-red-400 hover:text-red-600 min-h-[32px] px-1">✕</button>
        </div>
      )}

      {/* 로딩 */}
      {loading && <p className="text-gray-400 text-sm text-center py-8">로딩 중...</p>}

      {/* 목록 */}
      {!loading && (
        <Card accent="gray" className="overflow-hidden">
          {logs.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-12">
              해당 날짜에 등록된 일용직 기록이 없습니다
            </p>
          ) : (
            <>
              {/* 데스크탑 테이블 */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-500">
                      <th className="px-4 py-2.5 font-medium">이름</th>
                      <th className="px-4 py-2.5 font-medium">시작·종료</th>
                      <th className="px-4 py-2.5 font-medium text-right">휴게(분)</th>
                      <th className="px-4 py-2.5 font-medium text-right">근무(분)</th>
                      <th className="px-4 py-2.5 font-medium text-right">시급</th>
                      <th className="px-4 py-2.5 font-medium text-right">일당</th>
                      <th className="px-4 py-2.5 font-medium">지급</th>
                      <th className="px-4 py-2.5 font-medium" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-900">{log.workerName}</td>
                        <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                          {formatTime(log.startTime)} ~ {formatTime(log.endTime)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-600">
                          {log.breakMinutes != null ? log.breakMinutes : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-600">
                          {log.workMinutes ?? '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-600">
                          {formatWon(log.hourlyWage)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-gray-900">
                          {formatWon(log.dailyWage)}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            log.paymentStatus === 'paid'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {PAYMENT_LABEL[log.paymentStatus] || log.paymentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1">
                            <button
                              onClick={() => setEditTarget(log)}
                              className="text-xs text-blue-600 hover:text-blue-800 min-h-[32px] px-2 rounded"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => setDeleteTarget(log.id)}
                              className="text-xs text-red-500 hover:text-red-700 min-h-[32px] px-2 rounded"
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 모바일 카드 뷰 */}
              <div className="md:hidden divide-y divide-gray-100">
                {logs.map((log) => (
                  <div key={log.id} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">{log.workerName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        log.paymentStatus === 'paid'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {PAYMENT_LABEL[log.paymentStatus]}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      {formatTime(log.startTime)} ~ {formatTime(log.endTime)}
                      {log.breakMinutes != null ? ` · 휴게 ${log.breakMinutes}분` : ''}
                      {' · '}{log.workMinutes ?? '?'}분
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatWon(log.dailyWage)}
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditTarget(log)}
                          className="text-xs text-blue-600 min-h-[32px] px-2"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => setDeleteTarget(log.id)}
                          className="text-xs text-red-500 min-h-[32px] px-2"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 합계 행 */}
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-sm">
                <span className="text-gray-500">합계 <span className="font-medium text-gray-700">{logs.length}명</span></span>
                <span className="font-bold text-gray-900">{formatWon(totalDailyWage)}</span>
              </div>
            </>
          )}
        </Card>
      )}

      {/* 등록 모달 */}
      {createOpen && (
        <DailyWorkLogFormModal
          mode="create"
          defaultDate={selectedDate}
          defaultBranch={effectiveBranch}
          currentUser={currentUser}
          onClose={() => setCreateOpen(false)}
          onSaved={() => setCreateOpen(false)}
        />
      )}

      {/* 수정 모달 */}
      {editTarget && (
        <DailyWorkLogFormModal
          mode="edit"
          initialData={editTarget}
          defaultDate={selectedDate}
          defaultBranch={effectiveBranch}
          currentUser={currentUser}
          onClose={() => setEditTarget(null)}
          onSaved={() => setEditTarget(null)}
        />
      )}

      {/* 삭제 확인 모달 */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="삭제 확인">
        <p className="text-sm text-gray-600 mb-6">
          이 기록을 삭제하면 복구할 수 없습니다. 삭제하시겠습니까?
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setDeleteTarget(null)}
          >
            취소
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            disabled={deleting}
            onClick={handleDelete}
          >
            {deleting ? '삭제 중...' : '삭제'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

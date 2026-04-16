import { useEffect, useMemo, useState } from 'react';
import useAuthStore from '../../stores/authStore';
import useDailyWorkLogStore from '../../stores/dailyWorkLogStore';
import { isFarmAdmin } from '../../lib/permissions';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import DailyWorkLogFormModal from '../../components/dailyWorkLogs/DailyWorkLogFormModal';
import {
  downloadDailyExcel,
  downloadMonthlyExcel,
  aggregateByPerson,
} from '../../lib/dailyWorkLogExcel';
import { BRANCH_OPTIONS, BRANCH_LABEL } from '../../constants/branchLabels';

// [TEMP-DECISION-1] payment_status 2단계. 박민식·김민국 답 수신 시 옵션 확장
const PAYMENT_LABEL = { pending: '미지급', paid: '지급완료' };

const TABS = [
  { id: 'daily',   label: '일별 보기' },
  { id: 'monthly', label: '월별 보기' },
];

function formatWon(n) {
  if (n == null) return '—';
  return n.toLocaleString('ko-KR') + '원';
}

function formatTime(t) {
  // 교훈 3: Supabase TIME 컬럼 → 'HH:MM:SS'. input에는 slice(0,5)
  if (!t) return '—';
  return String(t).slice(0, 5);
}

function currentMonthStr() {
  return new Date().toISOString().slice(0, 7); // 'YYYY-MM'
}

// 브랜치 셀렉터 공용 컴포넌트 (일별/월별 공통)
function BranchFilter({ currentUser, selectedBranch, onChangeBranch }) {
  if (isFarmAdmin(currentUser)) {
    return (
      <span className="text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded-lg min-h-[44px] flex items-center">
        {BRANCH_LABEL[currentUser.branch] || currentUser.branch}
      </span>
    );
  }
  return (
    <select
      value={selectedBranch}
      onChange={(e) => onChangeBranch(e.target.value)}
      className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[44px]"
    >
      {BRANCH_OPTIONS.map((b) => (
        <option key={b.value} value={b.value}>{b.label}</option>
      ))}
    </select>
  );
}

// 로그 테이블 공용 컴포넌트 (일별/월별 전체 내역 공용)
// showActions: 수정/삭제 버튼 표시 여부 (일별 보기만 true)
function LogsTable({ logs, showActions, onEdit, onDelete }) {
  const total = logs.reduce((s, l) => s + (l.dailyWage || 0), 0);

  if (logs.length === 0) {
    return (
      <p className="text-gray-400 text-sm text-center py-12">등록된 기록이 없습니다</p>
    );
  }

  return (
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
              {showActions && <th className="px-4 py-2.5 font-medium" />}
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
                <td className="px-4 py-2.5 text-right text-gray-600">{log.workMinutes ?? '—'}</td>
                <td className="px-4 py-2.5 text-right text-gray-600">{formatWon(log.hourlyWage)}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{formatWon(log.dailyWage)}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    log.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {PAYMENT_LABEL[log.paymentStatus] || log.paymentStatus}
                  </span>
                </td>
                {showActions && (
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => onEdit(log)}
                        className="text-xs text-blue-600 hover:text-blue-800 min-h-[32px] px-2 rounded">수정</button>
                      <button onClick={() => onDelete(log.id)}
                        className="text-xs text-red-500 hover:text-red-700 min-h-[32px] px-2 rounded">삭제</button>
                    </div>
                  </td>
                )}
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
                log.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
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
              <span className="text-sm font-semibold text-gray-900">{formatWon(log.dailyWage)}</span>
              {showActions && (
                <div className="flex gap-1">
                  <button onClick={() => onEdit(log)} className="text-xs text-blue-600 min-h-[32px] px-2">수정</button>
                  <button onClick={() => onDelete(log.id)} className="text-xs text-red-500 min-h-[32px] px-2">삭제</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 합계 행 */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-sm">
        <span className="text-gray-500">합계 <span className="font-medium text-gray-700">{logs.length}건</span></span>
        <span className="font-bold text-gray-900">{formatWon(total)}</span>
      </div>
    </>
  );
}

export default function DailyWorkLogsPage() {
  const currentUser   = useAuthStore((s) => s.currentUser);
  const logs          = useDailyWorkLogStore((s) => s.logs);
  const loading       = useDailyWorkLogStore((s) => s.loading);
  const error         = useDailyWorkLogStore((s) => s.error);
  const fetchByDate   = useDailyWorkLogStore((s) => s.fetchByDate);
  const fetchByMonth  = useDailyWorkLogStore((s) => s.fetchByMonth);
  const deleteLog     = useDailyWorkLogStore((s) => s.deleteLog);
  const clearError    = useDailyWorkLogStore((s) => s.clearError);

  const todayStr = new Date().toISOString().slice(0, 10);

  // 탭
  const [activeTab, setActiveTab] = useState('daily');

  // 일별 필터
  const [selectedDate, setSelectedDate]     = useState(todayStr);
  const [selectedBranch, setSelectedBranch] = useState(
    isFarmAdmin(currentUser) ? currentUser.branch : 'busan'
  );

  // 월별 필터
  const [selectedMonth, setSelectedMonth]       = useState(currentMonthStr);
  const [selectedMonthBranch, setSelectedMonthBranch] = useState(
    isFarmAdmin(currentUser) ? currentUser.branch : 'busan'
  );

  const effectiveBranch = isFarmAdmin(currentUser)
    ? currentUser.branch
    : (activeTab === 'daily' ? selectedBranch : selectedMonthBranch);

  // 탭/필터 변경 시 조회
  useEffect(() => {
    if (activeTab === 'daily') {
      fetchByDate(selectedDate, effectiveBranch);
    } else {
      fetchByMonth(selectedMonth, effectiveBranch);
    }
  }, [activeTab, selectedDate, selectedMonth, effectiveBranch, fetchByDate, fetchByMonth]);

  // 모달 상태 (일별 전용)
  const [createOpen, setCreateOpen]     = useState(false);
  const [editTarget, setEditTarget]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await deleteLog(deleteTarget);
    setDeleting(false);
    setDeleteTarget(null);
  };

  // 사람별 집계 (월별 탭 — 도메인 노트 D-2: worker_name group by, 동명이인 합쳐짐)
  const peopleSummary = useMemo(
    () => (activeTab === 'monthly' ? aggregateByPerson(logs) : []),
    [activeTab, logs]
  );

  const branchLabel = BRANCH_LABEL[effectiveBranch] || effectiveBranch;

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-bold text-gray-900">일용직/시급제 임금 장부</h1>
        <div className="flex gap-2">
          {/* 엑셀 버튼 — 탭에 따라 다른 함수 호출 */}
          <Button
            variant="secondary"
            disabled={logs.length === 0}
            title={logs.length === 0 ? '조회된 데이터가 없습니다' : '엑셀 다운로드'}
            onClick={() => {
              if (activeTab === 'daily') {
                downloadDailyExcel(logs, { branchLabel, dateLabel: selectedDate });
              } else {
                downloadMonthlyExcel(logs, { branchLabel, monthLabel: selectedMonth });
              }
            }}
            className="active:scale-[0.98]"
          >
            엑셀 다운로드
          </Button>
          {/* 등록 버튼 — 일별 탭에서만 표시 */}
          {activeTab === 'daily' && (
            <Button onClick={() => setCreateOpen(true)} className="active:scale-[0.98]">
              + 등록
            </Button>
          )}
        </div>
      </div>

      {/* 탭 바 — GrowthSurveyAdminPage 패턴 */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 에러 배너 (공통) */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-600 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={clearError} className="ml-2 text-red-400 hover:text-red-600 min-h-[32px] px-1">✕</button>
        </div>
      )}

      {/* ── 일별 탭 ───────────────────────────────────────────────────── */}
      {activeTab === 'daily' && (
        <>
          {/* 필터 행 */}
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[44px]"
            />
            <BranchFilter
              currentUser={currentUser}
              selectedBranch={selectedBranch}
              onChangeBranch={setSelectedBranch}
            />
          </div>

          {loading && <p className="text-gray-400 text-sm text-center py-8">로딩 중...</p>}
          {!loading && (
            <Card accent="gray" className="overflow-hidden">
              <LogsTable
                logs={logs}
                showActions
                onEdit={setEditTarget}
                onDelete={setDeleteTarget}
              />
            </Card>
          )}
        </>
      )}

      {/* ── 월별 탭 ───────────────────────────────────────────────────── */}
      {activeTab === 'monthly' && (
        <>
          {/* 필터 행 */}
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[44px]"
            />
            <BranchFilter
              currentUser={currentUser}
              selectedBranch={selectedMonthBranch}
              onChangeBranch={setSelectedMonthBranch}
            />
          </div>

          {loading && <p className="text-gray-400 text-sm text-center py-8">로딩 중...</p>}

          {!loading && (
            <>
              {/* 사람별 집계 카드 */}
              <Card accent="gray" className="overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <span className="text-sm font-semibold text-gray-700">
                    사람별 집계 <span className="font-normal text-gray-400 ml-1">{peopleSummary.length}명</span>
                  </span>
                </div>
                {peopleSummary.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">데이터가 없습니다</p>
                ) : (
                  <>
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-left text-gray-500">
                            <th className="px-4 py-2.5 font-medium">이름</th>
                            <th className="px-4 py-2.5 font-medium text-right">근무일수</th>
                            <th className="px-4 py-2.5 font-medium text-right">총 근무시간(분)</th>
                            <th className="px-4 py-2.5 font-medium text-right">총 일당</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {peopleSummary.map((p) => (
                            <tr key={p.name} className="hover:bg-gray-50">
                              <td className="px-4 py-2.5 font-medium text-gray-900">{p.name}</td>
                              <td className="px-4 py-2.5 text-right text-gray-600">{p.days}일</td>
                              <td className="px-4 py-2.5 text-right text-gray-600">{p.totalMinutes}분</td>
                              <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{formatWon(p.totalWage)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* 모바일 */}
                    <div className="md:hidden divide-y divide-gray-100">
                      {peopleSummary.map((p) => (
                        <div key={p.name} className="px-4 py-3 flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{p.name}</div>
                            <div className="text-xs text-gray-500">{p.days}일 · {p.totalMinutes}분</div>
                          </div>
                          <span className="font-semibold text-gray-900">{formatWon(p.totalWage)}</span>
                        </div>
                      ))}
                    </div>
                    {/* 합계 */}
                    <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-sm">
                      <span className="text-gray-500">합계 <span className="font-medium text-gray-700">{peopleSummary.length}명</span></span>
                      <span className="font-bold text-gray-900">
                        {formatWon(peopleSummary.reduce((s, p) => s + p.totalWage, 0))}
                      </span>
                    </div>
                  </>
                )}
              </Card>

              {/* 전체 내역 카드 */}
              <Card accent="gray" className="overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <span className="text-sm font-semibold text-gray-700">
                    전체 내역 <span className="font-normal text-gray-400 ml-1">{logs.length}건</span>
                  </span>
                </div>
                <LogsTable logs={logs} showActions={false} />
              </Card>
            </>
          )}
        </>
      )}

      {/* ── 모달 (일별 탭 전용) ──────────────────────────────────────── */}
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
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="삭제 확인">
        <p className="text-sm text-gray-600 mb-6">
          이 기록을 삭제하면 복구할 수 없습니다. 삭제하시겠습니까?
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleteTarget(null)}>취소</Button>
          <Button variant="danger" className="flex-1" disabled={deleting} onClick={handleDelete}>
            {deleting ? '삭제 중...' : '삭제'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

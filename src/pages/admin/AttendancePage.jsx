import { useState, useMemo } from 'react';
import useAttendanceStore from '../../stores/attendanceStore';
import useEmployeeStore from '../../stores/employeeStore';
import useAuthStore from '../../stores/authStore';
import Card from '../../components/common/Card';
import { isFarmAdmin } from '../../lib/permissions';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

const BRANCH_LABEL = { busan: '부산LAB', jinju: '진주', hadong: '하동' };
const BRANCH_ORDER = ['busan', 'jinju', 'hadong', ''];

function formatTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function formatMinutes(min) {
  if (!min) return '—';
  return `${Math.floor(min / 60)}시간 ${min % 60}분`;
}
const STATUS_LABEL = { normal: '정상', late: '지각', working: '근무중', absent: '결근', early_leave: '조기퇴근' };
const STATUS_COLOR = {
  normal: 'bg-green-100 text-green-700',
  late: 'bg-amber-100 text-amber-700',
  working: 'bg-blue-100 text-blue-700',
  absent: 'bg-red-100 text-red-700',
  early_leave: 'bg-orange-100 text-orange-700',
};

/** 삭제 확인 모달 */
function ConfirmModal({ isOpen, onClose, onConfirm, message, loading }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="삭제 확인">
      <p className="text-gray-700 mb-6">{message}</p>
      <div className="flex gap-2">
        <Button className="flex-1" variant="danger" onClick={onConfirm} disabled={loading}>
          {loading ? '삭제 중...' : '삭제'}
        </Button>
        <Button className="flex-1" variant="secondary" onClick={onClose} disabled={loading}>
          취소
        </Button>
      </div>
    </Modal>
  );
}

export default function AttendancePage() {
  const records = useAttendanceStore((s) => s.records);
  const deleteRecord = useAttendanceStore((s) => s.deleteRecord);
  const deleteRecords = useAttendanceStore((s) => s.deleteRecords);
  const employees = useEmployeeStore((s) => s.employees);
  const updateEmployee = useEmployeeStore((s) => s.updateEmployee);
  const currentUser = useAuthStore((s) => s.currentUser);

  const today = new Date().toISOString().split('T')[0];

  const [view, setView] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  // 기록 초기화 탭 상태
  const [resetStartDate, setResetStartDate] = useState(today);
  const [resetEndDate, setResetEndDate] = useState(today);
  const [resetEmployeeId, setResetEmployeeId] = useState('');

  // 확인 모달
  const [confirm, setConfirm] = useState(null); // { message, onConfirm }
  const [deleting, setDeleting] = useState(false);

  // 관리팀은 근무 시간 열 숨김
  const isManagement = !isFarmAdmin(currentUser); // 재배팀만 근무시간 상세 표시

  const workers = useMemo(
    () => employees.filter((e) => e.role === 'worker' && e.isActive),
    [employees]
  );

  const workersByBranch = useMemo(() => {
    const groups = {};
    workers.forEach((w) => {
      const key = w.branch || '';
      if (!groups[key]) groups[key] = [];
      groups[key].push(w);
    });
    return groups;
  }, [workers]);

  const dailyRecords = useMemo(
    () => records.filter((r) => r.date === selectedDate),
    [records, selectedDate]
  );

  const monthlyStats = useMemo(() => {
    const monthRecords = records.filter((r) => r.date.startsWith(selectedMonth));
    return workers.map((w) => {
      const workerRecords = monthRecords.filter((r) => r.employeeId === w.id);
      const totalMinutes = workerRecords.reduce((sum, r) => sum + (r.workMinutes || 0), 0);
      const workDays = workerRecords.filter((r) => r.workMinutes).length;
      const lateDays = workerRecords.filter((r) => r.status === 'late').length;
      return {
        employee: w,
        workDays,
        totalMinutes,
        lateDays,
        avgMinutes: workDays > 0 ? Math.round(totalMinutes / workDays) : 0,
      };
    });
  }, [records, workers, selectedMonth]);

  // 근무 시간 인라인 편집
  const [editTimes, setEditTimes] = useState({});
  const getEditTime = (emp, key) => editTimes[emp.id]?.[key] ?? emp[key] ?? '';
  const handleTimeChange = (empId, key, value) =>
    setEditTimes((prev) => ({ ...prev, [empId]: { ...(prev[empId] || {}), [key]: value } }));
  const handleTimeBlur = (emp, key) => {
    const value = editTimes[emp.id]?.[key];
    if (value === undefined || value === (emp[key] ?? '')) return;
    updateEmployee(emp.id, { [key]: value });
  };

  const orderedBranches = BRANCH_ORDER.filter((b) => workersByBranch[b]?.length > 0);

  // 삭제 실행
  const runDelete = (message, fn) => {
    setConfirm({
      message,
      onConfirm: async () => {
        setDeleting(true);
        await fn();
        setDeleting(false);
        setConfirm(null);
      },
    });
  };

  const handleDeleteRecord = (id, label) =>
    runDelete(`${label}의 출퇴근 기록을 삭제하시겠습니까?`, () => deleteRecord(id));

  const handleDeleteDate = () =>
    runDelete(`${selectedDate} 날짜의 출퇴근 기록 전체(${dailyRecords.length}건)를 삭제하시겠습니까?`,
      () => deleteRecords({ startDate: selectedDate, endDate: selectedDate }));

  const handleDeleteToday = () =>
    runDelete(`오늘(${today}) 출퇴근 기록 전체를 삭제하시겠습니까?`,
      () => deleteRecords({ startDate: today, endDate: today }));

  const handleDeleteRange = () => {
    if (!resetStartDate || !resetEndDate) return;
    const workerName = resetEmployeeId ? workers.find((w) => w.id === resetEmployeeId)?.name : null;
    const who = workerName ? `${workerName}의 ` : '전체 작업자의 ';
    runDelete(`${who}${resetStartDate} ~ ${resetEndDate} 기간 출퇴근 기록을 삭제하시겠습니까?`,
      () => deleteRecords({ startDate: resetStartDate, endDate: resetEndDate, employeeId: resetEmployeeId || undefined }));
  };

  const handleDeleteWorkerAll = () => {
    if (!resetEmployeeId) return;
    const name = workers.find((w) => w.id === resetEmployeeId)?.name || '';
    runDelete(`${name}의 출퇴근 기록 전체를 삭제하시겠습니까?`,
      () => deleteRecords({ employeeId: resetEmployeeId }));
  };

  return (
    <div>
      <h2 className="text-xl font-heading font-semibold text-gray-900 mb-6">근무 관리</h2>

      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { key: 'daily', label: '일별 기록' },
          { key: 'monthly', label: '월별 집계' },
          { key: 'reset', label: '기록 초기화' },
        ].map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium min-h-[36px] transition-colors ${
              view === v.key
                ? v.key === 'reset' ? 'bg-red-500 text-white' : 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >{v.label}</button>
        ))}
      </div>

      {/* ── 일별 기록 ── */}
      {view === 'daily' && (
        <>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <input type="date" value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[44px]" />
            {dailyRecords.length > 0 && (
              <button
                onClick={handleDeleteDate}
                className="px-3 py-2 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 min-h-[44px] transition-colors"
              >
                이 날짜 기록 전체 삭제 ({dailyRecords.length}건)
              </button>
            )}
          </div>

          <div className="space-y-6">
            {orderedBranches.map((branchKey) => {
              const groupWorkers = workersByBranch[branchKey] || [];
              return (
                <div key={branchKey}>
                  <h3 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
                    {BRANCH_LABEL[branchKey] || '미지정'}
                    <span className="text-xs text-gray-400 font-normal">({groupWorkers.length}명)</span>
                  </h3>
                  {/* 모바일 카드 뷰 */}
                  <div className="md:hidden space-y-2 mb-2">
                    {groupWorkers.map((w) => {
                      const rec = dailyRecords.find((r) => r.employeeId === w.id);
                      return (
                        <Card key={w.id} accent="gray" className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <span className="font-semibold text-gray-900">{w.name}</span>
                            {rec ? (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[rec.status] || 'bg-gray-100 text-gray-600'}`}>
                                {STATUS_LABEL[rec.status] || rec.status}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400">미출근</span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">출근 기준</label>
                              <input type="time"
                                value={getEditTime(w, 'workStartTime')}
                                onChange={(e) => handleTimeChange(w.id, 'workStartTime', e.target.value)}
                                onBlur={() => handleTimeBlur(w, 'workStartTime')}
                                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm min-h-[36px]" />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">퇴근 기준</label>
                              <input type="time"
                                value={getEditTime(w, 'workEndTime')}
                                onChange={(e) => handleTimeChange(w.id, 'workEndTime', e.target.value)}
                                onBlur={() => handleTimeBlur(w, 'workEndTime')}
                                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm min-h-[36px]" />
                            </div>
                          </div>
                          {rec && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">
                                출근 {formatTime(rec.checkIn)} / 퇴근 {formatTime(rec.checkOut)}
                                {!isManagement && rec.workMinutes ? ` · ${formatMinutes(rec.workMinutes)}` : ''}
                              </span>
                              <button
                                onClick={() => handleDeleteRecord(rec.id, w.name)}
                                className="text-xs text-red-500 hover:text-red-700 px-2 py-1"
                              >삭제</button>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>

                  {/* 데스크탑 테이블 뷰 */}
                  <Card accent="gray" className="hidden md:block overflow-hidden mb-2">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-left text-gray-500">
                            <th className="px-4 py-2.5 font-medium">이름</th>
                            <th className="px-4 py-2.5 font-medium">출근 기준</th>
                            <th className="px-4 py-2.5 font-medium">퇴근 기준</th>
                            <th className="px-4 py-2.5 font-medium">출근</th>
                            <th className="px-4 py-2.5 font-medium">퇴근</th>
                            {!isManagement && <th className="px-4 py-2.5 font-medium">근무시간</th>}
                            <th className="px-4 py-2.5 font-medium">상태</th>
                            <th className="px-4 py-2.5 font-medium"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {groupWorkers.map((w) => {
                            const rec = dailyRecords.find((r) => r.employeeId === w.id);
                            return (
                              <tr key={w.id}>
                                <td className="px-4 py-2.5 font-medium text-gray-900">{w.name}</td>
                                <td className="px-4 py-2.5">
                                  <input type="time"
                                    value={getEditTime(w, 'workStartTime')}
                                    onChange={(e) => handleTimeChange(w.id, 'workStartTime', e.target.value)}
                                    onBlur={() => handleTimeBlur(w, 'workStartTime')}
                                    className="border border-gray-200 rounded px-2 py-1 text-xs w-24" />
                                </td>
                                <td className="px-4 py-2.5">
                                  <input type="time"
                                    value={getEditTime(w, 'workEndTime')}
                                    onChange={(e) => handleTimeChange(w.id, 'workEndTime', e.target.value)}
                                    onBlur={() => handleTimeBlur(w, 'workEndTime')}
                                    className="border border-gray-200 rounded px-2 py-1 text-xs w-24" />
                                </td>
                                <td className="px-4 py-2.5 text-gray-600">{rec ? formatTime(rec.checkIn) : '—'}</td>
                                <td className="px-4 py-2.5 text-gray-600">{rec ? formatTime(rec.checkOut) : '—'}</td>
                                {!isManagement && (
                                  <td className="px-4 py-2.5 text-gray-600">{rec ? formatMinutes(rec.workMinutes) : '—'}</td>
                                )}
                                <td className="px-4 py-2.5">
                                  {rec ? (
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[rec.status] || 'bg-gray-100 text-gray-600'}`}>
                                      {STATUS_LABEL[rec.status] || rec.status}
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400">미출근</span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5">
                                  {rec && (
                                    <button
                                      onClick={() => handleDeleteRecord(rec.id, w.name)}
                                      className="px-2 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                    >
                                      삭제
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              );
            })}

            {orderedBranches.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-12">등록된 작업자가 없습니다</p>
            )}
          </div>
        </>
      )}

      {/* ── 월별 집계 ── */}
      {view === 'monthly' && (
        <>
          <div className="mb-4">
            <input type="month" value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[44px]" />
          </div>

          <div className="space-y-6">
            {orderedBranches.map((branchKey) => {
              const groupWorkers = workersByBranch[branchKey] || [];
              const groupStats = monthlyStats.filter((s) => groupWorkers.some((w) => w.id === s.employee.id));
              return (
                <div key={branchKey}>
                  <h3 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
                    {BRANCH_LABEL[branchKey] || '미지정'}
                  </h3>
                  {/* 모바일 카드 뷰 */}
                  <div className="md:hidden space-y-2 mb-2">
                    {groupStats.map((s) => (
                      <Card key={s.employee.id} accent="gray" className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <span className="font-semibold text-gray-900">{s.employee.name}</span>
                          {s.lateDays > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                              지각 {s.lateDays}회
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 mb-2">
                          기준 {s.employee.workStartTime && s.employee.workEndTime
                            ? `${s.employee.workStartTime}~${s.employee.workEndTime}`
                            : '—'}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <div className="text-xs text-gray-400">출근일</div>
                            <div className="font-bold text-gray-900">{s.workDays}일</div>
                          </div>
                          {!isManagement && (
                            <>
                              <div>
                                <div className="text-xs text-gray-400">총 근무</div>
                                <div className="font-bold text-gray-900">{formatMinutes(s.totalMinutes)}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-400">평균</div>
                                <div className="font-bold text-gray-900">{formatMinutes(s.avgMinutes)}</div>
                              </div>
                            </>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* 데스크탑 테이블 뷰 */}
                  <Card accent="gray" className="hidden md:block overflow-hidden mb-2">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-left text-gray-500">
                            <th className="px-4 py-2.5 font-medium">이름</th>
                            <th className="px-4 py-2.5 font-medium">근무 시간</th>
                            <th className="px-4 py-2.5 font-medium">출근일수</th>
                            {!isManagement && <th className="px-4 py-2.5 font-medium">총 근무시간</th>}
                            {!isManagement && <th className="px-4 py-2.5 font-medium">평균 근무</th>}
                            <th className="px-4 py-2.5 font-medium">지각</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {groupStats.map((s) => (
                            <tr key={s.employee.id}>
                              <td className="px-4 py-2.5 font-medium text-gray-900">{s.employee.name}</td>
                              <td className="px-4 py-2.5 text-gray-500 text-xs">
                                {s.employee.workStartTime && s.employee.workEndTime
                                  ? `${s.employee.workStartTime}~${s.employee.workEndTime}`
                                  : '—'}
                              </td>
                              <td className="px-4 py-2.5 text-gray-600">{s.workDays}일</td>
                              {!isManagement && <td className="px-4 py-2.5 text-gray-600">{formatMinutes(s.totalMinutes)}</td>}
                              {!isManagement && <td className="px-4 py-2.5 text-gray-600">{formatMinutes(s.avgMinutes)}</td>}
                              <td className="px-4 py-2.5">
                                {s.lateDays > 0 ? (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">{s.lateDays}회</span>
                                ) : (
                                  <span className="text-gray-400">0</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              );
            })}

            {orderedBranches.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-12">등록된 작업자가 없습니다</p>
            )}
          </div>
        </>
      )}

      {/* ── 기록 초기화 ── */}
      {view === 'reset' && (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">
            삭제된 기록은 복구할 수 없습니다. 테스트 데이터 정리 용도로만 사용하세요.
          </div>

          {/* 오늘 기록 초기화 */}
          <Card accent="red" className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900 mb-0.5">오늘 기록 전체 초기화</div>
                <div className="text-xs text-gray-400">{today} · {records.filter((r) => r.date === today).length}건</div>
              </div>
              <button
                onClick={handleDeleteToday}
                className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors min-h-[44px]"
              >
                초기화
              </button>
            </div>
          </Card>

          {/* 날짜 범위 + 작업자별 초기화 */}
          <Card accent="gray" className="p-5">
            <div className="font-medium text-gray-900 mb-4">날짜 범위 / 작업자별 초기화</div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">시작일</label>
                <input type="date" value={resetStartDate}
                  onChange={(e) => setResetStartDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[44px]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">종료일</label>
                <input type="date" value={resetEndDate}
                  onChange={(e) => setResetEndDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[44px]" />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-1">작업자 (선택 안 하면 전체)</label>
              <select
                value={resetEmployeeId}
                onChange={(e) => setResetEmployeeId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
              >
                <option value="">전체 작업자</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDeleteRange}
                disabled={!resetStartDate || !resetEndDate}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 disabled:bg-gray-200 disabled:text-gray-400 transition-colors min-h-[44px]"
              >
                기간 기록 삭제
              </button>
              {resetEmployeeId && (
                <button
                  onClick={handleDeleteWorkerAll}
                  className="flex-1 px-4 py-2.5 border border-red-300 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors min-h-[44px]"
                >
                  이 작업자 전체 삭제
                </button>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* 확인 모달 */}
      <ConfirmModal
        isOpen={!!confirm}
        onClose={() => !deleting && setConfirm(null)}
        onConfirm={confirm?.onConfirm}
        message={confirm?.message || ''}
        loading={deleting}
      />
    </div>
  );
}

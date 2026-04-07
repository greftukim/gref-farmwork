import { useState, useMemo } from 'react';
import useAuthStore from '../../stores/authStore';
import useAttendanceStore from '../../stores/attendanceStore';
import useTaskStore from '../../stores/taskStore';
import useLeaveStore from '../../stores/leaveStore';
import BottomSheet from '../../components/common/BottomSheet';
import Button from '../../components/common/Button';

const leaveTypes = ['연차', '오전반차', '오후반차', '출장', '대휴'];

const statusMap = {
  pending: { label: '대기', color: 'bg-amber-100 text-amber-700' },
  farm_approved: { label: '1차 승인', color: 'bg-blue-100 text-blue-700' },
  hr_approved: { label: '최종 승인', color: 'bg-green-100 text-green-700' },
  rejected: { label: '반려', color: 'bg-red-100 text-red-700' },
};

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatHHMM(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function WorkerAttendancePage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const records = useAttendanceStore((s) => s.records);
  const tasks = useTaskStore((s) => s.tasks);
  const requests = useLeaveStore((s) => s.requests);
  const balances = useLeaveStore((s) => s.balances);
  const addRequest = useLeaveStore((s) => s.addRequest);

  const today = new Date().toISOString().split('T')[0];
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState(null);
  const [showLeaveSheet, setShowLeaveSheet] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ date: '', type: '연차', reason: '' });

  const { year, month } = viewDate;

  // Calendar grid cells
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const pad = String(d).padStart(2, '0');
      const mPad = String(month + 1).padStart(2, '0');
      cells.push(`${year}-${mPad}-${pad}`);
    }
    return cells;
  }, [year, month]);

  const myRecords = useMemo(
    () => records.filter((r) => r.employeeId === currentUser?.id),
    [records, currentUser]
  );
  const myTasks = useMemo(
    () => tasks.filter((t) => t.workerId === currentUser?.id),
    [tasks, currentUser]
  );
  const myRequests = useMemo(
    () => requests.filter((r) => r.employeeId === currentUser?.id),
    [requests, currentUser]
  );

  const recordByDate = useMemo(
    () => Object.fromEntries(myRecords.map((r) => [r.date, r])),
    [myRecords]
  );
  const tasksByDate = useMemo(() => {
    const map = {};
    myTasks.forEach((t) => {
      if (!map[t.date]) map[t.date] = [];
      map[t.date].push(t);
    });
    return map;
  }, [myTasks]);
  const leaveByDate = useMemo(() => {
    const map = {};
    myRequests.filter((r) => r.status !== 'rejected').forEach((r) => {
      if (!map[r.date]) map[r.date] = [];
      map[r.date].push(r);
    });
    return map;
  }, [myRequests]);

  const myBalance = useMemo(
    () => balances.find((b) => b.employeeId === currentUser?.id && b.year === new Date().getFullYear()),
    [balances, currentUser]
  );

  const selRecord = selectedDate ? recordByDate[selectedDate] : null;
  const selTasks = selectedDate ? (tasksByDate[selectedDate] || []) : [];
  const selLeaves = selectedDate ? (leaveByDate[selectedDate] || []) : [];

  const prevMonth = () =>
    setViewDate(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
    );

  const nextMonth = () =>
    setViewDate(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
    );

  const openLeaveForm = (date) => {
    setSelectedDate(null);
    setLeaveForm({ date: date || today, type: '연차', reason: '' });
    setShowLeaveSheet(true);
  };

  const handleLeaveSubmit = () => {
    if (!leaveForm.date || !leaveForm.reason.trim()) return;
    addRequest({
      employeeId: currentUser.id,
      date: leaveForm.date,
      type: leaveForm.type,
      reason: leaveForm.reason,
    });
    setLeaveForm({ date: '', type: '연차', reason: '' });
    setShowLeaveSheet(false);
  };

  const monthLabel = `${year}년 ${month + 1}월`;

  const selDateLabel = selectedDate
    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('ko-KR', {
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      })
    : '';

  return (
    <div className="pb-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-heading font-semibold text-gray-900">근태</h2>
        <Button size="sm" onClick={() => openLeaveForm(today)}>근태 신청</Button>
      </div>

      {/* 잔여 연차 요약 */}
      {myBalance && (
        <div className="flex gap-2 mb-4">
          <div className="flex-1 bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
            <div className="text-xs text-gray-400">총 연차</div>
            <div className="text-base font-bold text-gray-900">{myBalance.totalDays}일</div>
          </div>
          <div className="flex-1 bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
            <div className="text-xs text-gray-400">사용</div>
            <div className="text-base font-bold text-gray-900">{myBalance.usedDays}일</div>
          </div>
          <div className="flex-1 bg-blue-50 rounded-xl p-3 text-center shadow-sm border border-blue-100">
            <div className="text-xs text-blue-400">잔여 연차</div>
            <div className="text-base font-bold text-blue-600">{myBalance.totalDays - myBalance.usedDays}일</div>
          </div>
        </div>
      )}

      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={prevMonth}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 active:scale-95 transition-transform"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-base font-semibold text-gray-900">{monthLabel}</span>
        <button
          onClick={nextMonth}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 active:scale-95 transition-transform"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 캘린더 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-3">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {DAYS.map((d, i) => (
            <div
              key={d}
              className={`text-center text-xs font-medium py-2 ${
                i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'
              }`}
            >
              {d}
            </div>
          ))}
        </div>
        {/* 날짜 셀 */}
        <div className="grid grid-cols-7">
          {calendarDays.map((date, idx) => {
            if (!date) {
              return <div key={`empty-${idx}`} className="min-h-[62px] border-b border-gray-50" />;
            }
            const rec = recordByDate[date];
            const tCount = (tasksByDate[date] || []).length;
            const leaves = leaveByDate[date] || [];
            const isToday = date === today;
            const isSelected = date === selectedDate;
            const dayOfWeek = new Date(date + 'T00:00:00').getDay();

            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`min-h-[62px] p-1 flex flex-col items-center gap-0.5 transition-colors
                  border-b border-gray-50
                  ${idx % 7 !== 6 ? 'border-r border-gray-50' : ''}
                  ${isSelected ? 'bg-blue-50' : 'active:bg-gray-50'}`}
              >
                <span
                  className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium
                    ${isToday
                      ? 'bg-blue-600 text-white'
                      : dayOfWeek === 0
                      ? 'text-red-400'
                      : dayOfWeek === 6
                      ? 'text-blue-400'
                      : 'text-gray-700'
                    }`}
                >
                  {new Date(date + 'T00:00:00').getDate()}
                </span>
                <div className="flex gap-0.5 flex-wrap justify-center min-h-[12px]">
                  {rec?.checkIn && (
                    <span className={`w-1.5 h-1.5 rounded-full ${rec.checkOut ? 'bg-green-400' : 'bg-blue-400'}`} />
                  )}
                  {leaves.length > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  )}
                  {tCount > 0 && (
                    <span className="text-[9px] leading-3 text-gray-400 font-medium">{tCount}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 범례 */}
      <div className="flex gap-3 px-1 mb-2 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />출퇴근 완료
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />출근 중
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />휴가/신청
        </span>
      </div>

      {/* 날짜 상세 바텀시트 */}
      <BottomSheet
        isOpen={!!selectedDate}
        onClose={() => setSelectedDate(null)}
        title={selDateLabel}
      >
        {selectedDate && (
          <div className="space-y-4">
            {/* 출퇴근 */}
            <div>
              <div className="text-xs font-semibold text-gray-400 mb-2">출퇴근 기록</div>
              {selRecord ? (
                <div className="flex gap-4 bg-gray-50 rounded-xl px-4 py-3 flex-wrap">
                  <div className="text-center">
                    <div className="text-xs text-gray-400">출근</div>
                    <div className="text-lg font-bold text-gray-900">{formatHHMM(selRecord.checkIn)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400">퇴근</div>
                    <div className="text-lg font-bold text-gray-900">{formatHHMM(selRecord.checkOut)}</div>
                  </div>
                  {selRecord.workMinutes ? (
                    <div className="text-center">
                      <div className="text-xs text-gray-400">근무</div>
                      <div className="text-lg font-bold text-gray-900">
                        {Math.floor(selRecord.workMinutes / 60)}h {selRecord.workMinutes % 60}m
                      </div>
                    </div>
                  ) : null}
                  {selRecord.status === 'late' && (
                    <span className="self-center px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">지각</span>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-400 text-center py-3 bg-gray-50 rounded-xl">
                  출퇴근 기록 없음
                </div>
              )}
            </div>

            {/* 작업 */}
            {selTasks.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-400 mb-2">작업 ({selTasks.length}건)</div>
                <div className="space-y-1.5">
                  {selTasks.map((t) => (
                    <div key={t.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                      <span className="text-sm text-gray-800">{t.title}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        t.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : t.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-200 text-gray-500'
                      }`}>
                        {t.status === 'completed' ? '완료' : t.status === 'in_progress' ? '진행' : '대기'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 근태 신청 내역 */}
            {selLeaves.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-400 mb-2">근태 신청</div>
                <div className="space-y-1.5">
                  {selLeaves.map((req) => {
                    const st = statusMap[req.status];
                    return (
                      <div key={req.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                        <div>
                          <span className="text-sm text-gray-800">{req.type}</span>
                          {req.reason && (
                            <span className="text-xs text-gray-400 ml-2">{req.reason}</span>
                          )}
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                          {st.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Button className="w-full" onClick={() => openLeaveForm(selectedDate)}>
              근태 신청하기
            </Button>
          </div>
        )}
      </BottomSheet>

      {/* 근태 신청 바텀시트 */}
      <BottomSheet isOpen={showLeaveSheet} onClose={() => setShowLeaveSheet(false)} title="근태 신청">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
            <input
              type="date"
              value={leaveForm.date}
              onChange={(e) => setLeaveForm({ ...leaveForm, date: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">유형</label>
            <div className="flex flex-wrap gap-2">
              {leaveTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => setLeaveForm({ ...leaveForm, type: t })}
                  className={`px-3 py-2 rounded-lg text-sm font-medium min-h-[44px] transition-colors ${
                    leaveForm.type === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">사유</label>
            <textarea
              value={leaveForm.reason}
              onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
              placeholder="신청 사유를 입력하세요"
            />
          </div>
          <Button className="w-full" size="lg" onClick={handleLeaveSubmit}>
            신청하기
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}

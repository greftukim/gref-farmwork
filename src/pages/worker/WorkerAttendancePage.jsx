import { useState, useMemo } from 'react';
import useAuthStore from '../../stores/authStore';
import useAttendanceStore from '../../stores/attendanceStore';
import useTaskStore from '../../stores/taskStore';
import useLeaveStore from '../../stores/leaveStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import BottomSheet from '../../components/common/BottomSheet';

const leaveTypes = ['연차', '오전반차', '오후반차', '출장', '대휴'];

const KOREAN_HOLIDAYS = new Set([
  // 2025
  '2025-01-01','2025-01-28','2025-01-29','2025-01-30',
  '2025-03-01','2025-05-05','2025-05-06','2025-06-06',
  '2025-08-15','2025-10-03','2025-10-05','2025-10-06',
  '2025-10-07','2025-10-09','2025-12-25',
  // 2026
  '2026-01-01','2026-02-16','2026-02-17','2026-02-18',
  '2026-03-01','2026-03-02','2026-05-05','2026-05-24',
  '2026-06-06','2026-08-15','2026-08-17',
  '2026-09-23','2026-09-24','2026-09-25',
  '2026-10-03','2026-10-05','2026-10-09','2026-12-25',
]);

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
  const [leaveForm, setLeaveForm] = useState({ startDate: '', endDate: '', type: '연차', reason: '' });

  const { year, month } = viewDate;

  // 캘린더에 표시되는 월 기준 통계
  const viewMonth = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthRecords = useMemo(
    () => records.filter((r) => r.employeeId === currentUser?.id && r.date.startsWith(viewMonth)),
    [records, currentUser, viewMonth]
  );
  const totalMinutes = useMemo(
    () => monthRecords.reduce((sum, r) => sum + (r.workMinutes || 0), 0),
    [monthRecords]
  );
  const workDays = monthRecords.filter((r) => r.workMinutes).length;
  const lateDays = monthRecords.filter((r) => r.status === 'late').length;

  // 캘린더 셀 날짜 목록
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
    setLeaveForm({ startDate: date || today, endDate: date || today, type: '연차', reason: '' });
    setShowLeaveSheet(true);
  };

  const handleLeaveSubmit = () => {
    if (!leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason.trim()) return;
    const dates = [];
    const cur = new Date(leaveForm.startDate + 'T00:00:00');
    const end = new Date(leaveForm.endDate + 'T00:00:00');
    while (cur <= end) {
      dates.push(cur.toISOString().split('T')[0]);
      cur.setDate(cur.getDate() + 1);
    }
    dates.forEach((date) =>
      addRequest({ employeeId: currentUser.id, date, type: leaveForm.type, reason: leaveForm.reason })
    );
    setLeaveForm({ startDate: '', endDate: '', type: '연차', reason: '' });
    setShowLeaveSheet(false);
  };

  const monthLabel = `${year}년 ${month + 1}월`;
  const selDateLabel = selectedDate
    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('ko-KR', {
        month: 'long', day: 'numeric', weekday: 'short',
      })
    : '';

  const myBalance = useMemo(
    () => balances.find((b) => b.employeeId === currentUser?.id && b.year === new Date().getFullYear()),
    [balances, currentUser]
  );

  return (
    <div>
      {/* 통계 카드 (캘린더 월 기준) */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card accent="blue" className="p-3 text-center">
          <div className="text-xs text-gray-400">출근일</div>
          <div className="text-lg font-bold text-gray-900">{workDays}일</div>
        </Card>
        <Card accent="blue" className="p-3 text-center">
          <div className="text-xs text-gray-400">총 근무</div>
          <div className="text-lg font-bold text-gray-900">{Math.floor(totalMinutes / 60)}h</div>
        </Card>
        <Card accent={lateDays > 0 ? 'amber' : 'gray'} className="p-3 text-center">
          <div className="text-xs text-gray-400">지각</div>
          <div className="text-lg font-bold text-gray-900">{lateDays}회</div>
        </Card>
      </div>

      {/* 캘린더 월 네비게이션 */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 active:scale-95 transition-transform"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-base font-semibold text-gray-900">{monthLabel}</span>
        <button
          onClick={nextMonth}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 active:scale-95 transition-transform"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 캘린더 */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-3">
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
              return <div key={`empty-${idx}`} className="min-h-[56px] border-b border-gray-50" />;
            }
            const rec = recordByDate[date];
            const tCount = (tasksByDate[date] || []).length;
            const leaves = leaveByDate[date] || [];
            const isToday = date === today;
            const isSelected = date === selectedDate;
            const dayOfWeek = new Date(date + 'T00:00:00').getDay();
            const isHoliday = KOREAN_HOLIDAYS.has(date);

            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`min-h-[56px] p-1 flex flex-col items-center gap-0.5 transition-colors
                  border-b border-gray-50
                  ${idx % 7 !== 6 ? 'border-r border-gray-50' : ''}
                  ${isSelected ? 'bg-blue-50' : 'active:bg-gray-50'}`}
              >
                <span
                  className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium
                    ${isToday
                      ? 'bg-blue-600 text-white'
                      : isHoliday || dayOfWeek === 0 ? 'text-red-400'
                      : dayOfWeek === 6 ? 'text-blue-400'
                      : 'text-gray-700'
                    }`}
                >
                  {new Date(date + 'T00:00:00').getDate()}
                </span>
                <div className="flex gap-0.5 flex-wrap justify-center min-h-[10px]">
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
      <div className="flex gap-3 px-1 mb-4 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />출퇴근 완료
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />출근 중
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />근태 신청
        </span>
      </div>

      {/* 잔여 연차 */}
      {myBalance && (
        <Card accent="gray" className="p-4 mb-4">
          <div className="text-sm font-medium text-gray-700 mb-2">잔여 연차</div>
          <div className="flex gap-6">
            <div>
              <span className="text-xs text-gray-400">총 </span>
              <span className="font-bold text-gray-900">{myBalance.totalDays}일</span>
            </div>
            <div>
              <span className="text-xs text-gray-400">사용 </span>
              <span className="font-bold text-gray-900">{myBalance.usedDays}일</span>
            </div>
            <div>
              <span className="text-xs text-gray-400">잔여 </span>
              <span className="font-bold text-blue-600">{myBalance.totalDays - myBalance.usedDays}일</span>
            </div>
          </div>
        </Card>
      )}

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
                        t.status === 'completed' ? 'bg-green-100 text-green-700'
                        : t.status === 'in_progress' ? 'bg-blue-100 text-blue-700'
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
                    const st = statusMap[req.status] || { label: req.status, color: 'bg-gray-100 text-gray-500' };
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
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
              <input
                type="date"
                value={leaveForm.startDate}
                onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value, endDate: leaveForm.endDate < e.target.value ? e.target.value : leaveForm.endDate })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
              <input
                type="date"
                value={leaveForm.endDate}
                min={leaveForm.startDate}
                onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
              />
            </div>
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

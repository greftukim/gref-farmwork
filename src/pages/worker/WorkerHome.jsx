import { useState, useMemo } from 'react';
import useAuthStore from '../../stores/authStore';
import useAttendanceStore from '../../stores/attendanceStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

export default function WorkerHome() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const records = useAttendanceStore((s) => s.records);
  const checkIn = useAttendanceStore((s) => s.checkIn);
  const checkOut = useAttendanceStore((s) => s.checkOut);
  const [message, setMessage] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const todayRecord = useMemo(
    () => records.find((r) => r.employeeId === currentUser?.id && r.date === today),
    [records, currentUser, today]
  );

  const isWorking = todayRecord && !todayRecord.checkOut;
  const hasCheckedOut = todayRecord && todayRecord.checkOut;

  const formatTime = (isoString) => {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const handleCheckIn = () => {
    const result = checkIn(currentUser.id);
    if (result) {
      setMessage('출근 처리되었습니다');
    } else {
      setMessage('이미 출근 처리되었습니다');
    }
    setTimeout(() => setMessage(''), 2000);
  };

  const handleCheckOut = () => {
    checkOut(currentUser.id);
    setMessage('퇴근 처리되었습니다');
    setTimeout(() => setMessage(''), 2000);
  };

  return (
    <div>
      <h2 className="text-lg font-heading font-semibold text-gray-900 mb-4">
        {currentUser?.name}님, 안녕하세요
      </h2>

      {message && (
        <div className="bg-blue-50 text-blue-700 px-4 py-2.5 rounded-lg text-sm mb-4">
          {message}
        </div>
      )}

      <Card accent="blue" className="p-5 mb-4">
        <div className="text-sm text-gray-500 mb-3">출퇴근</div>
        {todayRecord && (
          <div className="flex gap-4 mb-3 text-sm">
            <div>
              <span className="text-gray-400">출근 </span>
              <span className="font-medium text-gray-700">{formatTime(todayRecord.checkIn)}</span>
            </div>
            {todayRecord.checkOut && (
              <div>
                <span className="text-gray-400">퇴근 </span>
                <span className="font-medium text-gray-700">{formatTime(todayRecord.checkOut)}</span>
              </div>
            )}
            {todayRecord.workMinutes && (
              <div>
                <span className="text-gray-400">근무 </span>
                <span className="font-medium text-gray-700">
                  {Math.floor(todayRecord.workMinutes / 60)}시간 {todayRecord.workMinutes % 60}분
                </span>
              </div>
            )}
          </div>
        )}
        <div className="flex gap-3">
          <Button
            size="lg"
            className="flex-1"
            onClick={handleCheckIn}
            disabled={isWorking || hasCheckedOut}
          >
            출근
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="flex-1"
            onClick={handleCheckOut}
            disabled={!isWorking}
          >
            퇴근
          </Button>
        </div>
      </Card>

      <Card accent="blue" className="p-5 mb-4">
        <div className="text-sm text-gray-500 mb-2">오늘의 작업</div>
        <p className="text-gray-400 text-sm">배정된 작업이 없습니다</p>
      </Card>

      <Button variant="danger" size="lg" className="w-full">
        긴급 호출
      </Button>
    </div>
  );
}

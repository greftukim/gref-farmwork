import { useState, useMemo } from 'react';
import useAuthStore from '../../stores/authStore';
import useAttendanceStore from '../../stores/attendanceStore';
import useLocationStore from '../../stores/locationStore';
import useGpsVerify from '../../hooks/useGpsVerify';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

export default function WorkerHome() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const records = useAttendanceStore((s) => s.records);
  const checkIn = useAttendanceStore((s) => s.checkIn);
  const checkOut = useAttendanceStore((s) => s.checkOut);
  const locationName = useLocationStore((s) => s.location.name);
  const radius = useLocationStore((s) => s.location.radius);

  const { status: gpsStatus, position, distance, error: gpsError, verify } = useGpsVerify();

  const [message, setMessage] = useState('');
  const [msgType, setMsgType] = useState('success'); // 'success' | 'error'

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

  const showMsg = (text, type = 'success') => {
    setMessage(text);
    setMsgType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  // 출퇴근 버튼 클릭 → GPS 검증 → 처리
  const handleAttendance = async (action) => {
    // GPS 검증이 아직 안 된 경우 먼저 위치 확인
    if (gpsStatus !== 'inside') {
      verify();
      return;
    }

    if (action === 'in') {
      const ok = await checkIn(currentUser.id, position);
      showMsg(ok ? '출근 처리되었습니다' : '이미 출근 처리되었습니다', ok ? 'success' : 'error');
    } else {
      await checkOut(currentUser.id, position);
      showMsg('퇴근 처리되었습니다');
    }
  };

  // GPS 상태별 안내 UI
  const renderGpsStatus = () => {
    if (gpsStatus === 'idle') {
      return (
        <button
          onClick={verify}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-gray-100
            text-gray-600 text-sm active:scale-[0.98] transition-transform mb-3"
        >
          <span>📍</span>
          <span>위치 확인하기</span>
        </button>
      );
    }
    if (gpsStatus === 'checking') {
      return (
        <div className="flex items-center gap-2 py-2 mb-3 text-sm text-gray-500">
          <span className="animate-spin">⏳</span>
          <span>GPS 위치 확인 중...</span>
        </div>
      );
    }
    if (gpsStatus === 'inside') {
      return (
        <div className="flex items-center gap-2 py-2 mb-3 text-sm text-emerald-600 bg-emerald-50 rounded-lg px-3">
          <span>✅</span>
          <span>{locationName} 반경 안 ({distance}m)</span>
        </div>
      );
    }
    if (gpsStatus === 'outside') {
      return (
        <div className="mb-3">
          <div className="flex items-center gap-2 py-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 mb-2">
            <span>🚫</span>
            <span>근무지 범위 밖입니다 ({distance}m, 허용 {radius}m)</span>
          </div>
          <button
            onClick={verify}
            className="text-xs text-gray-400 underline underline-offset-2"
          >
            다시 확인
          </button>
        </div>
      );
    }
    if (gpsStatus === 'error') {
      return (
        <div className="mb-3">
          <div className="flex items-start gap-2 py-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 mb-2">
            <span>⚠️</span>
            <span>{gpsError}</span>
          </div>
          <button
            onClick={verify}
            className="text-xs text-gray-400 underline underline-offset-2"
          >
            다시 시도
          </button>
        </div>
      );
    }
    return null;
  };

  const isGpsOk = gpsStatus === 'inside';
  const isChecking = gpsStatus === 'checking';

  return (
    <div>
      <h2 className="text-lg font-heading font-semibold text-gray-900 mb-4">
        {currentUser?.name}님, 안녕하세요
      </h2>

      {message && (
        <div className={`px-4 py-2.5 rounded-lg text-sm mb-4 ${
          msgType === 'error'
            ? 'bg-red-50 text-red-700'
            : 'bg-emerald-50 text-emerald-700'
        }`}>
          {message}
        </div>
      )}

      <Card accent="emerald" className="p-5 mb-4">
        <div className="text-sm text-gray-500 mb-3">출퇴근</div>

        {/* 오늘 출퇴근 시간 */}
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
            {todayRecord.workMinutes != null && (
              <div>
                <span className="text-gray-400">근무 </span>
                <span className="font-medium text-gray-700">
                  {Math.floor(todayRecord.workMinutes / 60)}시간 {todayRecord.workMinutes % 60}분
                </span>
              </div>
            )}
          </div>
        )}

        {/* GPS 상태 표시 */}
        {!hasCheckedOut && renderGpsStatus()}

        {/* 출퇴근 버튼 */}
        <div className="flex gap-3">
          <Button
            size="lg"
            className="flex-1"
            onClick={() => handleAttendance('in')}
            disabled={isWorking || hasCheckedOut || isChecking || (!isGpsOk && gpsStatus !== 'idle')}
          >
            {!isGpsOk && gpsStatus === 'idle' ? '위치 확인 후 출근' : '출근'}
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="flex-1"
            onClick={() => handleAttendance('out')}
            disabled={!isWorking || isChecking || (!isGpsOk && gpsStatus !== 'idle')}
          >
            {!isGpsOk && gpsStatus === 'idle' && isWorking ? '위치 확인 후 퇴근' : '퇴근'}
          </Button>
        </div>

        {/* 반경 밖일 때 버튼 비활성화 안내 */}
        {gpsStatus === 'outside' && (
          <p className="text-xs text-red-500 mt-2 text-center">
            근무지({locationName}) 반경 {radius}m 안에서만 출퇴근할 수 있습니다
          </p>
        )}
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

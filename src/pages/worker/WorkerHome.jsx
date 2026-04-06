import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import useAttendanceStore from '../../stores/attendanceStore';
import useTaskStore from '../../stores/taskStore';
import useBranchStore from '../../stores/branchStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

export default function WorkerHome() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);
  const records = useAttendanceStore((s) => s.records);
  const checkIn = useAttendanceStore((s) => s.checkIn);
  const checkOut = useAttendanceStore((s) => s.checkOut);
  const tasks = useTaskStore((s) => s.tasks);
  const branches = useBranchStore((s) => s.branches);
  const [message, setMessage] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [gpsStatus, setGpsStatus] = useState('checking'); // 'checking' | 'in_range' | 'out_range'

  const today = new Date().toISOString().split('T')[0];

  const todayRecord = useMemo(
    () => records.find((r) => r.employeeId === currentUser?.id && r.date === today),
    [records, currentUser, today]
  );

  const todayTasks = useMemo(
    () => tasks.filter((t) => t.workerId === currentUser?.id && t.date === today),
    [tasks, currentUser, today]
  );

  const isWorking = todayRecord && !todayRecord.checkOut;
  const hasCheckedOut = todayRecord && todayRecord.checkOut;

  const branchName = useMemo(() => {
    const branch = branches.find((b) => b.id === currentUser?.branchId);
    return branch?.name || '';
  }, [branches, currentUser]);

  // GPS 위치 확인
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('in_range');
      return;
    }
    const branch = branches.find((b) => b.id === currentUser?.branchId);
    if (!branch?.latitude) {
      setGpsStatus('in_range');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = getDistance(pos.coords.latitude, pos.coords.longitude, branch.latitude, branch.longitude);
        setGpsStatus(dist <= (branch.radiusMeters || 200) ? 'in_range' : 'out_range');
      },
      () => setGpsStatus('in_range'),
      { enableHighAccuracy: true }
    );
  }, [branches, currentUser]);

  // 근무 타이머
  useEffect(() => {
    if (!isWorking || !todayRecord?.checkIn) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(todayRecord.checkIn).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isWorking, todayRecord]);

  const formatElapsed = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatTime = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const handleCheckIn = async () => {
    const result = await checkIn(currentUser.id);
    setMessage(result ? '출근 처리되었습니다' : '이미 출근 처리되었습니다');
    setTimeout(() => setMessage(''), 2000);
  };

  const handleCheckOut = async () => {
    await checkOut(currentUser.id);
    setMessage('퇴근 처리되었습니다');
    setTimeout(() => setMessage(''), 2000);
  };

  const canCheckIn = gpsStatus === 'in_range' && !todayRecord;

  return (
    <div className="pb-4">
      {/* 상단 인사 + 지점 */}
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-900">{currentUser?.name}님, 안녕하세요</h2>
        {branchName && <p className="text-sm text-gray-400 mt-0.5">{branchName}</p>}
      </div>

      {message && (
        <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-2xl text-sm mb-4 border border-blue-100">
          {message}
        </div>
      )}

      {/* 출퇴근 카드 */}
      <Card accent="blue" className="p-6 mb-4">
        {isWorking ? (
          <>
            <div className="text-sm text-gray-500 mb-2">근무 중</div>
            <div className="text-4xl font-bold text-blue-600 text-center mb-4 font-mono">
              {formatElapsed(elapsed)}
            </div>
            <div className="text-sm text-gray-400 text-center mb-4">
              출근 {formatTime(todayRecord.checkIn)}
            </div>
            <Button size="xl" variant="danger" onClick={handleCheckOut}>
              퇴근하기
            </Button>
          </>
        ) : hasCheckedOut ? (
          <>
            <div className="text-sm text-gray-500 mb-2">오늘 근무 완료</div>
            <div className="flex justify-center gap-8 mb-2">
              <div className="text-center">
                <div className="text-xs text-gray-400">출근</div>
                <div className="text-lg font-bold text-gray-900">{formatTime(todayRecord.checkIn)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400">퇴근</div>
                <div className="text-lg font-bold text-gray-900">{formatTime(todayRecord.checkOut)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400">근무</div>
                <div className="text-lg font-bold text-gray-900">
                  {todayRecord.workMinutes ? `${Math.floor(todayRecord.workMinutes / 60)}h ${todayRecord.workMinutes % 60}m` : '—'}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="text-sm text-gray-500 mb-3">출퇴근</div>
            {gpsStatus === 'out_range' && (
              <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-3 text-center">
                현재 위치가 사업장 범위 밖입니다
              </div>
            )}
            <Button
              size="xl"
              onClick={handleCheckIn}
              disabled={!canCheckIn}
            >
              출근하기
            </Button>
          </>
        )}
      </Card>

      {/* 오늘의 작업 */}
      <Card accent="blue" className="p-5 mb-4">
        <div className="text-sm font-medium text-gray-700 mb-3">오늘의 작업</div>
        {todayTasks.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">배정된 작업이 없습니다</p>
        ) : (
          <div className="space-y-2">
            {todayTasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <span className="font-medium text-gray-900 text-base">{t.title}</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  t.status === 'completed' ? 'bg-green-100 text-green-700' :
                  t.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {t.status === 'completed' ? '완료' : t.status === 'in_progress' ? '진행' : '대기'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 긴급 호출 FAB */}
      <button
        onClick={() => navigate('/worker/emergency')}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-red-500 text-white
          flex items-center justify-center shadow-lg shadow-red-500/30
          active:scale-95 transition-all z-30"
      >
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </button>
    </div>
  );
}

// GPS 거리 계산 (Haversine)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

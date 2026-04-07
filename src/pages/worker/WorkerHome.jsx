import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import useAttendanceStore from '../../stores/attendanceStore';
import useTaskStore from '../../stores/taskStore';
import useEmployeeStore from '../../stores/employeeStore';
import useBranchStore from '../../stores/branchStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

// 현재 시각을 HH:MM 문자열로 반환
function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Haversine GPS 거리 (미터)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function WorkerHome() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);
  const records = useAttendanceStore((s) => s.records);
  const checkIn = useAttendanceStore((s) => s.checkIn);
  const checkOut = useAttendanceStore((s) => s.checkOut);
  const tasks = useTaskStore((s) => s.tasks);
  const employees = useEmployeeStore((s) => s.employees);
  const branches = useBranchStore((s) => s.branches);

  const [message, setMessage] = useState('');
  const [msgType, setMsgType] = useState('info'); // 'info' | 'error' | 'warn'
  const [gpsStatus, setGpsStatus] = useState('checking'); // 'checking' | 'in_range' | 'out_range' | 'no_gps'

  const today = new Date().toISOString().split('T')[0];

  // 현재 로그인한 직원의 최신 정보 (DB에서)
  const myEmployee = useMemo(
    () => employees.find((e) => e.id === currentUser?.id),
    [employees, currentUser]
  );

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

  // 소속 지점 (branches 테이블에서 code로 매칭)
  const myBranch = useMemo(
    () => branches.find((b) => b.code === myEmployee?.branch),
    [branches, myEmployee]
  );
  const branchDisplayName = myBranch?.name || myEmployee?.branch || '';

  // 직원에게 branch 코드가 설정됐지만 branches 테이블에 없는 경우
  const branchNotRegistered = myEmployee?.branch && !myBranch;

  // GPS 위치 확인: 본인 지점만 허용
  useEffect(() => {
    // 지점 미등록 → 출퇴근 차단 (관리자에게 문의)
    if (branchNotRegistered) {
      setGpsStatus('out_range');
      return;
    }
    if (!navigator.geolocation) {
      setGpsStatus('no_gps');
      return;
    }
    if (!myBranch?.latitude) {
      // 지점 GPS 미설정 → 제한 없이 허용
      setGpsStatus('in_range');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = getDistance(pos.coords.latitude, pos.coords.longitude, myBranch.latitude, myBranch.longitude);
        setGpsStatus(dist <= (myBranch.radiusMeters || 200) ? 'in_range' : 'out_range');
      },
      () => setGpsStatus('in_range'), // GPS 오류 시 제한 없이 허용
      { enableHighAccuracy: true }
    );
  }, [myBranch, branchNotRegistered]);

  const showMsg = (text, type = 'info') => {
    setMessage(text);
    setMsgType(type);
    setTimeout(() => setMessage(''), type === 'error' ? 4000 : 2500);
  };

  const formatTime = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const handleCheckIn = async () => {
    if (gpsStatus === 'out_range') {
      showMsg(
        branchNotRegistered
          ? '근무 지점이 등록되지 않았습니다. 관리자에게 지점 설정을 요청하세요.'
          : '본인 소속 지점에서만 출근 가능합니다',
        'error'
      );
      return;
    }

    // 출근 시간 검증: 기준 시간보다 늦으면 지각
    const hhmm = nowHHMM();
    const startTime = myEmployee?.workStartTime;
    const isLate = startTime ? hhmm > startTime : false;

    const ok = await checkIn(currentUser.id, null, isLate ? 'late' : 'working');
    if (ok) {
      showMsg(isLate ? `지각 출근 처리되었습니다 (기준: ${startTime})` : '출근 처리되었습니다', isLate ? 'warn' : 'info');
    } else {
      showMsg('이미 출근 처리되었습니다', 'error');
    }
  };

  const handleCheckOut = async () => {
    if (gpsStatus === 'out_range') {
      showMsg(
        branchNotRegistered
          ? '근무 지점이 등록되지 않았습니다. 관리자에게 지점 설정을 요청하세요.'
          : '본인 소속 지점에서만 퇴근 가능합니다',
        'error'
      );
      return;
    }
    // 퇴근 시간 검증: 기준 시간 이전이면 차단
    const hhmm = nowHHMM();
    const endTime = myEmployee?.workEndTime;
    if (endTime && hhmm < endTime) {
      showMsg(`아직 퇴근 시간 전입니다 (${endTime} 이후 퇴근 가능)`, 'error');
      return;
    }
    await checkOut(currentUser.id);
    showMsg('퇴근 처리되었습니다');
  };

  const canCheckIn = gpsStatus !== 'out_range' && !todayRecord;

  const msgStyle = {
    info:  'bg-blue-50 text-blue-700 border border-blue-100',
    warn:  'bg-amber-50 text-amber-700 border border-amber-100',
    error: 'bg-red-50 text-red-600 border border-red-100',
  }[msgType] || 'bg-blue-50 text-blue-700';

  return (
    <div className="pb-4">
      {/* 상단 인사 + 지점 */}
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-900">{currentUser?.name}님, 안녕하세요</h2>
        {branchDisplayName && (
          <p className="text-sm text-gray-400 mt-0.5">{branchDisplayName}</p>
        )}
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-2xl text-sm mb-4 ${msgStyle}`}>
          {message}
        </div>
      )}

      {/* GPS 지점 범위 밖 / 미등록 경고 */}
      {gpsStatus === 'out_range' && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-3 rounded-xl mb-4 text-center">
          {branchNotRegistered
            ? '근무 지점이 지점 설정에 등록되지 않았습니다. 관리자에게 지점 설정을 요청하세요.'
            : `본인 소속 지점(${branchDisplayName})에서만 출퇴근 가능합니다`}
        </div>
      )}

      {/* 출퇴근 카드 */}
      <Card accent="blue" className="p-6 mb-4">
        {isWorking ? (
          <>
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-base font-semibold text-blue-600">근무 중</span>
            </div>
            <div className="text-sm text-gray-400 text-center mb-5">
              출근 {formatTime(todayRecord.checkIn)}
              {myEmployee?.workEndTime && (
                <span className="ml-2 text-gray-300">· 퇴근 기준 {myEmployee.workEndTime}</span>
              )}
            </div>
            <Button size="xl" variant="danger" onClick={handleCheckOut} disabled={gpsStatus === 'out_range'}>
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
                  {todayRecord.workMinutes
                    ? `${Math.floor(todayRecord.workMinutes / 60)}h ${todayRecord.workMinutes % 60}m`
                    : '—'}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="text-sm text-gray-500 mb-1">출퇴근</div>
            {myEmployee?.workStartTime && (
              <div className="text-xs text-gray-400 mb-3">
                출근 기준 {myEmployee.workStartTime} · 퇴근 기준 {myEmployee.workEndTime || '—'}
              </div>
            )}
            <Button size="xl" onClick={handleCheckIn} disabled={!canCheckIn}>
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
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </button>
    </div>
  );
}

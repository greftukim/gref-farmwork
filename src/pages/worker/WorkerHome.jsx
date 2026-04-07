import { useState, useMemo, useRef } from 'react';
import useAuthStore from '../../stores/authStore';
import useAttendanceStore from '../../stores/attendanceStore';
import useTaskStore from '../../stores/taskStore';
import useEmployeeStore from '../../stores/employeeStore';
import useBranchStore from '../../stores/branchStore';
import useCallStore from '../../stores/callStore';
import useIssueStore from '../../stores/issueStore';
import useZoneStore from '../../stores/zoneStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import BottomSheet from '../../components/common/BottomSheet';

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

function verifyGpsNow(myBranch) {
  if (!myBranch?.latitude) return Promise.resolve({ ok: true });
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ ok: false, error: '위치 권한을 허용해주세요' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = Math.round(
          getDistance(pos.coords.latitude, pos.coords.longitude, myBranch.latitude, myBranch.longitude)
        );
        const radius = myBranch.radiusMeters || 200;
        if (dist <= radius) {
          resolve({ ok: true, dist });
        } else {
          resolve({ ok: false, dist, error: `본인 소속 지점에서만 출퇴근이 가능합니다 (현재 거리: ${dist}m)` });
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          resolve({ ok: false, error: '위치 권한을 허용해주세요' });
        } else {
          resolve({ ok: false, error: '위치를 확인할 수 없습니다. 다시 시도해주세요' });
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

// callTypes 제거됨 - 재배사 호출은 유형 선택 없이 바로 전송

const issueCategories = [
  { key: '작물이상', label: '작물 이상', desc: '병해충, 생육 불량 등', icon: '🌿' },
  { key: '설비이상', label: '설비 이상', desc: '장비 고장, 시설 불량 등', icon: '⚙️' },
];

export default function WorkerHome() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const records = useAttendanceStore((s) => s.records);
  const checkIn = useAttendanceStore((s) => s.checkIn);
  const checkOut = useAttendanceStore((s) => s.checkOut);
  const tasks = useTaskStore((s) => s.tasks);
  const employees = useEmployeeStore((s) => s.employees);
  const branches = useBranchStore((s) => s.branches);
  const addCall = useCallStore((s) => s.addCall);
  const addIssue = useIssueStore((s) => s.addIssue);
  const zones = useZoneStore((s) => s.zones);

  const [message, setMessage] = useState('');
  const [msgType, setMsgType] = useState('info');
  const [gpsLoading, setGpsLoading] = useState(false);

  // FAB 바텀시트
  const [showFab, setShowFab] = useState(false);
  const [fabTab, setFabTab] = useState('call'); // 미사용 - 이상 신고 항상 펼침
  const [callSubmitting, setCallSubmitting] = useState(false);

  // 이상 신고 폼
  const [issueCategory, setIssueCategory] = useState('');
  const [issueForm, setIssueForm] = useState({ zoneId: '', comment: '' });
  const [issuePhoto, setIssuePhoto] = useState(null);
  const [issueSubmitting, setIssueSubmitting] = useState(false);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const today = new Date().toISOString().split('T')[0];

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

  const myBranch = useMemo(
    () => branches.find((b) => b.code === myEmployee?.branch),
    [branches, myEmployee]
  );
  const branchDisplayName = myBranch?.name || myEmployee?.branch || '';
  const branchNotRegistered = myEmployee?.branch && !myBranch;

  const showMsg = (text, type = 'info') => {
    setMessage(text);
    setMsgType(type);
    setTimeout(() => setMessage(''), type === 'error' ? 5000 : 2500);
  };

  const formatTime = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const withGpsVerify = async (action) => {
    if (gpsLoading) return;
    if (branchNotRegistered) {
      showMsg('근무 지점이 등록되지 않았습니다. 관리자에게 지점 설정을 요청하세요.', 'error');
      return;
    }
    setGpsLoading(true);
    showMsg('위치 확인 중...', 'info');
    const result = await verifyGpsNow(myBranch);
    setGpsLoading(false);
    if (!result.ok) {
      showMsg(result.error, 'error');
      return;
    }
    await action();
  };

  const handleCheckIn = () =>
    withGpsVerify(async () => {
      const hhmm = nowHHMM();
      const startTime = myEmployee?.workStartTime;
      const isLate = startTime ? hhmm > startTime : false;
      const ok = await checkIn(currentUser.id, null, isLate ? 'late' : 'working');
      if (ok) {
        showMsg(isLate ? `지각 출근 처리되었습니다 (기준: ${startTime})` : '출근 처리되었습니다', isLate ? 'warn' : 'info');
      } else {
        showMsg('이미 출근 처리되었습니다', 'error');
      }
    });

  const handleCheckOut = () =>
    withGpsVerify(async () => {
      const hhmm = nowHHMM();
      const endTime = myEmployee?.workEndTime;
      if (endTime && hhmm < endTime) {
        showMsg(`아직 퇴근 시간 전입니다 (${endTime} 이후 퇴근 가능)`, 'error');
        return;
      }
      await checkOut(currentUser.id);
      showMsg('퇴근 처리되었습니다');
    });

  const openFab = () => {
    setIssueCategory('');
    setIssueForm({ zoneId: '', comment: '' });
    setIssuePhoto(null);
    setShowFab(true);
  };

  const handleCallSubmit = async () => {
    if (callSubmitting) return;
    setCallSubmitting(true);
    await addCall({ workerId: currentUser.id, type: '긴급호출', memo: '' });
    setCallSubmitting(false);
    setShowFab(false);
    showMsg('호출이 전송되었습니다', 'info');
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setIssuePhoto({ file, url });
  };

  const handleIssueSubmit = async () => {
    if (!issueCategory || !issueForm.comment.trim()) return;
    if (issueSubmitting) return;
    setIssueSubmitting(true);
    await addIssue({
      workerId: currentUser.id,
      zoneId: issueForm.zoneId || null,
      type: issueCategory,
      comment: issueForm.comment,
      photo: null,
    });
    setIssueSubmitting(false);
    setShowFab(false);
    showMsg('이상 신고가 접수되었습니다', 'info');
  };

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

      {branchNotRegistered && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-3 rounded-xl mb-4 text-center">
          근무 지점이 지점 설정에 등록되지 않았습니다. 관리자에게 지점 설정을 요청하세요.
        </div>
      )}

      {message && (
        <div className={`px-4 py-3 rounded-2xl text-sm mb-4 ${msgStyle}`}>
          {message}
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
            <Button size="xl" variant="danger" onClick={handleCheckOut} disabled={gpsLoading}>
              {gpsLoading ? '위치 확인 중...' : '퇴근하기'}
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
            <Button size="xl" onClick={handleCheckIn} disabled={gpsLoading || !!todayRecord}>
              {gpsLoading ? '위치 확인 중...' : '출근하기'}
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

      {/* 긴급 호출 / 이상 신고 FAB */}
      <button
        onClick={openFab}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-red-500 text-white
          flex items-center justify-center shadow-lg shadow-red-500/30
          active:scale-95 transition-all z-30"
      >
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </button>

      {/* 긴급 호출 / 이상 신고 바텀시트 */}
      <BottomSheet isOpen={showFab} onClose={() => setShowFab(false)} title="긴급 호출 / 이상 신고">
        {/* 재배사 호출 섹션 (상단 강조) */}
        <div className="mb-5">
          <div className="text-sm font-semibold text-gray-700 mb-2">재배사 호출</div>
          <Button
            size="lg"
            variant="danger"
            className="w-full"
            onClick={handleCallSubmit}
            disabled={callSubmitting}
          >
            {callSubmitting ? '전송 중...' : '재배사 긴급 호출'}
          </Button>
        </div>

        <div className="border-t border-gray-100 pt-5">
          <div className="text-sm font-semibold text-gray-700 mb-3">이상 신고</div>

        {/* 이상 신고 (항상 펼침) */}
        {true && (
          <div className="space-y-3">
            {/* 신고 유형 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">신고 유형</label>
              <div className="grid grid-cols-2 gap-2">
                {issueCategories.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setIssueCategory(cat.key)}
                    className={`p-3 rounded-xl border-2 text-left transition-colors ${
                      issueCategory === cat.key
                        ? 'border-red-400 bg-red-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="text-lg mb-1">{cat.icon}</div>
                    <div className="text-sm font-semibold text-gray-800">{cat.label}</div>
                    <div className="text-xs text-gray-400">{cat.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 구역 (선택) */}
            {zones.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">구역 (선택)</label>
                <select
                  value={issueForm.zoneId}
                  onChange={(e) => setIssueForm({ ...issueForm, zoneId: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
                >
                  <option value="">선택 안 함</option>
                  {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
            )}

            {/* 사진 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">사진 (선택)</label>
              <div className="flex gap-2">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 rounded-lg py-2.5 text-sm text-gray-600 bg-white active:bg-gray-50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  카메라
                </button>
                <button
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 rounded-lg py-2.5 text-sm text-gray-600 bg-white active:bg-gray-50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  갤러리
                </button>
              </div>
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
              <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              {issuePhoto && (
                <div className="relative mt-2">
                  <img src={issuePhoto.url} alt="첨부 사진" className="w-full h-36 object-cover rounded-lg" />
                  <button
                    onClick={() => setIssuePhoto(null)}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full text-white flex items-center justify-center text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* 상세 내용 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">상세 내용</label>
              <textarea
                value={issueForm.comment}
                onChange={(e) => setIssueForm({ ...issueForm, comment: e.target.value })}
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
                placeholder="이상 증상을 상세히 기록해주세요"
              />
            </div>

            <Button
              size="lg"
              variant="danger"
              className="w-full"
              onClick={handleIssueSubmit}
              disabled={issueSubmitting || !issueCategory || !issueForm.comment.trim()}
            >
              {issueSubmitting ? '접수 중...' : '신고 접수'}
            </Button>
          </div>
        )}
        </div>
      </BottomSheet>
    </div>
  );
}

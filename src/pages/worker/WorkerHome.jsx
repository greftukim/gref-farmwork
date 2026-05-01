// 작업자 홈 (모바일) — 트랙 77 U1 시각 재설계
// 시안: screens/worker-screens-v2.jsx ScreenHome
// 보존: 출퇴근 검증 v2 인라인 함수 (handlePunch / verifyBranchAndGps 등)

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Icon, Pill, T_worker as T, icons,
} from '../../design/primitives';
import useAuthStore from '../../stores/authStore';
import useAttendanceStore from '../../stores/attendanceStore';
import useTaskStore from '../../stores/taskStore';
import useNoticeStore from '../../stores/noticeStore';
import { supabase } from '../../lib/supabase';
import IssueModal, { IssueFab } from '../../components/worker/IssueModal';

const today = () => new Date().toISOString().split('T')[0];

const fmtTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// 출퇴근 검증 헬퍼 — ATTENDANCE-VALIDATION-HOTFIX-002 (옵션 나: 인프라 우회)
// 인프라 결함(LOCATION-STORE-MULTI-BRANCH-001 / JUDGE-ATTENDANCE-THRESHOLD-001) 회피
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('이 기기는 GPS를 지원하지 않습니다'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  });
}

function timeStrToTodayDate(timeStr) {
  if (!timeStr) return null;
  const [h, m] = String(timeStr).split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

const greeting = () => {
  const h = new Date().getHours();
  if (h < 6) return '이른 시간입니다';
  if (h < 12) return '좋은 아침입니다';
  if (h < 18) return '수고하고 있어요';
  return '오늘도 고생 많으셨어요';
};

export default function WorkerHome() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);
  const records = useAttendanceStore((s) => s.records);
  const checkIn = useAttendanceStore((s) => s.checkIn);
  const checkOut = useAttendanceStore((s) => s.checkOut);
  const tasks = useTaskStore((s) => s.tasks);
  const notices = useNoticeStore((s) => s.notices);

  const [now, setNow] = useState(new Date());
  const [processing, setProcessing] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const todayRecord = useMemo(
    () => records.find((r) => r.employeeId === currentUser?.id && r.date === today()),
    [records, currentUser]
  );

  const myTasks = useMemo(
    () => tasks.filter((t) =>
      (t.assignees || []).includes(currentUser?.id) &&
      t.status !== 'completed'
    ),
    [tasks, currentUser]
  );

  const todayTasks = myTasks.filter((t) =>
    !t.dueDate || t.dueDate === today() || t.status === 'in_progress'
  );

  const latestNotices = useMemo(
    () => [...notices].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 2),
    [notices]
  );

  const state = !todayRecord?.checkIn ? 'out' : (!todayRecord?.checkOut ? 'in' : 'done');
  const workedMinutes = todayRecord?.checkIn
    ? Math.round(((todayRecord.checkOut ? new Date(todayRecord.checkOut) : now) - new Date(todayRecord.checkIn)) / 60000)
    : 0;

  // 출근/퇴근 공통: 자기 지점 SELECT + GPS 검증 (NULL 지점은 자동 스킵)
  // 반환: { ok: true, gpsCoords } | { ok: false }
  const verifyBranchAndGps = async () => {
    const branchCode = currentUser?.branch;
    if (!branchCode) return { ok: true, gpsCoords: null };

    const { data: branchData, error } = await supabase
      .from('branches')
      .select('code, name, latitude, longitude, radius_meters')
      .eq('code', branchCode)
      .maybeSingle();
    if (error) {
      alert(`지점 정보 조회 실패: ${error.message ?? '알 수 없는 오류'}`);
      return { ok: false };
    }

    const branchHasGeofence =
      branchData?.latitude != null
      && branchData?.longitude != null
      && branchData?.radius_meters != null;
    if (!branchHasGeofence) return { ok: true, gpsCoords: null };

    let gpsCoords;
    try {
      gpsCoords = await getCurrentPosition();
    } catch (err) {
      alert(`GPS 위치를 확인할 수 없습니다.\n${err?.message ?? '위치 권한을 확인하세요'}`);
      return { ok: false };
    }
    const distance = haversineDistance(
      gpsCoords.lat, gpsCoords.lng,
      branchData.latitude, branchData.longitude,
    );
    if (distance > branchData.radius_meters) {
      alert(`반경 밖입니다.\n현재 위치는 ${branchData.name}에서 ${Math.round(distance)}m 떨어져 있습니다. (반경 ${branchData.radius_meters}m)`);
      return { ok: false };
    }
    return { ok: true, gpsCoords };
  };

  const handlePunch = async () => {
    if (processing) return;
    setProcessing(true);
    try {
      if (state === 'out') {
        // === 출근 흐름 ===
        const { ok, gpsCoords } = await verifyBranchAndGps();
        if (!ok) return;

        // 시간대 status 판정 (인라인 — judgeAttendanceStatus 우회: 임계값 인자 없음)
        // 정책: 출근 시각 30분 전부터 허용, 5분 후부터 'late'
        let initialStatus = 'working';
        const startDate = timeStrToTodayDate(currentUser?.workStartTime);
        if (startDate) {
          const nowDate = new Date();
          const earlyAllowedFrom = new Date(startDate.getTime() - 30 * 60 * 1000);
          const lateThreshold = new Date(startDate.getTime() + 5 * 60 * 1000);
          if (nowDate < earlyAllowedFrom) {
            alert(`출근 가능 시간이 아닙니다.\n출근 시각: ${String(currentUser.workStartTime).slice(0, 5)} (30분 전부터 허용)`);
            return;
          }
          if (nowDate > lateThreshold) {
            initialStatus = 'late';
          }
        }

        const success = await checkIn?.(currentUser.id, gpsCoords, initialStatus);
        if (success === false) {
          alert('이미 오늘 출근 기록이 있습니다.');
          return;
        }
        if (initialStatus === 'late') {
          alert('출근 처리됐습니다. (지각으로 기록)');
        }
      } else if (state === 'in') {
        // === 퇴근 흐름 ===
        const { ok, gpsCoords } = await verifyBranchAndGps();
        if (!ok) return;

        // 일찍 퇴근 confirm
        const endDate = timeStrToTodayDate(currentUser?.workEndTime);
        if (endDate && new Date() < endDate) {
          const confirmed = window.confirm(
            `근무 시간 전입니다.\n퇴근 시각: ${String(currentUser.workEndTime).slice(0, 5)}\n그래도 퇴근 처리하시겠습니까?`,
          );
          if (!confirmed) return;
        }

        await checkOut?.(currentUser.id, gpsCoords);
      }
      // state === 'done' 무동작
    } finally {
      setProcessing(false);
    }
  };

  const nowLabel = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const dateLabel = now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' });

  // 시안 v2 ScreenHome 매핑: 'out' → 'before', 'in' → 'working', 'done' 별도 처리
  const isWorking = state === 'in';
  const isDone = state === 'done';
  // 출근 시각 라벨 (시안: "08:32 출근")
  const checkInLabel = todayRecord?.checkIn ? fmtTime(todayRecord.checkIn) : null;
  // 출근 시각 안내 (시안: "오늘 근무 09:00 시작")
  const startLabel = currentUser?.workStartTime
    ? `오늘 근무 ${String(currentUser.workStartTime).slice(0, 5)} 시작`
    : null;

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, paddingBottom: 80 }}>
      {/* 헤더 — Q4: 알림 종 제거 */}
      <div style={{
        background: `linear-gradient(135deg, ${T.gradientFrom}, ${T.gradientTo})`,
        color: '#fff', padding: '20px 20px 30px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 999,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>{(currentUser?.name || '?')[0]}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 500 }}>{greeting()}</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{currentUser?.name || '작업자'}님</div>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 600, letterSpacing: 0.3 }}>{dateLabel}</div>
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1.5, fontFamily: 'ui-monospace,monospace', lineHeight: 1 }}>{nowLabel}</div>
        </div>
      </div>

      {/* 출퇴근 카드 — Q16: 상태별 분기 (위로 겹치기) */}
      <div style={{ padding: '0 16px', marginTop: -18 }}>
        <Card pad={20} style={{ boxShadow: T.shadowLg }}>
          {isWorking ? (
            <>
              {/* 출근 중 — 큰 강조 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 999, background: T.success, boxShadow: `0 0 0 4px ${T.successSoft}` }} />
                <span style={{ fontSize: 22, fontWeight: 800, color: T.success, letterSpacing: -0.4 }}>출근 중</span>
                {checkInLabel && (
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: T.mutedSoft, fontFamily: 'ui-monospace,monospace', fontWeight: 600 }}>
                    {checkInLabel} 출근
                  </span>
                )}
              </div>
              <button onClick={handlePunch} disabled={processing} style={{
                width: '100%', height: 52, borderRadius: 12, border: 0,
                background: T.primary, color: '#fff',
                fontSize: 15, fontWeight: 700, cursor: processing ? 'default' : 'pointer',
                boxShadow: T.shadowSm, marginBottom: 8,
                opacity: processing ? 0.6 : 1,
              }}>{processing ? '처리 중...' : '퇴근하기'}</button>
              {/* 연장근무 신청 — onClick은 U3에서 모달 연결 */}
              <button disabled style={{
                width: '100%', height: 44, borderRadius: 10,
                border: `1px solid ${T.info}`, background: T.infoSoft, color: T.info,
                fontSize: 13, fontWeight: 700, cursor: 'not-allowed',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                opacity: 0.6,
              }}>
                <Icon d={icons.clock} size={14} c={T.info} sw={2.2} />
                연장근무 신청
              </button>
            </>
          ) : isDone ? (
            <>
              {/* 퇴근 완료 — 기존 자산 보존 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 999, background: T.primary }} />
                <span style={{ fontSize: 18, fontWeight: 800, color: T.primaryText, letterSpacing: -0.3 }}>퇴근 완료</span>
                {workedMinutes > 0 && (
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: T.mutedSoft, fontFamily: 'ui-monospace,monospace', fontWeight: 600 }}>
                    {Math.floor(workedMinutes / 60)}시간 {workedMinutes % 60}분
                  </span>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ padding: 10, background: T.bg, borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 700, marginBottom: 4 }}>출근</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: T.text, fontFamily: 'ui-monospace,monospace' }}>{fmtTime(todayRecord?.checkIn)}</div>
                </div>
                <div style={{ padding: 10, background: T.bg, borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 700, marginBottom: 4 }}>퇴근</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: T.text, fontFamily: 'ui-monospace,monospace' }}>{fmtTime(todayRecord?.checkOut)}</div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* 출근 전 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 999, background: T.mutedSoft }} />
                <span style={{ fontSize: 16, fontWeight: 700, color: T.muted }}>출근 전</span>
                {startLabel && (
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: T.mutedSoft, fontWeight: 500 }}>
                    {startLabel}
                  </span>
                )}
              </div>
              <button onClick={handlePunch} disabled={processing} style={{
                width: '100%', height: 52, borderRadius: 12, border: 0,
                background: `linear-gradient(135deg, ${T.gradientFrom}, ${T.gradientTo})`,
                color: '#fff', fontSize: 16, fontWeight: 800, letterSpacing: -0.2,
                cursor: processing ? 'default' : 'pointer',
                boxShadow: T.shadowMd,
                opacity: processing ? 0.6 : 1,
              }}>{processing ? '처리 중...' : '출근하기'}</button>
            </>
          )}
        </Card>
      </div>

      {/* QR 스캔 CTA — Q1: 4버튼 그리드 폐기 후 단독 진입점 */}
      <div style={{ padding: '20px 16px 0' }}>
        <button
          onClick={() => navigate('/worker/m/qr-scan')}
          style={{
            width: '100%', height: 56, borderRadius: 14, border: 0,
            background: `linear-gradient(135deg, ${T.primary} 0%, ${T.primaryDark} 100%)`,
            color: '#fff', fontSize: 14, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            cursor: 'pointer', boxShadow: T.shadowMd,
          }}
        >
          <Icon d={icons.camera} size={20} c="#fff" sw={1.8} /> QR 스캔하기
        </button>
      </div>

      {/* 오늘의 작업 미니카드 */}
      {/* TODO U4: task_assignments 연동 — 현재 useTaskStore 실데이터 사용, U4에서 시각/필드 보강 */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 8, letterSpacing: 0.3 }}>오늘의 작업</div>
        {todayTasks.length === 0 ? (
          <Card pad={14} style={{ borderLeft: `3px solid ${T.warning}` }}>
            <div style={{ fontSize: 13, color: T.muted, fontWeight: 600 }}>오늘 배정된 작업이 없어요</div>
          </Card>
        ) : (
          (() => {
            const t = todayTasks[0];
            const progress = t.progress ?? (t.status === 'in_progress' ? 40 : 0);
            return (
              <Card pad={14} style={{ borderLeft: `3px solid ${T.warning}`, cursor: 'pointer' }} onClick={() => navigate('/worker/tasks')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  {t.status === 'in_progress' ? (
                    <Pill tone="warning" size="sm">진행중</Pill>
                  ) : (
                    <Pill tone="muted" size="sm">예정</Pill>
                  )}
                  {todayTasks.length > 1 && (
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: T.mutedSoft }}>+{todayTasks.length - 1}건</span>
                  )}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>{t.title}</div>
                {(t.crop || t.zone) && (
                  <div style={{ fontSize: 11, color: T.muted }}>
                    {t.crop}{t.crop && t.zone && ' · '}{t.zone}{progress > 0 && ` · ${progress}%`}
                  </div>
                )}
              </Card>
            );
          })()
        )}
      </div>

      {/* 공지 미니카드 */}
      {/* TODO U4: notices 연동 — 현재 useNoticeStore 실데이터 사용, U4에서 unread/뱃지 처리 */}
      <div style={{ padding: '14px 16px 0' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 8, letterSpacing: 0.3 }}>공지</div>
        {latestNotices.length === 0 ? (
          <Card pad={14}>
            <div style={{ fontSize: 13, color: T.muted, fontWeight: 600 }}>새 공지가 없어요</div>
          </Card>
        ) : (
          (() => {
            const n = latestNotices[0];
            return (
              <Card pad={14} style={{ cursor: 'pointer' }} onClick={() => navigate('/worker/notices')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  {n.priority === 'urgent' ? (
                    <Pill tone="danger" size="sm">긴급</Pill>
                  ) : n.priority === 'important' ? (
                    <Pill tone="warning" size="sm">중요</Pill>
                  ) : (
                    <Pill tone="primary" size="sm">공지</Pill>
                  )}
                  {latestNotices.length > 1 && (
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: T.mutedSoft }}>+{latestNotices.length - 1}건</span>
                  )}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{n.title}</div>
              </Card>
            );
          })()
        )}
      </div>

      {/* Q17 — 이상 신고 FAB (홈 한정, BottomNav 위 floating) */}
      <IssueFab onClick={() => setShowIssueModal(true)} />
      <IssueModal open={showIssueModal} onClose={() => setShowIssueModal(false)} />
    </div>
  );
}

// 작업자 홈 (모바일) — 프로 SaaS 리디자인
// 기존: src/pages/worker/WorkerHome.jsx 교체용

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar, Card, Dot, Icon, Pill, T, icons,
} from '../../design/primitives';
import useAuthStore from '../../stores/authStore';
import useAttendanceStore from '../../stores/attendanceStore';
import useTaskStore from '../../stores/taskStore';
import useNoticeStore from '../../stores/noticeStore';

const today = () => new Date().toISOString().split('T')[0];

const fmtTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 6) return '이른 시간입니다';
  if (h < 12) return '좋은 아침입니다';
  if (h < 18) return '수고하고 있어요';
  return '오늘도 고생 많으셨어요';
};

export default function WorkerHome({ onNavigate }) {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);
  const records = useAttendanceStore((s) => s.records);
  const checkIn = useAttendanceStore((s) => s.checkIn);
  const checkOut = useAttendanceStore((s) => s.checkOut);
  const tasks = useTaskStore((s) => s.tasks);
  const notices = useNoticeStore((s) => s.notices);

  const [now, setNow] = useState(new Date());
  const [processing, setProcessing] = useState(false);

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

  const handlePunch = async () => {
    if (processing) return;
    setProcessing(true);
    if (state === 'out') await checkIn?.(currentUser.id);
    else if (state === 'in') await checkOut?.(currentUser.id);
    setProcessing(false);
  };

  const nowLabel = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const dateLabel = now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' });

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, paddingBottom: 80 }}>
      {/* 헤더 */}
      <div style={{
        background: `linear-gradient(135deg, ${T.primary} 0%, ${T.primaryDark} 100%)`,
        color: '#fff', padding: '20px 20px 28px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar name={currentUser?.name || '?'} color="slate" size={40} />
            <div>
              <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 500 }}>{greeting()}</div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{currentUser?.name || '작업자'}님</div>
            </div>
          </div>
          <button onClick={() => onNavigate?.('notice')} style={{
            position: 'relative', width: 36, height: 36, borderRadius: 10, border: 0,
            background: 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon d={icons.bell} size={16} c="#fff" sw={2} />
            {latestNotices.length > 0 && (
              <span style={{ position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: 999, background: T.warning, border: '1.5px solid #fff' }} />
            )}
          </button>
        </div>

        {/* 현재 시각 + 날짜 */}
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 600, letterSpacing: 0.3 }}>{dateLabel}</div>
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1.5, fontFamily: 'ui-monospace,monospace', lineHeight: 1 }}>{nowLabel}</div>
        </div>
      </div>

      {/* 출퇴근 카드 (위로 겹치기) */}
      <div style={{ padding: '0 16px', marginTop: -18 }}>
        <Card pad={18} style={{ boxShadow: '0 6px 16px rgba(15,23,42,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>오늘 근무</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700,
                padding: '2px 7px', borderRadius: 999,
                background: state === 'in' ? T.successSoft : state === 'done' ? T.primarySoft : T.bg,
                color: state === 'in' ? T.success : state === 'done' ? T.primaryText : T.muted,
              }}>
                <Dot c={state === 'in' ? T.success : state === 'done' ? T.primary : T.mutedSoft} />
                {state === 'in' ? '근무중' : state === 'done' ? '퇴근 완료' : '출근 전'}
              </span>
            </div>
            {workedMinutes > 0 && (
              <span style={{ fontSize: 11, color: T.mutedSoft, fontFamily: 'ui-monospace,monospace' }}>
                {Math.floor(workedMinutes / 60)}시간 {workedMinutes % 60}분
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div style={{ padding: 10, background: T.bg, borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 700, marginBottom: 4 }}>출근</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: todayRecord?.checkIn ? T.text : T.mutedSoft, fontFamily: 'ui-monospace,monospace' }}>{fmtTime(todayRecord?.checkIn)}</div>
            </div>
            <div style={{ padding: 10, background: T.bg, borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 700, marginBottom: 4 }}>퇴근</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: todayRecord?.checkOut ? T.text : T.mutedSoft, fontFamily: 'ui-monospace,monospace' }}>{fmtTime(todayRecord?.checkOut)}</div>
            </div>
          </div>

          <button onClick={handlePunch} disabled={state === 'done' || processing}
            style={{
              width: '100%', height: 52, borderRadius: 10, border: 0,
              background: state === 'done' ? T.bg : state === 'in' ? T.warning : T.success,
              color: state === 'done' ? T.mutedSoft : '#fff',
              fontSize: 15, fontWeight: 700, cursor: state === 'done' ? 'default' : 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: state === 'done' ? 'none' : '0 2px 6px rgba(0,0,0,0.12)',
            }}>
            <Icon d={state === 'in' ? icons.stop : icons.play} size={16} c={state === 'done' ? T.mutedSoft : '#fff'} sw={2.2} />
            {processing ? '처리 중...' : state === 'out' ? '출근하기' : state === 'in' ? '퇴근하기' : '오늘 근무 완료'}
          </button>
        </Card>
      </div>

      {/* 빠른 액션 */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[
            { id: 'tasks', l: '내 작업', icon: icons.clipboard, c: T.primary, soft: T.primarySoft },
            { id: 'attendance', l: '출퇴근', icon: icons.calendar, c: T.success, soft: T.successSoft },
            { id: 'leave', l: '휴가 신청', icon: icons.leaf, c: T.warning, soft: T.warningSoft },
            { id: 'overtime', l: '연장근무', icon: icons.clock, c: T.info, soft: T.infoSoft },
          ].map((a) => (
            <button key={a.id} onClick={() => onNavigate?.(a.id)} style={{
              background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10,
              padding: '12px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              cursor: 'pointer',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9, background: a.soft,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon d={a.icon} size={16} c={a.c} sw={2} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: T.text }}>{a.l}</span>
            </button>
          ))}
        </div>
      </div>

      {/* QR 스캔 CTA */}
      <div style={{ padding: '16px 16px 0' }}>
        <button
          onClick={() => navigate('/worker/m/qr-scan')}
          style={{
            width: '100%', borderRadius: 14, border: 0,
            background: `linear-gradient(135deg, ${T.primary} 0%, ${T.primaryDark} 100%)`,
            color: '#fff', padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(99,102,241,0.30)',
          }}
        >
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'rgba(255,255,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon d={icons.camera} size={22} c="#fff" sw={2} />
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>QR 스캔</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>골 위치를 기록하세요</div>
          </div>
          <Icon d={<polyline points="9 18 15 12 9 6" />} size={18} c="rgba(255,255,255,0.7)" sw={2} />
        </button>
      </div>

      {/* 오늘의 작업 */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>오늘의 작업</h3>
          <button onClick={() => onNavigate?.('tasks')} style={{
            background: 'transparent', border: 0, color: T.primary, fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>전체 보기 →</button>
        </div>
        {todayTasks.length === 0 ? (
          <Card pad={24} style={{ textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: T.bg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <Icon d={icons.check} size={18} c={T.mutedSoft} sw={2} />
            </div>
            <div style={{ fontSize: 13, color: T.muted, fontWeight: 600 }}>오늘 배정된 작업이 없습니다</div>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {todayTasks.slice(0, 3).map((t) => {
              const progress = t.progress ?? (t.status === 'in_progress' ? 40 : 0);
              return (
                <Card key={t.id} pad={14} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 4, alignSelf: 'stretch', borderRadius: 2,
                    background: t.priority === 'high' ? T.danger : t.priority === 'medium' ? T.warning : T.mutedSoft,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 4 }}>{t.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: T.mutedSoft }}>
                      {t.crop && <span>{t.crop}</span>}
                      {t.zone && <><span>·</span><span>{t.zone}</span></>}
                      {t.status === 'in_progress' && <Pill tone="warning" size="sm">진행중</Pill>}
                    </div>
                    {progress > 0 && (
                      <div style={{ marginTop: 6, height: 4, background: T.bg, borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${progress}%`, height: '100%', background: T.primary }} />
                      </div>
                    )}
                  </div>
                  <Icon d={<polyline points="9 18 15 12 9 6" />} size={14} c={T.mutedSoft} sw={2} />
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 공지 */}
      {latestNotices.length > 0 && (
        <div style={{ padding: '20px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>공지사항</h3>
            <button onClick={() => onNavigate?.('notice')} style={{
              background: 'transparent', border: 0, color: T.primary, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>전체 →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {latestNotices.map((n) => (
              <Card key={n.id} pad={14} style={{
                borderLeft: n.priority === 'urgent' ? `3px solid ${T.danger}` :
                            n.priority === 'important' ? `3px solid ${T.warning}` : `3px solid ${T.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  {n.priority === 'urgent' && <Pill tone="danger" size="sm">긴급</Pill>}
                  {n.priority === 'important' && <Pill tone="warning" size="sm">중요</Pill>}
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{n.title}</span>
                </div>
                {n.content && (
                  <p style={{ fontSize: 12, color: T.muted, margin: '4px 0 0', lineHeight: 1.45,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {n.content}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

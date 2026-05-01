// 작업자 - 내 작업 (모바일) — 프로 SaaS 리디자인
// 기존: src/pages/worker/WorkerTasksPage.jsx 교체용

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Dot, Icon, Pill, T, icons,
} from '../../design/primitives';
import useAuthStore from '../../stores/authStore';
import useTaskStore from '../../stores/taskStore';

const today = () => new Date().toISOString().split('T')[0];

const STATUS = {
  planned: { l: '계획', fg: T.muted, soft: '#F1F5F9' },
  assigned: { l: '배정', fg: T.primary, soft: T.primarySoft },
  in_progress: { l: '진행중', fg: T.warning, soft: T.warningSoft },
  completed: { l: '완료', fg: T.success, soft: T.successSoft },
};

const PRIORITY = {
  high: { l: '높음', fg: T.danger, soft: T.dangerSoft },
  medium: { l: '보통', fg: T.warning, soft: T.warningSoft },
  low: { l: '낮음', fg: T.muted, soft: '#F1F5F9' },
};

const fmtDate = (s) => {
  if (!s) return '—';
  const d = new Date(s);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}/${d.getDate()} (${days[d.getDay()]})`;
};

function isoWeekStart(d) {
  const x = new Date(d);
  const day = x.getDay();
  x.setDate(x.getDate() - ((day + 6) % 7));
  return x.toISOString().split('T')[0];
}
function isoWeekEnd(d) {
  const x = new Date(isoWeekStart(d));
  x.setDate(x.getDate() + 6);
  return x.toISOString().split('T')[0];
}

export default function WorkerTasksPage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);
  const tasks = useTaskStore((s) => s.tasks);
  const updateTask = useTaskStore((s) => s.updateTask);

  const [tab, setTab] = useState('today');
  const [processing, setProcessing] = useState(null);

  const myTasks = useMemo(
    () => tasks.filter((t) => (t.assignees || []).includes(currentUser?.id)),
    [tasks, currentUser]
  );

  const todayStr = today();
  const wStart = isoWeekStart(new Date());
  const wEnd = isoWeekEnd(new Date());

  const filtered = useMemo(() => {
    if (tab === 'today') {
      return myTasks.filter((t) =>
        t.status !== 'completed' &&
        (!t.dueDate || t.dueDate === todayStr || t.status === 'in_progress')
      );
    }
    if (tab === 'week') {
      return myTasks.filter((t) =>
        t.status !== 'completed' &&
        t.dueDate && t.dueDate >= wStart && t.dueDate <= wEnd
      );
    }
    return myTasks.filter((t) => t.status === 'completed');
  }, [myTasks, tab, todayStr, wStart, wEnd]);

  const counts = {
    today: myTasks.filter((t) => t.status !== 'completed' && (!t.dueDate || t.dueDate === todayStr || t.status === 'in_progress')).length,
    week: myTasks.filter((t) => t.status !== 'completed' && t.dueDate && t.dueDate >= wStart && t.dueDate <= wEnd).length,
    done: myTasks.filter((t) => t.status === 'completed').length,
  };

  const handleStart = async (t) => {
    setProcessing(t.id);
    await updateTask(t.id, { status: 'in_progress' });
    setProcessing(null);
  };
  const handleComplete = async (t) => {
    setProcessing(t.id);
    await updateTask(t.id, { status: 'completed', progress: 100, completedAt: new Date().toISOString() });
    setProcessing(null);
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, paddingBottom: 80 }}>
      {/* 헤더 */}
      <div style={{
        background: T.surface, borderBottom: `1px solid ${T.border}`,
        padding: '16px 16px 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <button onClick={() => navigate('/worker')} style={{
            width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.border}`,
            background: T.bg, color: T.muted, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon d={<polyline points="15 18 9 12 15 6" />} size={14} sw={2.2} />
          </button>
          <h1 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0 }}>내 작업</h1>
          <div style={{ width: 32 }} />
        </div>

        {/* 탭 */}
        <div style={{ display: 'flex', gap: 0 }}>
          {[
            { v: 'today', l: '오늘', n: counts.today },
            { v: 'week', l: '이번 주', n: counts.week },
            { v: 'done', l: '완료', n: counts.done },
          ].map((t) => {
            const on = tab === t.v;
            return (
              <button key={t.v} onClick={() => setTab(t.v)} style={{
                flex: 1, padding: '12px 4px', border: 0, background: 'transparent',
                borderBottom: on ? `2px solid ${T.primary}` : '2px solid transparent',
                color: on ? T.primary : T.mutedSoft,
                fontSize: 13, fontWeight: on ? 700 : 600, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                {t.l}
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 3,
                  background: on ? T.primarySoft : T.bg, color: on ? T.primaryText : T.mutedSoft,
                }}>{t.n}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 목록 */}
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 ? (
          <Card pad={32} style={{ textAlign: 'center' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, background: T.bg,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10,
            }}>
              <Icon d={icons.clipboard} size={20} c={T.mutedSoft} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.muted }}>
              {tab === 'done' ? '완료한 작업이 없습니다' : '예정된 작업이 없습니다'}
            </div>
          </Card>
        ) : filtered.map((t) => {
          const st = STATUS[t.status] || STATUS.planned;
          const p = PRIORITY[t.priority] || PRIORITY.medium;
          const progress = t.progress ?? (t.status === 'completed' ? 100 : t.status === 'in_progress' ? 40 : 0);
          return (
            <Card key={t.id} pad={14} style={{
              borderLeft: `3px solid ${p.fg}`,
              opacity: t.status === 'completed' ? 0.72 : 1,
            }}>
              {/* 상단: 뱃지들 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 3,
                  background: p.soft, color: p.fg,
                }}>{p.l}</span>
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 3,
                  background: st.soft, color: st.fg,
                }}>{st.l}</span>
                {t.crop && (
                  <span style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 600 }}>· {t.crop}</span>
                )}
                {t.dueDate && (
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: T.mutedSoft, fontFamily: 'ui-monospace,monospace', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <Icon d={icons.calendar} size={10} c={T.mutedSoft} sw={2} />
                    {fmtDate(t.dueDate)}
                  </span>
                )}
              </div>

              {/* 타이틀 */}
              <div style={{
                fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 6, lineHeight: 1.35,
                textDecoration: t.status === 'completed' ? 'line-through' : 'none',
              }}>{t.title}</div>

              {/* 메타 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: T.mutedSoft, marginBottom: t.status === 'completed' ? 0 : 10 }}>
                {t.zone && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <Icon d={icons.location} size={11} c={T.mutedSoft} sw={2} />
                    {t.zone}
                  </span>
                )}
                {t.estimatedHours && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <Icon d={icons.clock} size={11} c={T.mutedSoft} sw={2} />
                    {t.estimatedHours}시간
                  </span>
                )}
              </div>

              {/* 진행도 */}
              {t.status !== 'completed' && progress > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.mutedSoft, fontWeight: 600, marginBottom: 4 }}>
                    <span>진행도</span>
                    <span style={{ fontFamily: 'ui-monospace,monospace', color: T.text }}>{progress}%</span>
                  </div>
                  <div style={{ height: 5, background: T.bg, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: T.warning }} />
                  </div>
                </div>
              )}

              {/* 액션 */}
              {t.status !== 'completed' && (
                <div style={{ display: 'flex', gap: 6 }}>
                  {t.status === 'assigned' || t.status === 'planned' ? (
                    <button onClick={() => handleStart(t)} disabled={processing === t.id}
                      style={{
                        flex: 1, height: 38, borderRadius: 8, border: 0,
                        background: T.primary, color: '#fff',
                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      }}>
                      <Icon d={icons.play} size={12} c="#fff" sw={2.2} />
                      {processing === t.id ? '처리 중...' : '작업 시작'}
                    </button>
                  ) : (
                    <button onClick={() => handleComplete(t)} disabled={processing === t.id}
                      style={{
                        flex: 1, height: 38, borderRadius: 8, border: 0,
                        background: T.success, color: '#fff',
                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      }}>
                      <Icon d={icons.check} size={12} c="#fff" sw={2.4} />
                      {processing === t.id ? '처리 중...' : '완료 처리'}
                    </button>
                  )}
                  <button style={{
                    height: 38, padding: '0 12px', borderRadius: 8,
                    border: `1px solid ${T.border}`, background: T.surface, color: T.muted,
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}>상세</button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

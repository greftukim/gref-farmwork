// 연장근무 승인 — 프로 SaaS 리디자인
// 기존: src/pages/admin/OvertimeApprovalPage.jsx 교체용

import React, { useEffect, useMemo, useState } from 'react';
import {
  Avatar, Card, Dot, Icon, Pill, T, TopBar,
  btnSecondary, icons,
} from '../../design/primitives';
import useOvertimeStore from '../../stores/overtimeStore';
import useEmployeeStore from '../../stores/employeeStore';
import useAuthStore from '../../stores/authStore';
import BottomSheet from '../../components/common/BottomSheet';
import { sendPushToEmployee } from '../../lib/pushNotify';
import { isFarmAdmin, isMaster } from '../../lib/permissions';

const AVATAR_COLORS = ['indigo', 'emerald', 'amber', 'sky', 'rose', 'violet'];
const avatarColor = (id) => {
  const s = (id || '').toString();
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

const STATUS = {
  pending: { label: '대기', tone: 'warning', dot: T.warning },
  approved: { label: '승인', tone: 'success', dot: T.success },
  rejected: { label: '반려', tone: 'danger', dot: T.danger },
};

function fmtOT(h, m) {
  if (h > 0 && m > 0) return `${h}시간 ${m}분`;
  if (h > 0) return `${h}시간`;
  return `${m}분`;
}
function fmtAgo(iso) {
  if (!iso) return '';
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  if (m < 1440) return `${Math.floor(m / 60)}시간 전`;
  return `${Math.floor(m / 1440)}일 전`;
}

export default function OvertimeApprovalPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const requests = useOvertimeStore((s) => s.requests);
  const fetchRequests = useOvertimeStore((s) => s.fetchRequests);
  const approveRequest = useOvertimeStore((s) => s.approveRequest);
  const bulkApprove = useOvertimeStore((s) => s.bulkApprove);
  const rejectRequest = useOvertimeStore((s) => s.rejectRequest);
  const adjustAndApprove = useOvertimeStore((s) => s.adjustAndApprove);
  const updateOvertimeHours = useOvertimeStore((s) => s.updateOvertimeHours);
  const subscribeRealtime = useOvertimeStore((s) => s.subscribeRealtime);
  const employees = useEmployeeStore((s) => s.employees);

  const canApprove = isFarmAdmin(currentUser) || isMaster(currentUser);
  const canEditHours = currentUser?.role === 'hr_admin' || isMaster(currentUser);

  const [processing, setProcessing] = useState(null);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [filterName, setFilterName] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [adjustForm, setAdjustForm] = useState({ hours: 0, minutes: 0 });

  useEffect(() => {
    fetchRequests();
    const unsub = subscribeRealtime();
    return unsub;
  }, []);

  const empMap = useMemo(
    () => Object.fromEntries(employees.map((e) => [e.id, e])),
    [employees]
  );

  const scopedRequests = useMemo(() => {
    return requests.filter((r) => {
      const emp = empMap[r.employeeId];
      if (!emp) return false;
      if (currentUser?.branch && emp.branch !== currentUser.branch) return false;
      return true;
    });
  }, [requests, empMap, currentUser]);

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0, all: scopedRequests.length };
    scopedRequests.forEach((r) => { if (c[r.status] != null) c[r.status]++; });
    return c;
  }, [scopedRequests]);

  const totalHoursPending = useMemo(() => {
    let mins = 0;
    scopedRequests.filter((r) => r.status === 'pending').forEach((r) => {
      mins += (r.hours || 0) * 60 + (r.minutes || 0);
    });
    return mins;
  }, [scopedRequests]);

  const filtered = useMemo(() => {
    return scopedRequests
      .filter((r) => filterStatus === 'all' || r.status === filterStatus)
      .filter((r) => !filterName || (empMap[r.employeeId]?.name || '').includes(filterName))
      .sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
  }, [scopedRequests, empMap, filterStatus, filterName]);

  const pendingIds = useMemo(() => filtered.filter((r) => r.status === 'pending').map((r) => r.id), [filtered]);
  const allPendingSelected = pendingIds.length > 0 && pendingIds.every((id) => selectedIds.has(id));

  const toggleSelect = (id) => setSelectedIds((p) => {
    const n = new Set(p);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const toggleSelectAll = () => setSelectedIds(allPendingSelected ? new Set() : new Set(pendingIds));

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`선택한 ${selectedIds.size}건을 일괄 승인하시겠습니까?`)) return;
    setProcessing('bulk');
    const { error } = await bulkApprove([...selectedIds], currentUser.id);
    setProcessing(null);
    if (error) alert('일괄 승인 실패');
    else setSelectedIds(new Set());
  };
  const handleApprove = async (id) => {
    if (processing) return;
    setProcessing(id);
    const req = requests.find((r) => r.id === id);
    const { error } = await approveRequest(id, currentUser.id);
    setProcessing(null);
    if (!error && req) sendPushToEmployee({
      employeeId: req.employeeId, title: '연장근무 승인',
      body: `${req.date} ${fmtOT(req.hours, req.minutes)} 승인`, type: 'overtime_request',
    }).catch(() => {});
  };
  const handleReject = async (id) => {
    if (processing) return;
    setProcessing(id);
    const req = requests.find((r) => r.id === id);
    const { error } = await rejectRequest(id, currentUser.id);
    setProcessing(null);
    if (!error && req) sendPushToEmployee({
      employeeId: req.employeeId, title: '연장근무 반려',
      body: `${req.date} 연장근무 반려`, type: 'overtime_request',
    }).catch(() => {});
  };
  const openAdjust = (req, mode = 'adjustAndApprove') => {
    setAdjustTarget({ ...req, mode });
    setAdjustForm({ hours: req.hours, minutes: req.minutes });
  };
  const handleAdjustConfirm = async () => {
    if (!adjustTarget || processing) return;
    if (adjustForm.hours === 0 && adjustForm.minutes === 0) return;
    setProcessing(adjustTarget.id);
    if (adjustTarget.mode === 'editHours') {
      const { error } = await updateOvertimeHours(adjustTarget.id, adjustForm.hours, adjustForm.minutes);
      setProcessing(null);
      if (error) alert('시간 수정 실패');
    } else {
      const { error } = await adjustAndApprove(adjustTarget.id, currentUser.id, adjustForm.hours, adjustForm.minutes);
      setProcessing(null);
      if (!error) sendPushToEmployee({
        employeeId: adjustTarget.employeeId, title: '연장근무 조정 승인',
        body: `${adjustTarget.date} ${fmtOT(adjustForm.hours, adjustForm.minutes)} 조정 승인`, type: 'overtime_request',
      }).catch(() => {});
    }
    setAdjustTarget(null);
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, minWidth: 0 }}>
      <TopBar
        subtitle="근태 관리"
        title={canEditHours ? '연장근무 관리' : '연장근무 승인'}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: T.mutedSoft }}>실시간 반영</span>
            <Dot c={T.success} />
          </div>
        }
      />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { l: '대기중', v: counts.pending, sub: '건', tone: T.warning, soft: T.warningSoft, trend: counts.pending > 0 ? '처리 필요' : '없음' },
            { l: '대기 시간 합계', v: Math.floor(totalHoursPending / 60), sub: `${totalHoursPending % 60}분`, unit: 'h', tone: T.primary, soft: T.primarySoft, trend: '누적' },
            { l: '승인됨', v: counts.approved, sub: '건', tone: T.success, soft: T.successSoft, trend: '완료' },
            { l: '반려됨', v: counts.rejected, sub: '건', tone: T.danger, soft: T.dangerSoft, trend: '완료' },
          ].map((k, i) => (
            <Card key={i} pad={18} style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.tone }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>{k.l}</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', background: k.soft, color: k.tone, borderRadius: 4 }}>{k.trend}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 36, fontWeight: 700, color: T.text, letterSpacing: -1, lineHeight: 1 }}>{k.v}</span>
                {k.unit && <span style={{ fontSize: 14, color: T.mutedSoft, fontWeight: 500 }}>{k.unit}</span>}
              </div>
              <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 8 }}>{k.sub}</div>
            </Card>
          ))}
        </div>

        {/* 필터 + 일괄 바 */}
        <Card pad={0}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.borderSoft}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 4, background: T.bg, padding: 3, borderRadius: 7 }}>
              {[
                { v: 'pending', l: '대기', n: counts.pending },
                { v: 'approved', l: '승인', n: counts.approved },
                { v: 'rejected', l: '반려', n: counts.rejected },
                { v: 'all', l: '전체', n: counts.all },
              ].map((t) => {
                const on = filterStatus === t.v;
                return (
                  <span key={t.v} onClick={() => { setFilterStatus(t.v); setSelectedIds(new Set()); }}
                    style={{
                      padding: '6px 12px', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      background: on ? T.surface : 'transparent',
                      color: on ? T.text : T.mutedSoft,
                      boxShadow: on ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}>
                    {t.l}
                    {t.n > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: '0 5px', borderRadius: 3, background: on ? T.bg : 'transparent', color: on ? T.muted : T.mutedSoft }}>{t.n}</span>}
                  </span>
                );
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, flex: 1, maxWidth: 260, marginLeft: 'auto', fontSize: 13, color: T.mutedSoft }}>
              <Icon d={icons.search} size={14} />
              <input value={filterName} onChange={(e) => { setFilterName(e.target.value); setSelectedIds(new Set()); }}
                placeholder="작업자명 검색"
                style={{ border: 0, background: 'transparent', outline: 'none', flex: 1, fontSize: 13, color: T.text }} />
            </div>
          </div>

          {/* 일괄 액션 바 */}
          {canApprove && selectedIds.size > 0 && (
            <div style={{ padding: '10px 18px', background: T.primarySoft, borderBottom: `1px solid ${T.borderSoft}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.primaryText }}>
                <Icon d={icons.check} size={13} c={T.primary} sw={2.4} /> 선택된 {selectedIds.size}건
              </span>
              <button onClick={handleBulkApprove} disabled={processing === 'bulk'} style={{
                marginLeft: 'auto', height: 32, padding: '0 14px', borderRadius: 7, border: 0,
                background: T.primary, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>
                {processing === 'bulk' ? '처리 중...' : '일괄 승인'}
              </button>
              <button onClick={() => setSelectedIds(new Set())} style={{
                height: 32, padding: '0 12px', borderRadius: 7, border: `1px solid ${T.border}`,
                background: T.surface, color: T.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>선택 해제</button>
            </div>
          )}

          {filtered.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: T.mutedSoft, fontSize: 13 }}>연장근무 신청 내역이 없습니다</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: T.bg, textAlign: 'left', color: T.mutedSoft, fontSize: 11, fontWeight: 700, letterSpacing: 0.3 }}>
                  {canApprove && (
                    <th style={{ padding: '10px 14px', width: 34 }}>
                      <input type="checkbox" checked={allPendingSelected} onChange={toggleSelectAll} disabled={pendingIds.length === 0} />
                    </th>
                  )}
                  <th style={{ padding: '10px 12px' }}>작업자</th>
                  <th style={{ padding: '10px 12px' }}>날짜</th>
                  <th style={{ padding: '10px 12px' }}>신청 시간</th>
                  <th style={{ padding: '10px 12px' }}>사유</th>
                  <th style={{ padding: '10px 12px' }}>신청</th>
                  <th style={{ padding: '10px 12px' }}>상태</th>
                  <th style={{ padding: '10px 18px', textAlign: 'right' }}>처리</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((req, i) => {
                  const emp = empMap[req.employeeId];
                  const st = STATUS[req.status] || STATUS.pending;
                  const isPending = req.status === 'pending';
                  return (
                    <tr key={req.id} style={{
                      borderTop: i ? `1px solid ${T.borderSoft}` : 'none',
                      background: isPending ? 'rgba(245,158,11,0.04)' : T.surface,
                    }}>
                      {canApprove && (
                        <td style={{ padding: '12px 14px' }}>
                          {isPending && <input type="checkbox" checked={selectedIds.has(req.id)} onChange={() => toggleSelect(req.id)} />}
                        </td>
                      )}
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={emp?.name || '?'} color={avatarColor(req.employeeId)} size={32} />
                          <div>
                            <div style={{ fontWeight: 600, color: T.text }}>{emp?.name || '—'}</div>
                            <div style={{ fontSize: 10, color: T.mutedSoft }}>{emp?.jobType || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px', color: T.text, fontFamily: 'ui-monospace,monospace' }}>{req.date}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', background: T.primarySoft, color: T.primaryText, borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                          <Icon d={icons.clock} size={11} c={T.primary} sw={2} />
                          {fmtOT(req.hours, req.minutes)}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: T.muted, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {req.reason || '—'}
                      </td>
                      <td style={{ padding: '12px', color: T.mutedSoft, fontSize: 11 }}>{fmtAgo(req.createdAt)}</td>
                      <td style={{ padding: '12px' }}>
                        <Pill tone={st.tone}><Dot c={st.dot} />{st.label}</Pill>
                        {req.adjustedByReviewer && (
                          <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, padding: '1px 5px', background: T.successSoft, color: T.success, borderRadius: 3 }}>조정</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                        {canApprove && isPending ? (
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button onClick={() => handleReject(req.id)} disabled={processing === req.id}
                              style={{ height: 30, padding: '0 10px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, color: T.danger, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>반려</button>
                            <button onClick={() => openAdjust(req, 'adjustAndApprove')}
                              style={{ height: 30, padding: '0 10px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, color: T.primary, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>시간 조정</button>
                            <button onClick={() => handleApprove(req.id)} disabled={processing === req.id}
                              style={{ height: 30, padding: '0 12px', borderRadius: 6, border: 0, background: T.success, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Icon d={icons.check} size={11} c="#fff" sw={2.5} />
                              {processing === req.id ? '...' : '승인'}
                            </button>
                          </div>
                        ) : canEditHours && req.status === 'approved' ? (
                          <button onClick={() => openAdjust(req, 'editHours')}
                            style={{ height: 30, padding: '0 10px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, color: '#7C3AED', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>시간 수정</button>
                        ) : (
                          <span style={{ fontSize: 11, color: T.mutedSoft }}>처리 완료</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <BottomSheet
        isOpen={!!adjustTarget}
        onClose={() => setAdjustTarget(null)}
        title={adjustTarget?.mode === 'editHours' ? '시간 수정' : '시간 조정 후 승인'}
      >
        {adjustTarget && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: 12, background: T.bg, borderRadius: 8, fontSize: 13 }}>
              <span style={{ color: T.mutedSoft }}>원래 신청: </span>
              <strong style={{ color: T.text }}>{fmtOT(adjustTarget.hours, adjustTarget.minutes)}</strong>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>시간</label>
                <select value={adjustForm.hours} onChange={(e) => setAdjustForm({ ...adjustForm, hours: Number(e.target.value) })}
                  style={{ width: '100%', height: 40, padding: '0 10px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 13 }}>
                  {Array.from({ length: 13 }, (_, i) => <option key={i} value={i}>{i}시간</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>분</label>
                <select value={adjustForm.minutes} onChange={(e) => setAdjustForm({ ...adjustForm, minutes: Number(e.target.value) })}
                  style={{ width: '100%', height: 40, padding: '0 10px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 13 }}>
                  {[0, 15, 30, 45].map((m) => <option key={m} value={m}>{m}분</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleAdjustConfirm}
              disabled={processing || (adjustForm.hours === 0 && adjustForm.minutes === 0)}
              style={{
                width: '100%', height: 44, borderRadius: 10, border: 0,
                background: T.primary, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>
              {processing ? '처리 중...' : adjustTarget?.mode === 'editHours' ? '시간 수정' : '조정하여 승인'}
            </button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

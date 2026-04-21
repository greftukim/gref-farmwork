// 작업자 긴급 연락 — /worker/emergency-call
import React, { useMemo, useState } from 'react';
import { Card, Icon, Pill, T, icons } from '../../design/primitives';
import useIssueStore from '../../stores/issueStore';
import useEmployeeStore from '../../stores/employeeStore';
import useAuthStore from '../../stores/authStore';

export default function EmergencyCallPage({ onBack }) {
  const addIssue = useIssueStore((s) => s.addIssue);
  const employees = useEmployeeStore((s) => s.employees);
  const user = useAuthStore((s) => s.user);

  const admins = useMemo(() => employees.filter((e) => e.role === 'admin' || e.role === 'hq_admin'), [employees]);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleEmergency = () => {
    if (!message.trim()) return;
    addIssue?.({
      id: 'emg_' + Date.now(), employeeId: user?.id,
      category: '긴급', severity: 'critical',
      description: message.trim(),
      message: message.trim(),
      status: 'pending', isEmergency: true,
      createdAt: new Date().toISOString(),
    });
    setMessage('');
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <div style={{ minHeight: '100vh', background: T.bg, paddingBottom: 24 }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, cursor: 'pointer', color: T.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon d={<polyline points="15 18 9 12 15 6" />} size={14} sw={2} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.danger, letterSpacing: 0.5 }}>SOS</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>긴급 연락</div>
        </div>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {sent && (
          <Card pad={14} style={{ background: T.successSoft, border: `1px solid ${T.success}40`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 16, background: T.success, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon d={icons.check} size={16} c="#fff" sw={2.5} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.success }}>긴급 신고 전송됨</div>
              <div style={{ fontSize: 11, color: T.success }}>관리자에게 즉시 알림이 전달되었습니다</div>
            </div>
          </Card>
        )}

        <Card pad={20} style={{ background: T.dangerSoft, border: `1.5px solid ${T.danger}40`, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: T.danger }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 18, background: T.danger, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon d={icons.alert} size={18} c="#fff" sw={2.5} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.danger }}>긴급 상황 신고</div>
              <div style={{ fontSize: 11, color: T.danger }}>안전 문제·부상·화재 등 즉각 대응 필요 시</div>
            </div>
          </div>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="상황을 간단히 설명하세요 (위치·부상·필요 조치 등)" rows={4}
            style={{ width: '100%', padding: 12, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', background: T.surface, marginBottom: 12 }} />
          <button onClick={handleEmergency} disabled={!message.trim()}
            style={{ width: '100%', height: 52, borderRadius: 10, border: 0, background: message.trim() ? T.danger : T.mutedSoft, color: '#fff', fontSize: 16, fontWeight: 800, cursor: message.trim() ? 'pointer' : 'not-allowed', letterSpacing: 0.5 }}>
            긴급 신고 보내기
          </button>
        </Card>

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.mutedSoft, letterSpacing: 0.4, padding: '0 4px', marginBottom: 8 }}>관리자 연락처</div>
          <Card pad={0}>
            {admins.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: T.mutedSoft, fontSize: 12 }}>등록된 관리자가 없습니다</div>
            ) : admins.map((a, i) => (
              <a key={a.id} href={a.phone ? `tel:${a.phone}` : '#'} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ padding: '14px 16px', borderTop: i ? `1px solid ${T.borderSoft}` : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 20, background: T.primarySoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon d={icons.phone} size={16} c={T.primary} sw={2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{a.name}</div>
                    <div style={{ fontSize: 11, color: T.mutedSoft }}>{a.role === 'hq_admin' ? '본사 관리자' : '관리자'}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.primary, fontFamily: 'ui-monospace,monospace' }}>{a.phone || '—'}</div>
                </div>
              </a>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

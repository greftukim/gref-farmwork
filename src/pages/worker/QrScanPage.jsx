// QR 스캔 (모바일) — 작업자
// 경로: /worker/m/qr-scan

import React, { useState } from 'react';
import {
  Card, Dot, Icon, Pill, T, icons,
} from '../../design/primitives';

const RECENT = [
  { time: '10:42', zone: '1cmp · A-01', result: '출근 완료', tone: 'success' },
  { time: '09:15', zone: '1cmp · B-03', result: '작업 시작', tone: 'primary' },
  { time: '08:50', zone: '정문', result: '출입 확인', tone: 'info' },
];

export default function QrScanPage({ onBack }) {
  const [scanning, setScanning] = useState(true);

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* 헤더 */}
      <div style={{
        background: `linear-gradient(135deg, ${T.primary} 0%, ${T.primaryDark} 100%)`,
        color: '#fff', padding: '14px 16px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={onBack} style={{
            width: 34, height: 34, borderRadius: 9, border: 0,
            background: 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon d={<polyline points="15 18 9 12 15 6" />} size={16} c="#fff" sw={2.2} />
          </button>
          <h1 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>QR 스캔</h1>
          <button style={{
            width: 34, height: 34, borderRadius: 9, border: 0,
            background: 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon d={<><line x1="9" y1="18" x2="15" y2="12" /><line x1="15" y1="12" x2="9" y2="6" /></>} size={14} c="#fff" sw={2} />
          </button>
        </div>
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, opacity: 0.9 }}>
          <Dot c="#fff" />
          <span style={{ fontWeight: 600 }}>{scanning ? '스캔 대기 중' : '스캐너 일시 정지'}</span>
        </div>
      </div>

      {/* 뷰파인더 */}
      <div style={{ padding: 16 }}>
        <div style={{
          position: 'relative', aspectRatio: '1',
          background: '#0A0F1C',
          borderRadius: 16, overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        }}>
          {/* 배경 격자 효과 */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `
              radial-gradient(circle at 50% 50%, rgba(79,70,229,0.12) 0%, transparent 60%),
              repeating-linear-gradient(0deg, transparent 0, transparent 19px, rgba(255,255,255,0.03) 19px, rgba(255,255,255,0.03) 20px),
              repeating-linear-gradient(90deg, transparent 0, transparent 19px, rgba(255,255,255,0.03) 19px, rgba(255,255,255,0.03) 20px)
            `,
          }} />

          {/* 스캔 영역 */}
          <div style={{
            position: 'absolute', top: '18%', left: '18%', right: '18%', bottom: '18%',
            border: '2px solid rgba(255,255,255,0.08)', borderRadius: 12,
          }}>
            {/* 4개 모서리 */}
            {[
              { t: -2, l: -2, bT: `3px solid ${T.primary}`, bL: `3px solid ${T.primary}`, br: '12px 0 0 0' },
              { t: -2, r: -2, bT: `3px solid ${T.primary}`, bR: `3px solid ${T.primary}`, br: '0 12px 0 0' },
              { b: -2, l: -2, bB: `3px solid ${T.primary}`, bL: `3px solid ${T.primary}`, br: '0 0 0 12px' },
              { b: -2, r: -2, bB: `3px solid ${T.primary}`, bR: `3px solid ${T.primary}`, br: '0 0 12px 0' },
            ].map((c, i) => (
              <div key={i} style={{
                position: 'absolute', width: 32, height: 32,
                top: c.t, bottom: c.b, left: c.l, right: c.r,
                borderTop: c.bT, borderBottom: c.bB, borderLeft: c.bL, borderRight: c.bR,
                borderRadius: c.br,
              }} />
            ))}

            {/* 스캔 라인 */}
            {scanning && (
              <div style={{
                position: 'absolute', left: 8, right: 8, top: '50%',
                height: 2,
                background: `linear-gradient(90deg, transparent, ${T.primary}, transparent)`,
                boxShadow: `0 0 12px ${T.primary}`,
                animation: 'scanLine 2s ease-in-out infinite',
              }} />
            )}

            {/* 중앙 QR 아이콘 힌트 */}
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0.12,
            }}>
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <line x1="14" y1="14" x2="14" y2="21" />
                <line x1="17" y1="14" x2="17" y2="17" />
                <line x1="20" y1="17" x2="20" y2="21" />
              </svg>
            </div>
          </div>

          <style>{`@keyframes scanLine { 0%,100% { top: 14%; } 50% { top: 86%; } }`}</style>
        </div>

        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>QR 코드를 스캔해 주세요</div>
          <div style={{ fontSize: 12, color: T.mutedSoft, lineHeight: 1.5 }}>
            카메라를 스캔 영역에 맞추면 자동으로 인식됩니다
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={() => setScanning(!scanning)} style={{
            flex: 1, height: 44, borderRadius: 10, border: `1px solid ${T.border}`,
            background: T.surface, color: T.text,
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Icon d={scanning ? icons.stop : icons.play} size={14} c={T.muted} sw={2} />
            {scanning ? '일시 정지' : '스캔 시작'}
          </button>
          <button style={{
            flex: 1, height: 44, borderRadius: 10, border: 0,
            background: T.primary, color: '#fff',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            boxShadow: '0 2px 6px rgba(79,70,229,0.28)',
          }}>
            <Icon d={icons.camera} size={14} c="#fff" sw={2} />
            수동 입력
          </button>
        </div>
      </div>

      {/* 최근 스캔 기록 */}
      <div style={{ padding: '8px 16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0 }}>최근 스캔 기록</h3>
          <span style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 600 }}>오늘</span>
        </div>
        {RECENT.length === 0 ? (
          <Card pad={24} style={{ textAlign: 'center' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: T.bg,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8,
            }}>
              <Icon d={icons.clock} size={18} c={T.mutedSoft} />
            </div>
            <div style={{ fontSize: 13, color: T.mutedSoft, fontWeight: 600 }}>오늘 스캔 기록이 없습니다</div>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {RECENT.map((r, i) => (
              <Card key={i} pad={12} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 9,
                  background: r.tone === 'success' ? T.successSoft : r.tone === 'primary' ? T.primarySoft : T.infoSoft,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon d={icons.check}
                    size={16}
                    c={r.tone === 'success' ? T.success : r.tone === 'primary' ? T.primary : T.info}
                    sw={2.4} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 2 }}>{r.result}</div>
                  <div style={{ fontSize: 11, color: T.mutedSoft, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <Icon d={icons.location} size={10} c={T.mutedSoft} sw={2} />
                      {r.zone}
                    </span>
                  </div>
                </div>
                <div style={{
                  fontSize: 13, fontWeight: 700, color: T.mutedSoft,
                  fontFamily: 'ui-monospace,monospace',
                }}>{r.time}</div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

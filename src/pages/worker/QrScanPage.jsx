// QR 스캔 (모바일) — 작업자
// 경로: /worker/m/qr-scan
// 트랙 77 U2: 시안 v2 적용
//   - Q6: 마운트 시 카메라 자동 시작
//   - Q7: 권한 거부 fallback (ScreenQrScanDenied)
//   - 자산 보존(QR-CORE): qr_codes SELECT → qr_scans INSERT 흐름 100% 유지

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Card, Dot, Icon, T_worker as T, icons,
} from '../../design/primitives';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../stores/authStore';

export default function QrScanPage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null); // { success, message }
  const [recentScans, setRecentScans] = useState([]);
  // Q7: 카메라 권한 상태 추적 — 'denied'일 때 ScreenQrScanDenied 분기
  const [permissionStatus, setPermissionStatus] = useState('pending');
  const scannerRef = useRef(null);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    supabase
      .from('qr_scans')
      .select('id, scanned_at, scan_type, qr_code_id')
      .gte('scanned_at', today + 'T00:00:00')
      .eq('employee_id', currentUser?.id)
      .order('scanned_at', { ascending: false })
      .limit(20)
      .then(({ data }) => { if (data) setRecentScans(data); });

    // Q6: 카메라 자동 시작 (마운트 1회)
    startScan();

    return () => {
      if (scannerRef.current) scannerRef.current.stop().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const stopScan = useCallback(async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  const onScanSuccess = useCallback(async (decodedText) => {
    await stopScan();

    const { data: qrCode } = await supabase
      .from('qr_codes')
      .select('id, gol, side, greenhouse_id, greenhouses(name)')
      .eq('id', decodedText.trim())
      .single();

    if (!qrCode) {
      setScanResult({ success: false, message: '등록되지 않은 QR 코드입니다' });
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const { data: siblingCodes } = await supabase
      .from('qr_codes')
      .select('id')
      .eq('greenhouse_id', qrCode.greenhouse_id)
      .eq('gol', qrCode.gol);

    const siblingIds = (siblingCodes || []).map((c) => c.id);

    let scan_type = 'start';
    if (siblingIds.length > 0) {
      const { data: priorScans } = await supabase
        .from('qr_scans')
        .select('scan_type')
        .in('qr_code_id', siblingIds)
        .eq('employee_id', currentUser?.id)
        .gte('scanned_at', todayStr + 'T00:00:00')
        .order('scanned_at', { ascending: false })
        .limit(5);

      const last = priorScans?.[0]?.scan_type;
      if (last === 'start') scan_type = 'half';
      else if (last === 'half') scan_type = 'complete';
    }

    const { data: scan, error } = await supabase.from('qr_scans').insert({
      qr_code_id: qrCode.id,
      employee_id: currentUser?.id,
      scanned_at: new Date().toISOString(),
      scan_type,
    }).select('id, scanned_at, scan_type, qr_code_id').single();

    if (error) {
      setScanResult({ success: false, message: '스캔 기록 저장에 실패했습니다' });
      return;
    }

    const ghName = qrCode.greenhouses?.name || '구역';
    const scanLabel = scan_type === 'start' ? '작업 시작' : scan_type === 'half' ? '작업 중간' : '작업 완료';
    setScanResult({ success: true, message: `${ghName} ${scanLabel}` });
    if (scan) setRecentScans((prev) => [scan, ...prev]);
  }, [currentUser?.id, stopScan]);

  const startScan = async () => {
    setScanResult(null);
    try {
      const scanner = new Html5Qrcode('qr-reader');
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        onScanSuccess,
        () => {}
      );
      scannerRef.current = scanner;
      setScanning(true);
      setPermissionStatus('granted');
    } catch {
      // Q7: 권한 거부 또는 디바이스 부재 → fallback UI
      setPermissionStatus('denied');
    }
  };

  const fmtTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  // Q7: 권한 거부 fallback — 시안 §5.2 C-2 ScreenQrScanDenied
  if (permissionStatus === 'denied') {
    return (
      <div style={{ flex: 1, overflow: 'auto', background: T.bg, display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <div style={{
          background: `linear-gradient(135deg, ${T.gradientFrom}, ${T.gradientTo})`,
          color: '#fff', padding: '14px 16px 20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => navigate(-1)} style={{
              width: 36, height: 36, borderRadius: 10, border: 0,
              background: 'rgba(255,255,255,0.18)', color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon d={<polyline points="15 18 9 12 15 6" />} size={16} c="#fff" sw={2.2} />
            </button>
            <h1 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0, flex: 1 }}>QR 스캔</h1>
          </div>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, opacity: 0.95 }}>
            <Dot c="rgba(255,255,255,0.5)" />
            <span style={{ fontWeight: 600 }}>카메라 권한 필요</span>
          </div>
        </div>

        <div style={{ padding: 16 }}>
          <Card pad={20}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '20px 8px' }}>
              <div style={{
                width: 64, height: 64, borderRadius: 16, marginBottom: 14,
                background: T.warningSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon d={icons.camera} size={28} c={T.warning} sw={1.8} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 6 }}>
                카메라 권한이 필요합니다
              </div>
              <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 18 }}>
                QR 스캔에 카메라 권한이 필요합니다. 아래 안내에 따라 권한을 허용한 뒤 다시 시도해 주세요.
              </div>
              <div style={{ width: '100%', textAlign: 'left', background: T.bg, borderRadius: 10, padding: 14, marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 8, letterSpacing: 0.4 }}>
                  권한 허용 방법
                </div>
                <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: T.text, lineHeight: 1.7 }}>
                  <li>주소창 좌측 자물쇠 아이콘 또는 사이트 설정 진입</li>
                  <li>카메라 권한을 <b>허용</b>으로 변경</li>
                  <li>아래 다시 시도 버튼</li>
                </ol>
              </div>
              <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                <button onClick={() => navigate(-1)} style={{
                  flex: 1, height: 44, borderRadius: 10,
                  border: `1px solid ${T.border}`, background: T.surface, color: T.muted,
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}>뒤로</button>
                {/* G77-A: window.location.reload() — 사용자 확정 */}
                <button onClick={() => window.location.reload()} style={{
                  flex: 2, height: 44, borderRadius: 10, border: 0,
                  background: T.primary, color: '#fff',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: T.shadowSm,
                }}>다시 시도</button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* 헤더 — Q6: 자동 시작 + 우상단 카메라 정지 버튼 */}
      <div style={{
        background: `linear-gradient(135deg, ${T.primary} 0%, ${T.primaryDark} 100%)`,
        color: '#fff', padding: '14px 16px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => navigate(-1)} style={{
            width: 34, height: 34, borderRadius: 9, border: 0,
            background: 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon d={<polyline points="15 18 9 12 15 6" />} size={16} c="#fff" sw={2.2} />
          </button>
          <h1 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>QR 스캔</h1>
          {scanning ? (
            <button onClick={stopScan} aria-label="카메라 정지" style={{
              width: 34, height: 34, borderRadius: 9, border: 0,
              background: 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon d={icons.stop} size={14} c="#fff" sw={2} />
            </button>
          ) : (
            <div style={{ width: 34 }} />
          )}
        </div>
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, opacity: 0.9 }}>
          <Dot c={scanning ? '#fff' : 'rgba(255,255,255,0.5)'} />
          <span style={{ fontWeight: 600 }}>
            {scanning ? '스캔 대기 중' : permissionStatus === 'pending' ? '카메라 시작 중...' : '스캐너 일시 정지'}
          </span>
        </div>
      </div>

      {/* 뷰파인더 / 카메라 */}
      <div style={{ padding: 16 }}>
        {/* html5-qrcode 마운트 영역 — 항상 DOM에 존재, 스캔 시 카메라 피드 주입됨 */}
        <div
          id="qr-reader"
          style={{
            display: scanning ? 'block' : 'none',
            borderRadius: 16, overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          }}
        />

        {/* 정적 뷰파인더 — 스캔 전 또는 완료 후 */}
        {!scanning && (
          <div style={{
            position: 'relative', aspectRatio: '1',
            background: '#0A0F1C',
            borderRadius: 16, overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {scanResult ? (
              <div style={{ textAlign: 'center', padding: 24 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16, margin: '0 auto 12px',
                  background: scanResult.success ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon
                    d={scanResult.success ? icons.check : icons.x}
                    size={28}
                    c={scanResult.success ? T.success : T.danger}
                    sw={2.4}
                  />
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                  {scanResult.success ? '스캔 성공' : '스캔 실패'}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{scanResult.message}</div>
              </div>
            ) : (
              <>
                <div style={{
                  position: 'absolute', inset: 0,
                  background: `
                    radial-gradient(circle at 50% 50%, rgba(79,70,229,0.12) 0%, transparent 60%),
                    repeating-linear-gradient(0deg, transparent 0, transparent 19px, rgba(255,255,255,0.03) 19px, rgba(255,255,255,0.03) 20px),
                    repeating-linear-gradient(90deg, transparent 0, transparent 19px, rgba(255,255,255,0.03) 19px, rgba(255,255,255,0.03) 20px)
                  `,
                }} />
                <div style={{
                  position: 'absolute', top: '18%', left: '18%', right: '18%', bottom: '18%',
                  border: '2px solid rgba(255,255,255,0.08)', borderRadius: 12,
                }}>
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
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.12 }}>
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
              </>
            )}
          </div>
        )}

        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>
            {scanning ? '카메라를 QR 코드에 맞추세요' : scanResult ? '스캔 완료' : 'QR 코드를 스캔해 주세요'}
          </div>
          <div style={{ fontSize: 12, color: T.mutedSoft, lineHeight: 1.5 }}>
            {scanning ? '자동으로 인식됩니다' : scanResult ? '다시 스캔하려면 아래 버튼을 누르세요' : '잠시만 기다려 주세요'}
          </div>
        </div>

        {/* Q6: 자동 시작이 기본. 결과 노출 후 사용자 의도로만 재스캔 트리거 */}
        {!scanning && scanResult && (
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={startScan} style={{
              flex: 1, height: 44, borderRadius: 10, border: 0,
              background: T.primary, color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: T.shadowSm,
            }}>
              <Icon d={icons.camera} size={14} c="#fff" sw={2} />
              다시 스캔
            </button>
          </div>
        )}
      </div>

      {/* 최근 스캔 기록 */}
      <div style={{ padding: '8px 16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0 }}>최근 스캔 기록</h3>
          <span style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 600 }}>오늘</span>
        </div>
        {recentScans.length === 0 ? (
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
            {recentScans.map((r) => (
              <Card key={r.id} pad={12} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 9,
                  background: T.primarySoft,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon d={icons.check} size={16} c={T.primary} sw={2.4} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 2 }}>
                    {r.scan_type === 'start' ? '작업 시작' : r.scan_type === 'half' ? '작업 중간' : r.scan_type === 'complete' ? '작업 완료' : r.scan_type === 'switch' ? '작업 전환' : '스캔'}
                  </div>
                  <div style={{ fontSize: 11, color: T.mutedSoft }}>
                    {r.qr_code_id?.slice(0, 8).toUpperCase()}
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.mutedSoft, fontFamily: 'ui-monospace,monospace' }}>
                  {fmtTime(r.scanned_at)}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

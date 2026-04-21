import React, { useState, useContext, createContext } from 'react';
import { ACTIVE_ASSIGNMENTS, FIELD_STATE, GOL_LENGTH_M, HOUSE_CONFIG, TASK_TYPES, WORKERS_MAP, WORKER_SPEED_FACTOR } from '../data/floor';
import { Card, Pill, T, btnSecondary, icons } from '../design/primitives';
import { useFloorData } from '../hooks/useFloorData';

const FLOOR_FALLBACK = { ACTIVE_ASSIGNMENTS, FIELD_STATE, GOL_LENGTH_M, HOUSE_CONFIG, TASK_TYPES, WORKERS_MAP, WORKER_SPEED_FACTOR };
const FloorCtx = createContext(FLOOR_FALLBACK);

// ═══════════════════════════════════════════════════════════
// 온실 평면도 + QR 추적 + 작업속도 기반 위치 예측
// 복도: 하단 / 거터+골: 세로 방향 / QR 스캔 → 시간 × 속도로 아이콘 위치 보간
// ═══════════════════════════════════════════════════════════

const getWorker = (id, workersMap) => workersMap.find(w => w.id === id);
const timeAgo = (hhmm) => {
  if (!hhmm) return '-';
  const [h, m] = hhmm.split(':').map(Number);
  const now = 10 * 60 + 25; // 10:25
  const then = h * 60 + m;
  const diff = now - then;
  if (diff < 0) return '지금';
  if (diff < 60) return `${diff}분 전`;
  return `${Math.floor(diff / 60)}시간 ${diff % 60}분 전`;
};

const minSinceScan = (hhmm) => {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return Math.max(0, (10 * 60 + 25) - (h * 60 + m));
};

// ─────── 위치 보간 로직 ───────
// 반환: {phase: 'rightDown'|'leftUp'|'idle', frac: 0~1}
// 한쪽 거터 20m × 두 거터 = 총 40m
// scanPattern 기반 phase:
//   lastScan='F' (첫 스캔): 오른쪽 거터를 앞→뒤로 이동 중
//   lastScan='B' (두번째 스캔): 왼쪽 거터를 뒤→앞으로 이동 중
//   lastScan='F-again': 완료 (idle)
function predictPosition(g, fd) {
  if (!g.currentWorker || !g.taskType || !g.startedAt) return null;
  const task = fd.TASK_TYPES[g.taskType];
  const factor = fd.WORKER_SPEED_FACTOR[g.currentWorker] || 1.0;
  const secPerM = task.speedSecPerM * factor;

  const lastSide = g.lastScan;
  const rawElapsed = minSinceScan(g.startedAt);
  const pauseTotal = g.pauseTotalMin || 0;
  const currentPause = g.pausedAt ? minSinceScan(g.pausedAt) : 0;
  const effectiveMin = Math.max(0, rawElapsed - pauseTotal - currentPause);
  const elapsedM = (effectiveMin * 60) / secPerM;

  const isPaused = !!g.pausedAt;
  const GL = fd.GOL_LENGTH_M;

  if (lastSide === 'F' && g.progress < 50) {
    const frac = Math.min(1, elapsedM / GL);
    return { phase: 'rightDown', frac, elapsedMin: effectiveMin, rawElapsed, pauseTotal: pauseTotal + currentPause, isPaused, estRemaining: Math.max(0, (GL - elapsedM) * secPerM / 60) };
  }
  if (lastSide === 'F' && g.progress === 50) {
    const frac = Math.min(1, elapsedM / GL);
    return { phase: 'leftUp', frac, elapsedMin: effectiveMin, rawElapsed, pauseTotal: pauseTotal + currentPause, isPaused, estRemaining: Math.max(0, (GL - elapsedM) * secPerM / 60) };
  }
  if (lastSide === 'B') {
    const frac = Math.min(1, elapsedM / GL);
    return { phase: 'leftUp', frac, elapsedMin: effectiveMin, rawElapsed, pauseTotal: pauseTotal + currentPause, isPaused, estRemaining: Math.max(0, (GL - elapsedM) * secPerM / 60) };
  }
  return null;
}

// ─────── 골 상태 색상 ───────
const golColor = (g) => {
  if (g.pausedAt) return { bg: '#FEF3C715', border: '#CA8A04', text: '#854D0E' };
  if (g.hasIssue) return { bg: `${T.danger}18`, border: T.danger, text: T.danger };
  if (g.progress === 100) return { bg: `${T.success}15`, border: T.success, text: T.success };
  if (g.progress === 50 && g.currentWorker) return { bg: `${T.warning}20`, border: T.warning, text: T.warning };
  if (g.progress === 50) return { bg: `${T.info}18`, border: T.info, text: T.info };
  if (g.currentWorker) return { bg: `${T.primary}18`, border: T.primary, text: T.primary };
  return { bg: '#F8FAFC', border: '#E2E8F0', text: T.mutedSoft };
};

// ─────── 평면도 SVG (복도=하단) ───────
function GreenhousePlan({ house, onSelectGol, selectedGol }) {
  const { HOUSE_CONFIG, FIELD_STATE, TASK_TYPES, WORKERS_MAP, WORKER_SPEED_FACTOR, GOL_LENGTH_M } = useContext(FloorCtx);
  const cfg = HOUSE_CONFIG.find(h => h.id === house);
  const gols = FIELD_STATE.gols.filter(g => g.house === house);

  // 레이아웃: 세로
  //  상단: 동 외벽 + 작업 영역 (거터+골 세로 스트립)
  //  하단: 복도
  const vbWidth = 1200;
  const vbHeight = 480;
  const corridorH = 70;       // 하단 복도
  const topMargin = 30;       // 상단 여백 (뒤쪽 벽)
  const plantH = vbHeight - corridorH - topMargin - 20;

  const innerW = vbWidth - 40; // 좌우 여백 20
  const gutterW = cfg.hanging ? 14 : 22;
  const golW = cfg.hanging ? 30 : 70;
  const totalUnits = cfg.gutters * gutterW + cfg.gols * golW;
  const scale = innerW / totalUnits;
  const gW = gutterW * scale;
  const goW = golW * scale;

  // 복도에서 바라본 방향: 왼쪽 = 큰번호, 오른쪽 = 1번
  // 순서: [거터N][골N][거터N-1][골N-1]...[거터1][골1]  (1cmp/2cmp)
  //        [거터N][골N-1][거터N-1]...[거터1]             (3cmp, 4cmp: 거터 사이만)
  let cursor = 20;
  const items = [];
  if (cfg.id === '3cmp' || cfg.hanging) {
    for (let i = cfg.gutters; i >= 1; i--) {
      items.push({ type: 'gutter', n: i, x: cursor, w: gW, hanging: cfg.hanging });
      cursor += gW;
      if (i > 1) {
        items.push({ type: 'gol', n: i - 1, x: cursor, w: goW });
        cursor += goW;
      }
    }
  } else {
    for (let i = cfg.gutters; i >= 1; i--) {
      items.push({ type: 'gutter', n: i, x: cursor, w: gW });
      cursor += gW;
      items.push({ type: 'gol', n: i, x: cursor, w: goW });
      cursor += goW;
    }
  }

  const plantTop = topMargin;
  const plantBot = topMargin + plantH;

  return (
    <svg viewBox={`0 0 ${vbWidth} ${vbHeight}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <linearGradient id="gutterGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D1FAE5" />
          <stop offset="1" stopColor="#A7F3D0" />
        </linearGradient>
      </defs>

      {/* 동 외벽 */}
      <rect x="10" y="10" width={vbWidth - 20} height={vbHeight - 20} fill="#FAFAF9" stroke="#94A3B8" strokeWidth="2" rx="6" />

      {/* 뒤쪽 벽 라벨 */}
      <text x={vbWidth / 2} y={24} textAnchor="middle" fontSize="10" fill={T.mutedSoft} fontWeight="600" letterSpacing="4">── 뒤 (끝 · B-QR) ──</text>

      {/* 재배 영역 배경 */}
      <rect x="20" y={plantTop} width={innerW} height={plantH} fill="#FAFAF9" />

      {/* 거터 및 골 */}
      {items.map((it, idx) => {
        if (it.type === 'gutter') {
          return (
            <g key={idx}>
              <rect x={it.x} y={plantTop} width={it.w} height={plantH}
                fill="url(#gutterGrad)" stroke="#10B981" strokeWidth="0.6"
                opacity={it.hanging ? 0.55 : 0.85} />
              {/* 잎 무늬 — 거터 내부 */}
              {!it.hanging && Array.from({ length: 5 }, (_, i) => (
                <circle key={i} cx={it.x + it.w / 2} cy={plantTop + (i + 0.5) * plantH / 5}
                  r={Math.min(it.w / 3, 4)} fill="#059669" opacity="0.35" />
              ))}
              {/* 거터 번호 — 복도 바로 위 */}
              <text x={it.x + it.w / 2} y={plantBot + 12} textAnchor="middle" fontSize="9" fill="#059669" fontWeight="700">G{it.n}</text>
            </g>
          );
        }
        // 골 (작업 통로)
        const g = gols.find(x => x.gol === it.n);
        if (!g) return null;
        const colors = golColor(g);
        const worker = g.currentWorker ? getWorker(g.currentWorker, WORKERS_MAP) : null;
        const selected = selectedGol === g.gol;
        const pos = worker ? predictPosition(g, { TASK_TYPES, WORKER_SPEED_FACTOR, GOL_LENGTH_M }) : null;

        // 작업자 아이콘 y 위치 계산
        let iconY = plantTop + plantH / 2;
        let iconX = it.x + it.w / 2;
        if (pos) {
          // rightDown: bottom → top (앞→뒤)
          // leftUp:    top → bottom (뒤→앞)
          if (pos.phase === 'rightDown') {
            iconY = plantBot - pos.frac * plantH;
            // 오른쪽 거터 쪽으로 치우침 (골 오른쪽 1/3)
            iconX = it.x + it.w * 0.68;
          } else {
            iconY = plantTop + pos.frac * plantH;
            // 왼쪽 거터 쪽
            iconX = it.x + it.w * 0.32;
          }
        }

        return (
          <g key={idx} onClick={() => onSelectGol && onSelectGol(it.n)} style={{ cursor: 'pointer' }}>
            {/* 골 바닥 */}
            <rect x={it.x} y={plantTop} width={it.w} height={plantH}
              fill={colors.bg}
              stroke={selected ? T.text : colors.border}
              strokeWidth={selected ? 2 : 1}
              rx="1" />

            {/* 골 번호 — 복도 바로 위 */}
            <rect x={it.x + it.w / 2 - 12} y={plantBot - 18} width="24" height="14" rx="3" fill={colors.text} opacity="0.95" />
            <text x={it.x + it.w / 2} y={plantBot - 8} textAnchor="middle" fontSize="9" fill="#fff" fontWeight="700">{it.n}</text>

            {/* 진행률 세로 바 — 골 왼쪽 끝 (얇은 게이지) */}
            {g.progress > 0 && (
              <g>
                {g.progress === 100 ? (
                  <>
                    <rect x={it.x + 2} y={plantTop + 2} width="3" height={plantH - 4} fill={T.success} rx="1.5" />
                    <circle cx={it.x + 3.5} cy={plantTop + 10} r="4" fill={T.success} />
                    <path d={`M ${it.x + 2} ${plantTop + 10} l 1.5 1.5 l 2.5 -2.5`} stroke="#fff" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                  </>
                ) : (
                  <>
                    <rect x={it.x + 2} y={plantTop + plantH / 2} width="3" height={plantH / 2 - 2} fill={T.info} rx="1.5" opacity="0.9" />
                  </>
                )}
              </g>
            )}

            {/* QR 마커 — 앞(bottom) / 뒤(top) */}
            <g>
              {/* 뒤 QR */}
              <rect x={it.x + it.w / 2 - 4} y={plantTop + 2} width="8" height="8"
                fill={g.lastScan === 'B' ? colors.border : '#E2E8F0'}
                stroke={g.lastScan === 'B' ? colors.text : '#CBD5E1'} strokeWidth="0.5" />
              {g.lastScan === 'B' && <circle cx={it.x + it.w / 2} cy={plantTop + 6} r="1.5" fill="#fff" />}

              {/* 앞 QR */}
              <rect x={it.x + it.w / 2 - 4} y={plantBot - 28} width="8" height="8"
                fill={g.lastScan === 'F' || g.lastScan === 'F-again' ? colors.border : '#E2E8F0'}
                stroke={g.lastScan ? colors.text : '#CBD5E1'} strokeWidth="0.5" />
              {(g.lastScan === 'F' || g.lastScan === 'F-again') && <circle cx={it.x + it.w / 2} cy={plantBot - 24} r="1.5" fill="#fff" />}
            </g>

            {/* 이상 표시 */}
            {g.hasIssue && (
              <g>
                <circle cx={it.x + it.w - 8} cy={plantTop + 14} r="6" fill={T.danger} />
                <text x={it.x + it.w - 8} y={plantTop + 17} textAnchor="middle" fontSize="9" fill="#fff" fontWeight="700">!</text>
              </g>
            )}

            {/* 작업자 아바타 — 예측 위치 */}
            {worker && pos && (
              <g style={{ transition: 'transform 0.5s ease' }}>
                {/* 이동 자취 (희미한 라인) */}
                {!pos.isPaused && pos.phase === 'rightDown' && (
                  <line x1={iconX} y1={plantBot} x2={iconX} y2={iconY}
                    stroke={worker.color} strokeWidth="1.2" strokeDasharray="3 2" opacity="0.35" />
                )}
                {!pos.isPaused && pos.phase === 'leftUp' && (
                  <line x1={iconX} y1={plantTop} x2={iconX} y2={iconY}
                    stroke={worker.color} strokeWidth="1.2" strokeDasharray="3 2" opacity="0.35" />
                )}
                {/* 방향 화살표 — 일시정지 시 숨김 */}
                {!pos.isPaused && (
                  <polygon
                    points={pos.phase === 'rightDown'
                      ? `${iconX},${iconY - (cfg.hanging ? 14 : 18)} ${iconX - 4},${iconY - (cfg.hanging ? 10 : 14)} ${iconX + 4},${iconY - (cfg.hanging ? 10 : 14)}`
                      : `${iconX},${iconY + (cfg.hanging ? 14 : 18)} ${iconX - 4},${iconY + (cfg.hanging ? 10 : 14)} ${iconX + 4},${iconY + (cfg.hanging ? 10 : 14)}`}
                    fill={worker.color} opacity="0.8" />
                )}
                {/* 펄스 — 일시정지 시 숨김 */}
                {!pos.isPaused && (
                  <circle cx={iconX} cy={iconY} r={cfg.hanging ? 12 : 16} fill={worker.color} opacity="0.2">
                    <animate attributeName="r" values={`${cfg.hanging ? 10 : 14};${cfg.hanging ? 14 : 20};${cfg.hanging ? 10 : 14}`} dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.3;0.05;0.3" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}
                {/* 아바타 */}
                <circle cx={iconX} cy={iconY} r={cfg.hanging ? 8 : 11} fill={pos.isPaused ? '#94A3B8' : worker.color} stroke="#fff" strokeWidth="2" />
                <text x={iconX} y={iconY + 3} textAnchor="middle" fontSize={cfg.hanging ? 8 : 10} fill="#fff" fontWeight="700">{worker.name.charAt(0)}</text>
                {/* 일시정지 아이콘 오버레이 */}
                {pos.isPaused && (
                  <g transform={`translate(${iconX + (cfg.hanging ? 8 : 10)}, ${iconY - (cfg.hanging ? 12 : 15)})`}>
                    <circle cx="0" cy="0" r="7" fill="#CA8A04" stroke="#fff" strokeWidth="1.5" />
                    <rect x="-2.5" y="-3" width="1.8" height="6" fill="#fff" />
                    <rect x="0.7" y="-3" width="1.8" height="6" fill="#fff" />
                  </g>
                )}
                {/* 작업유형 뱃지 */}
                {!cfg.hanging && !pos.isPaused && (
                  <g transform={`translate(${iconX + 14}, ${iconY - 7})`}>
                    <rect x="0" y="0" width="22" height="12" rx="6" fill={TASK_TYPES[g.taskType].color} />
                    <text x="11" y="9" textAnchor="middle" fontSize="8" fill="#fff" fontWeight="700">{TASK_TYPES[g.taskType].abbr}</text>
                  </g>
                )}
                {/* 일시정지 라벨 */}
                {!cfg.hanging && pos.isPaused && (
                  <g transform={`translate(${iconX + 14}, ${iconY - 7})`}>
                    <rect x="0" y="0" width="34" height="12" rx="6" fill="#CA8A04" />
                    <text x="17" y="9" textAnchor="middle" fontSize="8" fill="#fff" fontWeight="700">일시정지</text>
                  </g>
                )}
              </g>
            )}

            {/* 작업자 있지만 위치 예측 불가 → 중앙 표시 */}
            {worker && !pos && (
              <g>
                <circle cx={iconX} cy={iconY} r={cfg.hanging ? 8 : 11} fill={worker.color} stroke="#fff" strokeWidth="2" />
                <text x={iconX} y={iconY + 3} textAnchor="middle" fontSize={cfg.hanging ? 8 : 10} fill="#fff" fontWeight="700">{worker.name.charAt(0)}</text>
              </g>
            )}
          </g>
        );
      })}

      {/* 복도 (하단) */}
      <rect x="10" y={plantBot + 18} width={vbWidth - 20} height={corridorH - 18} fill="#E2E8F0" opacity="0.55" />
      <line x1="10" y1={plantBot + 18} x2={vbWidth - 10} y2={plantBot + 18} stroke="#94A3B8" strokeWidth="1" strokeDasharray="5 3" />
      <text x={vbWidth / 2} y={plantBot + 42} textAnchor="middle" fontSize="11" fill={T.mutedSoft} fontWeight="700" letterSpacing="4">복도 · 앞 (입구 · F-QR)</text>
      <text x={vbWidth / 2} y={plantBot + 58} textAnchor="middle" fontSize="9" fill={T.mutedSoft}>← 큰번호 · 작은번호 →</text>
    </svg>
  );
}

// ─────── 메인 화면 ───────
function FloorPlanScreen() {
  const { data: floorData } = useFloorData();
  const { HOUSE_CONFIG, FIELD_STATE, TASK_TYPES, ACTIVE_ASSIGNMENTS, WORKERS_MAP, WORKER_SPEED_FACTOR, GOL_LENGTH_M } = floorData;
  const [house, setHouse] = useState('1cmp');
  const [selectedGol, setSelectedGol] = useState(null);
  const [timeMode, setTimeMode] = useState('live');
  const [historyTime, setHistoryTime] = useState(625);

  const cfg = HOUSE_CONFIG.find(h => h.id === house);
  const gols = FIELD_STATE.gols.filter(g => g.house === house);
  const workingCount = gols.filter(g => g.currentWorker).length;
  const completedCount = gols.filter(g => g.progress === 100).length;
  const halfCount = gols.filter(g => g.progress === 50 && !g.currentWorker).length;
  const issueCount = gols.filter(g => g.hasIssue).length;

  const selected = selectedGol ? gols.find(g => g.gol === selectedGol) : null;
  const allWorking = FIELD_STATE.gols.filter(g => g.currentWorker);

  const fmtMin = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

  return (
    <FloorCtx.Provider value={floorData}>
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* 헤더 */}
      <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '18px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: T.mutedSoft, marginBottom: 4 }}>
              <span style={{ padding: '2px 8px', borderRadius: 4, fontWeight: 700, background: T.primarySoft, color: T.primaryText }}>재배팀</span>
              <span>부산LAB · 현장 현황</span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: -0.4, margin: 0 }}>실시간 작업 현황 · 평면도</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', background: T.bg, padding: 3, borderRadius: 7, fontSize: 11, fontWeight: 600 }}>
              <button onClick={() => setTimeMode('live')} style={{
                padding: '6px 12px', border: 0, borderRadius: 5, cursor: 'pointer',
                background: timeMode === 'live' ? T.surface : 'transparent',
                color: timeMode === 'live' ? T.text : T.mutedSoft,
                boxShadow: timeMode === 'live' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: T.success, animation: timeMode === 'live' ? 'p 1.5s infinite' : 'none' }} />
                Live
              </button>
              <button onClick={() => setTimeMode('history')} style={{
                padding: '6px 12px', border: 0, borderRadius: 5, cursor: 'pointer',
                background: timeMode === 'history' ? T.surface : 'transparent',
                color: timeMode === 'history' ? T.text : T.mutedSoft,
                boxShadow: timeMode === 'history' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              }}>오늘 히스토리</button>
            </div>
            <div style={{ padding: '8px 12px', background: T.bg, borderRadius: 8, fontSize: 11, color: T.muted }}>
              <span style={{ color: T.mutedSoft }}>현재 시각</span>{' '}
              <strong style={{ color: T.text, fontFamily: 'ui-monospace, monospace' }}>{FIELD_STATE.timestamp.split(' ')[1]}</strong>
            </div>
            {btnSecondary('QR 관리', icons.camera)}
          </div>
        </div>
      </div>

      {timeMode === 'history' && (
        <div style={{ background: T.bg, borderBottom: `1px solid ${T.border}`, padding: '10px 32px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.text }}>오늘 타임라인</div>
          <input type="range" min={480} max={625} step={5} value={historyTime} onChange={(e) => setHistoryTime(Number(e.target.value))} style={{ flex: 1 }} />
          <div style={{ padding: '4px 10px', background: T.primary, color: '#fff', borderRadius: 5, fontSize: 12, fontWeight: 700, fontFamily: 'ui-monospace, monospace', minWidth: 60, textAlign: 'center' }}>
            {fmtMin(historyTime)}
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto', padding: 24, background: T.bg }}>
        {/* 동 탭 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {HOUSE_CONFIG.map(h => {
            const on = h.id === house;
            const hGols = FIELD_STATE.gols.filter(g => g.house === h.id);
            const hWorking = hGols.filter(g => g.currentWorker).length;
            return (
              <button key={h.id} onClick={() => { setHouse(h.id); setSelectedGol(null); }} style={{
                padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', borderRadius: 8,
                border: `1px solid ${on ? T.primary : T.border}`,
                background: on ? T.primary : T.surface, color: on ? '#fff' : T.text,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span>{h.name}</span>
                <span style={{ fontSize: 10, fontWeight: 500, opacity: on ? 0.8 : 0.6 }}>
                  {h.hanging ? '행잉 ' : ''}{h.gutters}거터 · {h.gols}골
                </span>
                {hWorking > 0 && (
                  <span style={{ padding: '1px 6px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                    background: on ? 'rgba(255,255,255,0.25)' : T.successSoft, color: on ? '#fff' : T.success }}>● {hWorking}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { l: '작업중', v: workingCount, u: '골', sub: `${cfg.name} 전체 ${cfg.gols}골 중`, tone: T.primary, dot: T.primary },
            { l: '완료', v: completedCount, u: '골', sub: `전체 ${Math.round(completedCount / cfg.gols * 100)}%`, tone: T.success, dot: T.success },
            { l: '반 완료', v: halfCount, u: '골', sub: '한쪽 거터만', tone: T.info, dot: T.info },
            { l: '일시정지', v: gols.filter(g => g.pausedAt).length, u: '골', sub: '휴식/이탈 중', tone: '#CA8A04', dot: '#CA8A04' },
            { l: '이상 발생', v: issueCount, u: '건', sub: issueCount > 0 ? '조치 필요' : '양호', tone: issueCount > 0 ? T.danger : T.success, dot: issueCount > 0 ? T.danger : T.mutedSoft },
            { l: '미작업', v: Math.max(0, cfg.gols - workingCount - completedCount - halfCount - gols.filter(g => g.pausedAt).length), u: '골', sub: '오늘 배정 예정', tone: T.text, dot: T.mutedSoft },
          ].map((k, i) => (
            <Card key={i} pad={14}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>{k.l}</span>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: k.dot }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 6 }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: k.tone, letterSpacing: -0.4, fontVariantNumeric: 'tabular-nums' }}>{k.v}</span>
                <span style={{ fontSize: 11, color: T.mutedSoft, fontWeight: 500 }}>{k.u}</span>
              </div>
              <div style={{ fontSize: 10, color: T.mutedSoft, marginTop: 2 }}>{k.sub}</div>
            </Card>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14 }}>
          {/* 평면도 */}
          <Card pad={0}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.borderSoft}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>{cfg.name} 평면도 · {cfg.crop}</h3>
                <span style={{ fontSize: 11, color: T.mutedSoft }}>
                  {cfg.hanging ? '행잉거터 · ' : ''}거터 {cfg.gutters} · 골 {cfg.gols} · 골당 {GOL_LENGTH_M}m · QR 스캔 + 작업속도 기반 위치 예측
                </span>
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 10, color: T.muted, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 360 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: `${T.primary}18`, border: `1px solid ${T.primary}` }} />작업중</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: `${T.success}15`, border: `1px solid ${T.success}` }} />완료</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: `${T.info}18`, border: `1px solid ${T.info}` }} />반완료</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: `${T.danger}18`, border: `1px solid ${T.danger}` }} />이상</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: 'linear-gradient(#D1FAE5, #A7F3D0)', border: '1px solid #10B981' }} />거터</span>
              </div>
            </div>
            <div style={{ padding: 16 }}>
              <GreenhousePlan house={house} onSelectGol={setSelectedGol} selectedGol={selectedGol} />
            </div>
            {/* 설명 푸터 */}
            <div style={{ padding: '10px 16px', borderTop: `1px solid ${T.borderSoft}`, background: T.bg, fontSize: 11, color: T.muted, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span><strong style={{ color: T.text }}>●</strong> 아이콘 = 예측 위치 (QR 스캔 시각 + 작업 표준속도 × 개인 계수)</span>
              <span><strong style={{ color: T.text }}>▲</strong> 화살표 = 이동 방향</span>
              <span><strong style={{ color: T.text }}>┃</strong> 점선 = 이동 자취</span>
            </div>
          </Card>

          {/* 오른쪽 패널 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {selected ? (
              <GolDetail g={selected} cfg={cfg} onClose={() => setSelectedGol(null)} />
            ) : (
              <Card pad={0}>
                <div style={{ padding: '12px 14px', borderBottom: `1px solid ${T.borderSoft}` }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0 }}>지금 작업 중 ({allWorking.length}명)</h3>
                  <span style={{ fontSize: 11, color: T.mutedSoft }}>전체 동 · 예상 종료 순으로 정렬</span>
                </div>
                <div style={{ maxHeight: 360, overflow: 'auto' }}>
                  {allWorking.map(g => {
                    const w = getWorker(g.currentWorker, WORKERS_MAP);
                    const task = TASK_TYPES[g.taskType];
                    const pos = predictPosition(g, { TASK_TYPES, WORKER_SPEED_FACTOR, GOL_LENGTH_M });
                    const pct = pos ? Math.round((g.progress === 50 ? 50 : 0) + pos.frac * 50) : 0;
                    return (
                      <div key={`${g.house}-${g.gol}`} onClick={() => { setHouse(g.house); setSelectedGol(g.gol); }} style={{
                        padding: '10px 14px', borderBottom: `1px solid ${T.borderSoft}`, cursor: 'pointer',
                        background: g.pausedAt ? '#FEF3C710' : 'transparent',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ position: 'relative', flexShrink: 0 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 999, background: g.pausedAt ? '#94A3B8' : w.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{w.name.charAt(0)}</div>
                            {g.pausedAt && <div style={{ position: 'absolute', top: -3, right: -3, width: 14, height: 14, borderRadius: 999, background: '#CA8A04', color: '#fff', fontSize: 8, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>❚❚</div>}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{w.name} <span style={{ color: T.mutedSoft, fontWeight: 500, fontSize: 11 }}>· {g.house} {g.gol}번골</span></div>
                            <div style={{ fontSize: 10, color: T.mutedSoft, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                              {g.pausedAt ? (
                                <>
                                  <span style={{ padding: '1px 5px', borderRadius: 3, background: '#CA8A04', color: '#fff', fontSize: 9, fontWeight: 700 }}>일시정지</span>
                                  <span>{g.pausedAt}부터 · {minSinceScan(g.pausedAt)}분째</span>
                                </>
                              ) : (
                                <>
                                  <span style={{ padding: '1px 5px', borderRadius: 3, background: task.color, color: '#fff', fontSize: 9, fontWeight: 700 }}>{task.label}</span>
                                  {pos && <span>잔여 약 {Math.round(pos.estRemaining)}분</span>}
                                  {(g.pauseTotalMin > 0) && <span style={{ color: '#CA8A04' }}>누적 휴식 {g.pauseTotalMin}분</span>}
                                </>
                              )}
                              {g.hasIssue && <span style={{ color: T.danger, fontWeight: 700 }}>⚠</span>}
                            </div>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
                        </div>
                        <div style={{ marginTop: 6, height: 3, background: T.borderSoft, borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: g.pausedAt ? '#CA8A04' : task.color, transition: 'width 0.5s' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* 배정 진행 */}
            <Card pad={0}>
              <div style={{ padding: '12px 14px', borderBottom: `1px solid ${T.borderSoft}` }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0 }}>배정 진행</h3>
                <span style={{ fontSize: 11, color: T.mutedSoft }}>오늘의 작업 진행률</span>
              </div>
              <div>
                {ACTIVE_ASSIGNMENTS.map(a => {
                  const task = TASK_TYPES[a.taskType];
                  const pct = Math.round(a.completedGols / a.gols * 100);
                  return (
                    <div key={a.id} style={{ padding: '10px 14px', borderBottom: `1px solid ${T.borderSoft}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{a.house}</span>
                          <span style={{ padding: '1px 6px', borderRadius: 3, background: task.color, color: '#fff', fontSize: 9, fontWeight: 700 }}>{task.label}</span>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{a.completedGols}/{a.gols}골</span>
                      </div>
                      <div style={{ height: 4, background: T.borderSoft, borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: task.color }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: T.mutedSoft }}>
                        <span>{a.workers.length}명 · {a.startAt} 시작</span>
                        <span>종료 {a.plannedEnd}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
    </FloorCtx.Provider>
  );
}

// ─────── 골 상세 패널 ───────
function GolDetail({ g, cfg, onClose }) {
  const { TASK_TYPES, WORKERS_MAP, WORKER_SPEED_FACTOR, GOL_LENGTH_M } = useContext(FloorCtx);
  const worker = g.currentWorker ? getWorker(g.currentWorker, WORKERS_MAP) : null;
  const task = g.taskType ? TASK_TYPES[g.taskType] : null;
  const pos = worker ? predictPosition(g, { TASK_TYPES, WORKER_SPEED_FACTOR, GOL_LENGTH_M }) : null;

  return (
    <Card pad={0}>
      <div style={{ padding: 14, borderBottom: `1px solid ${T.borderSoft}`, background: golColor(g).bg }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: T.mutedSoft, fontWeight: 600 }}>{cfg.name} · {cfg.crop}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>{g.gol}번 골</div>
          </div>
          <button onClick={onClose} style={{ width: 24, height: 24, border: 0, background: 'transparent', cursor: 'pointer', color: T.muted, fontSize: 16 }}>×</button>
        </div>
      </div>
      <div style={{ padding: 14 }}>
        {/* 상태 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: T.mutedSoft, fontWeight: 600 }}>상태</span>
          {g.pausedAt ? (
            <span style={{ padding: '3px 8px', borderRadius: 5, background: '#CA8A04', color: '#fff', fontSize: 11, fontWeight: 700 }}>❚❚ 일시정지</span>
          ) : (
            <Pill tone={g.progress === 100 ? 'success' : g.progress === 50 && !g.currentWorker ? 'info' : g.currentWorker ? 'primary' : 'muted'}>
              {g.progress === 100 ? '완료' : g.currentWorker ? '작업중' : g.progress === 50 ? '반 완료' : '대기'}
            </Pill>
          )}
          {g.hasIssue && <Pill tone="danger">⚠ 이상</Pill>}
        </div>

        {/* 일시정지 배너 */}
        {g.pausedAt && worker && (
          <div style={{ marginBottom: 14, padding: 12, background: '#FEF3C7', borderRadius: 8, borderLeft: '3px solid #CA8A04' }}>
            <div style={{ fontSize: 10, color: '#854D0E', fontWeight: 700, marginBottom: 6 }}>❚❚ 일시정지 중</div>
            <div style={{ fontSize: 13, color: '#78350F', lineHeight: 1.5 }}>
              <strong>{g.pauseReason || '휴식'}</strong> · {g.pausedAt} 부터 {minSinceScan(g.pausedAt)}분째
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: '#92400E' }}>
              작업자가 골 앞 QR을 다시 찍으면 재개됩니다.
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <button style={{ flex: 1, padding: '7px 10px', fontSize: 11, fontWeight: 700, background: '#CA8A04', color: '#fff', border: 0, borderRadius: 5, cursor: 'pointer' }}>▶ 강제 재개</button>
              <button style={{ flex: 1, padding: '7px 10px', fontSize: 11, fontWeight: 700, background: T.surface, color: T.text, border: `1px solid ${T.border}`, borderRadius: 5, cursor: 'pointer' }}>📝 메모 추가</button>
            </div>
          </div>
        )}

        {/* 위치 예측 */}
        {worker && pos && (
          <div style={{ marginBottom: 14, padding: 12, background: `${worker.color}10`, borderRadius: 8, borderLeft: `3px solid ${worker.color}` }}>
            <div style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 700, marginBottom: 6 }}>예측 위치 (QR 스캔 기반)</div>
            <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}>
              <strong>{pos.phase === 'rightDown' ? '오른쪽 거터' : '왼쪽 거터'}</strong> ·{' '}
              {pos.phase === 'rightDown' ? '앞→뒤' : '뒤→앞'} 이동 중
            </div>
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: T.mutedSoft }}>진행 {Math.round(pos.frac * 100)}%</span>
              <span style={{ color: T.text, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>잔여 약 {Math.round(pos.estRemaining)}분</span>
            </div>
            <div style={{ marginTop: 6, height: 4, background: 'rgba(255,255,255,0.5)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${pos.frac * 100}%`, height: '100%', background: worker.color }} />
            </div>
          </div>
        )}

        {/* 진행률 */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.muted, marginBottom: 4 }}>
            <span>전체 진행률 (양쪽 거터)</span>
            <span style={{ fontWeight: 700, color: T.text }}>{g.progress + (pos ? Math.round(pos.frac * 50) : 0)}%</span>
          </div>
          <div style={{ height: 8, background: T.borderSoft, borderRadius: 999, overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${g.progress + (pos ? pos.frac * 50 : 0)}%`, background: g.progress === 100 ? T.success : T.primary, transition: 'width 0.5s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.mutedSoft, marginTop: 4 }}>
            <span>← 큰번호</span>
            <span>작은번호 →</span>
          </div>
        </div>

        {/* 작업자 */}
        {worker && (
          <div style={{ marginBottom: 14, padding: 12, background: T.bg, borderRadius: 8 }}>
            <div style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 700, marginBottom: 8 }}>작업자</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 999, background: worker.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>{worker.name.charAt(0)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{worker.name}</div>
                <div style={{ fontSize: 11, color: T.mutedSoft }}>{worker.role} · 속도 계수 ×{WORKER_SPEED_FACTOR[worker.id]?.toFixed(2)}</div>
              </div>
              <span style={{ padding: '3px 8px', borderRadius: 5, background: task.color, color: '#fff', fontSize: 10, fontWeight: 700 }}>{task.label}</span>
            </div>
            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 11 }}>
              <div>
                <div style={{ color: T.mutedSoft }}>시작</div>
                <div style={{ color: T.text, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{g.startedAt}</div>
              </div>
              <div>
                <div style={{ color: T.mutedSoft }}>실작업</div>
                <div style={{ color: T.text, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{pos ? pos.elapsedMin : 0}분</div>
              </div>
              <div>
                <div style={{ color: T.mutedSoft }}>휴식</div>
                <div style={{ color: (g.pauseTotalMin || 0) > 0 ? '#CA8A04' : T.mutedSoft, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{(g.pauseTotalMin || 0) + (g.pausedAt ? minSinceScan(g.pausedAt) : 0)}분</div>
              </div>
            </div>
            {/* 휴식 이력 */}
            {(g.pauseHistory && g.pauseHistory.length > 0) && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${T.borderSoft}` }}>
                <div style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 700, marginBottom: 4 }}>오늘 휴식 이력</div>
                {g.pauseHistory.map((p, i) => (
                  <div key={i} style={{ fontSize: 11, color: T.muted, fontFamily: 'ui-monospace, monospace' }}>
                    {p.from}—{p.to} · <span style={{ fontFamily: 'Pretendard, system-ui' }}>{p.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 이상 */}
        {g.hasIssue && (
          <div style={{ marginBottom: 14, padding: 12, background: `${T.danger}10`, borderRadius: 8, borderLeft: `3px solid ${T.danger}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.danger, marginBottom: 4 }}>⚠ 이상 신고</div>
            <div style={{ fontSize: 12, color: T.text, lineHeight: 1.5 }}>{g.issueNote}</div>
            <button style={{ marginTop: 8, padding: '5px 10px', fontSize: 11, fontWeight: 700, background: T.danger, color: '#fff', border: 0, borderRadius: 5, cursor: 'pointer' }}>생육조사 이상 기록으로 연결</button>
          </div>
        )}

        {/* QR 스캔 이력 */}
        <div>
          <div style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 700, marginBottom: 8 }}>QR 스캔 이력</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(g.scanHistory || [
              g.startedAt && { at: g.startedAt, side: 'F', by: g.currentWorker },
              g.completedAt && { at: g.completedAt, side: 'F-again', by: g.completedBy },
            ].filter(Boolean)).map((s, i) => {
              const w = getWorker(s.by, WORKERS_MAP);
              const label = s.side === 'F' ? '앞 QR (시작)' : s.side === 'B' ? '뒤 QR (반 완료)' : '앞 QR (재스캔 · 완료)';
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 6, background: T.bg, borderRadius: 5, fontSize: 11 }}>
                  <span style={{ fontFamily: 'ui-monospace, monospace', color: T.text, fontWeight: 700, minWidth: 40 }}>{s.at}</span>
                  <span style={{ color: T.muted, flex: 1 }}>{label}</span>
                  {w && <span style={{ padding: '1px 6px', borderRadius: 3, background: w.color, color: '#fff', fontSize: 10, fontWeight: 700 }}>{w.name}</span>}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
          {btnSecondary('작업자 재배정', icons.users)}
          {btnSecondary('생육 상세', icons.sprout)}
        </div>

        {/* QR 스캔 규칙 안내 */}
        <div style={{ marginTop: 14, padding: 12, background: T.bg, borderRadius: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.text, marginBottom: 6 }}>📱 작업자 앱에서 골 앞 QR 스캔 시</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { step: '처음 스캔', act: '작업 시작', color: T.primary },
              { step: '뒤 QR 스캔', act: '오른쪽 거터 완료 · 왼쪽 거터 시작', color: T.info },
              { step: '앞 QR 재스캔', act: '선택: [일시정지] · [완료] · [이상 신고]', color: '#CA8A04' },
              { step: '일시정지 후 재스캔', act: '작업 재개 (실작업 시간만 합산)', color: T.success },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: r.color, flexShrink: 0 }} />
                <span style={{ color: T.text, fontWeight: 600, minWidth: 110 }}>{r.step}</span>
                <span style={{ color: T.muted }}>{r.act}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
export { FloorPlanScreen, GreenhousePlan };

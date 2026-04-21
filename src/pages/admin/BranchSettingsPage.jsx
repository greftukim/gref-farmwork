// 지점 설정 (GPS) — 프로페셔널 SaaS 리디자인
// 기존 파일 교체: gref-farmwork/src/pages/admin/BranchSettingsPage.jsx
// AdminDashboard / EmployeesScreen 과 동일한 디자인 시스템 사용 (primitives.jsx)

import React, { useEffect, useMemo, useState } from 'react';
import {
  Card, Dot, Icon, Pill, T, TopBar,
  btnPrimary, btnSecondary, icons,
} from '../../design/primitives';
import useBranchStore from '../../stores/branchStore';
import useEmployeeStore from '../../stores/employeeStore';
import useAttendanceStore from '../../stores/attendanceStore';

const TODAY = new Date().toISOString().split('T')[0];

const ACCENT_MAP = {
  indigo: { fg: '#4F46E5', soft: '#EEF2FF', text: '#3730A3' },
  emerald: { fg: '#059669', soft: '#ECFDF5', text: '#047857' },
  amber: { fg: '#D97706', soft: '#FFFBEB', text: '#92400E' },
  violet: { fg: '#7C3AED', soft: '#F5F3FF', text: '#5B21B6' },
  sky: { fg: '#0284C7', soft: '#F0F9FF', text: '#075985' },
  rose: { fg: '#E11D48', soft: '#FFF1F2', text: '#9F1239' },
  slate: { fg: '#475569', soft: '#F1F5F9', text: '#334155' },
};
const ACCENT_KEYS = Object.keys(ACCENT_MAP);
function accentFor(b) {
  if (b?.accentKey && ACCENT_MAP[b.accentKey]) return ACCENT_MAP[b.accentKey];
  // 코드 해시로 자동 할당
  const code = (b?.code || b?.id || '').toString();
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0;
  return ACCENT_MAP[ACCENT_KEYS[h % ACCENT_KEYS.length]];
}

// ─────────────────────────────────────────────────────────
// Nominatim(무료 OSM) 주소 → 좌표
// ─────────────────────────────────────────────────────────
async function geocodeAddress(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=kr`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'ko' } });
  const data = await res.json();
  if (data.length > 0) {
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), display: data[0].display_name };
  }
  return null;
}

// ─────────────────────────────────────────────────────────
// 미니 반경 지도 — 행 썸네일용 SVG
// ─────────────────────────────────────────────────────────
function MiniMap({ radius = 120, accent = '#4F46E5', size = 64, configured = true }) {
  const cx = size / 2, cy = size / 2;
  const maxR = size / 2 - 6;
  const r = Math.max(8, Math.min(maxR, (radius / 500) * maxR));
  const pid = `mm-${Math.round(Math.random() * 1e6)}`;
  return (
    <svg width={size} height={size} style={{ display: 'block', flexShrink: 0 }}>
      <defs>
        <pattern id={pid} x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#E5E7EB" strokeWidth="0.4" />
        </pattern>
        <radialGradient id={`${pid}-g`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.28" />
          <stop offset="70%" stopColor={accent} stopOpacity="0.08" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={size} height={size} fill="#F8FAFC" rx="8" />
      <rect width={size} height={size} fill={`url(#${pid})`} rx="8" />
      <rect x={cx - 10} y={cy - 6} width="9" height="13" fill="#CBD5E1" opacity="0.55" rx="1" />
      <rect x={cx + 2} y={cy - 10} width="11" height="7" fill="#CBD5E1" opacity="0.5" rx="1" />
      <rect x={cx - 2} y={cy + 2} width="7" height="8" fill="#CBD5E1" opacity="0.55" rx="1" />
      <line x1="0" y1={cy + 14} x2={size} y2={cy + 14} stroke="#E5E7EB" strokeWidth="1.5" />
      {configured && (
        <>
          <circle cx={cx} cy={cy} r={r} fill={`url(#${pid}-g)`} stroke={accent} strokeWidth="1.3" strokeDasharray="2.5 2.5" />
          <circle cx={cx} cy={cy} r="4" fill={accent} />
          <circle cx={cx} cy={cy} r="1.6" fill="#fff" />
        </>
      )}
      {!configured && (
        <text x={cx} y={cy + 3} fontSize="10" fill="#94A3B8" fontWeight="700" textAnchor="middle">?</text>
      )}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────
// 큰 상세 지도
// ─────────────────────────────────────────────────────────
function DetailMap({ radius, accent, lat, lng }) {
  const configured = lat != null && lng != null && !Number.isNaN(Number(lat));
  return (
    <div style={{
      position: 'relative', background: '#F1F5F9', borderRadius: 10,
      overflow: 'hidden', height: 240, border: `1px solid ${T.border}`,
    }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <pattern id="dm-g1" x="0" y="0" width="5" height="5" patternUnits="userSpaceOnUse">
            <path d="M 5 0 L 0 0 0 5" fill="none" stroke="#E2E8F0" strokeWidth="0.2" />
          </pattern>
          <pattern id="dm-g2" x="0" y="0" width="25" height="25" patternUnits="userSpaceOnUse">
            <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#CBD5E1" strokeWidth="0.4" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#dm-g1)" />
        <rect width="100" height="100" fill="url(#dm-g2)" />
        <rect x="32" y="38" width="10" height="18" fill="#CBD5E1" opacity="0.55" />
        <rect x="45" y="42" width="14" height="10" fill="#CBD5E1" opacity="0.55" />
        <rect x="44" y="54" width="8" height="12" fill="#CBD5E1" opacity="0.55" />
        <rect x="55" y="55" width="10" height="10" fill="#CBD5E1" opacity="0.55" />
        <line x1="0" y1="68" x2="100" y2="68" stroke="#CBD5E1" strokeWidth="1.5" opacity="0.6" />
        <line x1="22" y1="0" x2="22" y2="100" stroke="#CBD5E1" strokeWidth="1" opacity="0.5" />
      </svg>
      {configured && (
        <>
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: `${Math.max(16, Math.min(200, (radius / 500) * 180))}px`,
            height: `${Math.max(16, Math.min(200, (radius / 500) * 180))}px`,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${accent}30 0%, ${accent}10 70%, transparent 100%)`,
            border: `2px dashed ${accent}`,
          }} />
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 14, height: 14, borderRadius: '50%', background: accent,
            border: '3px solid #fff', boxShadow: `0 2px 6px rgba(0,0,0,0.2)`, zIndex: 2,
          }} />
        </>
      )}
      {!configured && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: T.mutedSoft, fontSize: 12,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, marginBottom: 6, opacity: 0.5 }}>📍</div>
            GPS 좌표 미설정
          </div>
        </div>
      )}
      <div style={{
        position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6, alignItems: 'center',
        padding: '4px 8px', background: 'rgba(255,255,255,0.95)', borderRadius: 6,
        fontSize: 10, color: T.muted, fontWeight: 600, backdropFilter: 'blur(4px)',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: configured ? T.success : T.mutedSoft }} />
        {configured ? 'GPS 설정 완료' : '미설정'}
      </div>
      {configured && (
        <div style={{
          position: 'absolute', bottom: 10, right: 10,
          display: 'flex', flexDirection: 'column', gap: 2,
          padding: '6px 10px', background: 'rgba(255,255,255,0.95)', borderRadius: 6,
          fontSize: 10, color: T.text, fontFamily: 'ui-monospace, monospace', backdropFilter: 'blur(4px)',
        }}>
          <span>{Number(lat).toFixed(6)}</span>
          <span>{Number(lng).toFixed(6)}</span>
        </div>
      )}
      <div style={{
        position: 'absolute', bottom: 10, left: 10, display: 'flex', flexDirection: 'column',
        background: '#fff', border: `1px solid ${T.border}`, borderRadius: 6, overflow: 'hidden',
        fontSize: 13, fontWeight: 700, color: T.muted,
      }}>
        <div style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: `1px solid ${T.borderSoft}`, cursor: 'pointer' }}>+</div>
        <div style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>−</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// 공통 input/label
// ─────────────────────────────────────────────────────────
const inputStyle = {
  width: '100%', height: 36, padding: '0 10px',
  border: `1px solid ${T.border}`, borderRadius: 7,
  background: T.surface, fontSize: 13, color: T.text, outline: 'none',
  fontFamily: 'inherit',
};
function FormRow({ label, children, required, hint }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 5 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: 0.2 }}>{label}</span>
        {required && <span style={{ fontSize: 11, color: T.danger, fontWeight: 700 }}>*</span>}
        {hint && <span style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 500, marginLeft: 4 }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// 메인 페이지
// ─────────────────────────────────────────────────────────
export default function BranchSettingsPage() {
  const branches = useBranchStore((s) => s.branches);
  const addBranch = useBranchStore((s) => s.addBranch);
  const updateBranch = useBranchStore((s) => s.updateBranch);
  const deleteBranch = useBranchStore((s) => s.deleteBranch);
  const employees = useEmployeeStore((s) => s.employees);
  const records = useAttendanceStore((s) => s.records);

  const [selectedId, setSelectedId] = useState(null);
  const [searchQ, setSearchQ] = useState('');
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', code: '', latitude: '', longitude: '', radiusMeters: 100, address: '' });
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast] = useState(null);

  // 기본 선택
  useEffect(() => {
    if (!selectedId && branches.length > 0) setSelectedId(branches[0].id);
    if (selectedId && !branches.find((b) => b.id === selectedId) && branches.length > 0) {
      setSelectedId(branches[0].id);
    }
  }, [branches, selectedId]);

  const selected = branches.find((b) => b.id === selectedId);
  const accent = accentFor(selected);

  // 편집 폼 (선택 지점과 동기화)
  const [form, setForm] = useState({ name: '', radius: 100, address: '', lat: null, lng: null });
  useEffect(() => {
    if (!selected) return;
    setForm({
      name: selected.name || '',
      radius: Number(selected.radiusMeters) || 100,
      address: selected.address || '',
      lat: selected.latitude,
      lng: selected.longitude,
    });
  }, [selectedId, selected?.updatedAt]);

  // 파생 데이터
  const filtered = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return branches;
    return branches.filter((b) =>
      (b.name || '').toLowerCase().includes(q) ||
      (b.code || '').toLowerCase().includes(q)
    );
  }, [branches, searchQ]);

  const branchStats = useMemo(() => {
    const m = {};
    branches.forEach((b) => { m[b.id] = { workers: 0, checkedIn: 0 }; });
    employees.forEach((e) => {
      if (!e.isActive) return;
      const bid = e.branchId;
      if (bid && m[bid]) m[bid].workers += 1;
    });
    records.filter((r) => r.date === TODAY && r.checkIn).forEach((r) => {
      const emp = employees.find((e) => e.id === r.employeeId);
      if (emp?.branchId && m[emp.branchId]) m[emp.branchId].checkedIn += 1;
    });
    return m;
  }, [branches, employees, records]);

  const totalBranches = branches.length;
  const gpsConfigured = branches.filter((b) => b.latitude != null && b.longitude != null).length;
  const totalWorkers = Object.values(branchStats).reduce((a, s) => a + s.workers, 0);
  const configuredRadii = branches.filter((b) => b.latitude != null).map((b) => Number(b.radiusMeters) || 100);
  const avgRadius = configuredRadii.length ? Math.round(configuredRadii.reduce((a, v) => a + v, 0) / configuredRadii.length) : 0;

  // 액션
  const showToast = (msg, kind = 'success') => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 2500);
  };

  const handleSave = async () => {
    if (!selectedId) return;
    await updateBranch(selectedId, {
      name: form.name,
      latitude: form.lat != null && form.lat !== '' ? parseFloat(form.lat) : null,
      longitude: form.lng != null && form.lng !== '' ? parseFloat(form.lng) : null,
      radiusMeters: parseInt(form.radius) || 100,
    });
    showToast(`${form.name} 설정이 저장되었습니다`);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) { showToast('이 브라우저는 GPS를 지원하지 않습니다', 'danger'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude }));
        showToast(`현재 위치 확인 (정확도 ${Math.round(pos.coords.accuracy)}m)`);
      },
      () => showToast('위치 권한이 거부되었습니다', 'danger'),
      { enableHighAccuracy: true }
    );
  };

  const handleSearchAddress = async () => {
    if (!form.address?.trim()) return;
    const r = await geocodeAddress(form.address);
    if (r) { setForm((f) => ({ ...f, lat: r.lat, lng: r.lon })); showToast('주소로 좌표가 설정되었습니다'); }
    else showToast('검색 결과 없음', 'danger');
  };

  const resetAddForm = () => {
    setAddForm({ name: '', code: '', latitude: '', longitude: '', radiusMeters: 100, address: '' });
    setAddError('');
  };

  const handleAdd = async () => {
    if (!addForm.name.trim() || !addForm.code.trim()) { setAddError('지점명과 지점 코드는 필수입니다'); return; }
    setAddLoading(true);
    setAddError('');
    const { error } = await addBranch({
      name: addForm.name.trim(),
      code: addForm.code.trim().toLowerCase(),
      latitude: parseFloat(addForm.latitude) || null,
      longitude: parseFloat(addForm.longitude) || null,
      radiusMeters: parseInt(addForm.radiusMeters) || 100,
    });
    setAddLoading(false);
    if (error) {
      if (error.code === '23505') setAddError(`지점 코드 "${addForm.code}"가 이미 존재합니다`);
      else setAddError(`등록 실패: ${error.message}`);
      return;
    }
    setShowAddPanel(false);
    resetAddForm();
    showToast(`${addForm.name} 지점이 등록되었습니다`);
  };

  const handleDelete = async (id) => {
    const { error } = await deleteBranch(id);
    if (error) { showToast(`삭제 실패: ${error.message}`, 'danger'); }
    else showToast('지점이 삭제되었습니다');
    setDeleteConfirm(null);
  };

  const handleAddGeocode = async () => {
    if (!addForm.address?.trim()) return;
    const r = await geocodeAddress(addForm.address);
    if (r) setAddForm((f) => ({ ...f, latitude: r.lat, longitude: r.lon }));
    else setAddError('주소를 찾을 수 없습니다');
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, minWidth: 0 }}>
      <TopBar
        subtitle="시스템 설정"
        title="지점 설정 (GPS)"
        actions={
          <span onClick={() => { setShowAddPanel(true); resetAddForm(); }} style={{ display: 'inline-block' }}>
            {btnPrimary('새 지점 등록', icons.plus)}
          </span>
        }
      />

      {toast && (
        <div style={{
          position: 'fixed', top: 88, right: 32, zIndex: 40,
          padding: '12px 16px', background: T.surface,
          border: `1px solid ${T.border}`,
          borderLeft: `3px solid ${toast.kind === 'danger' ? T.danger : T.success}`,
          borderRadius: 8, boxShadow: '0 10px 30px rgba(15,23,42,0.12)',
          fontSize: 13, color: T.text, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Icon d={toast.kind === 'danger' ? icons.x : icons.check} size={14}
            c={toast.kind === 'danger' ? T.danger : T.success} sw={2.5} />
          {toast.msg}
        </div>
      )}

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { l: '등록 지점', v: totalBranches, sub: '전체', tone: T.primary, soft: T.primarySoft, trend: '지점' },
            { l: 'GPS 설정 완료', v: gpsConfigured, total: totalBranches,
              sub: gpsConfigured === totalBranches ? '모두 설정됨' : `${totalBranches - gpsConfigured}개 미설정`,
              tone: gpsConfigured === totalBranches ? T.success : T.warning,
              soft: gpsConfigured === totalBranches ? T.successSoft : T.warningSoft,
              trend: totalBranches ? `${Math.round((gpsConfigured / totalBranches) * 100)}%` : '—' },
            { l: '전체 소속 직원', v: totalWorkers, sub: '재직중 기준', tone: T.primary, soft: T.primarySoft, trend: '명' },
            { l: '평균 반경', v: avgRadius || '—', sub: configuredRadii.length ? `${Math.min(...configuredRadii)}m ~ ${Math.max(...configuredRadii)}m` : 'GPS 설정 필요', tone: T.primary, soft: T.primarySoft, trend: 'm' },
          ].map((k, i) => (
            <Card key={i} pad={18} style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.tone }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <span style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>{k.l}</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', background: k.soft, color: k.tone, borderRadius: 4 }}>{k.trend}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 36, fontWeight: 700, color: T.text, letterSpacing: -1, lineHeight: 1 }}>{k.v}</span>
                {k.total && <span style={{ fontSize: 14, color: T.mutedSoft, fontWeight: 500 }}>/ {k.total}</span>}
              </div>
              <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 8 }}>{k.sub}</div>
            </Card>
          ))}
        </div>

        {/* Split: 좌 목록 · 우 편집 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 20 }}>
          {/* 좌: 지점 목록 */}
          <Card pad={0}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.borderSoft}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, flex: 1, fontSize: 13, color: T.mutedSoft }}>
                <Icon d={icons.search} size={14} />
                <input
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="지점명, 코드 검색"
                  style={{ border: 0, background: 'transparent', outline: 'none', flex: 1, fontSize: 13, color: T.text }}
                />
              </div>
              <span style={{ fontSize: 11, color: T.mutedSoft, fontWeight: 600 }}>{filtered.length}개</span>
            </div>

            {filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: T.mutedSoft, fontSize: 13 }}>
                {branches.length === 0 ? '등록된 지점이 없습니다' : '검색 결과 없음'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {filtered.map((b, i) => {
                  const on = b.id === selectedId;
                  const a = accentFor(b);
                  const gpsOk = b.latitude != null && b.longitude != null;
                  const s = branchStats[b.id] || { workers: 0, checkedIn: 0 };
                  return (
                    <div key={b.id}
                      onClick={() => setSelectedId(b.id)}
                      style={{
                        padding: '14px 18px', cursor: 'pointer',
                        background: on ? a.soft : 'transparent',
                        borderLeft: on ? `3px solid ${a.fg}` : '3px solid transparent',
                        borderBottom: i < filtered.length - 1 ? `1px solid ${T.borderSoft}` : 'none',
                        display: 'flex', alignItems: 'center', gap: 14,
                        transition: 'background 120ms',
                      }}>
                      <MiniMap radius={Number(b.radiusMeters) || 100} accent={a.fg} size={56} configured={gpsOk} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: T.text, letterSpacing: -0.2 }}>{b.name}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', background: a.soft, color: a.text, borderRadius: 4, fontFamily: 'ui-monospace, monospace' }}>{b.code}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 12, fontSize: 11, color: T.mutedSoft, flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Icon d={icons.users} size={11} />
                            {s.workers}명
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Icon d={icons.location} size={11} />
                            {gpsOk ? `반경 ${b.radiusMeters || 100}m` : '미설정'}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: gpsOk ? T.success : T.warning, fontWeight: 600 }}>
                            <Dot c={gpsOk ? T.success : T.warning} />
                            {gpsOk ? 'GPS OK' : 'GPS 필요'}
                          </span>
                        </div>
                      </div>
                      <Icon d={<polyline points="9 18 15 12 9 6" />} size={16} c={on ? a.fg : T.mutedSoft} />
                    </div>
                  );
                })}
              </div>
            )}

            <div
              onClick={() => { setShowAddPanel(true); resetAddForm(); }}
              style={{
                padding: '14px 18px', borderTop: `1px solid ${T.borderSoft}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                fontSize: 13, fontWeight: 600, color: T.primary, cursor: 'pointer',
              }}>
              <Icon d={icons.plus} size={14} sw={2.2} />
              새 지점 등록
            </div>
          </Card>

          {/* 우: 편집 */}
          {selected ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* 헤더 */}
              <Card pad={0}>
                <div style={{ padding: 20, borderBottom: `1px solid ${T.borderSoft}`, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: `linear-gradient(135deg, ${accent.fg}, ${accent.text})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon d={icons.location} size={22} c="#fff" sw={2.2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: 0, letterSpacing: -0.3 }}>{selected.name}</h2>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', background: accent.soft, color: accent.text, borderRadius: 4, fontFamily: 'ui-monospace, monospace' }}>{selected.code}</span>
                      {selected.latitude == null && <Pill tone="warning">GPS 미설정</Pill>}
                      {selected.latitude != null && <Pill tone="success"><Dot c={T.success} />운영중</Pill>}
                    </div>
                    <div style={{ fontSize: 12, color: T.muted }}>
                      소속 직원 <strong style={{ color: T.text }}>{(branchStats[selected.id]?.workers) || 0}명</strong>
                      <span style={{ color: T.mutedSoft, margin: '0 8px' }}>·</span>
                      오늘 출근 <strong style={{ color: T.success }}>{(branchStats[selected.id]?.checkedIn) || 0}명</strong>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span onClick={() => setDeleteConfirm(selected.id)} style={{ display: 'inline-block' }}>
                      {btnSecondary('삭제')}
                    </span>
                  </div>
                </div>
              </Card>

              {/* GPS + 폼 */}
              <Card pad={0}>
                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.borderSoft}` }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>GPS 위치 및 반경</h3>
                  <p style={{ fontSize: 11, color: T.mutedSoft, margin: '2px 0 0' }}>설정된 반경 내에서만 출퇴근 인증이 가능합니다</p>
                </div>

                <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  {/* 지도 + 현재 위치 */}
                  <div>
                    <DetailMap radius={Number(form.radius) || 100} accent={accent.fg} lat={form.lat} lng={form.lng} />
                    <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
                      <button onClick={handleUseCurrentLocation}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          padding: '10px 12px', borderRadius: 8, border: `1px solid ${T.border}`,
                          background: T.surface, color: T.text, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        }}>
                        <Icon d={icons.location} size={13} c={T.primary} sw={2} />
                        현재 위치 사용
                      </button>
                      <button onClick={handleSearchAddress}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          padding: '10px 12px', borderRadius: 8, border: `1px solid ${T.border}`,
                          background: T.surface, color: T.text, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        }}>
                        <Icon d={icons.search} size={13} c={T.muted} sw={2} />
                        주소로 검색
                      </button>
                    </div>
                  </div>

                  {/* 폼 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <FormRow label="지점 이름">
                      <input value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        style={inputStyle} />
                    </FormRow>
                    <FormRow label="주소 (검색 시 좌표 자동 설정)">
                      <input value={form.address}
                        onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchAddress()}
                        style={inputStyle}
                        placeholder="예: 부산광역시 강서구 명지국제7로 77" />
                    </FormRow>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <FormRow label="위도 (Lat)">
                        <input value={form.lat ?? ''}
                          onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value === '' ? null : parseFloat(e.target.value) }))}
                          style={{ ...inputStyle, fontFamily: 'ui-monospace, monospace' }} placeholder="35.095632" />
                      </FormRow>
                      <FormRow label="경도 (Lng)">
                        <input value={form.lng ?? ''}
                          onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value === '' ? null : parseFloat(e.target.value) }))}
                          style={{ ...inputStyle, fontFamily: 'ui-monospace, monospace' }} placeholder="128.974691" />
                      </FormRow>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: 0.3 }}>허용 반경</span>
                        <span style={{ fontSize: 18, fontWeight: 700, color: accent.fg, letterSpacing: -0.4, fontFamily: 'ui-monospace, monospace' }}>
                          {form.radius}<span style={{ fontSize: 11, color: T.mutedSoft, marginLeft: 2, fontWeight: 500 }}>m</span>
                        </span>
                      </div>
                      <input type="range" min={30} max={500} step={10} value={form.radius}
                        onChange={(e) => setForm((f) => ({ ...f, radius: Number(e.target.value) }))}
                        style={{ width: '100%', height: 6, accentColor: accent.fg, cursor: 'pointer' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.mutedSoft, fontWeight: 500, marginTop: 4 }}>
                        <span>30m</span><span>100m</span><span>250m</span><span>500m</span>
                      </div>
                      <div style={{
                        marginTop: 10, padding: 10, background: accent.soft,
                        borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
                        fontSize: 11, color: accent.text,
                      }}>
                        <Icon d={icons.check} size={12} c={accent.fg} sw={2.4} />
                        반경 <strong style={{ fontWeight: 700 }}>{form.radius}m</strong> 이내 · 약 <strong style={{ fontWeight: 700 }}>{Math.round(Math.PI * form.radius * form.radius / 1000)}</strong>천m² 커버
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '12px 20px', borderTop: `1px solid ${T.borderSoft}`, background: T.bg, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: T.mutedSoft }}>
                    {form.lat != null ? '변경사항을 저장하면 작업자의 출퇴근 인증에 즉시 적용됩니다' : 'GPS 좌표를 설정해 주세요'}
                  </span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <button onClick={handleSave} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      height: 36, padding: '0 18px', borderRadius: 8,
                      background: T.primary, color: '#fff', border: 0,
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(79,70,229,0.25)',
                    }}>
                      <Icon d={icons.check} size={13} c="#fff" sw={2.5} />
                      변경사항 저장
                    </button>
                  </div>
                </div>
              </Card>

              {/* 가이드 */}
              <Card>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: T.primarySoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon d={icons.check} size={14} c={T.primary} sw={2.4} />
                  </div>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0 }}>운영 가이드</h3>
                </div>
                <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 12, color: T.muted, lineHeight: 1.7 }}>
                  <li>작업자는 지점 반경 내에 있어야 출퇴근 버튼이 활성화됩니다</li>
                  <li>실내 GPS 오차를 고려해 반경은 100m 이상을 권장합니다</li>
                  <li>지점 관리자는 GPS 없이 수동 출퇴근을 처리할 수 있습니다</li>
                </ul>
              </Card>
            </div>
          ) : (
            <Card pad={40} style={{ textAlign: 'center', color: T.mutedSoft, fontSize: 13 }}>
              지점을 선택하거나 새로 등록해 주세요
            </Card>
          )}
        </div>
      </div>

      {/* 신규 지점 사이드 패널 */}
      {showAddPanel && (
        <div onClick={() => setShowAddPanel(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', zIndex: 30, backdropFilter: 'blur(2px)' }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', right: 0, top: 0, bottom: 0, width: 460,
              background: T.surface, boxShadow: '-20px 0 40px rgba(15,23,42,0.15)',
              display: 'flex', flexDirection: 'column',
            }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: 0 }}>새 지점 등록</h2>
                <p style={{ fontSize: 11, color: T.mutedSoft, margin: '2px 0 0' }}>지점 정보와 GPS 좌표를 입력하세요</p>
              </div>
              <button onClick={() => setShowAddPanel(false)} style={{
                width: 32, height: 32, borderRadius: 8, background: T.bg,
                border: `1px solid ${T.border}`, color: T.muted, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon d={icons.x} size={14} />
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {addError && (
                <div style={{ padding: 10, background: T.dangerSoft, border: `1px solid ${T.danger}`, borderRadius: 8, fontSize: 12, color: T.danger, fontWeight: 600 }}>
                  {addError}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <FormRow label="지점명" required>
                  <input value={addForm.name}
                    onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                    style={inputStyle} placeholder="예: 광주지점" />
                </FormRow>
                <FormRow label="지점 코드" required hint="영문 소문자">
                  <input value={addForm.code}
                    onChange={(e) => setAddForm((f) => ({ ...f, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                    style={{ ...inputStyle, fontFamily: 'ui-monospace, monospace' }} placeholder="gwangju" />
                </FormRow>
              </div>

              <FormRow label="주소 검색">
                <div style={{ display: 'flex', gap: 6 }}>
                  <input value={addForm.address}
                    onChange={(e) => setAddForm((f) => ({ ...f, address: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddGeocode()}
                    style={{ ...inputStyle, flex: 1 }} placeholder="도로명 주소 입력" />
                  <button onClick={handleAddGeocode} style={{
                    padding: '0 14px', height: 36, borderRadius: 7, border: 0,
                    background: T.primary, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}>검색</button>
                </div>
              </FormRow>

              <div style={{
                padding: 14, background: T.bg, borderRadius: 10,
                border: `1px dashed ${T.border}`,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: T.primarySoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon d={icons.location} size={18} c={T.primary} sw={2.2} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>현재 위치 사용</div>
                  <div style={{ fontSize: 10, color: T.mutedSoft, marginTop: 2 }}>기기의 GPS로 좌표를 자동 입력합니다</div>
                </div>
                <button onClick={() => {
                  if (!navigator.geolocation) return;
                  navigator.geolocation.getCurrentPosition(
                    (p) => setAddForm((f) => ({ ...f, latitude: p.coords.latitude, longitude: p.coords.longitude })),
                    () => setAddError('위치 권한이 거부되었습니다'),
                    { enableHighAccuracy: true }
                  );
                }} style={{
                  padding: '7px 12px', borderRadius: 6, border: `1px solid ${T.border}`,
                  background: T.surface, fontSize: 12, fontWeight: 600, color: T.text, cursor: 'pointer',
                }}>가져오기</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <FormRow label="위도">
                  <input value={addForm.latitude}
                    onChange={(e) => setAddForm((f) => ({ ...f, latitude: e.target.value }))}
                    style={{ ...inputStyle, fontFamily: 'ui-monospace, monospace' }} placeholder="35.0000" />
                </FormRow>
                <FormRow label="경도">
                  <input value={addForm.longitude}
                    onChange={(e) => setAddForm((f) => ({ ...f, longitude: e.target.value }))}
                    style={{ ...inputStyle, fontFamily: 'ui-monospace, monospace' }} placeholder="128.0000" />
                </FormRow>
              </div>

              <FormRow label="허용 반경" hint="기본 100m">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="range" min={30} max={500} step={10} value={addForm.radiusMeters}
                    onChange={(e) => setAddForm((f) => ({ ...f, radiusMeters: Number(e.target.value) }))}
                    style={{ flex: 1, accentColor: T.primary }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: T.primary, minWidth: 56, textAlign: 'right', fontFamily: 'ui-monospace, monospace' }}>{addForm.radiusMeters}m</span>
                </div>
              </FormRow>
            </div>

            <div style={{ padding: '16px 24px', borderTop: `1px solid ${T.border}`, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <span onClick={() => setShowAddPanel(false)} style={{ display: 'inline-block' }}>{btnSecondary('취소')}</span>
              <button onClick={handleAdd} disabled={addLoading} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                height: 36, padding: '0 18px', borderRadius: 8,
                background: addLoading ? T.mutedSoft : T.primary, color: '#fff', border: 0,
                fontSize: 13, fontWeight: 600, cursor: addLoading ? 'not-allowed' : 'pointer',
              }}>
                <Icon d={icons.plus} size={13} c="#fff" sw={2.5} />
                {addLoading ? '등록 중...' : '지점 등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      {deleteConfirm && (
        <div onClick={() => setDeleteConfirm(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: T.surface, borderRadius: 12, width: 400, padding: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: T.dangerSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon d={icons.x} size={18} c={T.danger} sw={2.2} />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0 }}>지점 삭제 확인</h3>
            </div>
            <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, margin: '0 0 16px' }}>
              <strong style={{ color: T.text }}>{branches.find((b) => b.id === deleteConfirm)?.name}</strong> 지점을 삭제하면 소속 직원·출퇴근 기록 참조에 영향이 있을 수 있습니다.
            </p>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              <span onClick={() => setDeleteConfirm(null)} style={{ display: 'inline-block' }}>{btnSecondary('취소')}</span>
              <button onClick={() => handleDelete(deleteConfirm)} style={{
                height: 36, padding: '0 16px', borderRadius: 8,
                background: T.danger, color: '#fff', border: 0,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

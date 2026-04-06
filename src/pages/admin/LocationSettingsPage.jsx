import { useState } from 'react';
import useLocationStore, { haversineDistance } from '../../stores/locationStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

export default function LocationSettingsPage() {
  const { location, setLocation, resetToDefault } = useLocationStore();

  const [form, setForm] = useState({
    name: location.name,
    lat: String(location.lat),
    lng: String(location.lng),
    radius: String(location.radius),
  });
  const [gpsStatus, setGpsStatus] = useState('idle'); // idle | checking | done | error
  const [gpsMsg, setGpsMsg] = useState('');
  const [saved, setSaved] = useState(false);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setSaved(false);
  };

  const handleSave = () => {
    const lat = parseFloat(form.lat);
    const lng = parseFloat(form.lng);
    const radius = parseInt(form.radius, 10);

    if (isNaN(lat) || isNaN(lng) || isNaN(radius)) {
      alert('위도, 경도, 반경에 올바른 숫자를 입력해주세요');
      return;
    }
    if (lat < -90 || lat > 90) { alert('위도는 -90 ~ 90 범위여야 합니다'); return; }
    if (lng < -180 || lng > 180) { alert('경도는 -180 ~ 180 범위여야 합니다'); return; }
    if (radius < 10 || radius > 5000) { alert('허용 반경은 10m ~ 5000m 범위여야 합니다'); return; }

    setLocation({ name: form.name.trim() || '온실', lat, lng, radius });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsMsg('이 기기는 GPS를 지원하지 않습니다');
      setGpsStatus('error');
      return;
    }
    setGpsStatus('checking');
    setGpsMsg('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setForm((f) => ({ ...f, lat, lng }));
        setGpsStatus('done');
        setGpsMsg(`현재 위치를 가져왔습니다 (${lat}, ${lng})`);
        setSaved(false);
      },
      (err) => {
        setGpsStatus('error');
        const msgs = { 1: 'GPS 권한이 거부되었습니다', 2: 'GPS 신호 없음', 3: 'GPS 타임아웃' };
        setGpsMsg(msgs[err.code] || `GPS 오류: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleReset = () => {
    if (!confirm('기본값(부산LAB)으로 초기화하시겠습니까?')) return;
    resetToDefault();
    const def = useLocationStore.getState().location;
    setForm({
      name: def.name,
      lat: String(def.lat),
      lng: String(def.lng),
      radius: String(def.radius),
    });
    setSaved(false);
  };

  // 현재 저장된 위치와 입력값의 미리보기 거리
  const previewDistance = (() => {
    const lat = parseFloat(form.lat);
    const lng = parseFloat(form.lng);
    if (isNaN(lat) || isNaN(lng)) return null;
    if (lat === location.lat && lng === location.lng) return null;
    return Math.round(haversineDistance(location.lat, location.lng, lat, lng));
  })();

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-heading font-semibold text-gray-900 mb-6">온실 위치 설정</h2>

      <Card accent="emerald" className="p-5 mb-4">
        <div className="text-sm font-medium text-gray-700 mb-4">현재 설정</div>
        <div className="space-y-1 text-sm text-gray-600">
          <div className="flex gap-2">
            <span className="text-gray-400 w-16">이름</span>
            <span className="font-medium">{location.name}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-400 w-16">위도</span>
            <span className="font-mono">{location.lat}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-400 w-16">경도</span>
            <span className="font-mono">{location.lng}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-400 w-16">허용 반경</span>
            <span className="font-medium">{location.radius}m</span>
          </div>
        </div>
      </Card>

      <Card className="p-5 mb-4">
        <div className="text-sm font-medium text-gray-700 mb-4">위치 수정</div>

        <div className="space-y-3">
          {/* 이름 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">온실 이름</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="예: 부산LAB 온실"
            />
          </div>

          {/* 위도 / 경도 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">위도 (Latitude)</label>
              <input
                name="lat"
                value={form.lat}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="35.0956"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">경도 (Longitude)</label>
              <input
                name="lng"
                value={form.lng}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="128.9746"
              />
            </div>
          </div>

          {/* 현재 위치 가져오기 버튼 */}
          <button
            onClick={handleGetCurrentLocation}
            disabled={gpsStatus === 'checking'}
            className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2
              active:scale-[0.98] transition-transform disabled:opacity-50 w-full justify-center"
          >
            {gpsStatus === 'checking'
              ? <><span className="animate-spin">⏳</span> GPS 수신 중...</>
              : <><span>📍</span> 현재 위치로 설정</>
            }
          </button>

          {gpsMsg && (
            <p className={`text-xs px-2 ${gpsStatus === 'error' ? 'text-red-500' : 'text-emerald-600'}`}>
              {gpsMsg}
            </p>
          )}

          {previewDistance !== null && (
            <p className="text-xs text-gray-400 px-2">
              ※ 현재 저장된 위치에서 입력값까지 약 {previewDistance}m 차이
            </p>
          )}

          {/* 허용 반경 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              허용 반경 (미터) — 현재: {form.radius}m
            </label>
            <input
              name="radius"
              type="range"
              min={10}
              max={1000}
              step={10}
              value={form.radius}
              onChange={handleChange}
              className="w-full accent-emerald-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>10m</span>
              <span className="font-medium text-emerald-700">{form.radius}m</span>
              <span>1000m</span>
            </div>
          </div>
        </div>

        {/* 저장 버튼 */}
        <div className="flex gap-2 mt-5">
          <Button className="flex-1" onClick={handleSave}>
            {saved ? '저장됨 ✓' : '저장'}
          </Button>
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg
              hover:bg-gray-50 active:scale-[0.98] transition-transform"
          >
            기본값
          </button>
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-xs text-gray-500 space-y-1">
          <p className="font-medium text-gray-600 mb-2">안내</p>
          <p>• 작업자가 출퇴근 버튼을 누르면 현재 GPS 위치를 확인합니다</p>
          <p>• 온실 중심에서 허용 반경 안에 있어야 출퇴근이 가능합니다</p>
          <p>• 관리자는 GPS 없이 출퇴근을 직접 처리할 수 있습니다</p>
          <p>• 실내에서는 GPS 정확도가 낮을 수 있어 반경을 넉넉히 설정하세요</p>
        </div>
      </Card>
    </div>
  );
}

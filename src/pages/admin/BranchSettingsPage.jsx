import { useState } from 'react';
import useBranchStore from '../../stores/branchStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const emptyForm = { name: '', code: '', latitude: '', longitude: '', radiusMeters: 100, address: '' };

// Nominatim(무료 OSM) 주소 → 좌표 변환
async function geocodeAddress(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=kr`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'ko' } });
  const data = await res.json();
  if (data.length > 0) {
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), display: data[0].display_name };
  }
  return null;
}

// 주소 검색 + 현재 위치 + 반경 슬라이더 공용 컴포넌트
function LocationPicker({ form, setForm }) {
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState('');
  const [locating, setLocating] = useState(false);

  const handleSearch = async () => {
    if (!form.address?.trim()) return;
    setSearching(true);
    setSearchResult('');
    const result = await geocodeAddress(form.address);
    if (result) {
      setForm({ ...form, latitude: result.lat, longitude: result.lon });
      setSearchResult(result.display);
    } else {
      setSearchResult('검색 결과 없음');
    }
    setSearching(false);
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      setSearchResult('이 브라우저에서 위치를 지원하지 않습니다');
      return;
    }
    setLocating(true);
    setSearchResult('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm({ ...form, latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setSearchResult('현재 위치가 설정되었습니다');
        setLocating(false);
      },
      () => {
        setSearchResult('위치 권한이 거부되었습니다');
        setLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const hasCoords = form.latitude && form.longitude;
  const radius = parseInt(form.radiusMeters) || 100;

  return (
    <div className="space-y-4">
      {/* 주소 검색 */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">주소 검색</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={form.address || ''}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm min-h-[44px]"
            placeholder="예: 부산광역시 강서구 명지동"
          />
          <Button size="sm" onClick={handleSearch} disabled={searching}>
            {searching ? '검색 중...' : '검색'}
          </Button>
        </div>
      </div>

      {/* 현재 위치 버튼 */}
      <button
        onClick={handleCurrentLocation}
        disabled={locating}
        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 min-h-[36px] disabled:text-gray-400"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {locating ? '위치 확인 중...' : '현재 위치 사용'}
      </button>

      {/* 검색 결과 메시지 */}
      {searchResult && (
        <p className={`text-xs ${searchResult.includes('없음') || searchResult.includes('거부') ? 'text-red-500' : 'text-green-600'}`}>
          {searchResult}
        </p>
      )}

      {/* 좌표 확인 */}
      {hasCoords && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <div className="flex items-center gap-4 text-sm mb-3">
            <div>
              <span className="text-gray-500">위도 </span>
              <span className="font-bold text-gray-900">{Number(form.latitude).toFixed(6)}</span>
            </div>
            <div>
              <span className="text-gray-500">경도 </span>
              <span className="font-bold text-gray-900">{Number(form.longitude).toFixed(6)}</span>
            </div>
          </div>
          {/* 반경 시각화 */}
          <div className="flex items-center gap-3">
            <div className="relative w-16 h-16 flex-shrink-0">
              <div className="absolute inset-0 rounded-full bg-blue-200/50 border-2 border-blue-400 border-dashed" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-600" />
            </div>
            <div className="text-xs text-gray-500">
              반경 <span className="font-bold text-blue-600 text-base">{radius}m</span> 이내에서 출퇴근 인증 가능
            </div>
          </div>
        </div>
      )}

      {/* 반경 슬라이더 */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-gray-600">허용 반경</label>
          <span className="text-sm font-bold text-blue-600">{radius}m</span>
        </div>
        <input
          type="range"
          min={50}
          max={500}
          step={10}
          value={radius}
          onChange={(e) => setForm({ ...form, radiusMeters: Number(e.target.value) })}
          className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>50m</span>
          <span>250m</span>
          <span>500m</span>
        </div>
      </div>
    </div>
  );
}

export default function BranchSettingsPage() {
  const branches = useBranchStore((s) => s.branches);
  const addBranch = useBranchStore((s) => s.addBranch);
  const updateBranch = useBranchStore((s) => s.updateBranch);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm);
  const [saved, setSaved] = useState('');

  const startEdit = (branch) => {
    setEditing(branch.id);
    setForm({
      name: branch.name,
      latitude: branch.latitude ?? '',
      longitude: branch.longitude ?? '',
      radiusMeters: branch.radiusMeters ?? 100,
      address: '',
    });
  };

  const handleSave = async () => {
    await updateBranch(editing, {
      name: form.name,
      latitude: parseFloat(form.latitude) || null,
      longitude: parseFloat(form.longitude) || null,
      radiusMeters: parseInt(form.radiusMeters) || 100,
    });
    setSaved(editing);
    setEditing(null);
    setTimeout(() => setSaved(''), 2000);
  };

  const handleAdd = async () => {
    if (!addForm.name || !addForm.code) return;
    await addBranch({
      name: addForm.name,
      code: addForm.code,
      latitude: parseFloat(addForm.latitude) || null,
      longitude: parseFloat(addForm.longitude) || null,
      radiusMeters: parseInt(addForm.radiusMeters) || 100,
    });
    setAddForm(emptyForm);
    setShowAdd(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-heading font-bold text-gray-900">지점 설정 (GPS)</h2>
        {!showAdd && (
          <Button size="sm" onClick={() => setShowAdd(true)}>지점 추가</Button>
        )}
      </div>

      {/* 신규 지점 등록 */}
      {showAdd && (
        <Card accent="blue" className="p-6 mb-4">
          <div className="text-lg font-bold text-gray-900 mb-4">새 지점 등록</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">지점명</label>
              <input
                type="text"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm min-h-[44px]"
                placeholder="예: 부산LAB"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">지점 코드</label>
              <input
                type="text"
                value={addForm.code}
                onChange={(e) => setAddForm({ ...addForm, code: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm min-h-[44px]"
                placeholder="예: busan (영문, 고유값)"
              />
            </div>
          </div>
          <LocationPicker form={addForm} setForm={setAddForm} />
          <div className="flex gap-2 mt-4">
            <Button size="sm" onClick={handleAdd}>등록</Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowAdd(false); setAddForm(emptyForm); }}>취소</Button>
          </div>
        </Card>
      )}

      {/* 기존 지점 목록 */}
      {branches.length === 0 ? (
        <Card accent="gray" className="p-8 text-center">
          <p className="text-gray-400">등록된 지점이 없습니다. 위의 "지점 추가" 버튼으로 등록하세요.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {branches.map((b) => (
            <Card key={b.id} accent="blue" className="p-6">
              {editing === b.id ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">지점명</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm min-h-[44px] max-w-xs"
                    />
                  </div>
                  <LocationPicker form={form} setForm={setForm} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave}>저장</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>취소</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-lg font-bold text-gray-900">{b.name}</div>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{b.code}</span>
                    </div>
                    {b.latitude && b.longitude ? (
                      <div className="mt-2 flex items-center gap-4">
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>{b.latitude}, {b.longitude}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-medium">
                          반경 {b.radiusMeters || 100}m
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm text-amber-500 mt-1.5">GPS 좌표 미설정 — 수정 버튼을 눌러 설정하세요</p>
                    )}
                    {saved === b.id && (
                      <span className="text-xs text-green-600 font-medium mt-1 inline-block">저장 완료</span>
                    )}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => startEdit(b)}>수정</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

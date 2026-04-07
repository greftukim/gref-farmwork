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

      <button
        onClick={handleCurrentLocation}
        disabled={locating}
        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 min-h-[36px] disabled:text-gray-400"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {locating ? '위치 확인 중...' : '현재 위치 사용'}
      </button>

      {searchResult && (
        <p className={`text-xs ${searchResult.includes('없음') || searchResult.includes('거부') ? 'text-red-500' : 'text-green-600'}`}>
          {searchResult}
        </p>
      )}

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

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-gray-600">허용 반경</label>
          <span className="text-sm font-bold text-blue-600">{radius}m</span>
        </div>
        <input
          type="range" min={50} max={500} step={10} value={radius}
          onChange={(e) => setForm({ ...form, radiusMeters: Number(e.target.value) })}
          className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>50m</span><span>250m</span><span>500m</span>
        </div>
      </div>
    </div>
  );
}

export default function BranchSettingsPage() {
  const branches = useBranchStore((s) => s.branches);
  const addBranch = useBranchStore((s) => s.addBranch);
  const updateBranch = useBranchStore((s) => s.updateBranch);
  const deleteBranch = useBranchStore((s) => s.deleteBranch);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm);

  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [savedId, setSavedId] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

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
    setSavedId(editing);
    setEditing(null);
    setTimeout(() => setSavedId(''), 2500);
  };

  const handleAdd = async () => {
    if (!addForm.name.trim() || !addForm.code.trim()) {
      setAddError('지점명과 지점 코드는 필수입니다.');
      return;
    }
    setAddError('');
    setAddLoading(true);
    const { error } = await addBranch({
      name: addForm.name.trim(),
      code: addForm.code.trim().toLowerCase(),
      latitude: parseFloat(addForm.latitude) || null,
      longitude: parseFloat(addForm.longitude) || null,
      radiusMeters: parseInt(addForm.radiusMeters) || 100,
    });
    setAddLoading(false);
    if (error) {
      if (error.code === '23505') {
        setAddError(`지점 코드 "${addForm.code}"가 이미 존재합니다. 다른 코드를 사용하세요.`);
      } else {
        setAddError(`등록 실패: ${error.message}`);
      }
      return;
    }
    setAddForm(emptyForm);
    setShowAdd(false);
  };

  const handleDelete = async (id) => {
    const { error } = await deleteBranch(id);
    if (error) {
      alert(`삭제 실패: ${error.message}`);
    }
    setDeleteConfirm(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-heading font-bold text-gray-900">지점 설정 (GPS)</h2>
        {!showAdd && (
          <Button size="sm" onClick={() => { setShowAdd(true); setAddError(''); }}>
            + 지점 추가
          </Button>
        )}
      </div>

      {/* 신규 지점 등록 폼 */}
      {showAdd && (
        <Card accent="blue" className="p-6 mb-6">
          <div className="text-lg font-bold text-gray-900 mb-4">새 지점 등록</div>

          {addError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
              {addError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                지점명 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm min-h-[44px]"
                placeholder="예: 부산LAB"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                지점 코드 <span className="text-red-400">*</span>
                <span className="text-gray-400 font-normal ml-1">(영문 소문자, 고유값)</span>
              </label>
              <input
                type="text"
                value={addForm.code}
                onChange={(e) => setAddForm({ ...addForm, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm min-h-[44px]"
                placeholder="예: busan"
              />
            </div>
          </div>

          <LocationPicker form={addForm} setForm={setAddForm} />

          <div className="flex gap-2 mt-5">
            <Button size="sm" onClick={handleAdd} disabled={addLoading}>
              {addLoading ? '등록 중...' : '등록'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowAdd(false); setAddForm(emptyForm); setAddError(''); }}>
              취소
            </Button>
          </div>
        </Card>
      )}

      {/* 지점 목록 */}
      {branches.length === 0 ? (
        <Card accent="gray" className="p-8 text-center">
          <p className="text-gray-400">등록된 지점이 없습니다. "지점 추가" 버튼으로 등록하세요.</p>
          <p className="text-xs text-gray-300 mt-2">
            branches 테이블이 없으면 migration-branches.sql을 먼저 실행하세요.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {branches.map((b) => (
            <Card key={b.id} accent="blue" className="p-6">
              {editing === b.id ? (
                /* 수정 폼 */
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
              ) : deleteConfirm === b.id ? (
                /* 삭제 확인 */
                <div className="flex items-center justify-between">
                  <p className="text-sm text-red-600 font-medium">
                    "{b.name}" 지점을 삭제하시겠습니까?
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="danger" onClick={() => handleDelete(b.id)}>삭제</Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(null)}>취소</Button>
                  </div>
                </div>
              ) : (
                /* 일반 표시 */
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-lg font-bold text-gray-900">{b.name}</div>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded font-mono">
                        {b.code}
                      </span>
                      {savedId === b.id && (
                        <span className="text-xs text-green-600 font-medium">저장 완료</span>
                      )}
                    </div>
                    {b.latitude && b.longitude ? (
                      <div className="mt-2 flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round"
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="font-mono text-xs">
                            {Number(b.latitude).toFixed(5)}, {Number(b.longitude).toFixed(5)}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-medium">
                          반경 {b.radiusMeters || 100}m
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm text-amber-500 mt-1.5">
                        GPS 좌표 미설정 — 수정 버튼을 눌러 설정하세요
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0 ml-4">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(b)}>수정</Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(b.id)}>삭제</Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

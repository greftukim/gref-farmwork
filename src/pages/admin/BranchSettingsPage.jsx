import { useState } from 'react';
import useBranchStore from '../../stores/branchStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const emptyForm = { name: '', code: '', latitude: '', longitude: '', radiusMeters: 200 };

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
      radiusMeters: branch.radiusMeters ?? 200,
    });
  };

  const handleSave = async () => {
    await updateBranch(editing, {
      name: form.name,
      latitude: parseFloat(form.latitude) || null,
      longitude: parseFloat(form.longitude) || null,
      radiusMeters: parseInt(form.radiusMeters) || 200,
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
      radiusMeters: parseInt(addForm.radiusMeters) || 200,
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">위도</label>
              <input
                type="number"
                step="any"
                value={addForm.latitude}
                onChange={(e) => setAddForm({ ...addForm, latitude: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm min-h-[44px]"
                placeholder="35.1796"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">경도</label>
              <input
                type="number"
                step="any"
                value={addForm.longitude}
                onChange={(e) => setAddForm({ ...addForm, longitude: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm min-h-[44px]"
                placeholder="129.0756"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">허용 반경 (m)</label>
              <input
                type="number"
                value={addForm.radiusMeters}
                onChange={(e) => setAddForm({ ...addForm, radiusMeters: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm min-h-[44px]"
                placeholder="200"
              />
            </div>
          </div>
          <div className="flex gap-2">
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
                  <div className="text-lg font-bold text-gray-900 mb-2">{b.name} 수정</div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">지점명</label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">위도</label>
                      <input
                        type="number"
                        step="any"
                        value={form.latitude}
                        onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm min-h-[44px]"
                        placeholder="35.1796"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">경도</label>
                      <input
                        type="number"
                        step="any"
                        value={form.longitude}
                        onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm min-h-[44px]"
                        placeholder="129.0756"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">허용 반경 (m)</label>
                      <input
                        type="number"
                        value={form.radiusMeters}
                        onChange={(e) => setForm({ ...form, radiusMeters: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm min-h-[44px]"
                        placeholder="200"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave}>저장</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>취소</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-lg font-bold text-gray-900">{b.name}</div>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{b.code}</span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1.5">
                      {b.latitude && b.longitude ? (
                        <span>위도 <span className="font-medium text-gray-700">{b.latitude}</span> · 경도 <span className="font-medium text-gray-700">{b.longitude}</span> · 반경 <span className="font-medium text-gray-700">{b.radiusMeters || 200}m</span></span>
                      ) : (
                        <span className="text-amber-500">GPS 좌표 미설정 — 수정 버튼을 눌러 설정하세요</span>
                      )}
                    </div>
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

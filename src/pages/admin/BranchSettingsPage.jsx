import { useState } from 'react';
import useBranchStore from '../../stores/branchStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

export default function BranchSettingsPage() {
  const branches = useBranchStore((s) => s.branches);
  const updateBranch = useBranchStore((s) => s.updateBranch);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saved, setSaved] = useState('');

  const startEdit = (branch) => {
    setEditing(branch.id);
    setForm({
      name: branch.name,
      latitude: branch.latitude || '',
      longitude: branch.longitude || '',
      radiusMeters: branch.radiusMeters || 200,
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

  return (
    <div>
      <h2 className="text-2xl font-heading font-bold text-gray-900 mb-6">지점 설정 (GPS)</h2>

      <div className="space-y-4">
        {branches.map((b) => (
          <Card key={b.id} accent="blue" className="p-6">
            {editing === b.id ? (
              <div className="space-y-4">
                <div className="text-lg font-bold text-gray-900 mb-2">{b.name} 수정</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <div className="text-lg font-bold text-gray-900">{b.name}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {b.latitude && b.longitude
                      ? `위도 ${b.latitude} · 경도 ${b.longitude} · 반경 ${b.radiusMeters || 200}m`
                      : 'GPS 좌표 미설정'}
                  </div>
                  {saved === b.id && (
                    <span className="text-xs text-green-600 font-medium">저장 완료</span>
                  )}
                </div>
                <Button size="sm" variant="ghost" onClick={() => startEdit(b)}>수정</Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

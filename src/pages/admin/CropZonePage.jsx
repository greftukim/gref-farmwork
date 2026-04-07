import { useState } from 'react';
import useCropStore from '../../stores/cropStore';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';

const defaultTaskTypes = ['수확', '유인·결속', '적엽', '병해충 예찰', 'EC/pH 측정', '수분 작업', '러너 정리'];

export default function CropZonePage() {
  const crops = useCropStore((s) => s.crops);
  const addCrop = useCropStore((s) => s.addCrop);
  const updateCrop = useCropStore((s) => s.updateCrop);
  const toggleActive = useCropStore((s) => s.toggleActive);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({ name: '', taskTypes: [] });

  const openAdd = () => {
    setEditTarget(null);
    setForm({ name: '', taskTypes: [] });
    setShowModal(true);
  };

  const openEdit = (crop) => {
    setEditTarget(crop);
    setForm({ name: crop.name, taskTypes: [...crop.taskTypes] });
    setShowModal(true);
  };

  const toggleTaskType = (type) => {
    setForm((f) => ({
      ...f,
      taskTypes: f.taskTypes.includes(type)
        ? f.taskTypes.filter((t) => t !== type)
        : [...f.taskTypes, type],
    }));
  };

  const handleSave = () => {
    if (!form.name.trim() || form.taskTypes.length === 0) return;
    if (editTarget) {
      updateCrop(editTarget.id, form);
    } else {
      addCrop(form);
    }
    setShowModal(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-heading font-semibold text-gray-900">작물 관리</h2>
        <Button size="sm" onClick={openAdd}>+ 작물 추가</Button>
      </div>

      <div className="space-y-3">
        {crops.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-12">등록된 작물이 없습니다</p>
        )}
        {crops.map((crop) => (
          <Card key={crop.id} accent={crop.isActive ? 'emerald' : 'gray'} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{crop.name}</span>
                {!crop.isActive && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">비활성</span>
                )}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(crop)}>수정</Button>
                <Button size="sm" variant="ghost" onClick={() => toggleActive(crop.id)}>
                  {crop.isActive ? '비활성' : '활성'}
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {crop.taskTypes.map((t) => (
                <span key={t} className="px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700">{t}</span>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editTarget ? '작물 수정' : '작물 추가'}>
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">작물명</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
            placeholder="작물 이름"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">작업 유형</label>
          <div className="flex flex-wrap gap-2">
            {defaultTaskTypes.map((t) => (
              <button
                key={t}
                onClick={() => toggleTaskType(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium min-h-[36px] transition-colors ${
                  form.taskTypes.includes(t) ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={handleSave}>{editTarget ? '수정' : '추가'}</Button>
          <Button className="flex-1" variant="secondary" onClick={() => setShowModal(false)}>취소</Button>
        </div>
      </Modal>
    </div>
  );
}

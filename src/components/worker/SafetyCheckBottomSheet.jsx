import { useEffect, useState } from 'react';
import BottomSheet from '../common/BottomSheet';
import Button from '../common/Button';
import useSafetyCheckStore from '../../stores/safetyCheckStore';

export default function SafetyCheckBottomSheet({
  isOpen,
  onClose,
  onComplete,
  workerId,
  checkType,
}) {
  const items = useSafetyCheckStore((s) => s.items);
  const fetchItems = useSafetyCheckStore((s) => s.fetchItems);
  const saveCheck = useSafetyCheckStore((s) => s.saveCheck);
  const [checked, setChecked] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchItems().catch((e) => console.error('안전점검 항목 로드 실패:', e));
      setChecked({});
    }
  }, [isOpen, fetchItems]);

  const allChecked = items.length > 0 && items.every((i) => checked[i.id]);

  const handleToggle = (itemId) => {
    setChecked((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleSave = async () => {
    if (!allChecked || saving) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const results = items.map((i) => ({ itemId: i.id, checked: true }));
      await saveCheck(workerId, today, checkType, results);
      onComplete();
    } catch (e) {
      console.error(e);
      alert('저장 실패: ' + (e.message || '알 수 없는 오류'));
    } finally {
      setSaving(false);
    }
  };

  const title = checkType === 'pre_work' ? '작업 전 안전점검 (TBM)' : '작업 후 안전점검 (TBM)';

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          아래 항목을 모두 확인하고 체크해주세요. 전부 체크해야 진행됩니다.
        </p>
        <div className="space-y-2">
          {items.map((item) => (
            <label
              key={item.id}
              className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer active:bg-gray-100 transition-colors"
            >
              <input
                type="checkbox"
                checked={!!checked[item.id]}
                onChange={() => handleToggle(item.id)}
                className="mt-1 w-5 h-5 min-w-[20px] accent-emerald-600"
              />
              <span className="text-sm flex-1">
                <span className="font-semibold">{item.itemNo}.</span> {item.label}
              </span>
            </label>
          ))}
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1" disabled={saving}>
            취소
          </Button>
          <Button
            onClick={handleSave}
            disabled={!allChecked || saving}
            className="flex-1"
          >
            {saving ? '저장 중...' : '확인 및 진행'}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}

import { useEffect, useState } from 'react';
import BottomSheet from '../common/BottomSheet';
import Button from '../common/Button';
import useSafetyCheckStore from '../../stores/safetyCheckStore';

export default function SafetyCheckBottomSheet({
  isOpen,
  onClose,
  onComplete,
  onPreTaskComplete,
  workerId,
  checkType,
  cropId,
  taskIds,
  taskTitles,
}) {
  const items = useSafetyCheckStore((s) => s.items);
  const fetchItems = useSafetyCheckStore((s) => s.fetchItems);
  const saveCheck = useSafetyCheckStore((s) => s.saveCheck);
  const savePreTaskCheck = useSafetyCheckStore((s) => s.savePreTaskCheck);
  const fetchRiskTemplates = useSafetyCheckStore((s) => s.fetchRiskTemplates);
  const confirmRisks = useSafetyCheckStore((s) => s.confirmRisks);

  const [checked, setChecked] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [risks, setRisks] = useState([]);
  const [checkId, setCheckId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchItems().catch((e) => console.error('안전점검 항목 로드 실패:', e));
      setChecked({});
      setStep(1);
      setRisks([]);
      setCheckId(null);
      setSubmitting(false);
    }
  }, [isOpen, fetchItems]);

  useEffect(() => {
    if (isOpen && checkType === 'pre_task') {
      if (!onPreTaskComplete) console.error('onPreTaskComplete prop 필수');
      if (!taskIds) console.error('taskIds prop 필수');
      if (!taskTitles) console.error('taskTitles prop 필수');
      if (!cropId) console.error('cropId prop 필수');
    }
  }, [isOpen, checkType, onPreTaskComplete, taskIds, taskTitles, cropId]);

  const allChecked = items.length > 0 && items.every((i) => checked[i.id]);

  const handleToggle = (itemId) => {
    setChecked((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleSubmitStep1 = async () => {
    if (!allChecked || submitting) return;
    setSubmitting(true);
    try {
      const itemResults = items.map((it) => ({
        itemId: it.id,
        checked: !!checked[it.id],
      }));
      if (checkType === 'pre_task') {
        const matched = await fetchRiskTemplates(cropId, taskTitles, workerId);
        const newCheckId = await savePreTaskCheck(workerId, taskIds, itemResults);
        setCheckId(newCheckId);
        setRisks(matched);
        setStep(2);
      } else {
        const today = new Date().toISOString().slice(0, 10);
        await saveCheck(workerId, today, checkType, itemResults);
        onComplete();
      }
    } catch (e) {
      alert('저장 실패: ' + (e.message || '알 수 없는 오류'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmRisks = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const snapshot = risks.map((r) => ({
        risk_factor: r.riskFactor,
        mitigation: r.mitigation,
      }));
      await confirmRisks(checkId, snapshot);
      onPreTaskComplete(checkId);
    } catch (e) {
      alert('위험 확인 저장 실패: ' + (e.message || '알 수 없는 오류'));
      setSubmitting(false);
    }
  };

  const title =
    checkType === 'pre_task'
      ? step === 1
        ? '작업 전 안전점검'
        : '위험 요인 확인'
      : checkType === 'pre_work'
        ? '작업 전 안전점검 (TBM)'
        : '작업 후 안전점검 (TBM)';

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
      {step === 1 ? (
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
            <Button variant="secondary" onClick={onClose} className="flex-1" disabled={submitting}>
              취소
            </Button>
            <Button
              onClick={handleSubmitStep1}
              disabled={!allChecked || submitting}
              className="flex-1"
            >
              {submitting ? '저장 중...' : '확인 및 진행'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {risks.length === 0 ? (
            <p className="text-gray-500 text-sm">매칭된 위험 요인이 없습니다. 일반 안전수칙을 준수하세요.</p>
          ) : (
            risks.map((r, i) => (
              <div key={i} className="border border-amber-200 bg-amber-50 rounded-lg p-3">
                <div className="font-bold text-amber-900 mb-1">⚠️ {r.riskFactor}</div>
                <div className="text-sm text-gray-700">{r.mitigation}</div>
              </div>
            ))
          )}
          <Button className="w-full" onClick={handleConfirmRisks} disabled={submitting}>
            {submitting ? '저장 중...' : '확인했습니다'}
          </Button>
        </div>
      )}
    </BottomSheet>
  );
}

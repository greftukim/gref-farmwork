import { useState, useEffect } from 'react';
import useAuthStore from '../../stores/authStore';
import useSafetyCheckStore from '../../stores/safetyCheckStore';
import { isTeamLeader } from '../../lib/permissions';
import Card from '../common/Card';

function formatHHMM(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function TeamLeaderApprovalCard() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const getPendingChecksForApproval = useSafetyCheckStore((s) => s.getPendingChecksForApproval);
  const approveChecks = useSafetyCheckStore((s) => s.approveChecks);

  const [expanded, setExpanded] = useState(false);
  const [pendingChecks, setPendingChecks] = useState([]);
  const [excludedIds, setExcludedIds] = useState(new Set());
  const [fetched, setFetched] = useState(false);   // 뱃지 표시 여부 제어
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const teamLeader = isTeamLeader(currentUser);

  // 내부 fetch 함수 (취소 플래그 포함)
  const doFetch = async (onResult, onError, onDone) => {
    try {
      const result = await getPendingChecksForApproval(currentUser.branch);
      onResult(result);
    } catch (e) {
      onError(e.message || '불러오기 실패');
    } finally {
      onDone();
    }
  };

  // 마운트 시 1회 fetch — 뱃지 건수 표시용
  useEffect(() => {
    if (!teamLeader) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    doFetch(
      (result) => { if (!cancelled) { setPendingChecks([...result]); setFetched(true); } },
      (msg)    => { if (!cancelled) setError(msg); },
      ()       => { if (!cancelled) setLoading(false); }
    );
    return () => { cancelled = true; };
  }, [currentUser?.id]);

  // 펼칠 때마다 재fetch — 최신 목록 유지
  useEffect(() => {
    if (!expanded || !teamLeader || !fetched) return;  // fetched 전 이중 호출 방지
    let cancelled = false;
    setLoading(true);
    setError(null);
    doFetch(
      (result) => { if (!cancelled) { setPendingChecks([...result]); setExcludedIds(new Set()); } },
      (msg)    => { if (!cancelled) setError(msg); },
      ()       => { if (!cancelled) setLoading(false); }
    );
    return () => { cancelled = true; };
  }, [expanded]);

  // 반장이 아니면 렌더 차단 (hooks 완료 후)
  if (!teamLeader) return null;

  const visibleCount = pendingChecks.length - excludedIds.size;

  const grouped = Object.values(
    pendingChecks.reduce((acc, check) => {
      const key = check.workerId;
      if (!acc[key]) acc[key] = { workerName: check.worker?.name || '알 수 없음', checks: [] };
      acc[key].checks.push(check);
      return acc;
    }, {})
  ).sort((a, b) => a.workerName.localeCompare(b.workerName, 'ko'));

  const notExcludedIds = pendingChecks.filter((c) => !excludedIds.has(c.id)).map((c) => c.id);

  const handleToggle = () => {
    if (loading) return;
    setExpanded((prev) => !prev);
  };

  const handleExclude = (id) => {
    setExcludedIds((prev) => new Set([...prev, id]));
  };

  const handleApproveAll = async () => {
    if (notExcludedIds.length === 0) return;
    const confirmed = window.confirm(`${notExcludedIds.length}건의 TBM을 승인하시겠습니까?`);
    if (!confirmed) return;
    setSubmitting(true);
    setError(null);
    try {
      await approveChecks(notExcludedIds, currentUser.id);
      const result = await getPendingChecksForApproval(currentUser.branch);
      setPendingChecks([...result]);
      setExcludedIds(new Set());
      alert('TBM 승인이 완료되었습니다.');
    } catch (e) {
      setError(e.message || '승인 실패');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card accent="amber" className="mb-4 overflow-hidden">
      {/* 헤더 — 항상 표시 */}
      <button
        onClick={handleToggle}
        disabled={loading}
        className="w-full flex items-center justify-between px-5 py-4 text-left active:bg-amber-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">🛡️</span>
          <span className="text-sm font-semibold text-amber-900">TBM 승인 대기</span>
          {loading && (
            <span className="ml-1 text-xs text-amber-500">불러오는 중...</span>
          )}
          {!loading && fetched && (
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
              {visibleCount}건
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-amber-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 본문 — 펼친 상태에서만 */}
      {expanded && (
        <div className="border-t border-amber-100">
          {/* 에러 */}
          {error && (
            <div className="mx-4 mt-3 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => { setError(null); setExpanded(false); setTimeout(() => setExpanded(true), 0); }}
                className="ml-3 text-xs underline shrink-0"
              >
                재시도
              </button>
            </div>
          )}

          {/* 로딩 스켈레톤 */}
          {loading && (
            <div className="px-4 py-4 space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-amber-50 animate-pulse" />
              ))}
            </div>
          )}

          {/* 빈 상태 */}
          {!loading && !error && pendingChecks.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              승인 대기 중인 TBM이 없습니다
            </div>
          )}

          {/* 목록 */}
          {!loading && grouped.length > 0 && (
            <div className="px-4 py-3 space-y-2">
              {grouped.map(({ workerName, checks }) =>
                checks.map((check) => {
                  if (excludedIds.has(check.id)) return null;
                  const riskCount = check.shownRisks?.length || 0;
                  return (
                    <div
                      key={check.id}
                      className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-amber-100 hover:bg-amber-50 transition-colors"
                    >
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{workerName}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          위험 {riskCount}건 확인 · {formatHHMM(check.completedAt)} 제출
                        </div>
                      </div>
                      <button
                        onClick={() => handleExclude(check.id)}
                        className="ml-3 w-7 h-7 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-xs shrink-0 hover:bg-red-100 hover:text-red-500 transition-colors active:scale-95"
                        title="제외"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* 전부 제외된 경우 */}
          {!loading && !error && pendingChecks.length > 0 && notExcludedIds.length === 0 && (
            <div className="px-4 pb-4 text-center text-sm text-gray-400 py-3">
              모든 항목을 제외했습니다
            </div>
          )}

          {/* 전체 승인 액션 바 */}
          {!loading && notExcludedIds.length > 0 && (
            <div className="px-4 pb-4">
              <button
                onClick={handleApproveAll}
                disabled={submitting}
                className="w-full py-3.5 rounded-2xl text-sm font-bold bg-amber-600 text-white active:scale-[0.98] transition-transform disabled:opacity-60"
              >
                {submitting ? '승인 중...' : `전체 승인 (${notExcludedIds.length}건)`}
              </button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

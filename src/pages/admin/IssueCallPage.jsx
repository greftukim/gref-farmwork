import { useState, useMemo } from 'react';
import useIssueStore from '../../stores/issueStore';
import useCallStore from '../../stores/callStore';
import useEmployeeStore from '../../stores/employeeStore';
import useAuthStore from '../../stores/authStore';
import useZoneStore from '../../stores/zoneStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

export default function IssueCallPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const issues = useIssueStore((s) => s.issues);
  const resolveIssue = useIssueStore((s) => s.resolveIssue);
  const calls = useCallStore((s) => s.calls);
  const confirmCall = useCallStore((s) => s.confirmCall);
  const employees = useEmployeeStore((s) => s.employees);
  const zones = useZoneStore((s) => s.zones);
  const [tab, setTab] = useState('issues');

  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);
  const zoneMap = useMemo(() => Object.fromEntries(zones.map((z) => [z.id, z])), [zones]);

  const sortedIssues = useMemo(
    () => [...issues].sort((a, b) => {
      if (!a.isResolved && b.isResolved) return -1;
      if (a.isResolved && !b.isResolved) return 1;
      return b.createdAt.localeCompare(a.createdAt);
    }),
    [issues]
  );

  const sortedCalls = useMemo(
    () => [...calls].sort((a, b) => {
      if (!a.isConfirmed && b.isConfirmed) return -1;
      if (a.isConfirmed && !b.isConfirmed) return 1;
      return b.createdAt.localeCompare(a.createdAt);
    }),
    [calls]
  );

  const unresolvedIssues = issues.filter((i) => !i.isResolved).length;
  const unconfirmedCalls = calls.filter((c) => !c.isConfirmed).length;

  return (
    <div>
      <h2 className="text-xl font-heading font-semibold text-gray-900 mb-6">신고·호출 관리</h2>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('issues')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium min-h-[36px] transition-colors ${
            tab === 'issues' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}>
          이상 신고 {unresolvedIssues > 0 && <span className="ml-1 bg-red-500 text-white rounded-full px-1.5 text-xs">{unresolvedIssues}</span>}
        </button>
        <button onClick={() => setTab('calls')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium min-h-[36px] transition-colors ${
            tab === 'calls' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}>
          긴급 호출 {unconfirmedCalls > 0 && <span className="ml-1 bg-red-500 text-white rounded-full px-1.5 text-xs">{unconfirmedCalls}</span>}
        </button>
      </div>

      {tab === 'issues' && (
        <div className="space-y-3">
          {sortedIssues.map((issue) => (
            <Card key={issue.id} accent={issue.isResolved ? 'blue' : 'red'} className="p-4">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span className="font-medium text-gray-900">{empMap[issue.workerId]?.name}</span>
                  <span className="text-sm text-gray-400 ml-2">{zoneMap[issue.zoneId]?.name} · {issue.type}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  issue.isResolved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {issue.isResolved ? '처리완료' : '미처리'}
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-2">{issue.comment}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{new Date(issue.createdAt).toLocaleDateString('ko-KR')}</span>
                {!issue.isResolved && (
                  <Button size="sm" onClick={() => resolveIssue(issue.id, currentUser.id)}>처리 완료</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'calls' && (
        <div className="space-y-3">
          {sortedCalls.map((call) => (
            <Card key={call.id} accent={call.isConfirmed ? 'blue' : 'red'} className="p-4">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span className="font-medium text-gray-900">{empMap[call.workerId]?.name}</span>
                  <span className="text-sm text-gray-400 ml-2">{call.type}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  call.isConfirmed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {call.isConfirmed ? '확인됨' : '대기 중'}
                </span>
              </div>
              {call.memo && <p className="text-sm text-gray-500 mb-2">{call.memo}</p>}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{new Date(call.createdAt).toLocaleDateString('ko-KR')}</span>
                {!call.isConfirmed && (
                  <Button size="sm" onClick={() => confirmCall(call.id)}>확인 처리</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

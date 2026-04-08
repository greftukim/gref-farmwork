import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import useAttendanceStore from '../../stores/attendanceStore';
import useEmployeeStore from '../../stores/employeeStore';
import useAuthStore from '../../stores/authStore';
import useBranchStore from '../../stores/branchStore';
import Card from '../../components/common/Card';
import { isFarmAdmin } from '../../lib/permissions';
import Button from '../../components/common/Button';
import { downloadAttendanceExcel } from '../../lib/excelExport';

const COLORS = ['#059669', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function WorkStatsPage() {
  const attendance = useAttendanceStore((s) => s.records);
  const employees = useEmployeeStore((s) => s.employees);
  const currentUser = useAuthStore((s) => s.currentUser);
  const branches = useBranchStore((s) => s.branches);

  const [downloading, setDownloading] = useState(false);

  // 엑셀 다운로드 월 선택 (기본: 이번 달)
  const now = new Date();
  const [excelYear, setExcelYear] = useState(now.getFullYear());
  const [excelMonth, setExcelMonth] = useState(now.getMonth() + 1);
  const [excelBranch, setExcelBranch] = useState('all');

  const workers = useMemo(() => employees.filter((e) => e.role === 'worker' && e.isActive), [employees]);

  const isFarmTeam = isFarmAdmin(currentUser);
  const branchNameMap = useMemo(
    () => Object.fromEntries(branches.map((b) => [b.code, b.name])),
    [branches]
  );

  // 작업자별 일별 근무시간
  const hoursByWorker = useMemo(() => {
    const dates = [...new Set(attendance.map((r) => r.date))].sort();
    return dates.map((date) => {
      const row = { date: date.slice(5).replace('-', '/') };
      workers.forEach((w) => {
        const rec = attendance.find((r) => r.employeeId === w.id && r.date === date);
        row[w.name] = rec?.workMinutes ? Math.round(rec.workMinutes / 60 * 10) / 10 : 0;
      });
      return row;
    });
  }, [attendance, workers]);

  // 작업자별 총 근무시간 요약
  const hoursSummary = useMemo(() => {
    return workers.map((w) => {
      const recs = attendance.filter((r) => r.employeeId === w.id && r.workMinutes);
      const totalMin = recs.reduce((s, r) => s + r.workMinutes, 0);
      const days = recs.length;
      return {
        name: w.name,
        totalHours: Math.round(totalMin / 60 * 10) / 10,
        days,
        avgHours: days > 0 ? Math.round(totalMin / days / 60 * 10) / 10 : 0,
      };
    });
  }, [attendance, workers]);

  const handleExcelDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      let branchCodes = [];
      if (isFarmTeam) {
        branchCodes = [currentUser.branch];
      } else if (excelBranch === 'all') {
        branchCodes = branches.map((b) => b.code);
      } else {
        branchCodes = [excelBranch];
      }

      await downloadAttendanceExcel({
        year: excelYear,
        month: excelMonth,
        branches: branchCodes,
        branchNameMap,
        currentUser,
      });
    } catch (e) {
      console.error('엑셀 다운로드 실패:', e);
      alert('엑셀 다운로드에 실패했습니다.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-heading font-semibold text-gray-900 mb-6">근무 시간 통계</h2>

      {/* 엑셀 다운로드 영역 */}
      <Card accent="gray" className="p-4 mb-6">
        <div className="text-sm font-semibold text-gray-700 mb-3">월별 근태기록부 다운로드</div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">연도</label>
            <select
              value={excelYear}
              onChange={(e) => setExcelYear(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[40px]"
            >
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">월</label>
            <select
              value={excelMonth}
              onChange={(e) => setExcelMonth(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[40px]"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{m}월</option>
              ))}
            </select>
          </div>
          {!isFarmTeam && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">지점</label>
              <select
                value={excelBranch}
                onChange={(e) => setExcelBranch(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[40px]"
              >
                <option value="all">전체 지점</option>
                {branches.map((b) => (
                  <option key={b.code} value={b.code}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
          <Button onClick={handleExcelDownload} disabled={downloading}>
            {downloading ? '생성 중...' : '엑셀 다운로드'}
          </Button>
        </div>
      </Card>

      <div className="space-y-6">
        <Card accent="blue" className="p-5">
          <h3 className="text-sm font-semibold text-gray-500 mb-4">일별 근무 시간 (시간)</h3>
          <div className="h-72">
            {hoursByWorker.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-12">출퇴근 데이터가 없습니다</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hoursByWorker}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  {workers.map((w, i) => (
                    <Bar key={w.id} dataKey={w.name} fill={COLORS[i % COLORS.length]} radius={[2, 2, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* 모바일 카드 뷰 */}
        <div className="md:hidden space-y-3">
          {hoursSummary.length === 0 ? (
            <p className="text-center text-gray-400 py-8">데이터 없음</p>
          ) : (
            hoursSummary.map((s) => (
              <Card key={s.name} accent="gray" className="p-4">
                <div className="font-semibold text-gray-900 mb-3">{s.name}</div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-xs text-gray-400 mb-0.5">출근일</div>
                    <div className="font-bold text-gray-900">{s.days}일</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-0.5">총 근무</div>
                    <div className="font-bold text-gray-900">{s.totalHours}시간</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-0.5">일평균</div>
                    <div className="font-bold text-gray-900">{s.avgHours}시간</div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* 데스크탑 테이블 뷰 */}
        <Card accent="gray" className="hidden md:block overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">작업자</th>
                  <th className="px-4 py-3 font-medium">출근일</th>
                  <th className="px-4 py-3 font-medium">총 근무</th>
                  <th className="px-4 py-3 font-medium">일평균</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {hoursSummary.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400">데이터 없음</td>
                  </tr>
                ) : (
                  hoursSummary.map((s) => (
                    <tr key={s.name}>
                      <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                      <td className="px-4 py-3 text-gray-600">{s.days}일</td>
                      <td className="px-4 py-3 text-gray-600">{s.totalHours}시간</td>
                      <td className="px-4 py-3 text-gray-600">{s.avgHours}시간</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

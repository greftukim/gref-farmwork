import { useEffect } from 'react';
import useEmployeeStore from '../stores/employeeStore';
import useAttendanceStore from '../stores/attendanceStore';
import useLeaveStore from '../stores/leaveStore';
import useScheduleStore from '../stores/scheduleStore';
import useCropStore from '../stores/cropStore';
import useZoneStore from '../stores/zoneStore';
import useTaskStore from '../stores/taskStore';
import useGrowthSurveyStore from '../stores/growthSurveyStore';
import useIssueStore from '../stores/issueStore';
import useCallStore from '../stores/callStore';
import useNoticeStore from '../stores/noticeStore';

export default function useDataLoader() {
  const fetchEmployees = useEmployeeStore((s) => s.fetchEmployees);
  const fetchRecords = useAttendanceStore((s) => s.fetchRecords);
  const fetchRequests = useLeaveStore((s) => s.fetchRequests);
  const fetchBalances = useLeaveStore((s) => s.fetchBalances);
  const fetchSchedules = useScheduleStore((s) => s.fetchSchedules);
  const fetchCrops = useCropStore((s) => s.fetchCrops);
  const fetchZones = useZoneStore((s) => s.fetchZones);
  const fetchTasks = useTaskStore((s) => s.fetchTasks);
  const fetchSurveys = useGrowthSurveyStore((s) => s.fetchSurveys);
  const fetchIssues = useIssueStore((s) => s.fetchIssues);
  const fetchCalls = useCallStore((s) => s.fetchCalls);
  const fetchNotices = useNoticeStore((s) => s.fetchNotices);

  useEffect(() => {
    fetchEmployees();
    fetchRecords();
    fetchRequests();
    fetchBalances();
    fetchSchedules();
    fetchCrops();
    fetchZones();
    fetchTasks();
    fetchSurveys();
    fetchIssues();
    fetchCalls();
    fetchNotices();
  }, []);
}

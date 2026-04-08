import ExcelJS from 'exceljs';
import { supabase } from './supabase';

// ─── 유틸 함수 ──────────────────────────────────────────

function toMinutes(timeStr) {
  if (!timeStr) return null;
  // ISO 문자열인 경우 → HH:MM 추출
  if (timeStr.includes('T') || timeStr.length > 8) {
    const d = new Date(timeStr);
    return d.getHours() * 60 + d.getMinutes();
  }
  // HH:MM 형식
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

function formatHM(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return '';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

function formatHHMM(isoOrTime) {
  if (!isoOrTime) return '';
  if (isoOrTime.includes('T') || isoOrTime.length > 8) {
    const d = new Date(isoOrTime);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  return isoOrTime.slice(0, 5);
}

function getMonthDays(year, month) {
  const days = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return days;
}

function roleLabel(role) {
  if (role === 'worker') return '작업자';
  if (role === 'admin') return '관리자';
  return role || '';
}

// ─── 근무시간 계산 ──────────────────────────────────────

function calculateWork(checkIn, checkOut, workStartTime, workEndTime, overtime) {
  const ciMin = toMinutes(checkIn);
  const coMin = toMinutes(checkOut);
  const wsMin = toMinutes(workStartTime);
  const weMin = toMinutes(workEndTime);

  if (ciMin == null || coMin == null) return { workMinutes: 0, overtimeMinutes: 0, lateMinutes: 0, earlyMinutes: 0 };

  const startMin = wsMin != null ? Math.max(ciMin, wsMin) : ciMin;
  let workMinutes = coMin - startMin - 60; // 휴게 1시간 차감
  if (workMinutes < 0) workMinutes = 0;

  // 지각
  let lateMinutes = 0;
  if (wsMin != null && ciMin > wsMin) {
    lateMinutes = ciMin - wsMin;
  }

  // 조퇴
  let earlyMinutes = 0;
  if (weMin != null && coMin < weMin) {
    earlyMinutes = weMin - coMin;
  }

  // 연장근무
  let overtimeMinutes = 0;
  if (overtime && weMin != null) {
    const requestedMin = overtime.hours * 60 + overtime.minutes;
    overtimeMinutes = Math.max(0, Math.min(coMin, weMin + requestedMin) - weMin);
    workMinutes += overtimeMinutes;
  }

  return { workMinutes, overtimeMinutes, lateMinutes, earlyMinutes };
}

// ─── 스타일 상수 ────────────────────────────────────────

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
const LATE_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
const LEAVE_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
const EMPTY_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
const THIN_BORDER = {
  top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
  bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
  left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
  right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
};

const COLUMNS = [
  { header: '근무일', key: 'date', width: 12 },
  { header: '부서', key: 'dept', width: 10 },
  { header: '성명', key: 'name', width: 10 },
  { header: '호칭', key: 'title', width: 10 },
  { header: '출근', key: 'checkIn', width: 8 },
  { header: '퇴근', key: 'checkOut', width: 8 },
  { header: '지각', key: 'late', width: 8 },
  { header: '조퇴', key: 'early', width: 8 },
  { header: '근태미등록', key: 'noRecord', width: 12 },
  { header: '근무시간', key: 'workTime', width: 10 },
  { header: '연장시간', key: 'overtime', width: 10 },
  { header: '근태유형', key: 'leaveType', width: 10 },
  { header: '근태내용', key: 'leaveReason', width: 16 },
  { header: '상태', key: 'status', width: 8 },
  { header: '누적연장시간', key: 'cumOvertime', width: 12 },
  { header: '누적근무시간', key: 'cumWork', width: 12 },
];

// ─── 데이터 fetch ───────────────────────────────────────

async function fetchExcelData(year, month, branchCodes) {
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  // 1. 작업자 목록
  let empQuery = supabase
    .from('employees')
    .select('id, name, branch, role, job_type, work_start_time, work_end_time, is_active')
    .eq('role', 'worker')
    .order('name', { ascending: true });
  if (branchCodes.length > 0) {
    empQuery = empQuery.in('branch', branchCodes);
  }
  const { data: empData } = await empQuery;
  const employees = (empData || []).filter((e) => e.is_active !== false);
  const empIds = employees.map((e) => e.id);
  if (empIds.length === 0) return { employees: [], attendance: [], leaves: [], overtimes: [] };

  // 2. 출퇴근 기록
  const { data: attData } = await supabase
    .from('attendance')
    .select('employee_id, date, check_in, check_out')
    .gte('date', monthStart)
    .lte('date', monthEnd)
    .in('employee_id', empIds);

  // 3. 승인된 휴가
  const { data: leaveData } = await supabase
    .from('leave_requests')
    .select('employee_id, date, type, reason')
    .eq('status', 'approved')
    .gte('date', monthStart)
    .lte('date', monthEnd)
    .in('employee_id', empIds);

  // 4. 승인된 연장근무
  const { data: otData } = await supabase
    .from('overtime_requests')
    .select('employee_id, date, hours, minutes')
    .eq('status', 'approved')
    .gte('date', monthStart)
    .lte('date', monthEnd)
    .in('employee_id', empIds);

  return {
    employees,
    attendance: attData || [],
    leaves: leaveData || [],
    overtimes: otData || [],
  };
}

// ─── 시트 생성 ──────────────────────────────────────────

function buildSheet(workbook, sheetName, employees, monthDays, attendance, leaves, overtimes, branchNameMap) {
  const ws = workbook.addWorksheet(sheetName);
  ws.columns = COLUMNS;

  // 헤더 스타일
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, size: 10 };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 24;
  COLUMNS.forEach((_, ci) => {
    const cell = headerRow.getCell(ci + 1);
    cell.fill = HEADER_FILL;
    cell.border = THIN_BORDER;
  });

  // 인덱스 맵 생성
  const attMap = {};
  attendance.forEach((a) => {
    attMap[`${a.employee_id}_${a.date}`] = a;
  });
  const leaveMap = {};
  leaves.forEach((l) => {
    leaveMap[`${l.employee_id}_${l.date}`] = l;
  });
  const otMap = {};
  overtimes.forEach((o) => {
    otMap[`${o.employee_id}_${o.date}`] = o;
  });

  // 휴가 유형별 처리
  const LEAVE_WORK = { '연차': 0, '오전반차': 240, '오후반차': 240, '출장': 480, '대휴': 0 };

  employees.forEach((emp) => {
    let cumWork = 0;
    let cumOvertime = 0;
    const branchName = branchNameMap[emp.branch] || emp.branch || '';

    monthDays.forEach((date) => {
      const key = `${emp.id}_${date}`;
      const att = attMap[key];
      const leave = leaveMap[key];
      const ot = otMap[key];

      const row = {
        date,
        dept: branchName,
        name: emp.name,
        title: roleLabel(emp.role),
        checkIn: '',
        checkOut: '',
        late: '',
        early: '',
        noRecord: '',
        workTime: '',
        overtime: '',
        leaveType: '',
        leaveReason: '',
        status: '확정',
        cumOvertime: '',
        cumWork: '',
      };

      let dayWork = 0;
      let dayOvertime = 0;
      let isLate = false;
      let isLeaveDay = false;
      let isNoRecord = false;

      if (leave) {
        isLeaveDay = true;
        row.leaveType = leave.type;
        row.leaveReason = leave.reason || '';
        const fixedMin = LEAVE_WORK[leave.type] ?? 0;

        if (leave.type === '오전반차') {
          row.checkIn = '(오전반차)';
          row.checkOut = att?.check_out ? formatHHMM(att.check_out) : '';
          dayWork = fixedMin;
        } else if (leave.type === '오후반차') {
          row.checkIn = att?.check_in ? formatHHMM(att.check_in) : '';
          row.checkOut = '(오후반차)';
          dayWork = fixedMin;
        } else {
          // 연차, 출장, 대휴
          dayWork = fixedMin;
        }
        row.workTime = fixedMin > 0 ? formatHM(fixedMin) : '';
      } else if (att) {
        row.checkIn = formatHHMM(att.check_in);
        row.checkOut = formatHHMM(att.check_out);

        if (!att.check_in || !att.check_out) {
          row.noRecord = '근태미등록';
          isNoRecord = true;
        } else {
          const calc = calculateWork(att.check_in, att.check_out, emp.work_start_time, emp.work_end_time, ot);
          dayWork = calc.workMinutes;
          dayOvertime = calc.overtimeMinutes;
          if (calc.lateMinutes > 0) {
            row.late = formatHM(calc.lateMinutes);
            isLate = true;
          }
          if (calc.earlyMinutes > 0) {
            row.early = formatHM(calc.earlyMinutes);
          }
          row.workTime = formatHM(dayWork);
          row.overtime = formatHM(dayOvertime);
        }
      } else {
        row.noRecord = '근태미등록';
        isNoRecord = true;
      }

      cumWork += dayWork;
      cumOvertime += dayOvertime;
      row.cumOvertime = formatHM(cumOvertime);
      row.cumWork = formatHM(cumWork);

      const wsRow = ws.addRow(row);
      wsRow.font = { size: 10 };
      wsRow.alignment = { vertical: 'middle' };

      // 셀 테두리 + 조건부 배경
      COLUMNS.forEach((_, ci) => {
        const cell = wsRow.getCell(ci + 1);
        cell.border = THIN_BORDER;
        if (isLeaveDay) cell.fill = LEAVE_FILL;
        else if (isNoRecord) cell.fill = EMPTY_FILL;
      });
      if (isLate) {
        wsRow.getCell(7).fill = LATE_FILL; // G열 = 지각
      }
    });
  });
}

// ─── 메인 export 함수 ───────────────────────────────────

export async function downloadAttendanceExcel({ year, month, branches, branchNameMap, currentUser }) {
  // 권한별 지점 결정
  let branchCodes = [];
  if (currentUser.team === 'farm') {
    branchCodes = [currentUser.branch];
  } else if (branches && branches.length > 0) {
    branchCodes = branches;
  }

  const { employees, attendance, leaves, overtimes } = await fetchExcelData(year, month, branchCodes);
  if (employees.length === 0) {
    alert('해당 월에 데이터가 없습니다.');
    return;
  }

  const monthDays = getMonthDays(year, month);
  const workbook = new ExcelJS.Workbook();

  // 지점별 그룹핑
  const empByBranch = {};
  employees.forEach((e) => {
    const bc = e.branch || 'unknown';
    if (!empByBranch[bc]) empByBranch[bc] = [];
    empByBranch[bc].push(e);
  });

  const branchKeys = Object.keys(empByBranch).sort();

  if (branchKeys.length === 1) {
    // 단일 시트
    const bc = branchKeys[0];
    const sName = branchNameMap[bc] || bc;
    buildSheet(workbook, sName, empByBranch[bc], monthDays, attendance, leaves, overtimes, branchNameMap);
  } else {
    // 지점별 시트 분리
    branchKeys.forEach((bc) => {
      const sName = branchNameMap[bc] || bc;
      const branchEmps = empByBranch[bc];
      const branchAttendance = attendance.filter((a) => branchEmps.some((e) => e.id === a.employee_id));
      const branchLeaves = leaves.filter((l) => branchEmps.some((e) => e.id === l.employee_id));
      const branchOvertimes = overtimes.filter((o) => branchEmps.some((e) => e.id === o.employee_id));
      buildSheet(workbook, sName, branchEmps, monthDays, branchAttendance, branchLeaves, branchOvertimes, branchNameMap);
    });
  }

  // 파일 다운로드
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.document',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `근태현황_${month}월.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

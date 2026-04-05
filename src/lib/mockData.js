export const mockEmployees = [
  {
    id: 'emp-001',
    name: '관리자',
    empNo: 'A001',
    phone: '010-1234-0000',
    role: 'admin',
    jobType: '관리',
    hireDate: '2024-01-15',
    workHoursPerWeek: 40,
    annualLeaveDays: 15,
    pinCode: '000000',
    isActive: true,
  },
  {
    id: 'emp-002',
    name: '김민국',
    empNo: 'W001',
    phone: '010-1234-1111',
    role: 'worker',
    jobType: '재배',
    hireDate: '2024-03-01',
    workHoursPerWeek: 40,
    annualLeaveDays: 15,
    pinCode: '111111',
    isActive: true,
  },
  {
    id: 'emp-003',
    name: '이강모',
    empNo: 'W002',
    phone: '010-1234-2222',
    role: 'worker',
    jobType: '재배',
    hireDate: '2024-03-01',
    workHoursPerWeek: 40,
    annualLeaveDays: 15,
    pinCode: '222222',
    isActive: true,
  },
  {
    id: 'emp-004',
    name: '박민식',
    empNo: 'W003',
    phone: '010-1234-3333',
    role: 'worker',
    jobType: '재배',
    hireDate: '2024-04-15',
    workHoursPerWeek: 40,
    annualLeaveDays: 15,
    pinCode: '333333',
    isActive: true,
  },
  {
    id: 'emp-005',
    name: '최수진',
    empNo: 'W004',
    phone: '010-1234-4444',
    role: 'worker',
    jobType: '관리',
    hireDate: '2024-06-01',
    workHoursPerWeek: 40,
    annualLeaveDays: 15,
    pinCode: '444444',
    isActive: true,
  },
];

export const mockCrops = [
  {
    id: 'crop-001',
    name: '토마토',
    taskTypes: ['수확', '유인·결속', '적엽', '병해충 예찰', 'EC/pH 측정', '수분 작업'],
    isActive: true,
  },
  {
    id: 'crop-002',
    name: '오이',
    taskTypes: ['수확', '유인·결속', '적엽', '병해충 예찰', 'EC/pH 측정'],
    isActive: true,
  },
  {
    id: 'crop-003',
    name: '미니파프리카',
    taskTypes: ['수확', '유인·결속', '적엽', '병해충 예찰', 'EC/pH 측정', '수분 작업'],
    isActive: true,
  },
  {
    id: 'crop-004',
    name: '딸기',
    taskTypes: ['수확', '러너 정리', '적엽', '병해충 예찰', 'EC/pH 측정'],
    isActive: true,
  },
];

export const mockZones = [
  { id: 'zone-001', name: 'A동', description: '토마토 재배동', rowCount: 20, plantCount: 400 },
  { id: 'zone-002', name: 'B동', description: '오이·파프리카 재배동', rowCount: 16, plantCount: 320 },
  { id: 'zone-003', name: 'C동', description: '딸기 재배동', rowCount: 24, plantCount: 600 },
];

// 출퇴근 기록 (최근 2주)
export const mockAttendance = (() => {
  const records = [];
  const empIds = ['emp-002', 'emp-003', 'emp-004', 'emp-005'];
  const today = new Date();
  for (let d = 13; d >= 0; d--) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    if (date.getDay() === 0 || date.getDay() === 6) continue; // 주말 제외
    const dateStr = date.toISOString().split('T')[0];
    empIds.forEach((empId) => {
      const isToday = d === 0;
      const late = Math.random() < 0.1;
      const checkInH = late ? 8 + Math.floor(Math.random() * 2) + 1 : 8;
      const checkInM = Math.floor(Math.random() * 30);
      const checkIn = `${dateStr}T${String(checkInH).padStart(2, '0')}:${String(checkInM).padStart(2, '0')}:00`;
      const workMinutes = isToday ? null : 480 + Math.floor(Math.random() * 60) - 30;
      const checkOut = isToday ? null : (() => {
        const outDate = new Date(checkIn);
        outDate.setMinutes(outDate.getMinutes() + workMinutes);
        return outDate.toISOString();
      })();
      const status = late ? 'late' : 'normal';
      records.push({
        id: `att-${dateStr}-${empId}`,
        employeeId: empId,
        date: dateStr,
        checkIn,
        checkOut,
        workMinutes,
        status: isToday ? 'working' : status,
        note: null,
      });
    });
  }
  return records;
})();

// 휴가 신청
export const mockLeaveRequests = [
  {
    id: 'leave-001',
    employeeId: 'emp-002',
    date: '2026-04-10',
    type: '연차',
    reason: '개인 사유',
    status: 'pending',
    reviewedBy: null,
    reviewedAt: null,
    createdAt: '2026-04-03T09:00:00',
  },
  {
    id: 'leave-002',
    employeeId: 'emp-003',
    date: '2026-04-07',
    type: '오전반차',
    reason: '병원 진료',
    status: 'approved',
    reviewedBy: 'emp-001',
    reviewedAt: '2026-04-04T10:00:00',
    createdAt: '2026-04-03T14:00:00',
  },
  {
    id: 'leave-003',
    employeeId: 'emp-004',
    date: '2026-04-08',
    type: '연차',
    reason: '가족 행사',
    status: 'rejected',
    reviewedBy: 'emp-001',
    reviewedAt: '2026-04-04T11:00:00',
    createdAt: '2026-04-03T16:00:00',
  },
  {
    id: 'leave-004',
    employeeId: 'emp-005',
    date: '2026-04-15',
    type: '오후반차',
    reason: '관공서 방문',
    status: 'pending',
    reviewedBy: null,
    reviewedAt: null,
    createdAt: '2026-04-04T08:30:00',
  },
];

// 휴가 잔여
export const mockLeaveBalances = [
  { id: 'bal-001', employeeId: 'emp-002', year: 2026, totalDays: 15, usedDays: 3 },
  { id: 'bal-002', employeeId: 'emp-003', year: 2026, totalDays: 15, usedDays: 2 },
  { id: 'bal-003', employeeId: 'emp-004', year: 2026, totalDays: 15, usedDays: 1 },
  { id: 'bal-004', employeeId: 'emp-005', year: 2026, totalDays: 15, usedDays: 4 },
];

// 주간 근무 일정
export const mockSchedules = (() => {
  const schedules = [];
  const empIds = ['emp-002', 'emp-003', 'emp-004', 'emp-005'];
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  for (let d = 0; d < 5; d++) {
    const date = new Date(monday);
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().split('T')[0];
    empIds.forEach((empId) => {
      schedules.push({
        id: `sched-${dateStr}-${empId}`,
        employeeId: empId,
        date: dateStr,
        startTime: '08:00',
        endTime: '17:00',
        note: null,
      });
    });
  }
  return schedules;
})();

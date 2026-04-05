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

// 작업 배정
export const mockTasks = [
  {
    id: 'task-001',
    workerId: 'emp-002',
    title: '토마토 수확',
    date: new Date().toISOString().split('T')[0],
    zoneId: 'zone-001',
    rowRange: '1-8',
    cropId: 'crop-001',
    taskType: '수확',
    description: 'A동 1-8열 토마토 수확',
    estimatedMinutes: 120,
    quantity: null,
    quantityUnit: 'kg',
    status: 'in_progress',
    assignedAt: new Date(Date.now() - 3600000).toISOString(),
    startedAt: new Date(Date.now() - 1800000).toISOString(),
    completedAt: null,
    durationMinutes: null,
  },
  {
    id: 'task-002',
    workerId: 'emp-003',
    title: '오이 적엽',
    date: new Date().toISOString().split('T')[0],
    zoneId: 'zone-002',
    rowRange: '1-10',
    cropId: 'crop-002',
    taskType: '적엽',
    description: 'B동 1-10열 오이 적엽 작업',
    estimatedMinutes: 90,
    quantity: null,
    quantityUnit: '매',
    status: 'pending',
    assignedAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    durationMinutes: null,
  },
  {
    id: 'task-003',
    workerId: 'emp-004',
    title: '딸기 수확',
    date: new Date().toISOString().split('T')[0],
    zoneId: 'zone-003',
    rowRange: '1-12',
    cropId: 'crop-004',
    taskType: '수확',
    description: 'C동 1-12열 딸기 수확',
    estimatedMinutes: 150,
    quantity: 45,
    quantityUnit: 'kg',
    status: 'completed',
    assignedAt: new Date(Date.now() - 7200000).toISOString(),
    startedAt: new Date(Date.now() - 7200000).toISOString(),
    completedAt: new Date(Date.now() - 3600000).toISOString(),
    durationMinutes: 140,
  },
  {
    id: 'task-004',
    workerId: 'emp-002',
    title: '미니파프리카 병해충 예찰',
    date: new Date().toISOString().split('T')[0],
    zoneId: 'zone-002',
    rowRange: '11-16',
    cropId: 'crop-003',
    taskType: '병해충 예찰',
    description: 'B동 11-16열 미니파프리카 예찰',
    estimatedMinutes: 60,
    quantity: null,
    quantityUnit: null,
    status: 'pending',
    assignedAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    durationMinutes: null,
  },
];

// 생육 조사
export const mockGrowthSurveys = [
  {
    id: 'gs-001',
    workerId: 'emp-002',
    surveyDate: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
    zoneId: 'zone-001',
    rowNumber: 3,
    plantNumber: 5,
    plantHeight: 185.5,
    stemDiameter: 12.3,
    leafCount: 28,
    trussNumber: 7,
    fruitCount: 14,
    fruitWeight: 125.0,
    notes: '정상 생육',
    photos: [],
  },
  {
    id: 'gs-002',
    workerId: 'emp-003',
    surveyDate: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
    zoneId: 'zone-001',
    rowNumber: 3,
    plantNumber: 5,
    plantHeight: 182.0,
    stemDiameter: 12.1,
    leafCount: 26,
    trussNumber: 6,
    fruitCount: 12,
    fruitWeight: 118.5,
    notes: '',
    photos: [],
  },
];

// 이상 신고
export const mockIssues = [
  {
    id: 'issue-001',
    workerId: 'emp-002',
    zoneId: 'zone-001',
    type: '병해충',
    comment: '토마토 5열 잎마름병 의심 증상 발견',
    photo: null,
    isResolved: false,
    resolvedBy: null,
    resolvedAt: null,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'issue-002',
    workerId: 'emp-004',
    zoneId: 'zone-003',
    type: '시설이상',
    comment: 'C동 환기팬 3번 이상 소음',
    photo: null,
    isResolved: true,
    resolvedBy: 'emp-001',
    resolvedAt: new Date(Date.now() - 43200000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

// 긴급 호출
export const mockCalls = [
  {
    id: 'call-001',
    workerId: 'emp-003',
    type: '긴급호출',
    memo: 'B동 관수 라인 파손, 즉시 확인 필요',
    isConfirmed: true,
    confirmedAt: new Date(Date.now() - 86400000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

// 공지사항
export const mockNotices = [
  {
    id: 'notice-001',
    title: '4월 방제 일정 안내',
    body: '4월 8일(화) 오전 6시~8시 전 동 일제 방제 예정입니다. 방제 후 2시간 동안 온실 출입을 자제해 주세요.',
    priority: 'important',
    createdBy: 'emp-001',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'notice-002',
    title: '안전 장비 착용 안내',
    body: '작업 시 반드시 장갑, 안전화를 착용해 주세요. 미착용 시 작업 참여가 제한될 수 있습니다.',
    priority: 'normal',
    createdBy: 'emp-001',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'notice-003',
    title: '긴급: 내일 태풍 대비',
    body: '내일 오후부터 강풍이 예상됩니다. 오전 중 온실 문 잠금 및 외부 자재 정리를 완료해 주세요.',
    priority: 'urgent',
    createdBy: 'emp-001',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

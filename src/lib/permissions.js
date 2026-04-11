// 역할 상수
export const ROLES = {
  WORKER: 'worker',
  FARM_ADMIN: 'farm_admin',
  HR_ADMIN: 'hr_admin',
  SUPERVISOR: 'supervisor',
  MASTER: 'master',
};

// 역할 그룹
export const ADMIN_ROLES = ['farm_admin', 'hr_admin', 'supervisor', 'master'];
export const ALL_BRANCH_ROLES = ['hr_admin', 'supervisor', 'master']; // 전체 지점 조회
export const WRITE_ROLES = ['farm_admin', 'hr_admin', 'master'];      // 수정 권한
export const HR_CRUD_ROLES = ['hr_admin', 'master'];                   // 직원 CRUD

// 역할 판정 헬퍼
export function isFarmAdmin(user) {
  return user?.role === 'farm_admin';
}

export function isAdminLevel(user) {
  return ADMIN_ROLES.includes(user?.role);
}

export function canViewAllBranches(user) {
  return ALL_BRANCH_ROLES.includes(user?.role);
}

export function canWrite(user) {
  return WRITE_ROLES.includes(user?.role);
}

export function canHrCrud(user) {
  return HR_CRUD_ROLES.includes(user?.role);
}

export function isSupervisor(user) {
  return user?.role === 'supervisor';
}

export function isMaster(user) {
  return user?.role === 'master';
}

// 역할 한국어 표기
export const ROLE_LABELS = {
  worker: '작업자',
  farm_admin: '재배팀',
  hr_admin: '관리팀',
  supervisor: '총괄',
  master: '마스터',
  admin: '관리자', // 하위 호환
};

export function roleLabel(role) {
  return ROLE_LABELS[role] || role || '';
}

export function isTeamLeader(user) {
  return !!user?.isTeamLeader;
}

export function canApproveSafetyChecks(user) {
  if (!user) return false;
  if (user.isTeamLeader) return true;
  if (user.role === 'farm_admin') return true;
  if (user.role === 'hr_admin' || user.role === 'master') return true;
  return false;
}

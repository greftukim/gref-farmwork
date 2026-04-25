// 역할 상수
export const ROLES = {
  WORKER: 'worker',
  FARM_ADMIN: 'farm_admin',
  HR_ADMIN: 'hr_admin',
  SUPERVISOR: 'supervisor',
  MASTER: 'master',
  GENERAL: 'general',  // 세션 17 UI-A 추가 (J-3 부채 해소)
};

// 역할 그룹
export const ADMIN_ROLES = ['farm_admin', 'hr_admin', 'supervisor', 'master', 'general'];
export const HQ_ROLES    = ['hr_admin', 'supervisor', 'master', 'general'];       // HQ 전용 (farm_admin 제외)
export const ALL_BRANCH_ROLES = ['hr_admin', 'supervisor', 'master', 'general']; // 전체 지점 조회
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
  general: '총괄',  // 세션 17 UI-A 추가
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

/**
 * 직원 편집 권한 (resident_id, contract_end_date, birth_date 등 일반 편집)
 *
 * - master/hr_admin: 전체 편집 가능
 * - 그 외: 편집 불가 (읽기 전용)
 * - is_active=false: 모든 역할 편집 불가
 *
 * 세션 17 UI-A 추가 (메타 §3 결정 정합)
 */
export function canEditEmployee(currentUser) {
  if (!currentUser || !currentUser.isActive) return false;
  return ['master', 'hr_admin'].includes(currentUser.role);
}

/**
 * 반장 부여 권한 (job_rank = '반장' 설정)
 *
 * - master/hr_admin: 전체 지점 반장 부여 가능
 * - farm_admin: 본인 지점 직원만 반장 부여 가능
 * - 그 외: 불가
 * - is_active=false: 모든 역할 불가
 *
 * 세션 17 UI-A 추가 (메타 §3 결정 정합)
 */
export function canAssignLeader(currentUser, targetEmployee) {
  if (!currentUser || !currentUser.isActive) return false;
  if (['master', 'hr_admin'].includes(currentUser.role)) return true;
  if (currentUser.role === 'farm_admin' && currentUser.branch === targetEmployee?.branch) return true;
  return false;
}

/**
 * 주민번호 조회 권한 (decrypt_resident_id RPC 호출)
 *
 * - master/hr_admin: 복호화 조회 가능
 * - 그 외: 불가
 * - is_active=false: 모든 역할 불가
 *
 * 세션 17 UI-C 추가 (메타 결정 — 민감정보 조회 권한 별 헬퍼)
 * 현 매트릭스 canEditEmployee와 동일하나 의미 차원 분리 (편집 vs 조회)
 */
export function canViewResidentId(currentUser) {
  if (!currentUser || !currentUser.isActive) return false;
  return ['master', 'hr_admin'].includes(currentUser.role);
}

/**
 * 생년월일 조회 권한 체크
 * - master / hr_admin
 * - isActive 필수
 */
export function canViewBirthDate(currentUser) {
  if (!currentUser?.isActive) return false;
  return ['master', 'hr_admin'].includes(currentUser.role);
}

/**
 * 계약만료 강조 표시 권한 체크
 * - master / hr_admin
 * - isActive 필수
 */
export function canViewContractExpiry(currentUser) {
  if (!currentUser?.isActive) return false;
  return ['master', 'hr_admin'].includes(currentUser.role);
}

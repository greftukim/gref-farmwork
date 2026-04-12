// ============================================================================
// Supabase Edge Function chatbot-query — 도구 정의·실행 모듈 (트랙 H-2)
// ============================================================================
// 도메인 노트: docs/DOMAIN_CHATBOT_V1.md §3.4
// v1 = 조회 전용 5종:
//   1. get_branch_tbm_summary
//   2. get_branch_daily_work_summary
//   3. get_branch_safety_check_summary
//   4. get_pending_approvals
//   5. get_user_list
//
// 공통 규약 (§3.4.3):
// - 사용자 JWT로 Supabase 쿼리 (RLS 위임). service_role 우회 금지.
// - branch 생략 시 farm_admin은 본인 지점 자동(RLS), hr_admin/master는 전 지점.
// - 날짜 기본값: CURRENT_DATE.
// - 에러 계약: {"error": "<code>", "message": "<optional>"} 형식.
// - 공통 에러 코드: invalid_date_range, invalid_branch, date_range_too_wide, permission_denied
// - RLS가 차단하면 빈 results 반환 (에러 아님).
// - 리스트 반환 도구는 카테고리당 최대 50건, 초과 시 truncated: true.
// ============================================================================

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

// ----------------------------------------------------------------------------
// 상수
// ----------------------------------------------------------------------------
const VALID_BRANCHES = ['busan', 'jinju', 'hadong'] as const;
type Branch = typeof VALID_BRANCHES[number];

const MAX_ROWS = 50;
const MAX_DATE_RANGE_DAYS = 93;

// ----------------------------------------------------------------------------
// Tool 정의 (Anthropic tool_use API 형식)
// ----------------------------------------------------------------------------
export const TOOL_DEFINITIONS = [
  {
    name: 'get_branch_tbm_summary',
    description: "지점 TBM(사전위험성평가, check_type='pre_task') 작성·승인 현황 집계. 날짜 생략 시 오늘.",
    input_schema: {
      type: 'object',
      properties: {
        branch: {
          type: 'string',
          enum: VALID_BRANCHES,
          description: '조회 지점. farm_admin은 본인 지점만 접근 가능(RLS 자동 필터). 생략 시 hr_admin/master는 전 지점 합산.',
        },
        date_from: { type: 'string', format: 'date', description: '조회 시작일(YYYY-MM-DD). 생략 시 오늘.' },
        date_to: { type: 'string', format: 'date', description: '조회 종료일(YYYY-MM-DD). 생략 시 date_from과 동일.' },
      },
      required: [],
    },
  },
  {
    name: 'get_branch_daily_work_summary',
    description: '일용직(daily_work_logs) 작업·임금 집계. 기간 필수.',
    input_schema: {
      type: 'object',
      properties: {
        branch: { type: 'string', enum: VALID_BRANCHES },
        date_from: { type: 'string', format: 'date' },
        date_to: { type: 'string', format: 'date' },
        payment_status: { type: 'string', enum: ['pending', 'paid'], description: '지급 상태 필터. 생략 시 전체.' },
      },
      required: ['date_from', 'date_to'],
    },
  },
  {
    name: 'get_branch_safety_check_summary',
    description: "일반 안전점검(check_type IN ('pre_work','post_work')) 현황. 날짜 생략 시 오늘.",
    input_schema: {
      type: 'object',
      properties: {
        branch: { type: 'string', enum: VALID_BRANCHES },
        date_from: { type: 'string', format: 'date' },
        date_to: { type: 'string', format: 'date' },
      },
      required: [],
    },
  },
  {
    name: 'get_pending_approvals',
    description: '승인 대기 통합 조회 — 휴가/연장근무/안전점검 3개 테이블. 생략 시 전체.',
    input_schema: {
      type: 'object',
      properties: {
        branch: { type: 'string', enum: VALID_BRANCHES },
        approval_type: {
          type: 'string',
          enum: ['leave', 'overtime', 'safety_check', 'all'],
          description: '조회할 승인 종류. 생략 시 all.',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_user_list',
    description: '지점별 사용자 목록·역할 조회. 민감 필드(phone, 연차일수 등)는 반환하지 않음.',
    input_schema: {
      type: 'object',
      properties: {
        branch: { type: 'string', enum: VALID_BRANCHES },
        role: {
          type: 'string',
          enum: ['worker', 'farm_admin', 'hr_admin', 'master', 'team_leader'],
          description: "역할 필터. 'team_leader'는 role='worker' AND is_team_leader=true로 매핑.",
        },
        active_only: { type: 'boolean', description: '기본 true. 비활성 사용자 제외.' },
      },
      required: [],
    },
  },
];

// ----------------------------------------------------------------------------
// 타입
// ----------------------------------------------------------------------------
export type ToolResult =
  | { ok: true; result: unknown; row_count: number; truncated: boolean }
  | { ok: false; error: string; message?: string };

// ----------------------------------------------------------------------------
// 공통 유틸
// ----------------------------------------------------------------------------
function isValidBranch(b: unknown): b is Branch {
  return typeof b === 'string' && (VALID_BRANCHES as readonly string[]).includes(b);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  const d1 = new Date(from).getTime();
  const d2 = new Date(to).getTime();
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

function resolveDateRange(
  date_from?: string,
  date_to?: string,
  { requireBoth = false, maxDays = MAX_DATE_RANGE_DAYS }: { requireBoth?: boolean; maxDays?: number } = {},
): { from: string; to: string } | ToolResult {
  if (requireBoth && (!date_from || !date_to)) {
    return { ok: false, error: 'invalid_date_range', message: 'date_from과 date_to가 모두 필요합니다.' };
  }
  const from = date_from ?? todayISO();
  const to = date_to ?? from;
  if (new Date(from).getTime() > new Date(to).getTime()) {
    return { ok: false, error: 'invalid_date_range', message: 'date_from이 date_to보다 늦습니다.' };
  }
  if (daysBetween(from, to) > maxDays) {
    return { ok: false, error: 'date_range_too_wide', message: `최대 ${maxDays}일까지 조회 가능합니다.` };
  }
  return { from, to };
}

function resolveBranch(input: unknown): Branch | null | ToolResult {
  if (input === undefined || input === null || input === '') return null;
  if (!isValidBranch(input)) {
    return { ok: false, error: 'invalid_branch', message: `지원 지점: ${VALID_BRANCHES.join(', ')}` };
  }
  return input;
}

function isToolError(v: unknown): v is ToolResult & { ok: false } {
  return typeof v === 'object' && v !== null && 'ok' in v && (v as ToolResult).ok === false;
}

// ----------------------------------------------------------------------------
// 도구 1: get_branch_tbm_summary
// ----------------------------------------------------------------------------
async function getBranchTbmSummary(
  input: Record<string, unknown>,
  client: SupabaseClient,
): Promise<ToolResult> {
  const branchResolved = resolveBranch(input.branch);
  if (isToolError(branchResolved)) return branchResolved;

  const dateRange = resolveDateRange(input.date_from as string | undefined, input.date_to as string | undefined);
  if (isToolError(dateRange)) return dateRange;

  // safety_checks JOIN employees (branch는 employees 쪽)
  // check_type='pre_task', status별 집계
  let query = client
    .from('safety_checks')
    .select('status, employees!inner(branch)', { count: 'exact' })
    .eq('check_type', 'pre_task')
    .gte('date', dateRange.from)
    .lte('date', dateRange.to);

  if (branchResolved !== null) {
    query = query.eq('employees.branch', branchResolved);
  }

  const { data, error } = await query.limit(10000); // 집계용, 상한은 안전장치
  if (error) {
    return { ok: false, error: 'query_failed', message: error.message };
  }

  // 클라이언트 측 GROUP BY (branch, status)
  const agg = new Map<string, { submitted: number; approved: number; total: number }>();
  for (const row of data ?? []) {
    // deno-lint-ignore no-explicit-any
    const branch = (row as any).employees?.branch ?? 'unknown';
    // deno-lint-ignore no-explicit-any
    const status = (row as any).status as string;
    if (!agg.has(branch)) agg.set(branch, { submitted: 0, approved: 0, total: 0 });
    const entry = agg.get(branch)!;
    entry.total += 1;
    if (status === 'submitted') entry.submitted += 1;
    if (status === 'approved') entry.approved += 1;
  }

  const results = Array.from(agg.entries()).map(([branch, stats]) => ({ branch, ...stats }));

  return {
    ok: true,
    result: { period: { from: dateRange.from, to: dateRange.to }, results },
    row_count: results.length,
    truncated: false,
  };
}

// ----------------------------------------------------------------------------
// 도구 2: get_branch_daily_work_summary
// ----------------------------------------------------------------------------
async function getBranchDailyWorkSummary(
  input: Record<string, unknown>,
  client: SupabaseClient,
): Promise<ToolResult> {
  const branchResolved = resolveBranch(input.branch);
  if (isToolError(branchResolved)) return branchResolved;

  const dateRange = resolveDateRange(
    input.date_from as string | undefined,
    input.date_to as string | undefined,
    { requireBoth: true },
  );
  if (isToolError(dateRange)) return dateRange;

  const paymentStatus = input.payment_status as string | undefined;
  if (paymentStatus !== undefined && !['pending', 'paid'].includes(paymentStatus)) {
    return { ok: false, error: 'invalid_payment_status', message: "payment_status는 'pending' 또는 'paid'만 허용됩니다." };
  }

  let query = client
    .from('daily_work_logs')
    .select('branch, worker_name, work_date, daily_wage, payment_status')
    .gte('work_date', dateRange.from)
    .lte('work_date', dateRange.to);

  if (branchResolved !== null) query = query.eq('branch', branchResolved);
  if (paymentStatus) query = query.eq('payment_status', paymentStatus);

  const { data, error } = await query.limit(10000);
  if (error) return { ok: false, error: 'query_failed', message: error.message };

  // 클라이언트 측 집계 (branch 단위)
  const agg = new Map<string, {
    total_work_days: number;
    unique_workers: Set<string>;
    total_wage: number;
    pending_wage: number;
    paid_wage: number;
  }>();

  for (const row of data ?? []) {
    // deno-lint-ignore no-explicit-any
    const r = row as any;
    if (!agg.has(r.branch)) {
      agg.set(r.branch, {
        total_work_days: 0,
        unique_workers: new Set(),
        total_wage: 0,
        pending_wage: 0,
        paid_wage: 0,
      });
    }
    const entry = agg.get(r.branch)!;
    entry.total_work_days += 1;
    entry.unique_workers.add(r.worker_name);
    const wage = Number(r.daily_wage) || 0;
    entry.total_wage += wage;
    if (r.payment_status === 'pending') entry.pending_wage += wage;
    if (r.payment_status === 'paid') entry.paid_wage += wage;
  }

  const results = Array.from(agg.entries()).map(([branch, stats]) => ({
    branch,
    total_work_days: stats.total_work_days,
    unique_workers: stats.unique_workers.size,
    total_wage: stats.total_wage,
    pending_wage: stats.pending_wage,
    paid_wage: stats.paid_wage,
  }));

  return {
    ok: true,
    result: { period: { from: dateRange.from, to: dateRange.to }, results },
    row_count: results.length,
    truncated: false,
  };
}

// ----------------------------------------------------------------------------
// 도구 3: get_branch_safety_check_summary
// ----------------------------------------------------------------------------
async function getBranchSafetyCheckSummary(
  input: Record<string, unknown>,
  client: SupabaseClient,
): Promise<ToolResult> {
  const branchResolved = resolveBranch(input.branch);
  if (isToolError(branchResolved)) return branchResolved;

  const dateRange = resolveDateRange(input.date_from as string | undefined, input.date_to as string | undefined);
  if (isToolError(dateRange)) return dateRange;

  let query = client
    .from('safety_checks')
    .select('check_type, status, employees!inner(branch)')
    .in('check_type', ['pre_work', 'post_work'])
    .gte('date', dateRange.from)
    .lte('date', dateRange.to);

  if (branchResolved !== null) query = query.eq('employees.branch', branchResolved);

  const { data, error } = await query.limit(10000);
  if (error) return { ok: false, error: 'query_failed', message: error.message };

  // branch × check_type × status 집계
  const agg = new Map<string, {
    pre_work: { submitted: number; approved: number };
    post_work: { submitted: number; approved: number };
  }>();

  for (const row of data ?? []) {
    // deno-lint-ignore no-explicit-any
    const r = row as any;
    const branch = r.employees?.branch ?? 'unknown';
    const ct = r.check_type as 'pre_work' | 'post_work';
    const st = r.status as 'submitted' | 'approved';

    if (!agg.has(branch)) {
      agg.set(branch, {
        pre_work: { submitted: 0, approved: 0 },
        post_work: { submitted: 0, approved: 0 },
      });
    }
    const entry = agg.get(branch)!;
    if (ct === 'pre_work' || ct === 'post_work') {
      if (st === 'submitted') entry[ct].submitted += 1;
      if (st === 'approved') entry[ct].approved += 1;
    }
  }

  const results = Array.from(agg.entries()).map(([branch, stats]) => ({ branch, ...stats }));

  return {
    ok: true,
    result: { period: { from: dateRange.from, to: dateRange.to }, results },
    row_count: results.length,
    truncated: false,
  };
}

// ----------------------------------------------------------------------------
// 도구 4: get_pending_approvals
// ----------------------------------------------------------------------------
async function getPendingApprovals(
  input: Record<string, unknown>,
  client: SupabaseClient,
): Promise<ToolResult> {
  const branchResolved = resolveBranch(input.branch);
  if (isToolError(branchResolved)) return branchResolved;

  const approvalType = (input.approval_type as string | undefined) ?? 'all';
  if (!['leave', 'overtime', 'safety_check', 'all'].includes(approvalType)) {
    return { ok: false, error: 'invalid_approval_type' };
  }

  const results: {
    leave: unknown[];
    overtime: unknown[];
    safety_check: unknown[];
  } = { leave: [], overtime: [], safety_check: [] };

  let truncated = false;

  // --- leave_requests ---
  // TODO (교훈 17): leave_requests.status의 실제 enum 값은 runtime 확인 필요.
  //   현재는 'pending'으로 가정. 배포 후 Supabase MCP로 SELECT DISTINCT status 검증.
  if (approvalType === 'leave' || approvalType === 'all') {
    let q = client
      .from('leave_requests')
      .select('id, employee_id, date, type, status, employees!inner(name, branch)')
      .eq('status', 'pending')
      .limit(MAX_ROWS + 1);
    if (branchResolved !== null) q = q.eq('employees.branch', branchResolved);

    const { data, error } = await q;
    if (error) return { ok: false, error: 'query_failed', message: `leave: ${error.message}` };

    const rows = data ?? [];
    if (rows.length > MAX_ROWS) truncated = true;
    results.leave = rows.slice(0, MAX_ROWS).map((r) => {
      // deno-lint-ignore no-explicit-any
      const rr = r as any;
      return {
        id: rr.id,
        employee_name: rr.employees?.name,
        branch: rr.employees?.branch,
        date: rr.date,
        type: rr.type,
      };
    });
  }

  // --- overtime_requests ---
  if (approvalType === 'overtime' || approvalType === 'all') {
    let q = client
      .from('overtime_requests')
      .select('id, employee_id, date, hours, minutes, status, employees!inner(name, branch)')
      .eq('status', 'pending')
      .limit(MAX_ROWS + 1);
    if (branchResolved !== null) q = q.eq('employees.branch', branchResolved);

    const { data, error } = await q;
    if (error) return { ok: false, error: 'query_failed', message: `overtime: ${error.message}` };

    const rows = data ?? [];
    if (rows.length > MAX_ROWS) truncated = true;
    results.overtime = rows.slice(0, MAX_ROWS).map((r) => {
      // deno-lint-ignore no-explicit-any
      const rr = r as any;
      return {
        id: rr.id,
        employee_name: rr.employees?.name,
        branch: rr.employees?.branch,
        date: rr.date,
        hours: rr.hours,
        minutes: rr.minutes,
      };
    });
  }

  // --- safety_checks (승인 대기 = status='submitted', check_type='pre_task') ---
  if (approvalType === 'safety_check' || approvalType === 'all') {
    let q = client
      .from('safety_checks')
      .select('id, worker_id, date, check_type, status, employees!inner(name, branch)')
      .eq('status', 'submitted')
      .eq('check_type', 'pre_task')
      .limit(MAX_ROWS + 1);
    if (branchResolved !== null) q = q.eq('employees.branch', branchResolved);

    const { data, error } = await q;
    if (error) return { ok: false, error: 'query_failed', message: `safety_check: ${error.message}` };

    const rows = data ?? [];
    if (rows.length > MAX_ROWS) truncated = true;
    results.safety_check = rows.slice(0, MAX_ROWS).map((r) => {
      // deno-lint-ignore no-explicit-any
      const rr = r as any;
      return {
        id: rr.id,
        worker_name: rr.employees?.name,
        branch: rr.employees?.branch,
        check_type: rr.check_type,
        date: rr.date,
      };
    });
  }

  const counts = {
    leave: results.leave.length,
    overtime: results.overtime.length,
    safety_check: results.safety_check.length,
    total: results.leave.length + results.overtime.length + results.safety_check.length,
  };

  return {
    ok: true,
    result: truncated ? { results, counts, truncated: true } : { results, counts },
    row_count: counts.total,
    truncated,
  };
}

// ----------------------------------------------------------------------------
// 도구 5: get_user_list
// ----------------------------------------------------------------------------
async function getUserList(
  input: Record<string, unknown>,
  client: SupabaseClient,
): Promise<ToolResult> {
  const branchResolved = resolveBranch(input.branch);
  if (isToolError(branchResolved)) return branchResolved;

  const roleInput = input.role as string | undefined;
  const validRoles = ['worker', 'farm_admin', 'hr_admin', 'master', 'team_leader'];
  if (roleInput !== undefined && !validRoles.includes(roleInput)) {
    return { ok: false, error: 'invalid_role' };
  }
  const activeOnly = (input.active_only as boolean | undefined) ?? true;

  // 민감 필드 제외: phone, annual_leave_days 등 일체 미포함
  let query = client
    .from('employees')
    .select('id, name, branch, role, is_team_leader, is_active')
    .limit(MAX_ROWS + 1);

  if (branchResolved !== null) query = query.eq('branch', branchResolved);
  if (activeOnly) query = query.eq('is_active', true);

  if (roleInput === 'team_leader') {
    query = query.eq('role', 'worker').eq('is_team_leader', true);
  } else if (roleInput) {
    query = query.eq('role', roleInput);
  }

  const { data, error } = await query;
  if (error) return { ok: false, error: 'query_failed', message: error.message };

  const rows = data ?? [];
  const truncated = rows.length > MAX_ROWS;
  const sliced = rows.slice(0, MAX_ROWS);

  return {
    ok: true,
    result: truncated
      ? { results: sliced, count: sliced.length, truncated: true }
      : { results: sliced, count: sliced.length },
    row_count: sliced.length,
    truncated,
  };
}

// ----------------------------------------------------------------------------
// 디스패처
// ----------------------------------------------------------------------------
export async function executeTool(
  name: string,
  input: unknown,
  client: SupabaseClient,
): Promise<ToolResult> {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, error: 'invalid_input', message: 'input은 객체여야 합니다.' };
  }
  const inp = input as Record<string, unknown>;

  switch (name) {
    case 'get_branch_tbm_summary':
      return await getBranchTbmSummary(inp, client);
    case 'get_branch_daily_work_summary':
      return await getBranchDailyWorkSummary(inp, client);
    case 'get_branch_safety_check_summary':
      return await getBranchSafetyCheckSummary(inp, client);
    case 'get_pending_approvals':
      return await getPendingApprovals(inp, client);
    case 'get_user_list':
      return await getUserList(inp, client);
    default:
      return { ok: false, error: 'unknown_tool', message: `알 수 없는 도구: ${name}` };
  }
}

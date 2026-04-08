import { supabase } from './supabase';

// Supabase Auth 미사용 → anon key 명시 주입
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function invoke(payload) {
  const { data, error } = await supabase.functions.invoke('send-push', {
    body: payload,
    headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (error) throw new Error(error.message ?? JSON.stringify(error));
  return data;
}

/** 관리자 전체에게 푸시 */
export async function sendPushToAdmins({ title, body, type, urgent = false }) {
  return invoke({ title, body, type, urgent, targetRole: 'admin' });
}

/**
 * 작업자에게 푸시 (전체 또는 필터)
 * @param {string} [targetBranch] - 지점 코드 (busan/jinju/hadong) - 없으면 전체
 * @param {string} [targetJobType] - 직무 ('재배'/'포장'/'관리'/'기타') - 없으면 전체
 */
export async function sendPushToWorkers({ title, body, type = 'notice', urgent = false, targetBranch, targetJobType } = {}) {
  return invoke({ title, body, type, urgent, targetRole: 'worker', targetBranch, targetJobType });
}

/**
 * 특정 직원 1명에게 푸시
 * @param {string} employeeId
 */
export async function sendPushToEmployee({ employeeId, title, body, type = 'info', urgent = false }) {
  return invoke({ title, body, type, urgent, targetEmployeeId: employeeId });
}

import { supabase } from './supabase';

// 이 앱은 Supabase Auth를 사용하지 않으므로 세션이 항상 null.
// functions.invoke는 세션이 없으면 Authorization 헤더를 누락하거나 빈 값으로
// 보내 401이 발생한다 → anon key를 명시적으로 헤더에 주입.
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function sendPushToAdmins({ title, body, type, urgent = false }) {
  console.log('[Push] sendPushToAdmins 호출:', { title, type, urgent });
  try {
    const { data, error } = await supabase.functions.invoke('send-push', {
      body: { title, body, type, urgent, targetRole: 'admin' },
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (error) {
      console.error('[Push] Edge Function 오류:', error);
      throw new Error(error.message ?? JSON.stringify(error));
    }
    console.log('[Push] 전송 완료:', data);
    return data;
  } catch (e) {
    console.error('[Push] 전송 실패:', e);
    throw e;
  }
}

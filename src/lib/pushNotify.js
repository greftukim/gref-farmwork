import { supabase } from './supabase';

export async function sendPushToAdmins({ title, body, type, urgent = false }) {
  console.log('[Push] sendPushToAdmins 호출:', { title, type, urgent });
  try {
    const { data, error } = await supabase.functions.invoke('send-push', {
      body: { title, body, type, urgent, targetRole: 'admin' },
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

import { supabase } from './supabase';

export async function sendPushToAdmins({ title, body, type, urgent = false }) {
  try {
    const { data, error } = await supabase.functions.invoke('send-push', {
      body: { title, body, type, urgent, targetRole: 'admin' },
    });
    if (error) console.warn('푸시 전송 실패:', error.message);
    return data;
  } catch (e) {
    console.warn('푸시 전송 오류:', e.message);
    return null;
  }
}

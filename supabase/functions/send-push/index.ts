// Supabase Edge Function: send-push
// 긴급호출/이상신고/작업완료 시 관리자에게 FCM 푸시 알림 전송
//
// 배포: supabase functions deploy send-push --project-ref yzqdpfauadbtutkhxzeu
// 시크릿 설정: supabase secrets set FCM_SERVER_KEY=your-firebase-server-key

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { title, body, type, urgent, targetRole } = await req.json();

    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');
    if (!fcmServerKey) {
      return new Response(
        JSON.stringify({ error: 'FCM_SERVER_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Supabase 클라이언트 (service_role로 모든 데이터 접근)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 대상 역할의 FCM 토큰 조회 (기본: admin)
    const role = targetRole || 'admin';
    const { data: employees } = await supabase
      .from('employees')
      .select('id')
      .eq('role', role)
      .eq('is_active', true);

    if (!employees || employees.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: 'No target employees' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const empIds = employees.map((e: { id: string }) => e.id);
    const { data: tokens } = await supabase
      .from('fcm_tokens')
      .select('token')
      .in('employee_id', empIds);

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: 'No FCM tokens found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // FCM 전송 (각 토큰에 개별 전송)
    let sent = 0;
    let failed = 0;
    const staleTokens: string[] = [];

    for (const { token } of tokens) {
      const fcmRes = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Authorization': `key=${fcmServerKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: token,
          notification: {
            title,
            body,
            icon: '/icons/icon-192.png',
            click_action: '/',
          },
          data: {
            type: type || 'info',
            urgent: urgent ? 'true' : 'false',
          },
          priority: urgent ? 'high' : 'normal',
        }),
      });

      const result = await fcmRes.json();
      if (result.success === 1) {
        sent++;
      } else {
        failed++;
        // 만료/무효 토큰 정리
        if (result.results?.[0]?.error === 'NotRegistered' ||
            result.results?.[0]?.error === 'InvalidRegistration') {
          staleTokens.push(token);
        }
      }
    }

    // 만료 토큰 삭제
    if (staleTokens.length > 0) {
      await supabase.from('fcm_tokens').delete().in('token', staleTokens);
    }

    return new Response(
      JSON.stringify({ sent, failed, cleaned: staleTokens.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

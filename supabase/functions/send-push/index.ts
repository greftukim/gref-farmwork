// Supabase Edge Function: send-push (FCM V1 API)
// 서비스 계정 JWT → OAuth2 토큰 → FCM V1 HTTP API
//
// 배포:
//   supabase functions deploy send-push --project-ref yzqdpfauadbtutkhxzeu
// 시크릿 설정:
//   supabase secrets set FIREBASE_SERVICE_ACCOUNT='<서비스 계정 JSON 전체>'

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SignJWT, importPKCS8 } from 'https://esm.sh/jose@5.2.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 서비스 계정으로 OAuth2 액세스 토큰 발급
async function getAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
  token_uri: string;
}) {
  const now = Math.floor(Date.now() / 1000);

  const privateKey = await importPKCS8(serviceAccount.private_key, 'RS256');

  const jwt = await new SignJWT({
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: serviceAccount.token_uri,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const res = await fetch(serviceAccount.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`OAuth2 토큰 발급 실패: ${JSON.stringify(data)}`);
  }
  return data.access_token as string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { title, body, type, urgent, targetRole } = await req.json();

    // 서비스 계정 JSON 로드
    const saJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    if (!saJson) {
      return new Response(
        JSON.stringify({ error: 'FIREBASE_SERVICE_ACCOUNT not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const serviceAccount = JSON.parse(saJson);
    const projectId = serviceAccount.project_id;

    // OAuth2 액세스 토큰 발급
    const accessToken = await getAccessToken(serviceAccount);

    // Supabase에서 대상 FCM 토큰 조회
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // FCM V1 API로 전송
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
    let sent = 0;
    let failed = 0;
    const staleTokens: string[] = [];

    for (const { token } of tokens) {
      const message = {
        message: {
          token,
          notification: {
            title,
            body,
          },
          webpush: {
            notification: {
              icon: '/icons/icon-192.png',
              badge: '/icons/icon-192.png',
              tag: type || 'default',
            },
            fcm_options: {
              link: '/',
            },
          },
          data: {
            type: type || 'info',
            urgent: urgent ? 'true' : 'false',
          },
          android: {
            priority: urgent ? 'high' : 'normal',
          },
        },
      };

      const fcmRes = await fetch(fcmUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (fcmRes.ok) {
        sent++;
      } else {
        failed++;
        const errBody = await fcmRes.json().catch(() => ({}));
        const errCode = errBody?.error?.details?.[0]?.errorCode;
        // UNREGISTERED = 만료/무효 토큰
        if (errCode === 'UNREGISTERED' || fcmRes.status === 404) {
          staleTokens.push(token);
        }
      }
    }

    // 만료 토큰 정리
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

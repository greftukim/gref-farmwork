// Supabase Edge Function: send-push (FCM V1 API)
// 서비스 계정 JWT → OAuth2 토큰 → FCM V1 HTTP API
//
// 배포:
//   supabase functions deploy send-push --project-ref yzqdpfauadbtutkhxzeu --no-verify-jwt
// 시크릿 설정:
//   supabase secrets set FIREBASE_SERVICE_ACCOUNT='<서비스 계정 JSON 전체>'

import { createClient } from 'npm:@supabase/supabase-js@2';
import { SignJWT, importPKCS8 } from 'npm:jose@5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

// 서비스 계정으로 Google OAuth2 액세스 토큰 발급
async function getAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
  token_uri: string;
}): Promise<string> {
  console.log('[getAccessToken] private_key 파싱 시작');

  let privateKey;
  try {
    privateKey = await importPKCS8(serviceAccount.private_key, 'RS256');
  } catch (e) {
    throw new Error(`private_key importPKCS8 실패: ${errMsg(e)}`);
  }
  console.log('[getAccessToken] private_key 파싱 완료');

  const now = Math.floor(Date.now() / 1000);

  let jwt: string;
  try {
    jwt = await new SignJWT({
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
    })
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
      .setIssuer(serviceAccount.client_email)
      .setSubject(serviceAccount.client_email)
      .setAudience(serviceAccount.token_uri)
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(privateKey);
  } catch (e) {
    throw new Error(`JWT 서명 실패: ${errMsg(e)}`);
  }
  console.log('[getAccessToken] JWT 서명 완료, 토큰 요청 중...');

  let res: Response;
  try {
    res = await fetch(serviceAccount.token_uri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });
  } catch (e) {
    throw new Error(`OAuth2 토큰 요청 네트워크 오류: ${errMsg(e)}`);
  }

  const data = await res.json();
  console.log('[getAccessToken] OAuth2 응답 status:', res.status);

  if (!data.access_token) {
    throw new Error(`OAuth2 토큰 발급 실패 (${res.status}): ${JSON.stringify(data)}`);
  }
  console.log('[getAccessToken] 액세스 토큰 발급 완료');
  return data.access_token as string;
}

Deno.serve(async (req) => {
  console.log('[send-push] 요청 수신:', req.method);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. 요청 파싱
    let payload: { title: string; body: string; type: string; urgent: boolean; targetRole: string };
    try {
      payload = await req.json();
    } catch (e) {
      throw new Error(`요청 JSON 파싱 실패: ${errMsg(e)}`);
    }
    const { title, body, type, urgent, targetRole } = payload;
    console.log('[send-push] payload:', { title, type, urgent, targetRole });

    // 2. 서비스 계정 로드
    const saJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    if (!saJson) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT 시크릿이 설정되지 않았습니다');
    }

    let serviceAccount: {
      project_id: string;
      client_email: string;
      private_key: string;
      token_uri: string;
    };
    try {
      serviceAccount = JSON.parse(saJson);
    } catch (e) {
      throw new Error(`FIREBASE_SERVICE_ACCOUNT JSON 파싱 실패: ${errMsg(e)}`);
    }
    console.log('[send-push] 서비스 계정 로드 완료, project_id:', serviceAccount.project_id);

    if (!serviceAccount.private_key || !serviceAccount.client_email || !serviceAccount.token_uri) {
      throw new Error(
        `서비스 계정 필드 누락: private_key=${!!serviceAccount.private_key}, ` +
        `client_email=${!!serviceAccount.client_email}, token_uri=${!!serviceAccount.token_uri}`
      );
    }

    // 3. OAuth2 액세스 토큰
    const accessToken = await getAccessToken(serviceAccount);

    // 4. Supabase에서 대상 FCM 토큰 조회
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const role = targetRole || 'admin';
    console.log('[send-push] 대상 role:', role, '직원 조회 중...');

    const { data: employees, error: empErr } = await supabase
      .from('employees')
      .select('id')
      .eq('role', role)
      .eq('is_active', true);

    if (empErr) throw new Error(`employees 조회 실패: ${empErr.message}`);
    console.log('[send-push] 직원 수:', employees?.length ?? 0);

    if (!employees || employees.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: '대상 직원 없음' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const empIds = employees.map((e: { id: string }) => e.id);
    const { data: tokens, error: tokErr } = await supabase
      .from('fcm_tokens')
      .select('token')
      .in('employee_id', empIds);

    if (tokErr) throw new Error(`fcm_tokens 조회 실패: ${tokErr.message}`);
    console.log('[send-push] FCM 토큰 수:', tokens?.length ?? 0);

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: 'FCM 토큰 없음' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. FCM V1 API 전송
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;
    let sent = 0;
    let failed = 0;
    const staleTokens: string[] = [];

    for (const { token } of tokens) {
      const message = {
        message: {
          token,
          notification: { title, body },
          webpush: {
            notification: {
              icon: '/icons/icon-192.png',
              badge: '/icons/icon-192.png',
              tag: type || 'default',
            },
            fcm_options: { link: '/' },
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
        console.log('[send-push] FCM 전송 성공, token prefix:', token.substring(0, 10));
      } else {
        failed++;
        const errBody = await fcmRes.json().catch(() => ({}));
        const errCode = errBody?.error?.details?.[0]?.errorCode;
        console.error('[send-push] FCM 전송 실패:', fcmRes.status, errCode, JSON.stringify(errBody));
        if (errCode === 'UNREGISTERED' || fcmRes.status === 404) {
          staleTokens.push(token);
        }
      }
    }

    // 6. 만료 토큰 정리
    if (staleTokens.length > 0) {
      console.log('[send-push] 만료 토큰 삭제:', staleTokens.length);
      await supabase.from('fcm_tokens').delete().in('token', staleTokens);
    }

    const result = { sent, failed, cleaned: staleTokens.length };
    console.log('[send-push] 완료:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const msg = errMsg(err);
    console.error('[send-push] 처리 중 오류:', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

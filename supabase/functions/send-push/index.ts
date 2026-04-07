// Supabase Edge Function: send-push (FCM V1 API)
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

async function getAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
  token_uri: string;
}): Promise<string> {
  const privateKey = await importPKCS8(serviceAccount.private_key, 'RS256');
  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(serviceAccount.client_email)
    .setSubject(serviceAccount.client_email)
    .setAudience(serviceAccount.token_uri)
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
  if (!data.access_token) throw new Error(`OAuth2 토큰 발급 실패 (${res.status}): ${JSON.stringify(data)}`);
  return data.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // 1. 요청 파싱
    const payload: {
      title: string;
      body: string;
      type?: string;
      urgent?: boolean;
      targetRole?: string;       // 'admin' | 'worker' — role 기반 전송
      targetBranch?: string;     // 지점 코드 필터 (worker 전송 시)
      targetJobType?: string;    // 직무 필터 (worker 전송 시)
      targetEmployeeId?: string; // 특정 직원 1명
    } = await req.json();

    const { title, body, type, urgent, targetRole, targetBranch, targetJobType, targetEmployeeId } = payload;
    console.log('[send-push] payload:', { title, type, urgent, targetRole, targetBranch, targetJobType, targetEmployeeId });

    // 2. 서비스 계정 로드
    const saJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    if (!saJson) throw new Error('FIREBASE_SERVICE_ACCOUNT 시크릿 미설정');
    const serviceAccount: { project_id: string; client_email: string; private_key: string; token_uri: string } =
      JSON.parse(saJson);

    // 3. OAuth2 액세스 토큰
    const accessToken = await getAccessToken(serviceAccount);

    // 4. Supabase에서 대상 FCM 토큰 조회
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let empIds: string[];

    if (targetEmployeeId) {
      // 특정 직원 1명
      empIds = [targetEmployeeId];
    } else {
      // role 기반 + 선택적 필터
      const role = targetRole || 'admin';
      let query = supabase.from('employees').select('id').eq('role', role).eq('is_active', true);
      if (targetBranch) query = query.eq('branch', targetBranch);
      if (targetJobType) query = query.eq('job_type', targetJobType);

      const { data: employees, error: empErr } = await query;
      if (empErr) throw new Error(`employees 조회 실패: ${empErr.message}`);
      if (!employees || employees.length === 0) {
        return new Response(JSON.stringify({ sent: 0, message: '대상 직원 없음' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      empIds = employees.map((e: { id: string }) => e.id);
    }

    console.log('[send-push] 대상 직원 수:', empIds.length);

    const { data: tokens, error: tokErr } = await supabase
      .from('fcm_tokens')
      .select('token')
      .in('employee_id', empIds);
    if (tokErr) throw new Error(`fcm_tokens 조회 실패: ${tokErr.message}`);

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'FCM 토큰 없음' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. FCM V1 API 전송
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;
    let sent = 0, failed = 0;
    const staleTokens: string[] = [];

    for (const { token } of tokens) {
      const message = {
        message: {
          token,
          // 플랫폼 공통 notification (백그라운드 자동 표시용)
          notification: { title, body },
          webpush: {
            // webpush.notification이 있으면 notification을 덮어씀 →
            // title/body를 명시해야 브라우저가 올바르게 표시한다
            notification: {
              title,
              body,
              icon: '/icons/icon-192.png',
              badge: '/icons/icon-192.png',
              tag: type || 'default',
              requireInteraction: urgent || false,
            },
            fcm_options: { link: '/' },
          },
          data: {
            type: type || 'info',
            urgent: urgent ? 'true' : 'false',
          },
          android: { priority: urgent ? 'high' : 'normal' },
        },
      };

      const fcmRes = await fetch(fcmUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      if (fcmRes.ok) {
        sent++;
      } else {
        failed++;
        const errBody = await fcmRes.json().catch(() => ({}));
        const errCode = errBody?.error?.details?.[0]?.errorCode;
        console.error('[send-push] FCM 전송 실패:', fcmRes.status, errCode);
        if (errCode === 'UNREGISTERED' || fcmRes.status === 404) staleTokens.push(token);
      }
    }

    // 6. 만료 토큰 정리
    if (staleTokens.length > 0) {
      await supabase.from('fcm_tokens').delete().in('token', staleTokens);
    }

    const result = { sent, failed, cleaned: staleTokens.length };
    console.log('[send-push] 완료:', result);
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    const msg = errMsg(err);
    console.error('[send-push] 오류:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { snakeToCamel } from '../lib/dbHelpers';

const useAuthStore = create(
  persist(
    (set, get) => ({
      currentUser: null,
      session: null,
      isAuthenticated: false,
      workerToken: null,
      loading: true,

      // 앱 시작 시 Supabase Auth 세션 확인 및 리스너 등록
      initialize: async () => {
        set({ loading: true });

        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          const { data: profile } = await supabase
            .from('employees')
            .select('*')
            .eq('auth_user_id', session.user.id)
            .single();

          if (profile && profile.is_active) {
            set({
              currentUser: snakeToCamel(profile),
              session,
              isAuthenticated: true,
              loading: false,
            });
          } else {
            await supabase.auth.signOut();
            set({ currentUser: null, session: null, isAuthenticated: false, loading: false });
          }
        } else {
          // Supabase 세션 없음 → 작업자 토큰 재검증
          const { currentUser, workerToken } = get();
          if (currentUser?.role === 'worker' && workerToken) {
            const { data, error } = await supabase
              .from('employees')
              .select('device_token, is_active')
              .eq('id', currentUser.id)
              .maybeSingle();

            if (error || !data || data.device_token !== workerToken || !data.is_active) {
              set({ currentUser: null, isAuthenticated: false, workerToken: null, loading: false });
            } else {
              set({ loading: false });
            }
          } else {
            set({ loading: false });
          }
        }

        // Auth 상태 변화 리스너 등록
        supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_OUT') {
            set({ currentUser: null, session: null, isAuthenticated: false });
          } else if (event === 'TOKEN_REFRESHED' && session) {
            set({ session });
          }
        });
      },

      // 관리자용: Supabase Auth 이메일/비밀번호 로그인
      login: async (username, password) => {
        const email =
          username === 'greftukim'
            ? 'greftukim@gmail.com'
            : `${username}@gref.local`;

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { success: false, error: error.message };

        const { data: profile, error: profileError } = await supabase
          .from('employees')
          .select('*')
          .eq('auth_user_id', data.user.id)
          .single();

        if (profileError || !profile) {
          await supabase.auth.signOut();
          return { success: false, error: '직원 정보를 찾을 수 없습니다' };
        }

        if (!profile.is_active) {
          await supabase.auth.signOut();
          return { success: false, error: '비활성화된 계정입니다' };
        }

        set({
          currentUser: snakeToCamel(profile),
          session: data.session,
          isAuthenticated: true,
        });

        return { success: true, role: profile.role };
      },

      // 작업자용: QR 토큰으로 로그인 (Supabase Auth 미사용)
      // .maybeSingle(): RLS 0행 영향 시 PostgREST 406 차단 (QR 발급 hot-fix와 동일 패턴)
      loginWithDeviceToken: async (token) => {
        const { data, error } = await supabase
          .from('employees')
          .select('id, name, role, branch, is_active, is_team_leader, device_token, auth_user_id, job_type, work_start_time, work_end_time')
          .eq('device_token', token)
          .eq('is_active', true)
          .maybeSingle();

        if (error) return { success: false, error: error.message };
        if (!data) return { success: false, error: '유효하지 않거나 만료된 QR 코드입니다' };

        if (data.role !== 'worker') {
          return { success: false, error: '작업자만 QR 로그인을 사용할 수 있습니다' };
        }

        const user = snakeToCamel(data);
        set({ currentUser: user, isAuthenticated: true, workerToken: token });
        return { success: true };
      },

      // AuthCallbackPage 하위 호환
      loginWithToken: async (token) => {
        return get().loginWithDeviceToken(token);
      },

      // 앱 로드 시 작업자 토큰 유효성 재검증 (HydrationGate 호환)
      // .maybeSingle(): 0행 영향 시 silent failure 방지 (QR 발급 hot-fix와 동일 패턴)
      revalidateWorkerToken: async () => {
        const { currentUser, workerToken } = get();
        if (!currentUser || currentUser.role !== 'worker' || !workerToken) return;

        const { data, error } = await supabase
          .from('employees')
          .select('device_token')
          .eq('id', currentUser.id)
          .maybeSingle();

        if (error || !data || data.device_token !== workerToken) {
          set({ currentUser: null, isAuthenticated: false, workerToken: null });
        }
      },

      logout: async () => {
        const { currentUser } = get();
        if (currentUser?.role !== 'worker') {
          await supabase.auth.signOut();
        }
        set({ currentUser: null, session: null, isAuthenticated: false, workerToken: null });
      },
    }),
    {
      name: 'gref-auth',
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
        workerToken: state.workerToken,
      }),
    }
  )
);

export default useAuthStore;

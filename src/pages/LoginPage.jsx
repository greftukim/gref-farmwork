import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import { useTeamStore } from '../stores/team';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const setTeam = useTeamStore((s) => s.setTeam);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('관리자');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    setError('');
    setLoading(true);
    const result = await login(username, password);
    setLoading(false);
    if (result.success) {
      const role = result.role;
      if (role === 'worker') {
        setTeam('farm');
        navigate('/worker', { replace: true });
      } else if (role === 'master' || role === 'hr_admin') {
        setTeam('hq');
        navigate('/admin/hq', { replace: true });
      } else {
        setTeam('farm');
        navigate('/admin', { replace: true });
      }
    } else {
      setError(result.error || '아이디 또는 비밀번호가 올바르지 않습니다');
    }
  };

  const canSubmit = username.length > 0 && password.length > 0 && !loading;

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'Pretendard, system-ui', background: '#F7F8FA' }}>
      {/* 좌측 브랜드 패널 — 데스크톱 전용 */}
      <div
        className="hidden lg:flex flex-[1.1] relative overflow-hidden flex-col justify-between"
        style={{
          padding: '48px 56px',
          background: 'linear-gradient(135deg, #4338CA 0%, #4F46E5 50%, #6366F1 100%)',
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.1) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.08) 0%, transparent 40%)',
          }}
        />

        {/* 로고 */}
        <div className="relative flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22V12" />
              <path d="M12 12c0-3 2-5 5-6" />
              <path d="M12 12c0-3-2-5-5-6" />
              <path d="M5 3l7 9 7-9" />
            </svg>
          </div>
          <span className="text-white font-bold text-base">GREF Farm</span>
        </div>

        {/* 메인 카피 + 통계 */}
        <div className="relative text-white">
          <div
            className="text-xs font-semibold opacity-75 mb-4"
            style={{ letterSpacing: '0.06em' }}
          >
            SMART GREENHOUSE · HR
          </div>
          <h1 className="font-bold leading-tight mb-5" style={{ fontSize: 40, letterSpacing: -1, margin: 0, marginBottom: 20 }}>
            온실에서 사람까지,<br />
            한 화면에서 관리하세요.
          </h1>
          <p className="text-sm opacity-85 leading-relaxed max-w-sm">
            출근 기록, 작업 배정, 생육 조사, 이상 신고까지 — 현장의 모든 흐름을 실시간으로 확인합니다.
          </p>
          <div className="grid grid-cols-3 gap-4 mt-10 max-w-sm">
            {[
              { v: '20', l: '작업자' },
              { v: '4', l: '재배 작물' },
              { v: '3.2t', l: '주간 수확' },
            ].map((s, i) => (
              <div
                key={i}
                className="rounded-[10px]"
                style={{
                  padding: '14px 16px',
                  background: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
              >
                <div className="font-bold" style={{ fontSize: 22, letterSpacing: -0.5 }}>{s.v}</div>
                <div className="opacity-80 mt-0.5" style={{ fontSize: 11 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative" style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
          © 2026 GREF · 대한제강 자회사
        </div>
      </div>

      {/* 우측 로그인 폼 */}
      <div className="flex-1 flex items-center justify-center" style={{ padding: 40 }}>
        <div className="w-full" style={{ maxWidth: 360 }}>
          {/* 헤더 */}
          <div style={{ marginBottom: 32 }}>
            <h2 className="font-bold text-slate-900" style={{ fontSize: 24, letterSpacing: -0.4, margin: 0 }}>
              로그인
            </h2>
            <p className="text-slate-500" style={{ fontSize: 13, margin: '6px 0 0' }}>
              GREF Farm 인력관리 시스템에 접속합니다
            </p>
          </div>

          {/* 관리자/작업자 탭 */}
          <div
            className="flex mb-6 p-1 rounded-lg"
            style={{ background: '#F7F8FA', gap: 0 }}
          >
            {['관리자', '작업자'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => { setActiveTab(tab); setError(''); }}
                className="flex-1 text-center rounded-md transition-all"
                style={{
                  padding: '9px 0',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 0,
                  background: activeTab === tab ? '#FFFFFF' : 'transparent',
                  color: activeTab === tab ? '#0F172A' : '#94A3B8',
                  boxShadow: activeTab === tab ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* 작업자 탭 — QR 안내 */}
          {activeTab === '작업자' ? (
            <div className="text-center py-8 text-slate-500 text-sm leading-relaxed">
              <div className="text-3xl mb-3">📱</div>
              작업자는 모바일 앱에서<br />
              QR 코드로 출근합니다
            </div>
          ) : (
            /* 관리자 로그인 폼 */
            <form onSubmit={handleSubmit}>
              {/* 아이디 */}
              <div style={{ marginBottom: 14 }}>
                <label
                  className="block font-semibold text-slate-900"
                  style={{ fontSize: 12, marginBottom: 6 }}
                >
                  아이디
                </label>
                <div
                  className="flex items-center transition-all"
                  style={{
                    padding: '0 14px',
                    background: '#FFFFFF',
                    border: `1px solid ${error ? '#F87171' : '#E5E7EB'}`,
                    borderRadius: 8,
                    height: 42,
                  }}
                >
                  <input
                    type="text"
                    placeholder="아이디를 입력하세요"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setError(''); }}
                    className="flex-1 bg-transparent outline-none text-slate-900 placeholder:text-slate-400"
                    style={{ fontSize: 14 }}
                  />
                </div>
              </div>

              {/* 비밀번호 */}
              <div style={{ marginBottom: 14 }}>
                <label
                  className="block font-semibold text-slate-900"
                  style={{ fontSize: 12, marginBottom: 6 }}
                >
                  비밀번호
                </label>
                <div
                  className="flex items-center transition-all"
                  style={{
                    padding: '0 14px',
                    background: '#FFFFFF',
                    border: `1px solid ${error ? '#F87171' : '#E5E7EB'}`,
                    borderRadius: 8,
                    height: 42,
                  }}
                >
                  <input
                    type="password"
                    placeholder="비밀번호를 입력하세요"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    className="flex-1 bg-transparent outline-none text-slate-900 placeholder:text-slate-400"
                    style={{ fontSize: 14 }}
                  />
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </div>
              </div>

              {error && <p className="text-red-500" style={{ fontSize: 12, marginBottom: 8 }}>{error}</p>}

              {/* 로그인 유지 + 비밀번호 찾기 */}
              <div className="flex items-center justify-between" style={{ margin: '20px 0 24px', fontSize: 12 }}>
                <label className="flex items-center gap-1.5 text-slate-500 cursor-pointer">
                  <div
                    className="flex items-center justify-center rounded"
                    style={{ width: 16, height: 16, background: '#4F46E5' }}
                  >
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  로그인 유지
                </label>
                <span className="font-semibold cursor-pointer" style={{ color: '#4F46E5' }}>
                  비밀번호 찾기
                </span>
              </div>

              {/* 로그인 버튼 */}
              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full font-bold transition-all active:scale-[0.98]"
                style={{
                  height: 44,
                  borderRadius: 8,
                  border: 0,
                  fontSize: 14,
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                  background: canSubmit ? '#4F46E5' : '#E5E7EB',
                  color: canSubmit ? '#fff' : '#9CA3AF',
                  boxShadow: canSubmit ? '0 2px 4px rgba(79,70,229,0.3)' : 'none',
                }}
              >
                {loading ? '로그인 중...' : '로그인'}
              </button>
            </form>
          )}

          <div className="text-center text-slate-400 mt-6" style={{ fontSize: 11 }}>
            작업자는 모바일 앱에서도 접속 가능합니다 · v2.4.1
          </div>
        </div>
      </div>
    </div>
  );
}

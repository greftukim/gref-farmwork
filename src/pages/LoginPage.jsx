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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    setError('');
    setLoading(true);
    const result = await login(username, password);
    setLoading(false);
    if (result.success) {
      const role = result.role;
      // eslint-disable-next-line no-console
      console.log('[DEBUG LOGIN] role:', role, 'result:', result);
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* 로고 */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <img src="/icons/icon-192.png" alt="GREF" className="w-10 h-10 rounded-xl" />
          <span className="text-xl font-heading font-bold text-gray-900">GREF FarmWork</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">관리자 로그인</h2>
          <p className="text-gray-400 mb-8">온실 인력관리 시스템에 로그인하세요</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">아이디</label>
              <input
                type="text"
                placeholder="아이디를 입력하세요"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                className={`w-full rounded-xl px-4 py-3 text-sm min-h-[48px] outline-none transition-all
                  border ${error ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'}
                  focus:ring-2 focus:ring-blue-500/20 placeholder:text-gray-400`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">비밀번호</label>
              <input
                type="password"
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className={`w-full rounded-xl px-4 py-3 text-sm min-h-[48px] outline-none transition-all
                  border ${error ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'}
                  focus:ring-2 focus:ring-blue-500/20 placeholder:text-gray-400`}
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full text-white text-base font-bold rounded-xl
                min-h-[48px] active:scale-95 transition-all mt-2 ${
                  canSubmit
                    ? 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/20'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                }`}
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </div>

        <div className="flex justify-center mt-6">
          <img src="/images/login-bear.png" alt="" className="w-[120px] opacity-80" />
        </div>
        <p className="text-xs text-gray-400 text-center mt-4">
          © GREF FarmWork · 대한제강 부산LAB
        </p>
      </div>
    </div>
  );
}

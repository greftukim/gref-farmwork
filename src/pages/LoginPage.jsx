import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const loginWithPassword = useAuthStore((s) => s.loginWithPassword);
  const [team, setTeam] = useState('farm');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    setError('');
    const result = await loginWithPassword(username, password, team);
    if (result.success) {
      navigate('/admin', { replace: true });
    } else {
      setError('아이디 또는 비밀번호가 올바르지 않습니다');
    }
  };

  const canSubmit = username.length > 0 && password.length > 0;

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

          {/* 팀 선택 */}
          <div className="flex gap-2 mb-6">
            {[
              { key: 'farm', label: '재배팀' },
              { key: 'management', label: '관리팀' },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTeam(t.key)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
                  team === t.key
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

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
              로그인
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

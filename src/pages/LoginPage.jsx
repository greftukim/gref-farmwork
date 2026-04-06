import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import useEmployeeStore from '../stores/employeeStore';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

// ─── 작업자 로그인 (모바일): 직원 선택 + PIN ───
function WorkerLogin() {
  const navigate = useNavigate();
  const loginWithPin = useAuthStore((s) => s.loginWithPin);
  const allEmployees = useEmployeeStore((s) => s.employees);
  const workers = useMemo(() => allEmployees.filter((e) => e.isActive && e.role === 'worker'), [allEmployees]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handlePinPress = (digit) => {
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
      setError('');
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleSubmit = async () => {
    if (!selectedEmployee || pin.length !== 6) return;
    const result = await loginWithPin(selectedEmployee.id, pin);
    if (result.success) {
      navigate('/worker', { replace: true });
    } else {
      setError('PIN이 올바르지 않습니다');
      setPin('');
    }
  };

  if (!selectedEmployee) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-6 py-10">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center mb-4">
          <span className="text-white text-xl font-bold">G</span>
        </div>
        <h1 className="text-2xl font-heading font-bold text-white mb-1">GREF FarmWork</h1>
        <p className="text-blue-300 text-lg mb-8">반갑습니다</p>
        <div className="w-full max-w-sm space-y-3">
          {workers.map((emp) => (
            <button
              key={emp.id}
              onClick={() => setSelectedEmployee(emp)}
              className="w-full bg-slate-800/80 hover:bg-slate-700 text-white
                rounded-2xl px-5 py-4 text-left transition-all
                active:scale-95 min-h-[56px] flex items-center gap-4
                border border-slate-700/50"
            >
              <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-400 font-bold">{emp.name?.[0]}</span>
              </div>
              <div>
                <div className="font-medium text-lg">{emp.name}</div>
                <div className="text-sm text-slate-400">{emp.jobType} · {emp.empNo}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const pinFilled = pin.length === 6;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center pt-16 px-6">
      <button
        onClick={() => { setSelectedEmployee(null); setPin(''); setError(''); }}
        className="text-blue-300 mb-8 min-h-[44px] flex items-center gap-1 text-sm"
      >
        ← 직원 선택으로
      </button>
      <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center mb-3">
        <span className="text-blue-400 font-bold text-lg">{selectedEmployee.name?.[0]}</span>
      </div>
      <h1 className="text-xl font-heading font-bold text-white mb-1">{selectedEmployee.name}</h1>
      <p className="text-slate-400 mb-8">PIN 6자리를 입력하세요</p>

      {/* 6개 동그라미 */}
      <div className="flex gap-3 mb-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-all duration-200 ${
              i < pin.length ? 'bg-blue-500 scale-110' : 'border-2 border-slate-600'
            }`}
          />
        ))}
      </div>

      {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
      <div className="h-4" />

      {/* 대형 숫자 패드 (화면 50%) */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-[320px]">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
          <button
            key={digit}
            onClick={() => handlePinPress(String(digit))}
            className="bg-slate-800 hover:bg-slate-700 text-white text-2xl font-semibold
              rounded-2xl h-16 active:scale-95 transition-all border border-slate-700/50"
          >
            {digit}
          </button>
        ))}
        <button
          onClick={handleDelete}
          className="bg-slate-800/50 hover:bg-slate-700 text-slate-400 text-lg
            rounded-2xl h-16 active:scale-95 transition-all"
        >
          ⌫
        </button>
        <button
          onClick={() => handlePinPress('0')}
          className="bg-slate-800 hover:bg-slate-700 text-white text-2xl font-semibold
            rounded-2xl h-16 active:scale-95 transition-all border border-slate-700/50"
        >
          0
        </button>
        <button
          onClick={handleSubmit}
          disabled={!pinFilled}
          className={`text-white text-base font-bold rounded-2xl h-16
            active:scale-95 transition-all ${
              pinFilled
                ? 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/30'
                : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
            }`}
        >
          확인
        </button>
      </div>
    </div>
  );
}

// ─── 관리자 로그인 (PC): 2분할 레이아웃 ───
function AdminLogin() {
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
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <span className="text-white text-lg font-bold">G</span>
          </div>
          <span className="text-xl font-heading font-bold text-gray-900">GREF FarmWork</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">관리자 로그인</h2>
          <p className="text-gray-400 mb-8">온실 인력관리 시스템에 로그인하세요</p>

          {/* 팀 선택 */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setTeam('farm')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
                team === 'farm'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              재배팀
            </button>
            <button
              type="button"
              onClick={() => setTeam('management')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
                team === 'management'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              관리팀
            </button>
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

// ─── 메인: 디바이스에 따라 분기 ───
export default function LoginPage() {
  const isMobile = useIsMobile();

  useEffect(() => {
    useEmployeeStore.getState().fetchEmployees();
  }, []);

  return isMobile ? <WorkerLogin /> : <AdminLogin />;
}

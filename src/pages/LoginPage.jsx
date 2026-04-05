import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import useEmployeeStore from '../stores/employeeStore';
import Button from '../components/common/Button';

function DebugPanel() {
  const [info, setInfo] = useState({});
  const [show, setShow] = useState(false);

  useEffect(() => {
    const gather = () => {
      try {
        const raw = localStorage.getItem('gref-auth');
        const parsed = raw ? JSON.parse(raw) : null;
        const storeState = useAuthStore.getState();
        setInfo({
          localStorage: raw ? `저장됨 (${raw.length}B)` : '비어있음',
          lsAuth: parsed?.state?.isAuthenticated ?? 'N/A',
          lsUser: parsed?.state?.currentUser?.name ?? 'N/A',
          storeAuth: String(storeState.isAuthenticated),
          storeUser: storeState.currentUser?.name ?? 'null',
          hydrated: String(useAuthStore.persist.hasHydrated()),
          swCount: 'checking...',
        });
        navigator.serviceWorker?.getRegistrations().then((regs) => {
          setInfo((prev) => ({ ...prev, swCount: String(regs.length) }));
        });
      } catch (e) {
        setInfo({ error: e.message });
      }
    };
    gather();
  }, [show]);

  return (
    <div className="fixed bottom-2 left-2 z-50">
      <button onClick={() => setShow(!show)}
        className="bg-gray-800/80 text-white text-xs px-2 py-1 rounded">
        {show ? '닫기' : '디버그'}
      </button>
      {show && (
        <div className="bg-gray-900/95 text-emerald-300 text-xs p-3 rounded-lg mt-1 space-y-1 max-w-[280px]">
          {Object.entries(info).map(([k, v]) => (
            <div key={k}><span className="text-gray-400">{k}:</span> {v}</div>
          ))}
          <button onClick={() => { localStorage.removeItem('gref-auth'); window.location.reload(); }}
            className="mt-2 bg-red-600 text-white px-2 py-1 rounded text-xs w-full">
            캐시 초기화 + 새로고침
          </button>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const allEmployees = useEmployeeStore((s) => s.employees);
  const employees = useMemo(() => allEmployees.filter((e) => e.isActive), [allEmployees]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    useEmployeeStore.getState().fetchEmployees();
  }, []);

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
    const result = await login(selectedEmployee.id, pin);
    if (result.success) {
      navigate(result.role === 'admin' ? '/admin' : '/worker', { replace: true });
    } else {
      setError('PIN이 올바르지 않습니다');
      setPin('');
    }
  };

  if (!selectedEmployee) {
    return (
      <div className="min-h-screen bg-emerald-950 flex flex-col items-center justify-center p-6">
        <DebugPanel />
        <h1 className="text-2xl font-heading font-bold text-white mb-2">GREF FarmWork</h1>
        <p className="text-emerald-300 mb-8">직원을 선택하세요</p>
        <div className="w-full max-w-sm space-y-3">
          {employees.map((emp) => (
            <button
              key={emp.id}
              onClick={() => setSelectedEmployee(emp)}
              className="w-full bg-emerald-900/50 hover:bg-emerald-800 text-white
                rounded-xl px-5 py-4 text-left transition-colors
                active:scale-[0.98] min-h-[56px] flex items-center justify-between"
            >
              <div>
                <div className="font-medium text-lg">{emp.name}</div>
                <div className="text-sm text-emerald-300">{emp.jobType} · {emp.empNo}</div>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-emerald-800 text-emerald-200">
                {emp.role === 'admin' ? '관리자' : '작업자'}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-emerald-950 flex flex-col items-center justify-center p-6">
      <button
        onClick={() => { setSelectedEmployee(null); setPin(''); setError(''); }}
        className="text-emerald-300 mb-6 min-h-[44px] flex items-center gap-1"
      >
        ← 직원 선택으로
      </button>
      <h1 className="text-xl font-heading font-bold text-white mb-1">{selectedEmployee.name}</h1>
      <p className="text-emerald-300 mb-8">PIN 6자리를 입력하세요</p>

      <div className="flex gap-2.5 mb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full ${
              i < pin.length ? 'bg-emerald-400' : 'bg-emerald-800'
            }`}
          />
        ))}
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] mb-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
          <button
            key={digit}
            onClick={() => handlePinPress(String(digit))}
            className="bg-emerald-900/50 hover:bg-emerald-800 text-white text-2xl font-medium
              rounded-xl min-h-[64px] min-w-[64px] active:scale-[0.98] transition-all"
          >
            {digit}
          </button>
        ))}
        <button
          onClick={handleDelete}
          className="bg-emerald-900/30 hover:bg-emerald-800 text-emerald-300 text-lg
            rounded-xl min-h-[64px] min-w-[64px] active:scale-[0.98] transition-all"
        >
          ⌫
        </button>
        <button
          onClick={() => handlePinPress('0')}
          className="bg-emerald-900/50 hover:bg-emerald-800 text-white text-2xl font-medium
            rounded-xl min-h-[64px] min-w-[64px] active:scale-[0.98] transition-all"
        >
          0
        </button>
        <button
          onClick={handleSubmit}
          disabled={pin.length !== 6}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-base font-medium
            rounded-xl min-h-[64px] min-w-[64px] active:scale-[0.98] transition-all
            disabled:opacity-40 disabled:pointer-events-none"
        >
          확인
        </button>
      </div>
    </div>
  );
}

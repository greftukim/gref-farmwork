import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const loginWithToken = useAuthStore((s) => s.loginWithToken);
  const [status, setStatus] = useState('checking'); // 'checking' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setErrorMsg('잘못된 QR 코드입니다');
      return;
    }

    loginWithToken(token).then((result) => {
      if (result.success) {
        const user = useAuthStore.getState().currentUser;
        const dest = user?.role === 'admin' ? '/admin' : '/worker';
        navigate(dest, { replace: true });
      } else {
        setStatus('error');
        setErrorMsg('QR 코드가 만료되었거나 유효하지 않습니다. 관리자에게 QR을 재발급 받으세요.');
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-blue-300 text-sm">인증 확인 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-6 text-center">
      <div className="text-6xl mb-6">📵</div>
      <h2 className="text-xl font-bold text-white mb-3">QR 코드를 다시 스캔하세요</h2>
      <p className="text-slate-400 text-sm max-w-xs">{errorMsg}</p>
    </div>
  );
}

import { useState, useEffect } from 'react';

const DISMISSED_KEY = 'pwa-install-dismissed';
const DISMISS_DAYS = 7;

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function isDismissed() {
  const val = localStorage.getItem(DISMISSED_KEY);
  if (!val) return false;
  return Date.now() - Number(val) < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isIosSafari() {
  return isIos() && /safari/i.test(navigator.userAgent) && !/crios|fxios|opios/i.test(navigator.userAgent);
}

/**
 * PWA 설치 안내 훅
 * returns: { showPrompt, promptType, triggerInstall, dismiss }
 *   - showPrompt: 팝업 표시 여부
 *   - promptType: 'android' | 'ios' | null
 *   - triggerInstall: Android에서 설치 프롬프트 호출
 *   - dismiss: 나중에 (7일 숨김)
 */
export default function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [promptType, setPromptType] = useState(null); // 'android' | 'ios'

  useEffect(() => {
    // 이미 설치(standalone) 또는 최근에 닫은 경우 표시 안 함
    if (isStandalone() || isDismissed()) return;

    // Android Chrome: beforeinstallprompt 캐치
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPromptType('android');
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS Safari: beforeinstallprompt 미지원 → 직접 감지
    if (isIosSafari()) {
      setPromptType('ios');
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const triggerInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setPromptType(null);
    if (outcome === 'dismissed') {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setPromptType(null);
    setDeferredPrompt(null);
  };

  return {
    showPrompt: !!promptType,
    promptType,
    triggerInstall,
    dismiss,
  };
}

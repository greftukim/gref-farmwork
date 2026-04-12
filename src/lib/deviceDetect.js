/**
 * iOS PWA 알림 호환성 감지 유틸
 * IOS-001
 */

const ua = () => navigator.userAgent || '';

// iOS 감지 (iPad 13+ 포함)
export function isIOS() {
  const u = ua();
  return /iPad|iPhone|iPod/.test(u) || (u.includes('Mac') && 'ontouchend' in document);
}

// iOS 버전 추출 ([major, minor] 또는 null)
export function getIOSVersion() {
  const m = ua().match(/OS (\d+)_(\d+)/);
  return m ? [parseInt(m[1]), parseInt(m[2])] : null;
}

// iOS 16.4 미만 (웹 푸시 미지원)
export function isIOSPushUnsupported() {
  if (!isIOS()) return false;
  const v = getIOSVersion();
  if (!v) return false;
  return v[0] < 16 || (v[0] === 16 && v[1] < 4);
}

// 인앱 브라우저 감지 (카카오톡, 네이버)
export function getInAppBrowser() {
  const u = ua();
  if (/KAKAOTALK/i.test(u)) return 'kakaotalk';
  if (/NAVER/i.test(u))     return 'naver';
  return null;
}

// iOS Safari 여부 (Chrome iOS, 인앱 브라우저 제외)
export function isIOSSafari() {
  if (!isIOS()) return false;
  if (getInAppBrowser()) return false;
  const u = ua();
  // CriOS = Chrome iOS, FxiOS = Firefox iOS, EdgiOS = Edge iOS
  if (/CriOS|FxiOS|EdgiOS/i.test(u)) return false;
  return /Safari/i.test(u);
}

// 이미 PWA(홈 화면 추가)로 실행 중인지
export function isStandalone() {
  return window.navigator.standalone === true ||
         window.matchMedia('(display-mode: standalone)').matches;
}

/**
 * 안내 모달 표시 여부 + 안내 타입 결정
 * @returns {'inapp' | 'ios_safari' | 'ios_outdated' | null}
 *   inapp        - 카카오톡/네이버 → Safari로 열기 안내
 *   ios_safari   - iOS Safari → 홈 화면 추가 안내
 *   ios_outdated - iOS 16.4 미만 → 업데이트 안내
 *   null         - 안내 불필요 (안드로이드, 데스크톱, 이미 PWA 설치 등)
 */
export function getGuideType() {
  // 이미 PWA로 실행 중이면 안내 불필요
  if (isStandalone()) return null;

  // 인앱 브라우저 (iOS·안드로이드 모두) → Safari/Chrome 안내
  // ⚠️ 안드로이드 카카오톡도 인앱 브라우저이므로 안내 대상
  if (getInAppBrowser()) return 'inapp';

  // iOS 전용 분기
  if (isIOS()) {
    if (isIOSPushUnsupported()) return 'ios_outdated';
    if (isIOSSafari())          return 'ios_safari';
    // iOS Chrome/Firefox → Safari로 열기 안내 (inapp과 동일 메시지)
    return 'inapp';
  }

  // 안드로이드 Chrome 등 → 자동 PWA 안내 + 푸시 정상 → 안내 불필요
  return null;
}

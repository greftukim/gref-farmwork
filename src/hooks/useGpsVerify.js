import { useState, useCallback } from 'react';
import useLocationStore from '../stores/locationStore';

/**
 * GPS 위치 검증 훅
 *
 * status:
 *   'idle'     — 아직 검증 안 함
 *   'checking' — GPS 위치 요청 중
 *   'inside'   — 온실 반경 안
 *   'outside'  — 온실 반경 밖
 *   'error'    — GPS 권한 거부 또는 오류
 */
export default function useGpsVerify() {
  const isWithinRadius = useLocationStore((s) => s.isWithinRadius);
  const [status, setStatus] = useState('idle');
  const [position, setPosition] = useState(null); // { lat, lng }
  const [distance, setDistance] = useState(null);  // 온실까지 거리(m)
  const [error, setError] = useState(null);

  const verify = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('error');
      setError('이 기기는 GPS를 지원하지 않습니다');
      return;
    }

    setStatus('checking');
    setError(null);
    setPosition(null);
    setDistance(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const { inside, distance: dist } = isWithinRadius(lat, lng);
        setPosition({ lat, lng });
        setDistance(dist);
        setStatus(inside ? 'inside' : 'outside');
      },
      (err) => {
        setStatus('error');
        const msgs = {
          1: 'GPS 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요',
          2: 'GPS 신호를 받을 수 없습니다',
          3: 'GPS 요청 시간이 초과되었습니다',
        };
        setError(msgs[err.code] || `GPS 오류 (${err.code}): ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [isWithinRadius]);

  return { status, position, distance, error, verify };
}

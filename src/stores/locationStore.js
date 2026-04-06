import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 부산LAB 온실 기본 좌표 (관리자 설정 화면에서 실제 좌표로 수정 필요)
const DEFAULT = {
  name: '부산LAB 온실',
  lat: 35.0956,
  lng: 128.9746,
  radius: 200, // 허용 반경 (미터)
};

/** Haversine 공식 — 두 위경도 좌표 간 거리(m) 반환 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const useLocationStore = create(
  persist(
    (set, get) => ({
      location: { ...DEFAULT },

      setLocation: (updates) =>
        set((s) => ({ location: { ...s.location, ...updates } })),

      resetToDefault: () => set({ location: { ...DEFAULT } }),

      /** 주어진 GPS 좌표가 온실 반경 안인지 확인 */
      isWithinRadius: (lat, lng) => {
        const { location } = get();
        const distance = Math.round(haversineDistance(location.lat, location.lng, lat, lng));
        return { inside: distance <= location.radius, distance };
      },
    }),
    { name: 'gref-location' }
  )
);

export default useLocationStore;

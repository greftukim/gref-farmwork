import { create } from 'zustand';

// HR 관리자용 지점 선택 필터 (지점이 없는 관리자만 사용)
const useBranchFilterStore = create((set) => ({
  selectedBranch: null, // null = 전체 지점
  setSelectedBranch: (branch) => set({ selectedBranch: branch }),
}));

export default useBranchFilterStore;

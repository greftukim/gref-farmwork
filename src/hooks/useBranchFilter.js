import useAuthStore from '../stores/authStore';
import useBranchFilterStore from '../stores/branchFilterStore';

/**
 * 지점 필터 훅
 * - 재배팀 관리자: currentUser.branch 자동 고정 (변경 불가)
 * - 인사팀/전체 관리자: selectedBranch로 수동 선택 (null = 전체)
 */
export default function useBranchFilter() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const { selectedBranch, setSelectedBranch } = useBranchFilterStore();

  const isFarmAdmin = !!currentUser?.branch;
  const branchFilter = isFarmAdmin ? currentUser.branch : selectedBranch;

  return { branchFilter, isFarmAdmin, setSelectedBranch };
}

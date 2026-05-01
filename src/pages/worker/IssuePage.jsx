// 트랙 77 U5 (G77-G): 이상 신고는 IssueModal로 이전됨.
// 기존 URL `/worker/issues` 진입 시 홈으로 리다이렉트 (북마크 호환).
import { Navigate } from 'react-router-dom';

export default function IssuePage() {
  return <Navigate to="/worker" replace />;
}

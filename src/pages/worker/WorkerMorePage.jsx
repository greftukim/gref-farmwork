import { Link } from 'react-router-dom';
import Card from '../../components/common/Card';

const menuItems = [
  { to: '/worker/leave', label: '휴가 신청', desc: '연차/반차 신청 및 조회', accent: 'blue' },
  { to: '/worker/issues', label: '이상 신고', desc: '병해충, 시설이상 등 신고', accent: 'red' },
  { to: '/worker/emergency', label: '긴급 호출', desc: '관리자에게 긴급 연락', accent: 'red' },
  { to: '/worker/notices', label: '공지사항', desc: '관리자 공지 확인', accent: 'blue' },
];

export default function WorkerMorePage() {
  return (
    <div>
      <h2 className="text-lg font-heading font-semibold text-gray-900 mb-4">더보기</h2>
      <div className="space-y-3">
        {menuItems.map((item) => (
          <Link key={item.to} to={item.to}>
            <Card accent={item.accent} className="p-4 active:scale-[0.98] transition-transform">
              <div className="font-medium text-gray-900">{item.label}</div>
              <div className="text-sm text-gray-500">{item.desc}</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

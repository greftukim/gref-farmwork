import useAuthStore from '../../stores/authStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

export default function WorkerHome() {
  const currentUser = useAuthStore((s) => s.currentUser);

  return (
    <div>
      <h2 className="text-lg font-heading font-semibold text-gray-900 mb-4">
        {currentUser?.name}님, 안녕하세요
      </h2>

      <Card accent="emerald" className="p-5 mb-4">
        <div className="text-sm text-gray-500 mb-3">출퇴근</div>
        <div className="flex gap-3">
          <Button size="lg" className="flex-1">출근</Button>
          <Button size="lg" variant="secondary" className="flex-1">퇴근</Button>
        </div>
      </Card>

      <Card accent="blue" className="p-5 mb-4">
        <div className="text-sm text-gray-500 mb-2">오늘의 작업</div>
        <p className="text-gray-400 text-sm">배정된 작업이 없습니다</p>
      </Card>

      <Button variant="danger" size="lg" className="w-full">
        긴급 호출
      </Button>
    </div>
  );
}

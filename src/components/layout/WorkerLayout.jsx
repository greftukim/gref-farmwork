import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import BottomNav from './BottomNav';

export default function WorkerLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <TopBar />
      <main className="flex-1 px-4 py-4 pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

import { useCallback, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import ToastContainer from '../common/ToastContainer';
import useDataLoader from '../../hooks/useDataLoader';
import useRealtimeSubscriptions from '../../hooks/useRealtimeSubscriptions';
import useNotificationStore from '../../stores/notificationStore';
import { requestNotificationPermission, onForegroundMessage } from '../../lib/firebase';

export default function AdminLayout() {
  useDataLoader();

  const addNotification = useNotificationStore((s) => s.addNotification);

  const handleNotification = useCallback((n) => {
    addNotification(n);
  }, [addNotification]);

  useRealtimeSubscriptions(handleNotification);

  useEffect(() => {
    requestNotificationPermission();
    const unsub = onForegroundMessage((msg) => {
      addNotification(msg);
    });
    return unsub;
  }, [addNotification]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}

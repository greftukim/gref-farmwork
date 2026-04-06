import useNotificationStore from '../../stores/notificationStore';

const typeStyles = {
  task_completed: { bg: 'bg-emerald-600', icon: '✅' },
  emergency_call: { bg: 'bg-red-600', icon: '🚨' },
  issue_report: { bg: 'bg-amber-600', icon: '⚠️' },
  info: { bg: 'bg-blue-600', icon: 'ℹ️' },
  fcm_error: { bg: 'bg-rose-700', icon: '🔕' },
};

export default function ToastContainer() {
  const notifications = useNotificationStore((s) => s.notifications);
  const removeNotification = useNotificationStore((s) => s.removeNotification);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {notifications.map((n) => {
        const style = typeStyles[n.type] || typeStyles.info;
        return (
          <div
            key={n.id}
            className={`${style.bg} text-white rounded-xl shadow-lg px-4 py-3 pointer-events-auto
              animate-[slideInRight_0.3s_ease-out] ${n.urgent ? 'ring-2 ring-red-300' : ''}`}
          >
            <div className="flex items-start gap-3">
              <span className="text-lg flex-shrink-0">{style.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{n.title}</div>
                <div className="text-xs text-white/80 mt-0.5 line-clamp-2">{n.message}</div>
              </div>
              <button
                onClick={() => removeNotification(n.id)}
                className="text-white/60 hover:text-white text-sm flex-shrink-0 min-w-[32px] min-h-[32px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

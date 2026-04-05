import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import useTaskStore from '../stores/taskStore';
import useCallStore from '../stores/callStore';
import useIssueStore from '../stores/issueStore';

export default function useRealtimeSubscriptions(onNotification) {
  useEffect(() => {
    const channel = supabase
      .channel('db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          useTaskStore.getState().fetchTasks();
          if (payload.eventType === 'UPDATE' && payload.new.status === 'completed') {
            onNotification?.({
              type: 'task_completed',
              title: '작업 완료',
              message: `${payload.new.title} 작업이 완료되었습니다`,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'calls' },
        (payload) => {
          useCallStore.getState().fetchCalls();
          onNotification?.({
            type: 'emergency_call',
            title: '긴급 호출',
            message: `${payload.new.type}: ${payload.new.memo || '긴급 호출이 접수되었습니다'}`,
            urgent: true,
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'issues' },
        (payload) => {
          useIssueStore.getState().fetchIssues();
          onNotification?.({
            type: 'issue_report',
            title: '이상 신고',
            message: `[${payload.new.type}] ${payload.new.comment || '이상 신고가 접수되었습니다'}`,
            urgent: payload.new.type === '병해충',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onNotification]);
}

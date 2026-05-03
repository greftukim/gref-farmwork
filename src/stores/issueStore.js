import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { snakeToCamel } from '../lib/dbHelpers';
import { sendPushToAdmins } from '../lib/pushNotify';
import { uploadIssuePhotos } from '../lib/issueStorage';

// 트랙 77 후속 U11: 사진 첨부 활성화. addIssue 시그니처 확장 (photos 배열 추가).
//   - issue INSERT 후 사진 업로드 + issue_photos INSERT
//   - 부분 실패 (issue 성공, 사진 실패) 시 'PHOTO_UPLOAD_FAILED' throw → 호출자 toast 분기
const useIssueStore = create((set) => ({
  issues: [],
  loading: false,

  fetchIssues: async (currentUser) => {
    set({ loading: true });
    // [TRACK77-U13] issue_photos LEFT JOIN — 관리자 상세 모달에서 사진 표시
    // PostgREST nested resource 문법: photos:issue_photos(...)
    // photo_order는 클라이언트 측 정렬 (G77-W: PostgREST nested ORDER BY 환경 차이 회피)
    let query = supabase
      .from('issues')
      .select('*, photos:issue_photos(id, photo_url, photo_path, photo_order, created_at)')
      .order('created_at', { ascending: false });
    if (currentUser?.role === 'farm_admin' && currentUser?.branch) {
      const { data: branchEmps } = await supabase.from('employees').select('id').eq('branch', currentUser.branch);
      const empIds = (branchEmps || []).map((e) => e.id);
      if (empIds.length > 0) query = query.in('worker_id', empIds);
    }
    const { data } = await query;
    if (data) {
      set({
        issues: data.map((d) => {
          const camel = snakeToCamel(d);
          // photos 키 유지 (snakeToCamel 후에도 nested 배열은 그대로) + photo_order 클라이언트 정렬
          const sortedPhotos = Array.isArray(camel.photos)
            ? [...camel.photos].sort((a, b) => (a.photoOrder ?? 0) - (b.photoOrder ?? 0))
            : [];
          return {
            ...camel,
            photos: sortedPhotos,
            status: d.is_resolved ? 'resolved' : 'pending',
          };
        }),
      });
    }
    set({ loading: false });
  },

  addIssue: async (issue) => {
    // 1. issues INSERT (사진 0장도 정상 동작)
    const { data, error } = await supabase.from('issues').insert({
      worker_id: issue.workerId,
      zone_id: issue.zoneId,
      type: issue.type,
      comment: issue.comment,
      photo: issue.photo, // 호환성 보존 (단일 photo 컬럼). 다중 사진은 issue_photos 별 테이블
    }).select().single();
    if (error || !data) return;

    set((s) => ({ issues: [...s.issues, snakeToCamel(data)] }));

    // 2. 푸시 알림 (fire-and-forget — 사진 업로드 결과 무관, issue 본문 자체는 전달됨)
    const senderPrefix = issue.workerName ? `[${issue.workerName}] ` : '';
    sendPushToAdmins({
      title: `${senderPrefix}작물 이상 신고`,
      body: `[${issue.type}] ${issue.comment || '이상 신고가 접수되었습니다'}`,
      type: 'issue_report',
      urgent: issue.type === '병해충',
    }).catch((pushErr) => console.error('[issueStore] 푸시 전송 실패:', pushErr));

    // 3. 사진 업로드 (선택, photos 배열 있을 때만)
    // 트랙 77 후속 U11: 부분 실패 시 PHOTO_UPLOAD_FAILED throw → 호출자 toast warning 분기.
    if (Array.isArray(issue.photos) && issue.photos.length > 0) {
      try {
        const uploaded = await uploadIssuePhotos({
          workerId: issue.workerId,
          issueId: data.id,
          photos: issue.photos,
        });
        if (uploaded.length > 0) {
          const photoRows = uploaded.map((p, idx) => ({
            issue_id: data.id,
            photo_url: p.url,
            photo_path: p.path,
            photo_order: idx,
          }));
          const { error: photoErr } = await supabase
            .from('issue_photos')
            .insert(photoRows);
          if (photoErr) {
            console.error('[issueStore] issue_photos INSERT 실패:', photoErr.message);
            throw new Error('PHOTO_UPLOAD_FAILED');
          }
        }
      } catch (storageErr) {
        console.error('[issueStore] 사진 업로드 실패:', storageErr?.message || storageErr);
        throw new Error('PHOTO_UPLOAD_FAILED');
      }
    }
  },

  updateIssue: async (id, patch) => {
    if (patch.status === 'in_progress') {
      // is_resolved 컬럼만 존재 — in_progress는 로컬 상태만 반영
      set((s) => ({ issues: s.issues.map((i) => (i.id === id ? { ...i, status: 'in_progress' } : i)) }));
      return;
    }
    if (patch.status === 'resolved') {
      const { data } = await supabase.from('issues').update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
      }).eq('id', id).select().single();
      if (data) {
        set((s) => ({ issues: s.issues.map((i) => (i.id === id ? { ...snakeToCamel(data), status: 'resolved' } : i)) }));
      }
    }
  },

  resolveIssue: async (issueId, resolverId) => {
    const { data } = await supabase.from('issues').update({
      is_resolved: true,
      resolved_by: resolverId,
      resolved_at: new Date().toISOString(),
    }).eq('id', issueId).select().single();
    if (data) {
      set((s) => ({ issues: s.issues.map((i) => (i.id === issueId ? snakeToCamel(data) : i)) }));
    }
  },
}));

export default useIssueStore;

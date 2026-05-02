// 이상신고 사진 Storage 헬퍼 — 트랙 77 후속 U11
// G-Storage-1: 최대 3장
// G-Storage-3: 1280px / JPEG 80% 압축
// G-Storage-5: 자동 재시도 1회 + 실패 시 throw → 호출자가 toast
//
// 작업자 인증: Supabase Auth 미사용 (anon 컨텍스트). Storage 버킷 RLS는 anon INSERT 허용 필요.
//   상세: docs/migrations/U11_issue_photos.sql §3 (Storage RLS)
//   본 라운드 정책: 단순 anon INSERT 허용 (보안 강화는 BACKLOG TRACK77-AUTH-RLS-WORKER-001 별 트랙)

import { supabase } from './supabase';
import { compressImage } from './imageCompress';

const BUCKET = 'issue_photos';
export const MAX_PHOTOS = 3;

/**
 * 단일 사진 업로드 (자동 재시도 1회 포함).
 * @returns {Promise<{ path: string, url: string }>}
 */
async function uploadIssuePhotoOnce({ workerId, issueId, file, index }) {
  // 1. 압축
  const compressed = await compressImage(file, { maxWidth: 1280, quality: 0.8 });

  // 2. 경로: {worker_id}/{issue_id}/{index}.jpg
  const path = `${workerId}/${issueId}/${index}.jpg`;

  // 3. Storage 업로드
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed, {
      contentType: 'image/jpeg',
      upsert: false,
    });
  if (upErr) throw upErr;

  // 4. Public URL (버킷 비공개여도 Supabase는 경로만 반환 — admin SELECT는 RLS 통제)
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return { path, url: urlData?.publicUrl || '' };
}

/**
 * 1회 자동 재시도 래퍼.
 */
async function uploadWithRetry(args) {
  try {
    return await uploadIssuePhotoOnce(args);
  } catch (err1) {
    // 1초 대기 후 재시도
    await new Promise((r) => setTimeout(r, 1000));
    try {
      return await uploadIssuePhotoOnce(args);
    } catch (err2) {
      // 2차 실패 — 원본 에러 throw
      throw err2;
    }
  }
}

/**
 * 다수 사진 일괄 업로드. 부분 실패도 throw (호출자가 issue_photos INSERT 결정).
 * @returns {Promise<Array<{ path, url }>>}
 */
export async function uploadIssuePhotos({ workerId, issueId, photos }) {
  if (!Array.isArray(photos) || photos.length === 0) return [];
  const limited = photos.slice(0, MAX_PHOTOS);
  // 병렬 업로드 (3장이라 부담 적음)
  return Promise.all(
    limited.map((file, index) =>
      uploadWithRetry({ workerId, issueId, file, index }),
    ),
  );
}

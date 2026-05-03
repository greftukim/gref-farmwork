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

/**
 * [TRACK77-U14] 비공개 버킷 사진 표시용 Signed URL 발급.
 *
 * 배경:
 *   - 버킷 issue_photos는 public=false (followup-u11 박제, U11 SQL 검증 결과 (3))
 *   - upload 시 저장한 photo_url 컬럼은 getPublicUrl() 결과 — 비공개 버킷에서는 401/403 (broken image)
 *   - 표시 시점에 createSignedUrls()로 인증된 단기 URL 발급 (TTL 1시간)
 *
 * @param {string[]} photoPaths - issue_photos.photo_path 컬럼 값 배열
 * @param {number} expiresInSec - TTL (default 3600 = 1시간) — G77-AA
 * @returns {Promise<Record<string, string>>} - { path: signedUrl } 매핑. 실패 시 빈 매핑
 */
export async function getSignedUrlsForPhotos(photoPaths, expiresInSec = 3600) {
  if (!Array.isArray(photoPaths) || photoPaths.length === 0) return {};
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(photoPaths, expiresInSec);
  if (error || !Array.isArray(data)) return {};
  const map = {};
  for (const item of data) {
    if (item?.path && item?.signedUrl) {
      map[item.path] = item.signedUrl;
    }
  }
  return map;
}

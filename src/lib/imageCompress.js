// 클라이언트 측 이미지 압축 — 트랙 77 후속 U11
// G-Storage-3: max 1280px width / JPEG 80%
// 의도: Storage 비용 + 모바일 업로드 시간 ↓

/**
 * @param {File|Blob} file - 원본 이미지
 * @param {object} opts
 * @param {number} opts.maxWidth - 최대 너비 (default 1280)
 * @param {number} opts.quality - JPEG 품질 0~1 (default 0.8)
 * @returns {Promise<Blob>} 압축된 JPEG Blob
 */
export async function compressImage(file, { maxWidth = 1280, quality = 0.8 } = {}) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        // 원본보다 작아질 때만 리사이즈 (확대 방지)
        const ratio = Math.min(maxWidth / img.width, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext('2d');
        // 가독성 + 부드러운 다운스케일
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (!blob) {
              reject(new Error('이미지 압축 실패 (canvas.toBlob 반환 null)'));
              return;
            }
            resolve(blob);
          },
          'image/jpeg',
          quality,
        );
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지 로드 실패 (HEIC 등 미지원 포맷 가능성)'));
    };
    img.src = url;
  });
}

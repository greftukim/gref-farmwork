import { useRef, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

const DEPLOY_URL = 'https://gref-farmwork.vercel.app';

export default function QrCodePage() {
  const qrRef = useRef(null);

  const handleDownload = useCallback(() => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'gref-farmwork-qr.png';
    link.href = url;
    link.click();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-gray-900 mb-6">
        앱 배포 QR코드
      </h1>

      <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-emerald-500 p-8 max-w-md">
        <p className="text-sm text-gray-500 mb-1">배포 주소</p>
        <p className="text-base font-medium text-gray-800 mb-6 break-all">
          {DEPLOY_URL}
        </p>

        <div
          ref={qrRef}
          className="flex justify-center bg-white p-4 rounded-lg mb-6"
        >
          <QRCodeCanvas
            value={DEPLOY_URL}
            size={220}
            level="H"
            marginSize={2}
          />
        </div>

        <button
          onClick={handleDownload}
          className="w-full bg-emerald-600 text-white py-2.5 px-4 rounded-lg text-base font-medium hover:bg-emerald-700 active:scale-[0.98] transition-all min-h-[44px]"
        >
          QR 이미지 저장
        </button>
      </div>
    </div>
  );
}

import Modal from './common/Modal';
import Button from './common/Button';

const CONTENTS = {
  inapp: {
    title: '⚠️ Safari로 열어주세요',
    body: (
      <>
        <p className="mb-3">현재 인앱 브라우저(카카오톡/네이버 등)에서 접속하셨습니다.</p>
        <p className="mb-3">앱 알림을 받으려면 <strong>Safari로 열어야</strong> 합니다.</p>
        <ol className="text-sm space-y-1 pl-4 list-decimal text-gray-600">
          <li>우측 상단 ⋯ 또는 ⋮ 메뉴 클릭</li>
          <li>"Safari로 열기" 또는 "다른 브라우저로 열기" 선택</li>
          <li>Safari가 열리면 다시 접속 후 아래 "홈 화면에 추가" 진행</li>
        </ol>
      </>
    ),
  },
  ios_safari: {
    title: '📱 홈 화면에 앱 추가',
    body: (
      <>
        <p className="mb-3">알림을 받으려면 홈 화면에 앱을 추가해야 합니다.</p>
        <ol className="text-sm space-y-1 pl-4 list-decimal text-gray-600">
          <li>화면 하단 공유 버튼(⬆️) 탭</li>
          <li>"홈 화면에 추가" 선택</li>
          <li>"추가" 버튼 탭</li>
          <li>홈 화면의 FarmWork 아이콘으로 다시 접속</li>
        </ol>
      </>
    ),
  },
  ios_outdated: {
    title: '⚠️ iOS 업데이트 필요',
    body: (
      <>
        <p className="mb-3">현재 iOS 버전에서는 푸시 알림이 동작하지 않습니다.</p>
        <p className="text-sm text-gray-600">
          알림을 받으려면 iOS 16.4 이상으로 업데이트해주세요.<br/>
          설정 → 일반 → 소프트웨어 업데이트
        </p>
      </>
    ),
  },
};

export default function PWAInstallGuideModal({ guideType, onClose }) {
  if (!guideType || !CONTENTS[guideType]) return null;
  const { title, body } = CONTENTS[guideType];

  return (
    <Modal isOpen onClose={onClose} title={title}>
      <div className="text-sm text-gray-700">{body}</div>
      <div className="mt-6">
        <Button onClick={onClose} className="w-full">확인했습니다</Button>
      </div>
    </Modal>
  );
}

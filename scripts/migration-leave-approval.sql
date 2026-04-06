-- 근태 신청 2단계 승인 흐름 지원을 위한 leave_requests 테이블 확장
-- 실행: Supabase SQL Editor에서 실행

-- 1차 승인 (재배팀) 필드
ALTER TABLE leave_requests
  ADD COLUMN IF NOT EXISTS farm_reviewed_by UUID REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS farm_reviewed_at TIMESTAMPTZ;

-- 최종 승인 (관리팀) 필드
ALTER TABLE leave_requests
  ADD COLUMN IF NOT EXISTS hr_reviewed_by UUID REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS hr_reviewed_at TIMESTAMPTZ;

-- 기존 status 체크 제약 업데이트 (있는 경우 삭제 후 재생성)
-- status: pending → farm_approved → hr_approved / rejected
ALTER TABLE leave_requests
  DROP CONSTRAINT IF EXISTS leave_requests_status_check;

ALTER TABLE leave_requests
  ADD CONSTRAINT leave_requests_status_check
  CHECK (status IN ('pending', 'farm_approved', 'hr_approved', 'rejected'));

-- 기존 approved 상태 데이터를 hr_approved로 변환
UPDATE leave_requests SET status = 'hr_approved' WHERE status = 'approved';

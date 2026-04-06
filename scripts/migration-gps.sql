-- GPS 위치 컬럼 추가 (출퇴근 GPS 인증 기능)
-- attendance 테이블에 출퇴근 시 GPS 좌표 저장 컬럼 추가

ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS check_in_lat  FLOAT,
  ADD COLUMN IF NOT EXISTS check_in_lng  FLOAT,
  ADD COLUMN IF NOT EXISTS check_out_lat FLOAT,
  ADD COLUMN IF NOT EXISTS check_out_lng FLOAT;

-- 컬럼 코멘트
COMMENT ON COLUMN attendance.check_in_lat  IS '출근 시 GPS 위도';
COMMENT ON COLUMN attendance.check_in_lng  IS '출근 시 GPS 경도';
COMMENT ON COLUMN attendance.check_out_lat IS '퇴근 시 GPS 위도';
COMMENT ON COLUMN attendance.check_out_lng IS '퇴근 시 GPS 경도';

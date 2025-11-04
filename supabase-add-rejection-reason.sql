-- users 테이블에 rejection_reason 컬럼 추가
-- 도매상 승인 거절 시 사유를 저장하기 위한 컬럼

-- 1. rejection_reason 컬럼 추가
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. 컬럼 코멘트 추가
COMMENT ON COLUMN public.users.rejection_reason IS '도매상 승인 거절 사유. 관리자가 도매상 신청을 거절할 때 입력하는 사유. 사용자가 확인하고 재신청 가능.';

-- 완료
SELECT 'rejection_reason 컬럼이 성공적으로 추가되었습니다.' AS result;

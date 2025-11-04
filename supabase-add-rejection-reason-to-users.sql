-- ============================================
-- users 테이블에 rejection_reason 컬럼 추가
-- ============================================
-- 관리자가 도매상 신청을 거부할 때 사유를 저장하기 위한 컬럼

-- rejection_reason 컬럼이 없다면 추가
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE public.users
        ADD COLUMN rejection_reason TEXT;

        RAISE NOTICE 'rejection_reason 컬럼이 추가되었습니다.';
    ELSE
        RAISE NOTICE 'rejection_reason 컬럼이 이미 존재합니다.';
    END IF;
END $$;

-- 완료 메시지
SELECT 'users 테이블에 rejection_reason 컬럼 추가 완료!' AS message;

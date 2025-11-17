-- ============================================
-- 매입 요청 테이블에 카테고리 컬럼 추가
-- ============================================
-- 이 스크립트는 sell_requests 테이블에 category 컬럼을 추가하여
-- 컴퓨터와 스마트폰 매입 요청을 구분할 수 있도록 합니다.

-- 1. sell_requests 테이블에 category 컬럼 추가
ALTER TABLE public.sell_requests
ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'computer'
CHECK (category IN ('computer', 'smartphone'));

-- 2. 인덱스 생성 (카테고리별 필터링 성능 향상)
CREATE INDEX IF NOT EXISTS idx_sell_requests_category
ON public.sell_requests(category);

-- 3. 기존 데이터의 카테고리를 'computer'로 설정 (이미 기본값이지만 명시적으로)
UPDATE public.sell_requests
SET category = 'computer'
WHERE category IS NULL OR category = '';

-- 완료 메시지
COMMENT ON COLUMN public.sell_requests.category IS '매입 요청 카테고리: computer(컴퓨터 관련), smartphone(스마트폰)';

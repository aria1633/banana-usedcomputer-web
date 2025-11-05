-- =====================================================
-- Transactions 테이블 확인 및 정리
-- =====================================================

-- 1. 현재 transactions 테이블 데이터 확인
SELECT
  id,
  purchase_offer_id,
  status,
  created_at,
  completed_at
FROM public.transactions
ORDER BY created_at DESC;

-- 2. (필요시) 모든 transactions 데이터 삭제 (테스트용)
-- 주의: 실제 운영 중이라면 실행하지 마세요!
-- DELETE FROM public.transactions;

-- 3. (또는) 특정 purchase_offer_id의 transaction만 삭제
-- DELETE FROM public.transactions
-- WHERE purchase_offer_id = '여기에_purchase_offer_id_입력';

-- 4. transactions 테이블 구조 확인
\d public.transactions;

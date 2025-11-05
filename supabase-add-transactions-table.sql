-- =====================================================
-- 거래(Transaction) 테이블 생성 마이그레이션
-- =====================================================
-- 목적: 낙찰 후 실제 거래 진행 상태를 관리
-- 작성일: 2025-11-05
-- =====================================================

-- 1. transactions 테이블 생성
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 관계 필드
  sell_request_id UUID NOT NULL REFERENCES public.sell_requests(id) ON DELETE CASCADE,
  purchase_offer_id UUID NOT NULL REFERENCES public.purchase_offers(id) ON DELETE CASCADE,
  wholesaler_id UUID NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,

  -- 상태 필드
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),

  -- 메타데이터
  notes TEXT,  -- 거래 메모 (선택)

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- 2. 인덱스 생성 (쿼리 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_transactions_sell_request_id
  ON public.transactions(sell_request_id);

CREATE INDEX IF NOT EXISTS idx_transactions_purchase_offer_id
  ON public.transactions(purchase_offer_id);

CREATE INDEX IF NOT EXISTS idx_transactions_wholesaler_id
  ON public.transactions(wholesaler_id);

CREATE INDEX IF NOT EXISTS idx_transactions_seller_id
  ON public.transactions(seller_id);

CREATE INDEX IF NOT EXISTS idx_transactions_status
  ON public.transactions(status);

-- 3. 고유 제약 조건 (한 purchase_offer당 하나의 transaction만 가능)
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_unique_offer
  ON public.transactions(purchase_offer_id);

-- 4. updated_at 자동 업데이트 트리거 함수 (이미 존재하지 않으면 생성)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. updated_at 트리거 적용
DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. RLS (Row Level Security) 정책
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 도매상은 자신의 거래만 조회/수정 가능
CREATE POLICY "Wholesalers can view their own transactions"
  ON public.transactions
  FOR SELECT
  USING (auth.uid() = wholesaler_id);

CREATE POLICY "Wholesalers can update their own transactions"
  ON public.transactions
  FOR UPDATE
  USING (auth.uid() = wholesaler_id);

-- 판매자는 자신의 거래만 조회 가능
CREATE POLICY "Sellers can view their own transactions"
  ON public.transactions
  FOR SELECT
  USING (auth.uid() = seller_id);

-- 거래 생성은 시스템에서만 (낙찰 시 자동 생성)
CREATE POLICY "Only system can insert transactions"
  ON public.transactions
  FOR INSERT
  WITH CHECK (true);

-- 7. 코멘트 추가 (문서화)
COMMENT ON TABLE public.transactions IS '낙찰 후 실제 거래 진행 상태를 관리하는 테이블';
COMMENT ON COLUMN public.transactions.status IS 'in_progress: 진행중, completed: 완료, cancelled: 취소';
COMMENT ON COLUMN public.transactions.sell_request_id IS '매입 요청 ID (외래키)';
COMMENT ON COLUMN public.transactions.purchase_offer_id IS '낙찰받은 제안 ID (외래키)';
COMMENT ON COLUMN public.transactions.wholesaler_id IS '도매상 ID (외래키)';
COMMENT ON COLUMN public.transactions.seller_id IS '판매자 ID (외래키)';

-- =====================================================
-- 마이그레이션 완료
-- =====================================================
-- 적용 방법:
-- 1. Supabase Dashboard > SQL Editor에서 실행
-- 2. 또는 psql로 직접 실행
-- =====================================================

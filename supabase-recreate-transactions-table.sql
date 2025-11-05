-- =====================================================
-- Transactions 테이블 완전 재생성
-- =====================================================
-- 기존 테이블과 모든 제약조건을 삭제하고 새로 생성합니다
-- =====================================================

-- 1. 기존 테이블 완전 삭제 (존재하는 경우)
DROP TABLE IF EXISTS public.transactions CASCADE;

-- 2. transactions 테이블 생성
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 관계 필드
  sell_request_id UUID NOT NULL REFERENCES public.sell_requests(id) ON DELETE CASCADE,
  purchase_offer_id UUID NOT NULL REFERENCES public.purchase_offers(id) ON DELETE CASCADE,
  wholesaler_id UUID NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,

  -- 상태 필드
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),

  -- 메타데이터
  notes TEXT,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- 3. 인덱스 생성
CREATE INDEX idx_transactions_sell_request_id ON public.transactions(sell_request_id);
CREATE INDEX idx_transactions_purchase_offer_id ON public.transactions(purchase_offer_id);
CREATE INDEX idx_transactions_wholesaler_id ON public.transactions(wholesaler_id);
CREATE INDEX idx_transactions_seller_id ON public.transactions(seller_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);

-- 4. 고유 제약 조건 (한 purchase_offer당 하나의 transaction만 가능)
CREATE UNIQUE INDEX idx_transactions_unique_offer ON public.transactions(purchase_offer_id);

-- 5. updated_at 트리거 함수 생성 (이미 존재하지 않는 경우만)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. updated_at 트리거 적용
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 7. RLS 활성화
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 8. RLS 정책 생성
CREATE POLICY "Wholesalers can view their own transactions"
  ON public.transactions
  FOR SELECT
  USING (auth.uid() = wholesaler_id);

CREATE POLICY "Wholesalers can update their own transactions"
  ON public.transactions
  FOR UPDATE
  USING (auth.uid() = wholesaler_id);

CREATE POLICY "Sellers can view their own transactions"
  ON public.transactions
  FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "System can insert transactions"
  ON public.transactions
  FOR INSERT
  WITH CHECK (true);

-- 9. 코멘트 추가
COMMENT ON TABLE public.transactions IS '낙찰 후 실제 거래 진행 상태를 관리하는 테이블';
COMMENT ON COLUMN public.transactions.status IS 'in_progress: 진행중, completed: 완료, cancelled: 취소';

-- =====================================================
-- 완료!
-- =====================================================
SELECT 'Transactions 테이블이 성공적으로 재생성되었습니다!' AS message;

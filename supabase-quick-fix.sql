-- ============================================
-- 빠른 수정: 트리거 비활성화 + 테이블 생성
-- ============================================

-- 1. 기존 트리거 모두 삭제 (500 에러 방지)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. users 테이블 생성 (없으면 생성)
CREATE TABLE IF NOT EXISTS public.users (
  uid UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone_number TEXT,
  business_registration_url TEXT,
  user_type TEXT NOT NULL DEFAULT 'normal' CHECK (user_type IN ('normal', 'wholesaler', 'admin')),
  verification_status TEXT NOT NULL DEFAULT 'none' CHECK (verification_status IN ('none', 'pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- 3. 나머지 테이블 생성
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  seller_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price BIGINT NOT NULL CHECK (price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  category TEXT NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.sell_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  seller_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  desired_price TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
  selected_wholesaler_id UUID REFERENCES public.users(uid),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.purchase_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sell_request_id UUID NOT NULL REFERENCES public.sell_requests(id) ON DELETE CASCADE,
  wholesaler_id UUID NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  wholesaler_name TEXT NOT NULL,
  offer_price BIGINT NOT NULL CHECK (offer_price >= 0),
  message TEXT,
  is_selected BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- 4. RLS 활성화
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sell_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_offers ENABLE ROW LEVEL SECURITY;

-- 5. users 테이블 정책 (매우 관대하게 설정 - 개발용)
DROP POLICY IF EXISTS "Anyone can read users" ON public.users;
CREATE POLICY "Anyone can read users"
  ON public.users FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert users" ON public.users;
CREATE POLICY "Anyone can insert users"
  ON public.users FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = uid);

-- 6. products 테이블 정책
DROP POLICY IF EXISTS "Anyone can read products" ON public.products;
CREATE POLICY "Anyone can read products"
  ON public.products FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create products" ON public.products;
CREATE POLICY "Authenticated users can create products"
  ON public.products FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Sellers can update own products" ON public.products;
CREATE POLICY "Sellers can update own products"
  ON public.products FOR UPDATE
  USING (seller_id = auth.uid());

DROP POLICY IF EXISTS "Sellers can delete own products" ON public.products;
CREATE POLICY "Sellers can delete own products"
  ON public.products FOR DELETE
  USING (seller_id = auth.uid());

-- 7. sell_requests 테이블 정책
DROP POLICY IF EXISTS "Anyone can read sell requests" ON public.sell_requests;
CREATE POLICY "Anyone can read sell requests"
  ON public.sell_requests FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create sell requests" ON public.sell_requests;
CREATE POLICY "Authenticated users can create sell requests"
  ON public.sell_requests FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update own sell requests" ON public.sell_requests;
CREATE POLICY "Users can update own sell requests"
  ON public.sell_requests FOR UPDATE
  USING (seller_id = auth.uid());

-- 8. purchase_offers 테이블 정책
DROP POLICY IF EXISTS "Anyone can read offers" ON public.purchase_offers;
CREATE POLICY "Anyone can read offers"
  ON public.purchase_offers FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create offers" ON public.purchase_offers;
CREATE POLICY "Authenticated users can create offers"
  ON public.purchase_offers FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 9. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON public.products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sell_requests_seller_id ON public.sell_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_sell_requests_status ON public.sell_requests(status);
CREATE INDEX IF NOT EXISTS idx_purchase_offers_sell_request_id ON public.purchase_offers(sell_request_id);

SELECT '✅ 빠른 수정 완료! 트리거 비활성화, 테이블 생성, RLS 정책 설정 완료' AS message;

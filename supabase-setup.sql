-- ============================================
-- 바나나 중고컴퓨터 Supabase 데이터베이스 설정
-- ============================================

-- 1. users 테이블 생성
CREATE TABLE IF NOT EXISTS public.users (
  uid UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone_number TEXT,
  business_registration_url TEXT,
  user_type TEXT NOT NULL DEFAULT 'normal' CHECK (user_type IN ('normal', 'wholesaler', 'admin')),
  verification_status TEXT NOT NULL DEFAULT 'none' CHECK (verification_status IN ('none', 'pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- 2. products 테이블 생성
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

-- 3. sell_requests 테이블 생성
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

-- 4. purchase_offers 테이블 생성
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

-- 5. inquiries 테이블 생성
CREATE TABLE IF NOT EXISTS public.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_title TEXT NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  seller_id UUID NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  seller_name TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  answered_at TIMESTAMPTZ
);

-- 6. business_verifications 테이블 생성
CREATE TABLE IF NOT EXISTS public.business_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  business_number TEXT NOT NULL,
  company_name TEXT NOT NULL,
  representative_name TEXT NOT NULL,
  document_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES public.users(uid)
);

-- ============================================
-- 인덱스 생성 (성능 최적화)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_products_seller_id ON public.products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sell_requests_seller_id ON public.sell_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_sell_requests_status ON public.sell_requests(status);
CREATE INDEX IF NOT EXISTS idx_purchase_offers_sell_request_id ON public.purchase_offers(sell_request_id);
CREATE INDEX IF NOT EXISTS idx_purchase_offers_wholesaler_id ON public.purchase_offers(wholesaler_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_product_id ON public.inquiries(product_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_customer_id ON public.inquiries(customer_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_seller_id ON public.inquiries(seller_id);

-- ============================================
-- Auth 트리거 함수 (사용자 생성 시 자동으로 users 테이블에 추가)
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (uid, email, name, user_type, verification_status, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'normal'),
    'none',
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 트리거 삭제 후 재생성
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- RLS (Row Level Security) 정책 설정
-- ============================================

-- RLS 활성화
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sell_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_verifications ENABLE ROW LEVEL SECURITY;

-- users 테이블 정책
DROP POLICY IF EXISTS "Users can read all users" ON public.users;
CREATE POLICY "Users can read all users"
  ON public.users FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = uid);

DROP POLICY IF EXISTS "Service role can insert users" ON public.users;
CREATE POLICY "Service role can insert users"
  ON public.users FOR INSERT
  WITH CHECK (true);

-- products 테이블 정책
DROP POLICY IF EXISTS "Anyone can read products" ON public.products;
CREATE POLICY "Anyone can read products"
  ON public.products FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Wholesalers can create products" ON public.products;
CREATE POLICY "Wholesalers can create products"
  ON public.products FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE uid = auth.uid()
      AND user_type = 'wholesaler'
      AND verification_status = 'approved'
    )
  );

DROP POLICY IF EXISTS "Sellers can update own products" ON public.products;
CREATE POLICY "Sellers can update own products"
  ON public.products FOR UPDATE
  USING (seller_id = auth.uid());

DROP POLICY IF EXISTS "Sellers can delete own products" ON public.products;
CREATE POLICY "Sellers can delete own products"
  ON public.products FOR DELETE
  USING (seller_id = auth.uid());

-- sell_requests 테이블 정책
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

-- purchase_offers 테이블 정책
DROP POLICY IF EXISTS "Wholesalers and request owners can read offers" ON public.purchase_offers;
CREATE POLICY "Wholesalers and request owners can read offers"
  ON public.purchase_offers FOR SELECT
  USING (
    wholesaler_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.sell_requests
      WHERE id = sell_request_id
      AND seller_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Wholesalers can create offers" ON public.purchase_offers;
CREATE POLICY "Wholesalers can create offers"
  ON public.purchase_offers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE uid = auth.uid()
      AND user_type = 'wholesaler'
      AND verification_status = 'approved'
    )
  );

DROP POLICY IF EXISTS "Wholesalers can update own offers" ON public.purchase_offers;
CREATE POLICY "Wholesalers can update own offers"
  ON public.purchase_offers FOR UPDATE
  USING (wholesaler_id = auth.uid());

-- inquiries 테이블 정책
DROP POLICY IF EXISTS "Users can read own inquiries" ON public.inquiries;
CREATE POLICY "Users can read own inquiries"
  ON public.inquiries FOR SELECT
  USING (customer_id = auth.uid() OR seller_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can create inquiries" ON public.inquiries;
CREATE POLICY "Authenticated users can create inquiries"
  ON public.inquiries FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Sellers can update inquiries" ON public.inquiries;
CREATE POLICY "Sellers can update inquiries"
  ON public.inquiries FOR UPDATE
  USING (seller_id = auth.uid());

-- business_verifications 테이블 정책
DROP POLICY IF EXISTS "Users can read own verifications" ON public.business_verifications;
CREATE POLICY "Users can read own verifications"
  ON public.business_verifications FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE uid = auth.uid()
      AND user_type = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can create verifications" ON public.business_verifications;
CREATE POLICY "Users can create verifications"
  ON public.business_verifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can update verifications" ON public.business_verifications;
CREATE POLICY "Admins can update verifications"
  ON public.business_verifications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE uid = auth.uid()
      AND user_type = 'admin'
    )
  );

-- ============================================
-- Storage 버킷 생성 (이미지 업로드용)
-- ============================================
-- 주의: 이 부분은 Supabase Dashboard의 Storage 섹션에서 수동으로 생성해야 합니다.
--
-- 필요한 버킷:
-- 1. business_documents (사업자등록증)
-- 2. products (상품 이미지)
-- 3. sell_requests (매입 요청 이미지)
--
-- 각 버킷의 정책:
-- - Public: false
-- - Allowed MIME types: image/jpeg, image/png, image/jpg, application/pdf

-- ============================================
-- 완료 메시지
-- ============================================
SELECT 'Supabase 데이터베이스 설정 완료!' AS message;

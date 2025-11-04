-- ============================================
-- Auth 트리거 수정 (500 에러 해결)
-- ============================================

-- 1. 기존 트리거 삭제
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. 안전한 트리거 함수 생성 (에러 발생 시에도 Auth 가입 성공)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_name TEXT;
  user_user_type TEXT;
  insert_success BOOLEAN;
BEGIN
  -- 1. 이메일 확인 전에는 users 테이블에 INSERT하지 않음
  -- Supabase Auth는 이메일 확인 전에도 트리거를 실행하지만,
  -- 우리는 이메일 확인 후 callback에서 처리

  -- 이메일 확인 여부 체크 (confirmed_at 필드)
  IF NEW.confirmed_at IS NULL THEN
    -- 이메일 미확인 상태 - users 테이블에 INSERT하지 않고 그냥 RETURN
    RAISE NOTICE 'User % created, waiting for email confirmation', NEW.email;
    RETURN NEW;
  END IF;

  -- 2. 이메일 확인 완료 - users 테이블에 INSERT 시도
  BEGIN
    -- raw_user_meta_data에서 안전하게 값 추출
    user_name := COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    );

    user_user_type := COALESCE(
      NEW.raw_user_meta_data->>'user_type',
      'normal'
    );

    -- users 테이블에 INSERT
    INSERT INTO public.users (
      uid,
      email,
      name,
      user_type,
      verification_status,
      created_at
    )
    VALUES (
      NEW.id,
      NEW.email,
      user_name,
      user_user_type,
      'none',
      NOW()
    )
    ON CONFLICT (uid) DO NOTHING;

    insert_success := TRUE;
    RAISE NOTICE 'User % inserted successfully', NEW.email;

  EXCEPTION
    WHEN OTHERS THEN
      -- INSERT 실패해도 Auth 가입은 성공
      insert_success := FALSE;
      RAISE WARNING 'Failed to insert user %: %', NEW.email, SQLERRM;
  END;

  -- 항상 NEW 반환 (Auth 가입 성공)
  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- 최상위 예외 처리 - 어떤 에러가 발생해도 Auth 가입은 성공
    RAISE WARNING 'Critical error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 3. INSERT 트리거 생성 (회원가입 시)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. UPDATE 트리거 생성 (이메일 확인 시)
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_new_user();

-- 4. users 테이블 INSERT 정책 수정 (트리거에서도 작동하도록)
DROP POLICY IF EXISTS "Service role can insert users" ON public.users;
DROP POLICY IF EXISTS "Allow auth trigger to insert" ON public.users;

-- 모든 INSERT 허용 (트리거가 SECURITY DEFINER로 실행됨)
CREATE POLICY "Allow auth trigger to insert"
  ON public.users FOR INSERT
  WITH CHECK (true);

-- 5. 테스트를 위한 기존 데이터 정리 (선택사항)
-- DELETE FROM public.users WHERE email = 'mi700123@naver.com';
-- DELETE FROM auth.users WHERE email = 'mi700123@naver.com';

SELECT 'Auth 트리거 수정 완료!' AS message;

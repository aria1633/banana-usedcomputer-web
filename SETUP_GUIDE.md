# 🔧 Supabase 설정 가이드

회원가입 500 에러를 해결하기 위한 단계별 설정 가이드입니다.

---

## 📋 **1단계: 이메일 확인 비활성화 (가장 중요!)**

이메일 확인을 비활성화하면 회원가입 후 바로 로그인할 수 있습니다.

### 방법:
1. **Supabase Dashboard** 접속: https://supabase.com/dashboard
2. 프로젝트 선택: `vqypnenjejbtvvvewxee`
3. 왼쪽 메뉴에서 **Authentication** 클릭
4. 상단 탭에서 **Providers** 클릭
5. **Email** 항목 찾기
6. **"Confirm email"** 옵션을 **OFF**로 설정
7. **Save** 버튼 클릭

---

## 📋 **2단계: SQL 실행 (트리거 수정)**

### 방법:
1. 왼쪽 메뉴에서 **SQL Editor** 클릭
2. **New query** 버튼 클릭
3. 파일 열기: `E:\Project_doing\banana_usedcomputer_web\supabase-fix-trigger.sql`
4. 내용 복사하여 SQL Editor에 붙여넣기
5. 오른쪽 하단 **Run** 버튼 클릭

---

## 📋 **3단계: Storage 버킷 생성 (선택사항)**

이미지 업로드 기능을 사용하려면 Storage 버킷을 생성해야 합니다.

### 방법:
1. 왼쪽 메뉴에서 **Storage** 클릭
2. **New bucket** 버튼 클릭
3. 다음 3개 버킷 생성:

#### **버킷 1: business_documents**
- Name: `business_documents`
- Public: **체크 해제** (Private)

#### **버킷 2: products**
- Name: `products`
- Public: **체크 해제** (Private)

#### **버킷 3: sell_requests**
- Name: `sell_requests`
- Public: **체크 해제** (Private)

---

## 📋 **4단계: Storage 정책 설정 (선택사항)**

Storage 버킷 생성 후 업로드/다운로드 정책을 추가합니다.

### 방법:
1. **SQL Editor**로 돌아가기
2. **New query** 버튼 클릭
3. 다음 SQL 실행:

```sql
-- business_documents 버킷 정책
CREATE POLICY "Users can upload own business documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'business_documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can read own business documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'business_documents');

-- products 버킷 정책
CREATE POLICY "Wholesalers can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'products' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE uid = auth.uid()
    AND user_type = 'wholesaler'
  )
);

CREATE POLICY "Anyone can read product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'products');

-- sell_requests 버킷 정책
CREATE POLICY "Users can upload sell request images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'sell_requests' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Anyone can read sell request images"
ON storage.objects FOR SELECT
USING (bucket_id = 'sell_requests');
```

---

## ✅ **테스트하기**

모든 설정이 완료되면:

1. 브라우저에서 http://localhost:3001 접속
2. 회원가입 페이지로 이동
3. 테스트 계정 생성:
   - 이름: `테스트`
   - 이메일: `test@example.com`
   - 전화번호: `010-1111-1111`
   - 비밀번호: `test1234`
   - 사용자 유형: `일반 사용자`
4. **회원가입** 버튼 클릭
5. 성공 메시지 확인 및 로그인 페이지로 리다이렉트

---

## 🐛 **문제 해결**

### 여전히 "Database error saving new user" 에러가 발생하는 경우:

#### 1. users 테이블 확인
```sql
-- SQL Editor에서 실행
SELECT * FROM public.users LIMIT 5;
```
- 테이블이 없으면 `supabase-setup.sql` 파일을 먼저 실행하세요.

#### 2. Auth 트리거 확인
```sql
-- SQL Editor에서 실행
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';
```
- 트리거가 없으면 `supabase-fix-trigger.sql` 파일을 실행하세요.

#### 3. RLS 정책 확인
```sql
-- SQL Editor에서 실행
SELECT * FROM pg_policies WHERE tablename = 'users';
```
- INSERT 정책이 없으면 `supabase-setup.sql` 파일을 다시 실행하세요.

#### 4. 브라우저 콘솔 로그 확인
- F12 → Console 탭
- `[AuthService]` 로그 확인
- 에러 메시지 복사하여 분석

---

## 📞 **추가 도움**

문제가 계속되면 다음 정보를 제공해주세요:
1. 브라우저 콘솔 로그 (F12 → Console)
2. Supabase SQL Editor에서 실행한 결과
3. 회원가입 시 입력한 데이터

---

**작성일**: 2025-11-02
**버전**: 1.0.0

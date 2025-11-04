# 바나나 중고컴퓨터 - Next.js + Supabase 프로젝트 가이드

Next.js 14 (App Router) + TypeScript + Supabase로 구축된 중고 컴퓨터 도매 매칭 플랫폼입니다.

---

## 📦 문서 패키지 구성

이 폴더에는 프로젝트를 이해하고 유지보수하는데 필요한 모든 정보가 포함되어 있습니다.

### 📁 문서 목록

| 번호 | 문서명 | 설명 | 중요도 |
|------|--------|------|--------|
| 00 | **README_시작하기.md** | 이 문서 - 전체 가이드 개요 | ⭐⭐⭐ |
| 01 | **데이터모델_TypeScript_인터페이스.md** | 모든 데이터 모델의 TypeScript 정의 | ⭐⭐⭐ |
| 02 | **화면별_상세_기능_명세서.md** | 15개 화면의 상세 기능 및 UI 명세 | ⭐⭐⭐ |
| 03 | **Next.js_프로젝트_구조_제안서.md** | 완전한 Next.js 프로젝트 구조 | ⭐⭐⭐ |

---

## 🎯 프로젝트 개요

### 프로젝트명
**바나나 중고컴퓨터 - 도매 매칭 플랫폼**

### 프로젝트 설명
중고 컴퓨터 도매상과 일반 사용자를 연결하는 B2C 플랫폼입니다.

**주요 특징:**
- 도매상이 중고 컴퓨터를 판매
- 일반 사용자가 중고 컴퓨터를 구매 또는 매입 요청
- **역경매 시스템**: 일반 사용자가 매물을 올리면 도매상들이 경쟁적으로 매입가 제시
- **블라인드 입찰**: 도매상들은 서로의 제안을 볼 수 없음 (RLS 정책으로 구현)
- 사업자 인증 시스템 (이메일 확인 + 사업자 등록증 업로드)
- 관리자 승인 시스템

---

## 🏗️ 기술 스택

### Framework & Language
```
Framework: Next.js 14.2 (App Router)
Language: TypeScript 5+
Styling: Tailwind CSS 3+
Backend: Supabase (PostgreSQL, Auth, Storage, RLS)
```

### 핵심 라이브러리
```json
{
  "dependencies": {
    "next": "14.2.23",
    "react": "^18",
    "typescript": "^5",
    "@supabase/supabase-js": "^2.49.2",
    "tailwindcss": "^3.4.1",
    "date-fns": "^2.30.0"
  }
}
```

---

## 📊 프로젝트 규모

### 데이터 모델 (PostgreSQL Tables)
- **users** - 사용자 정보
- **products** - 상품 정보 (도매상이 등록)
- **inquiries** - 문의 시스템
- **sell_requests** - 매입 요청 (일반 사용자가 등록)
- **purchase_offers** - 매입 제안 (도매상이 제시)

### 화면 구성
- **15개의 화면**
  - 인증: 로그인, 회원가입
  - 상품: 목록, 상세, 등록/수정
  - 매입 요청: 목록, 상세, 등록, 내 요청
  - 대시보드: 도매상, 관리자
  - 기타: 문의, 사업자 인증

### Supabase Storage Buckets
- `business-registrations` - 사업자 등록증 파일
- `product-images` - 상품 이미지
- `sell-request-images` - 매입 요청 이미지

---

## 🚀 Quick Start

### 1. 환경 설정

프로젝트 루트에 `.env.local` 파일 생성:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://vqypnenjejbtvvvewxee.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service Role Key (Server-side only)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# App Configuration
NEXT_PUBLIC_APP_NAME=바나나 중고컴퓨터
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. 패키지 설치 및 실행

```bash
# 패키지 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start
```

### 3. Supabase 설정 확인

Supabase Dashboard에서 다음 사항을 확인:

1. **RLS (Row Level Security) 정책**
   - users 테이블: 자신의 데이터만 읽기/수정 가능
   - products 테이블: 모두 읽기, 승인된 도매상만 생성/수정
   - Storage: public read, 인증된 사용자만 업로드

2. **Database Triggers**
   - `handle_new_user()`: Auth 가입 시 users 테이블 자동 생성

3. **Storage Buckets**
   - business-registrations (Public)
   - product-images (Public)
   - sell-request-images (Public)

---

## 📐 프로젝트 구조

```
banana-usedcomputer-web/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 인증 라우트 (로그인, 회원가입)
│   ├── (main)/            # 메인 라우트 (상품, 대시보드 등)
│   ├── api/               # API routes (파일 업로드 등)
│   └── auth/callback/     # 이메일 확인 콜백
├── components/            # React 컴포넌트
│   ├── products/
│   ├── sell-requests/
│   ├── auth/
│   └── common/
├── lib/                   # 핵심 로직
│   ├── supabase/         # Supabase 설정
│   ├── services/         # 비즈니스 로직 (AuthService, ProductService 등)
│   └── hooks/            # Custom Hooks (use-auth, use-products 등)
├── types/                 # TypeScript 타입
└── constants/             # 상수
```

---

## 🎨 주요 기능 구현 가이드

### 1. 인증 시스템 (Supabase Auth)

**회원가입 흐름:**
```
1. 사용자가 회원가입 폼 작성
   ↓
2. Supabase Auth 계정 생성 (이메일 확인 필요)
   ↓
3. Database Trigger가 users 테이블에 레코드 자동 생성
   ↓
4. 이메일 확인 링크 클릭
   ↓
5. /auth/callback 라우트에서 사업자 등록증 URL 업데이트 (도매상인 경우)
   ↓
6. 로그인 가능
```

**주요 파일:**
- `lib/services/auth.service.ts` - 회원가입, 로그인, 로그아웃
- `lib/hooks/use-auth.ts` - 인증 상태 관리 Hook
- `app/auth/callback/route.ts` - 이메일 확인 후 처리

### 2. 관리자 대시보드 (도매상 승인)

**승인 프로세스:**
```
1. 도매상 회원가입 + 사업자 등록증 업로드
   ↓
2. 이메일 확인 후 verification_status = 'pending'
   ↓
3. 관리자 대시보드에서 승인 대기 목록 확인
   ↓
4. 승인 → verification_status = 'approved'
   거부 → verification_status = 'rejected', user_type = 'normal'
```

**주요 파일:**
- `app/(main)/admin/dashboard/page.tsx` - 관리자 대시보드
- `lib/services/admin.service.ts` - 관리자 기능 (localStorage 기반 세션)

**중요:** AdminService는 Supabase 클라이언트 hanging 문제를 피하기 위해 `localStorage`에서 직접 세션 토큰을 읽어 fetch API를 사용합니다.

### 3. 파일 업로드 (Storage)

**사업자 등록증 업로드:**
- Server-side API route 사용 (`/api/upload-business-registration`)
- Service Role Key로 RLS 우회
- 파일명 형식: `{userId}/{userId}_{timestamp}.{ext}`

**주요 파일:**
- `app/api/upload-business-registration/route.ts` - 서버 사이드 업로드
- `lib/services/storage.service.ts` - 클라이언트 업로드 헬퍼

### 4. 역경매 시스템 (매입 요청)

**핵심 로직:**
- **블라인드 입찰**: RLS 정책으로 도매상은 자신의 제안만 볼 수 있음
- **제안 수정/삭제 불가**: RLS에서 UPDATE/DELETE 차단
- **거래 확정**: 일반 사용자가 최고가 선택 → 트랜잭션으로 상태 업데이트

**구현 순서:**
1. `types/sell-request.ts`, `types/purchase-offer.ts`
2. `lib/services/sell-request.service.ts`
3. `components/sell-requests/sell-request-form.tsx`
4. `components/sell-requests/offer-list.tsx`
5. `app/(main)/sell-requests/[id]/page.tsx`

---

## 🔐 보안 정책 (RLS)

### Users 테이블
```sql
-- 임시로 RLS 비활성화 (개발 중)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 프로덕션에서는 RLS 활성화 필요:
-- 자신의 데이터만 읽기/수정 가능
-- 관리자는 모든 데이터 접근 가능
```

### Storage (business-registrations)
```sql
-- 공개 읽기 허용
CREATE POLICY "Allow public read from business-registrations"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'business-registrations');

-- 공개 업로드 허용 (회원가입 시 필요)
CREATE POLICY "Allow public upload to business-registrations"
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id = 'business-registrations');
```

---

## 💡 중요한 비즈니스 로직

### 1. 사용자 타입별 권한

| 사용자 타입 | 상품 등록 | 매입 요청 | 문의 작성 | 사업자 승인 |
|-------------|-----------|-----------|-----------|-------------|
| 일반 사용자 | ❌ | ✅ | ✅ | ❌ |
| 도매상 (미승인) | ❌ | ❌ | ❌ | ❌ |
| 도매상 (승인) | ✅ | ❌ | ❌ | ❌ |
| 관리자 | ✅ | ✅ | ✅ | ✅ |

### 2. 이메일 확인 필수
- Supabase Auth의 이메일 확인 기능 사용
- 확인 전에는 DB 업데이트 불가 (RLS 때문)
- 확인 후 `/auth/callback`에서 추가 처리

### 3. Supabase 클라이언트 Hanging 문제 해결
- `supabase.auth.getSession()` 등이 hanging되는 문제 발생
- **해결책**: localStorage에서 직접 세션 토큰 읽기 + fetch API 사용
- `AdminService`, `AuthService`, `callback route` 등에서 적용됨

---

## ✅ 구현 체크리스트

### Phase 1: 기본 인프라 ✅
- [x] Next.js 프로젝트 생성
- [x] Supabase 초기화
- [x] Tailwind CSS 설정
- [x] TypeScript 타입 정의

### Phase 2: 인증 시스템 ✅
- [x] 로그인/회원가입 UI
- [x] Supabase Auth 연동
- [x] 이메일 확인 플로우
- [x] Protected Route 구현

### Phase 3: 사업자 인증 ✅
- [x] 사업자 등록증 업로드 (Server-side API)
- [x] 관리자 대시보드
- [x] 승인/거부 처리
- [x] 파일 미리보기/다운로드 기능

### Phase 4: 상품 기능 (진행 중)
- [ ] 상품 목록 (실시간 구독)
- [ ] 상품 상세
- [ ] 상품 등록/수정 (도매상만)
- [ ] 이미지 업로드 (Storage)

### Phase 5: 문의 시스템 (대기)
- [ ] 문의 작성
- [ ] 문의 목록
- [ ] 답변 작성 (도매상)

### Phase 6: 역경매 시스템 (대기)
- [ ] 매입 요청 등록
- [ ] 매입 요청 목록 (도매상용)
- [ ] 매입 제안 (블라인드)
- [ ] 거래 확정 (트랜잭션)

### Phase 7: 대시보드 (부분 완료)
- [x] 관리자 대시보드
- [ ] 도매상 대시보드
- [ ] 통계 데이터 표시

---

## 🐛 알려진 이슈 및 해결 방법

### 1. Supabase 클라이언트 Hanging 문제
**증상:** `supabase.auth.getSession()`, `supabase.from('table').select()` 등이 무한 대기

**원인:** RLS 정책과 클라이언트 SDK의 충돌로 추정

**해결책:**
```typescript
// ❌ 안 됨
const { data } = await supabase.from('users').select('*');

// ✅ 작동
const url = `${SUPABASE_URL}/rest/v1/users`;
const response = await fetch(url, {
  headers: {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${sessionToken}`,
  },
});
```

### 2. RLS 무한 재귀 문제
**증상:** `is_admin()` 함수 호출 시 무한 재귀

**해결책:**
```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER          -- 함수 소유자 권한으로 실행
SET search_path = public  -- 스키마 고정
STABLE                    -- 같은 트랜잭션에서 캐시
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE uid = auth.uid()
    AND user_type = 'admin'
  );
END;
$$;

ALTER FUNCTION public.is_admin() OWNER TO postgres;
```

### 3. 이메일 확인 전 DB 업데이트 실패
**증상:** 회원가입 시 phone_number 등이 DB에 저장되지 않음

**원인:** 이메일 확인 전에는 세션이 없어서 RLS에 의해 차단됨

**해결책:**
```typescript
// 이메일 확인이 필요한지 먼저 체크
if (!authData.session) {
  // UPDATE 시도하지 않고 바로 에러 반환
  throw new Error('이메일 확인이 필요합니다...');
}

// 세션이 있는 경우에만 UPDATE
```

---

## 📚 추가 참고 자료

### Supabase 공식 문서
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [PostgreSQL & PostgREST](https://supabase.com/docs/guides/database)
- [Storage](https://supabase.com/docs/guides/storage)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

### Next.js 공식 문서
- [App Router](https://nextjs.org/docs/app)
- [Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)

---

## 🤝 개발 지원

### 문서 업데이트
- 작성일: 2025-11-02
- 버전: 2.0.0 (Supabase 마이그레이션 완료)
- 기반: Flutter Web (Firebase) → Next.js (Supabase)

### 마이그레이션 히스토리
- 2025-11-01: Firebase → Supabase 마이그레이션 시작
- 2025-11-02: 인증 시스템, 관리자 대시보드 완료
- Hanging 문제 해결 (fetch API + localStorage 세션)
- RLS 정책 설정 완료

---

**프로젝트를 시작하세요! 🚀**

모든 필요한 정보는 이 문서화 패키지 안에 있습니다.
각 문서를 순서대로 읽고, 단계별로 구현하면 완벽한 Next.js + Supabase 프로젝트가 완성됩니다!

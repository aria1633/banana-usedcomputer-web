# 🍌 바나나 중고컴퓨터 프로젝트 - Claude Code 지침서

이 파일은 Claude Code가 프로젝트 시작 시 자동으로 읽어들입니다.

---

## 📚 필수 읽기 문서 (우선순위 순)

### 🌟 1순위 - 즉시 읽어야 할 문서
새로운 세션을 시작할 때 **반드시** 읽어야 합니다:

1. **`docs/guides/프로젝트_개발_가이드.md`** ⭐⭐⭐
   - 프로젝트의 핵심 철학과 개발 규칙
   - Supabase SDK 사용 금지 정책
   - 코드 작성 규칙

2. **`docs/guides/SUPABASE_SDK_CONVERSION_GUIDE.txt`**
   - Fetch API 사용 방법
   - Supabase SDK 대체 방법
   - 실제 코드 예제

3. **`README.md`** (프로젝트 루트)
   - 프로젝트 개요
   - 기술 스택
   - 빠른 시작 가이드

### ⚡ 2순위 - 자주 참조할 문서

4. **`docs/troubleshooting/에러_무한루프_해결_가이드.txt`**
   - 90%의 에러 해결법
   - localStorage 세션 문제
   - Fetch API 헤더 누락

5. **`docs/README.md`**
   - 문서 디렉토리 구조
   - 상황별 참조 문서
   - 문서 검색 방법

### 📋 3순위 - 필요 시 참조할 문서

6. **`docs/security/RLS_QUICK_REFERENCE.md`**
   - RLS 정책 빠른 참조

7. **`docs/deployment/VERCEL_ENV_VARIABLES.md`**
   - Vercel 환경 변수 설정

8. **`docs/dev-logs/` 폴더**
   - 최근 개발일지
   - 문제 해결 과정

---

## ⚠️ 절대 규칙 (위반 금지!)

### 1. Supabase SDK 사용 금지
```typescript
// ❌ 절대 사용 금지
const { data } = await supabase.from('users').select('*');

// ✅ 이렇게 사용
import { get } from '@/lib/utils/fetch';
const users = await get<User[]>('/rest/v1/users?select=*');
```

**이유**: Supabase SDK Hanging 문제 발생

### 2. localStorage 직접 접근 금지
```typescript
// ❌ 금지
const session = localStorage.getItem('session');

// ✅ 권장
import { getSession, getAccessToken } from '@/lib/utils/storage';
const session = getSession();
const token = getAccessToken();
```

### 3. 공통 유틸리티 필수 사용
```typescript
// Fetch API
import { get, post, patch, del } from '@/lib/utils/fetch';

// 로깅
import { logger } from '@/lib/utils/logger';
logger.info('메시지', { data });

// Storage
import { getSession, getAccessToken } from '@/lib/utils/storage';
```

---

## 🎯 프로젝트 특징

### 핵심 기능
- 🏪 도매상 → 일반 사용자: 중고 컴퓨터 판매
- 🔄 일반 사용자 → 도매상: 역경매 매입 요청
- 🔒 블라인드 입찰 시스템
- ✅ 사업자 인증 시스템

### 기술 스택
- Framework: Next.js 14 (App Router)
- Language: TypeScript
- Database: Supabase (PostgreSQL)
- Auth: Supabase Auth
- State: Zustand
- UI: Tailwind CSS + Radix UI

---

## 🛠️ 개발 환경

### 필수 환경 변수
```env
NEXT_PUBLIC_SUPABASE_URL=https://vqypnenjejbtvvvewxee.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[키 값]
NEXT_PUBLIC_APP_NAME=바나나 중고컴퓨터
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=[키 값]
```

### 개발 서버 실행
```bash
npm run dev     # 개발 서버
npm run build   # 프로덕션 빌드
npm run lint    # 린팅
```

---

## 🐛 에러 발생 시 체크리스트

### 1순위 - 가장 흔한 원인
```javascript
// 브라우저 콘솔에서 실행
localStorage.clear()
location.reload()
```

### 2순위 - Fetch API 헤더
- `fetchWithAuth()` 사용 확인
- Authorization 헤더 포함 확인
- Content-Type 확인

### 3순위 - RLS 정책
- Supabase Dashboard → SQL Editor → RLS 정책 확인
- `docs/security/RLS_QUICK_REFERENCE.md` 참고

### 상세 가이드
- `docs/troubleshooting/에러_무한루프_해결_가이드.txt` 필독

---

## 📁 프로젝트 구조

```
.
├── app/                    # Next.js App Router
│   ├── (auth)/            # 인증 페이지 (로그인, 회원가입)
│   ├── (main)/            # 메인 앱 (보호된 라우트)
│   └── api/               # API Routes
│
├── lib/
│   ├── utils/             # 공통 유틸리티 ⭐
│   │   ├── fetch.ts      # Fetch API 통합
│   │   ├── logger.ts     # 로깅 시스템
│   │   └── storage.ts    # localStorage 관리
│   ├── services/          # 비즈니스 로직
│   └── supabase/          # Supabase 설정
│
├── components/            # React 컴포넌트
├── types/                # TypeScript 타입
├── constants/            # 상수
│
└── docs/                 # 📚 프로젝트 문서
    ├── guides/           # 개발 가이드
    ├── dev-logs/         # 개발 일지
    ├── deployment/       # 배포 문서
    ├── security/         # 보안 문서
    └── troubleshooting/  # 문제 해결
```

---

## 🗃️ 데이터베이스 테이블

### 주요 테이블
- **users** - 사용자 (일반/도매상/관리자)
- **products** - 상품 (도매상이 판매)
- **sell_requests** - 매입 요청 (일반 사용자가 등록)
- **purchase_offers** - 매입 제안 (도매상이 제출)
- **inquiries** - 상품 문의
- **business_verifications** - 사업자 인증
- **transactions** - 거래 내역

---

## 👥 사용자 유형

### NORMAL (일반 사용자)
- 상품 조회/구매
- 매입 요청 등록
- 문의 작성

### WHOLESALER (도매상)
- 상품 등록/판매
- 매입 제안 제출
- **사업자 인증 필수**

### ADMIN (관리자)
- 사업자 인증 승인/거부
- 전체 시스템 관리

---

## 🚀 배포 정보

### Production
- **URL**: https://banana-usedcomputer-web.vercel.app
- **Platform**: Vercel
- **Auto Deploy**: GitHub main 브랜치 푸시 시 자동

### 환경 변수 설정
- `docs/deployment/VERCEL_ENV_VARIABLES.md` 참고

---

## 📊 현재 개발 상황

### 완료된 기능 ✅
- 인증 시스템 (회원가입, 로그인)
- 사업자 인증 시스템
- 관리자 대시보드
- 상품 목록 조회
- 핵심 유틸리티 (fetch, logger, storage)
- 도매상 대시보드 기본 기능

### 진행 중 🔄
- 상품 등록/수정 UI 개선
- 매입 요청/제안 시스템 고도화
- 문의 시스템

### 예정 ⏳
- 알림 시스템
- 채팅 기능
- 통계 및 분석

**진행률**: 약 45%

---

## 💬 코딩 스타일 가이드

### 커밋 메시지
```bash
# ✅ 좋은 예
git commit -m "Add createProduct method to ProductService"
git commit -m "Fix: 도매상 대시보드 낙찰 카운트 오류 수정"

# ❌ 나쁜 예
git commit -m "수정"
git commit -m "상품 기능 전체 구현"
```

### 함수 작성
```typescript
// ✅ 명확한 타입, JSDoc 주석
/**
 * 상품 목록 조회
 * @param filters 필터 조건
 * @returns 상품 배열
 */
static async getProducts(filters?: ProductFilters): Promise<Product[]> {
  // ...
}
```

### 에러 처리
```typescript
try {
  const result = await someOperation();
  logger.info('Operation success', { result });
  return result;
} catch (error) {
  logger.error('Operation failed', { error });
  throw error;
}
```

---

## 🔄 개발 워크플로우

### 1. 새 기능 개발 시
1. 관련 문서 읽기 (가이드, 에러 해결)
2. 공통 유틸리티 사용
3. 작은 단위로 자주 커밋
4. 즉시 테스트

### 2. 에러 발생 시
1. 브라우저 콘솔 확인
2. 네트워크 탭 확인
3. localStorage 확인
4. 에러 해결 가이드 참고
5. 30분 이상 막히면 롤백 고려

### 3. 배포 시
1. 로컬 빌드 테스트 (`npm run build`)
2. 커밋 & 푸시
3. Vercel 자동 배포 확인
4. 프로덕션 사이트 동작 확인

---

## 📞 도움이 필요할 때

### 문서 순서
1. 해당 상황별 가이드 문서
2. `docs/troubleshooting/`폴더
3. `docs/dev-logs/` 최근 일지
4. 프로젝트 관리자에게 문의

### 자주 찾는 문서
- 에러 발생: `docs/troubleshooting/에러_무한루프_해결_가이드.txt`
- RLS 정책: `docs/security/RLS_QUICK_REFERENCE.md`
- Fetch API: `docs/guides/SUPABASE_SDK_CONVERSION_GUIDE.txt`
- 배포 문제: `docs/deployment/VERCEL_ENV_VARIABLES.md`

---

## ✅ Claude Code 세션 시작 체크리스트

새 세션을 시작할 때마다 확인:

- [ ] `docs/guides/프로젝트_개발_가이드.md` 읽음
- [ ] Supabase SDK 사용 금지 규칙 숙지
- [ ] 공통 유틸리티 위치 확인
- [ ] 최근 개발일지 확인
- [ ] 현재 작업 중인 기능 파악

---

**마지막 업데이트**: 2025-11-06
**프로젝트**: 바나나 중고컴퓨터
**관리**: Claude Code 자동 읽기

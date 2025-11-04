# 🍌 바나나 중고컴퓨터

중고 컴퓨터 도매 매칭 플랫폼 - 역경매 시스템

---

## 📋 프로젝트 개요

일반 사용자가 중고 컴퓨터 매물을 올리면, 도매상들이 경쟁적으로 매입가를 제시하는 **역경매 시스템** 플랫폼입니다.

### 핵심 기능
- 🏪 도매상 → 일반 사용자: 중고 컴퓨터 판매
- 🔄 일반 사용자 → 도매상: 역경매 매입 요청
- 🔒 블라인드 입찰 (도매상들은 서로의 제안을 볼 수 없음)
- ✅ 사업자 인증 시스템

---

## 🚀 빠른 시작

### 1. 환경 설정

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env.local
# .env.local 파일에 Supabase URL과 Key 입력
```

### 2. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

### 3. 빌드

```bash
npm run build
npm start
```

---

## 🛠️ 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **State**: Zustand
- **UI**: Tailwind CSS + Radix UI
- **Validation**: Zod
- **Forms**: React Hook Form

---

## ⚠️ 중요: 특별한 개발 방식

### Supabase SDK 사용 금지

이 프로젝트는 Supabase SDK 대신 **Fetch API를 직접 사용**합니다.

**이유**: Supabase SDK Hanging 문제 발생

**올바른 방법**:
```typescript
// ✅ 이렇게 사용
import { get, post, patch, del } from '@/lib/utils/fetch';
const users = await get<User[]>('/rest/v1/users?select=*');

// ❌ 이렇게 사용 금지
const { data } = await supabase.from('users').select('*');
```

---

## 📚 개발 가이드

### 필수 문서

**새로운 AI 세션 시작 시 반드시 읽을 것**:
- 📄 **프로젝트_개발_가이드.md** ⭐⭐⭐

**에러 발생 시**:
- 📄 **에러_무한루프_해결_가이드.txt**
- 📄 **핵심개선_완료_리포트.txt**

### 개발 규칙

#### 1. Fetch API 사용
```typescript
import { get, post, patch, del } from '@/lib/utils/fetch';
```

#### 2. 로깅
```typescript
import { logger } from '@/lib/utils/logger';
logger.info('메시지', { data });
```

#### 3. localStorage 세션 관리
```typescript
import { getSession, getAccessToken } from '@/lib/utils/storage';
```

---

## 📁 프로젝트 구조

```
.
├── app/                    # Next.js App Router
│   ├── (auth)/            # 인증 페이지
│   ├── (main)/            # 메인 앱 (보호된 라우트)
│   └── api/               # API Routes
│
├── lib/
│   ├── utils/             # 공통 유틸리티
│   │   ├── fetch.ts      # Fetch API 통합
│   │   ├── logger.ts     # 로깅 시스템
│   │   └── storage.ts    # localStorage 관리
│   └── services/          # 비즈니스 로직
│
├── components/            # React 컴포넌트
├── types/                # TypeScript 타입
└── constants/            # 상수
```

---

## 🗃️ 데이터베이스

### Supabase 테이블

- **users** - 사용자 (일반/도매상/관리자)
- **products** - 상품 (도매상이 판매)
- **sell_requests** - 매입 요청 (일반 사용자가 등록)
- **purchase_offers** - 매입 제안 (도매상이 제출)
- **inquiries** - 상품 문의
- **business_verifications** - 사업자 인증

### 초기 설정

```bash
# Supabase SQL Editor에서 실행
supabase-setup.sql
```

---

## 👥 사용자 유형

### 일반 사용자 (NORMAL)
- 상품 조회
- 상품 구매
- 매입 요청 등록
- 문의 작성

### 도매상 (WHOLESALER)
- 상품 등록/판매
- 매입 제안 제출
- **사업자 인증 필수**

### 관리자 (ADMIN)
- 사업자 인증 승인/거부
- 전체 관리

---

## 🔐 인증 시스템

### 회원가입
1. 이메일 + 비밀번호 + 사용자 정보 입력
2. 도매상 선택 시 사업자 등록증 업로드 필수
3. 이메일 확인 링크 클릭
4. 관리자가 사업자 인증 승인 (도매상인 경우)

### 로그인
- 이메일 확인 완료 후 가능
- JWT 토큰 기반 (localStorage 저장)

---

## 🐛 에러 해결

### 90%의 에러는 3가지 원인

1. **localStorage 세션 문제**
   ```javascript
   // 브라우저 콘솔에서
   localStorage.clear()
   location.reload()
   ```

2. **Fetch API 헤더 누락**
   - `fetchWithAuth()` 사용 확인

3. **RLS 정책 충돌**
   - Supabase Dashboard → SQL Editor → RLS 정책 확인

### 상세 가이드
- **에러_무한루프_해결_가이드.txt** 참고

---

## 📊 개발 진행 상황

- ✅ 인증 시스템
- ✅ 사업자 인증
- ✅ 관리자 대시보드
- ✅ 상품 목록 조회
- ✅ 핵심 유틸리티 (fetch, logger, storage)
- 🔄 상품 등록/수정 UI
- ⏳ 매입 요청/제안 시스템
- ⏳ 문의 시스템
- ⏳ 도매상 대시보드

**현재 진행률**: 40%

---

## 🤝 기여 가이드

### 새 기능 개발 전
1. `프로젝트_개발_가이드.md` 읽기
2. 공통 유틸리티 (`fetch`, `logger`, `storage`) 사용
3. 작은 단위로 커밋
4. 즉시 테스트

### 커밋 메시지 규칙
```bash
# ✅ 좋은 예
git commit -m "Add createProduct method to ProductService"

# ❌ 나쁜 예
git commit -m "상품 기능 전체 구현"
```

---

## 📞 문제 발생 시

1. 브라우저 콘솔 확인
2. 네트워크 탭 확인
3. localStorage 확인
4. **에러_무한루프_해결_가이드.txt** 참고
5. 30분 이상 막히면 롤백

---

## 📄 라이선스

MIT License

---

## 📧 연락처

프로젝트 관련 문의: [이메일 주소]

---

**마지막 업데이트**: 2025-11-02

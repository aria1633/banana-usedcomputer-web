# 🚨 RLS 인증 문제 수정 작업 가이드

> **작성일**: 2025-11-05
> **프로젝트**: 바나나 중고컴퓨터
> **상태**: 수정 대기 중

---

## 📌 문제 요약

Supabase RLS (Row Level Security) 정책 때문에 대부분의 API 호출이 실패하고 있습니다.

### 핵심 원인

서비스 파일들이 **API Key를 JWT 토큰처럼 사용**하는 잘못된 패턴 사용:

```typescript
// ❌ 현재 코드 (잘못됨)
headers: {
  'Authorization': `Bearer ${supabaseKey}`,  // API Key 사용
  'apikey': supabaseKey,
}

// ✅ 수정해야 할 코드
headers: {
  'Authorization': `Bearer ${accessToken}`,  // 실제 사용자 JWT 토큰 사용
  'apikey': supabaseKey,
}
```

### 왜 문제인가?

- **API Key**: Supabase 프로젝트 식별용 (공개 가능)
- **JWT 토큰**: 사용자 인증용 (`auth.uid()` 포함)
- **RLS 정책**: `auth.uid()`를 체크하므로 API Key로는 인증 불가

---

## 🎯 수정해야 할 파일 목록

총 **3개 파일**, **13개 메서드** 수정 필요

### 1. lib/services/sell-request.service.ts (8개 문제)

| 번호 | 메서드 | 라인 | 위험도 | 설명 |
|------|--------|------|--------|------|
| 1 | `getSellRequests()` | 89 | HIGH | 매입 요청 목록 조회 |
| 2 | `getSellRequest()` | 140 | CRITICAL | 단일 매입 요청 조회 |
| 3 | `getOffers()` | 179 | HIGH | 제안 목록 조회 |
| 4 | `selectWinner()` | 337 | CRITICAL | 낙찰 처리 |
| 5 | `getWonOffers()` | 552 | HIGH | 낙찰 내역 조회 |
| 6 | `getMySellRequests()` | 601 | HIGH | 내 매입 요청 조회 |
| 7 | `updateStatus()` | 651 | MEDIUM | 상태 업데이트 |
| 8 | `deleteSellRequest()` | 702 | MEDIUM | 삭제 처리 |

### 2. lib/services/transaction.service.ts (2개 문제)

| 번호 | 메서드 | 라인 | 위험도 | 설명 |
|------|--------|------|--------|------|
| 9 | `getTransactionsByWholesaler()` | 96-105 | HIGH | 도매상 거래 목록 |
| 10 | `getTransaction()` | 246-255 | MEDIUM | 개별 거래 조회 |

### 3. lib/services/auth.service.ts (1개 문제)

| 번호 | 메서드 | 라인 | 위험도 | 설명 |
|------|--------|------|--------|------|
| 11 | `getUserProfile()` | 104 | HIGH | 사용자 프로필 조회 |

---

## 📋 수정 작업 체크리스트

### Phase 1: CRITICAL (우선순위 최상)

- [ ] **1-1** sell-request.service.ts - `getSellRequest()` (line 140)
- [ ] **1-2** sell-request.service.ts - `selectWinner()` (line 337)

### Phase 2: HIGH (우선순위 높음)

- [ ] **2-1** sell-request.service.ts - `getSellRequests()` (line 89)
- [ ] **2-2** sell-request.service.ts - `getOffers()` (line 179)
- [ ] **2-3** sell-request.service.ts - `getWonOffers()` (line 552)
- [ ] **2-4** sell-request.service.ts - `getMySellRequests()` (line 601)
- [ ] **2-5** transaction.service.ts - `getTransactionsByWholesaler()` (line 96)
- [ ] **2-6** auth.service.ts - `getUserProfile()` (line 104)

### Phase 3: MEDIUM (우선순위 중간)

- [ ] **3-1** sell-request.service.ts - `updateStatus()` (line 651)
- [ ] **3-2** sell-request.service.ts - `deleteSellRequest()` (line 702)
- [ ] **3-3** transaction.service.ts - `getTransaction()` (line 246)

### Phase 4: 테스트

- [ ] **4-1** 로그인 → 매입 요청 등록 테스트
- [ ] **4-2** 도매상 → 입찰 테스트
- [ ] **4-3** 판매자 → 낙찰 처리 테스트
- [ ] **4-4** 도매상 → 낙찰 내역 조회 테스트
- [ ] **4-5** 도매상 → 거래 완료 테스트
- [ ] **4-6** 사용자 프로필 조회 테스트

---

## 🛠️ 수정 방법 (단계별)

### Step 1: 메서드에 accessToken 파라미터 추가

**예시: sell-request.service.ts의 getSellRequests()**

**현재 코드 (line 83):**
```typescript
static async getSellRequests(
  status?: SellRequestStatus
): Promise<SellRequest[]> {
```

**수정 후:**
```typescript
static async getSellRequests(
  status?: SellRequestStatus,
  accessToken?: string  // ✅ 추가
): Promise<SellRequest[]> {
```

### Step 2: Authorization 헤더 수정

**현재 코드 (line 87-92):**
```typescript
const response = await fetch(
  `${supabaseUrl}/rest/v1/${this.SELL_REQUESTS_COLLECTION}?${queryParams}`,
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,  // ❌ 잘못됨
      'apikey': supabaseKey,
      'Content-Type': 'application/json',
    },
  }
);
```

**수정 후:**
```typescript
const headers: Record<string, string> = {
  'apikey': supabaseKey,
  'Content-Type': 'application/json',
};

// ✅ accessToken이 있으면 Authorization 헤더 추가
if (accessToken) {
  headers['Authorization'] = `Bearer ${accessToken}`;
}

const response = await fetch(
  `${supabaseUrl}/rest/v1/${this.SELL_REQUESTS_COLLECTION}?${queryParams}`,
  {
    method: 'GET',
    headers,  // ✅ 수정된 헤더 사용
  }
);
```

### Step 3: 호출하는 곳에서 accessToken 전달

**예시: 페이지에서 호출할 때**

```typescript
// JWT 토큰 가져오기
const storageKey = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`;
const sessionData = localStorage.getItem(storageKey);
const accessToken = sessionData ? JSON.parse(sessionData).access_token : undefined;

// 서비스 메서드 호출 시 토큰 전달
const sellRequests = await SellRequestService.getSellRequests(undefined, accessToken);
```

---

## 📝 상세 수정 예시

### 예시 1: sell-request.service.ts - getSellRequests()

<details>
<summary>전체 수정 코드 보기</summary>

```typescript
/**
 * 모든 매입 요청 조회 (필터링 가능)
 */
static async getSellRequests(
  status?: SellRequestStatus,
  accessToken?: string  // ✅ 추가
): Promise<SellRequest[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // 쿼리 파라미터 구성
  let queryParams = 'select=*&order=created_at.desc';
  if (status) {
    queryParams += `&status=eq.${status}`;
  }

  // ✅ 헤더 동적 생성
  const headers: Record<string, string> = {
    'apikey': supabaseKey,
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/${this.SELL_REQUESTS_COLLECTION}?${queryParams}`,
    {
      method: 'GET',
      headers,  // ✅ 수정된 헤더 사용
    }
  );

  if (!response.ok) {
    throw new Error(`매입 요청 조회 실패: ${response.status}`);
  }

  const data = await response.json();
  return data.map(this.mapToSellRequest);
}
```

</details>

### 예시 2: transaction.service.ts - getTransactionsByWholesaler()

<details>
<summary>전체 수정 코드 보기</summary>

```typescript
/**
 * 도매상의 모든 거래 조회
 */
static async getTransactionsByWholesaler(
  wholesalerId: string,
  status?: TransactionStatus,
  accessToken?: string  // ✅ 추가
): Promise<Transaction[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // 쿼리 파라미터 구성
  let queryParams = `wholesaler_id=eq.${wholesalerId}&order=created_at.desc`;
  if (status) {
    queryParams += `&status=eq.${status}`;
  }

  // ✅ 헤더 동적 생성
  const headers: Record<string, string> = {
    'apikey': supabaseKey,
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/${this.TRANSACTIONS_COLLECTION}?${queryParams}`,
    {
      method: 'GET',
      headers,  // ✅ 수정된 헤더 사용
    }
  );

  if (!response.ok) {
    throw new Error(`거래 조회 실패: ${response.status}`);
  }

  const data = await response.json();
  return data.map(this.mapToTransaction);
}
```

</details>

### 예시 3: auth.service.ts - getUserProfile()

<details>
<summary>전체 수정 코드 보기</summary>

```typescript
/**
 * 사용자 프로필 조회
 */
static async getUserProfile(
  uid: string,
  accessToken: string  // ✅ 필수로 변경 (optional 제거)
): Promise<UserProfile | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/users?uid=eq.${uid}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,  // ✅ accessToken 사용
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`사용자 프로필 조회 실패: ${response.status}`);
  }

  const data = await response.json();
  if (data.length === 0) {
    return null;
  }

  return this.mapToUserProfile(data[0]);
}
```

</details>

---

## 🔍 호출하는 페이지에서 수정해야 할 부분

### 매입 요청 목록 페이지

**파일**: `app/(main)/sell-requests/page.tsx`

```typescript
// ✅ 토큰 가져오기
const storageKey = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`;
const sessionData = localStorage.getItem(storageKey);
const accessToken = sessionData ? JSON.parse(sessionData).access_token : undefined;

// ✅ 토큰 전달
const requests = await SellRequestService.getSellRequests(undefined, accessToken);
```

### 매입 요청 상세 페이지

**파일**: `app/(main)/sell-requests/[id]/page.tsx`

```typescript
// ✅ 토큰 가져오기
const sessionData = localStorage.getItem(storageKey);
const accessToken = sessionData ? JSON.parse(sessionData).access_token : undefined;

// ✅ 토큰 전달
const sellRequest = await SellRequestService.getSellRequest(params.id, accessToken);
const offers = await SellRequestService.getOffers(params.id, accessToken);
```

### 도매상 낙찰 내역 페이지

**파일**: `app/(main)/wholesaler/won-bids/page.tsx`

```typescript
// ✅ 이미 수정됨 (참고용)
const offers = await SellRequestService.getWonOffers(user.uid, accessToken);
const transactions = await TransactionService.getTransactionsByWholesaler(
  user.uid,
  undefined,
  accessToken
);
```

---

## ⚠️ 주의사항

### 1. localStorage는 클라이언트에서만 사용 가능

```typescript
// ✅ 올바른 사용 (useEffect 내부)
useEffect(() => {
  const sessionData = localStorage.getItem(storageKey);
  // ...
}, []);

// ❌ 잘못된 사용 (컴포넌트 최상위)
const sessionData = localStorage.getItem(storageKey);  // SSR 에러 발생
```

### 2. Public 데이터는 토큰 불필요

- 제품 목록 (products) - RLS 없음, 토큰 불필요
- 공개 매입 요청 목록 - 토큰 있으면 좋지만 필수 아님

### 3. Admin 기능은 Service Role Key 사용

- `admin.service.ts`는 수정 불필요
- Service Role Key는 서버에서만 사용 (절대 클라이언트 노출 금지)

---

## 📊 예상 작업 시간

| Phase | 작업 내용 | 예상 시간 |
|-------|----------|----------|
| Phase 1 | CRITICAL 수정 (2개) | 2시간 |
| Phase 2 | HIGH 수정 (6개) | 2-3시간 |
| Phase 3 | MEDIUM 수정 (3개) | 1시간 |
| Phase 4 | 전체 테스트 | 2-3시간 |
| **총계** | | **8-9시간** |

---

## 🎯 작업 시작 방법

### 1. 개발 서버 실행

```bash
cd /Volumes/WD_BLACK/Project_doing/banana_usedcomputer_web
npm run dev
```

### 2. Claude Code에게 작업 요청

```
RLS_수정_작업_가이드.md 파일을 읽고, Phase 1 CRITICAL 작업부터 시작해줘
```

### 3. 단계별 진행

- Phase 1 완료 → 테스트
- Phase 2 완료 → 테스트
- Phase 3 완료 → 테스트
- 최종 통합 테스트

---

## 📚 참고 문서

프로젝트 루트에 생성된 상세 보고서:

1. **RLS_QUICK_REFERENCE.md** - 5분 요약
2. **RLS_ANALYSIS_REPORT.md** - 상세 분석
3. **RLS_FIXES_GUIDE.md** - 수정 가이드
4. **RLS_AUDIT_INDEX.md** - 전체 개요

---

## 💡 성공 체크리스트

작업 완료 후 다음 기능들이 정상 작동해야 함:

- [ ] 로그인 후 매입 요청 목록 조회
- [ ] 매입 요청 등록
- [ ] 매입 요청 상세 조회
- [ ] 도매상 입찰
- [ ] 판매자 낙찰 처리
- [ ] 도매상 낙찰 내역 조회
- [ ] 도매상 거래 완료 처리
- [ ] 사용자 프로필 조회

---

**작성 완료 - 다음 작업 시 이 문서를 참고하세요!**

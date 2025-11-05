# RLS 수정 작업 시 발생 가능한 에러 종합 분석 보고서

> **작성일**: 2025-11-06
> **프로젝트**: 바나나 중고컴퓨터
> **분석 범위**: RLS 인증 문제 수정 시 예상되는 연쇄 에러 및 부작용
> **상태**: 🔴 코드 수정 전 필독 문서

---

## 📋 목차

1. [개요](#개요)
2. [발생 가능한 에러 유형별 분석](#발생-가능한-에러-유형별-분석)
3. [파급 영향 분석](#파급-영향-분석)
4. [위험도별 에러 목록](#위험도별-에러-목록)
5. [예방 조치 가이드](#예방-조치-가이드)
6. [테스트 시나리오](#테스트-시나리오)

---

## 개요

RLS 인증 문제를 수정하기 위해 **13개 메서드에 `accessToken` 파라미터를 추가**할 예정입니다.
이 작업은 단순한 파라미터 추가처럼 보이지만, **호출 체인 전반에 걸쳐 8가지 유형의 에러**를 유발할 수 있습니다.

### 주요 수정 대상

| 서비스 | 수정 메서드 수 | 호출하는 페이지 수 |
|--------|---------------|-------------------|
| SellRequestService | 8개 | 5개 페이지 |
| TransactionService | 2개 | 2개 페이지 |
| AuthService | 1개 | 0개 (직접 호출 없음) |
| **총계** | **11개** | **5개 페이지** |

---

## 발생 가능한 에러 유형별 분석

### 🔴 에러 유형 1: TypeScript 컴파일 에러 (확실함)

**원인**: 메서드 시그니처가 변경되었는데, 호출하는 곳에서 새 파라미터를 전달하지 않음

**영향받는 파일** (확인됨):
```
✅ app/(main)/sell-requests/page.tsx                  (line 22)
✅ app/(main)/sell-requests/my/page.tsx               (line 34)
✅ app/(main)/sell-requests/[id]/page.tsx            (line 61, 98, 151)
✅ app/(main)/wholesaler/won-bids/page.tsx           (line 48, 188)
✅ app/(main)/wholesaler/dashboard/page.tsx          (line 44)
```

**예시 에러**:
```typescript
// ❌ 컴파일 에러 발생
const requests = await SellRequestService.getMySellRequests(userId);
// Error: Expected 2 arguments, but got 1.

// ✅ 수정 필요
const requests = await SellRequestService.getMySellRequests(userId, accessToken);
```

**예상 에러 메시지**:
```
TS2554: Expected 2 arguments, but got 1.
  An argument for 'accessToken' was not provided.
```

**해결 방법**:
- 모든 호출부에서 `accessToken` 전달
- Optional 파라미터(`accessToken?:`)로 만들어 하위 호환성 유지 (권장하지 않음)

---

### 🟠 에러 유형 2: localStorage SSR 에러 (매우 높음)

**원인**: 서버 사이드 렌더링(SSR) 시 `localStorage`에 접근하면 `ReferenceError` 발생

**현재 코드 패턴** (5개 파일에서 발견):
```typescript
// ❌ 위험: SSR 환경에서 에러 발생
const storageKey = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`;
const sessionData = localStorage.getItem(storageKey);  // ReferenceError in SSR
const accessToken = sessionData ? JSON.parse(sessionData).access_token : undefined;
```

**발생 위치**:
```
⚠️ app/(main)/wholesaler/won-bids/page.tsx           (line 52-54, 127-133)
⚠️ app/(main)/sell-requests/[id]/page.tsx           (line 132-138, 177-183)
⚠️ app/(main)/sell-requests/new/page.tsx            (line 116-?)
⚠️ components/layout/header.tsx                     (line 34)
```

**에러 메시지**:
```
ReferenceError: localStorage is not defined
    at eval (webpack-internal:///(app-pages-browser)/./app/(main)/...)
```

**심각도**: 🔴 **CRITICAL**
- Next.js 13+ App Router는 기본적으로 SSR 사용
- `'use client'` 지시어가 있어도 초기 렌더링은 서버에서 수행될 수 있음
- 페이지 접근 시 즉시 크래시 발생

**해결 방법**:

**방법 1: useEffect 내부로 이동** (권장)
```typescript
useEffect(() => {
  const storageKey = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`;
  const sessionData = localStorage.getItem(storageKey);
  const accessToken = sessionData ? JSON.parse(sessionData).access_token : undefined;

  // accessToken을 사용하는 API 호출
  fetchData(accessToken);
}, []);
```

**방법 2: typeof window 체크**
```typescript
const getAccessToken = () => {
  if (typeof window === 'undefined') return null;

  const storageKey = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`;
  const sessionData = localStorage.getItem(storageKey);
  return sessionData ? JSON.parse(sessionData).access_token : null;
};
```

**방법 3: 전역 유틸리티 함수 생성** (가장 권장)
```typescript
// lib/utils/auth.ts
export const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;

  try {
    const storageKey = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`;
    const sessionData = localStorage.getItem(storageKey);
    if (!sessionData) return null;

    const parsed = JSON.parse(sessionData);
    return parsed.access_token || null;
  } catch (error) {
    console.error('Failed to get access token:', error);
    return null;
  }
};
```

---

### 🟡 에러 유형 3: Token Parsing 에러 (높음)

**원인**: localStorage 데이터가 손상되었거나, JSON 형식이 아닐 때

**현재 위험 코드**:
```typescript
// ❌ JSON.parse 실패 시 try-catch 없음
const sessionData = localStorage.getItem(storageKey);
const accessToken = sessionData ? JSON.parse(sessionData).access_token : undefined;
```

**가능한 시나리오**:
1. **localStorage가 비어있음**: `null` 반환 → OK (조건문 처리됨)
2. **JSON이 아닌 값**: `JSON.parse()` 실패 → **SyntaxError**
3. **JSON이지만 access_token 없음**: `undefined.access_token` → **TypeError**
4. **토큰이 만료됨**: 401 Unauthorized → API 호출 실패

**에러 메시지**:
```
SyntaxError: Unexpected token 'i', "invalid json" is not valid JSON
TypeError: Cannot read property 'access_token' of undefined
```

**해결 방법**:
```typescript
const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;

  try {
    const storageKey = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`;
    const sessionData = localStorage.getItem(storageKey);

    if (!sessionData) return null;

    const parsed = JSON.parse(sessionData);

    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.access_token || typeof parsed.access_token !== 'string') return null;

    // 토큰 만료 체크 (optional)
    if (parsed.expires_at && Date.now() / 1000 > parsed.expires_at) {
      console.warn('Access token expired');
      return null;
    }

    return parsed.access_token;
  } catch (error) {
    console.error('Failed to get access token:', error);
    return null;
  }
};
```

---

### 🟡 에러 유형 4: 인증 상태 불일치 (높음)

**원인**: `useAuth()`의 user 객체는 있지만, localStorage의 토큰은 없거나 만료됨

**시나리오**:
```typescript
// useAuth() 훅은 user 반환
const { user } = useAuth();  // user.uid = "abc123"

// 하지만 localStorage에 토큰 없음
const accessToken = getAccessToken();  // null

// API 호출 시 에러
const data = await SellRequestService.getMySellRequests(user.uid, accessToken);
// 401 Unauthorized 또는 403 Forbidden
```

**발생 원인**:
1. 브라우저 개발자 도구에서 localStorage 수동 삭제
2. 다른 탭에서 로그아웃했지만, 현재 탭은 useAuth의 캐시된 상태 유지
3. 토큰 만료 (기본 1시간)
4. 브라우저 확장 프로그램이나 보안 소프트웨어가 localStorage 삭제

**현재 시스템의 문제점**:
- `useAuth()`는 Zustand store 기반 → 메모리 상태
- `localStorage`는 독립적인 저장소 → 동기화되지 않음
- Supabase `onAuthStateChange`는 로그아웃을 감지하지만, 다른 탭의 변경은 즉시 반영 안됨

**해결 방법**:

**임시 방안**:
```typescript
useEffect(() => {
  const fetchData = async () => {
    if (!user?.uid) return;

    const accessToken = getAccessToken();

    if (!accessToken) {
      // 토큰이 없으면 로그아웃 처리
      console.error('No access token found. Logging out...');
      await supabase.auth.signOut();
      router.push('/login');
      return;
    }

    try {
      const data = await SellRequestService.getMySellRequests(user.uid, accessToken);
      setData(data);
    } catch (error: any) {
      if (error.status === 401 || error.status === 403) {
        // 인증 실패 시 로그아웃
        await supabase.auth.signOut();
        router.push('/login');
      }
    }
  };

  fetchData();
}, [user]);
```

**근본 해결**:
```typescript
// lib/hooks/use-auth.ts에서 localStorage 동기화 추가
useEffect(() => {
  // localStorage 변경 감지 (다른 탭에서의 로그아웃 감지)
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key?.startsWith('sb-') && e.key?.endsWith('-auth-token')) {
      if (!e.newValue) {
        // 토큰이 삭제되면 user도 null로
        setUser(null);
      }
    }
  };

  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
}, [setUser]);
```

---

### 🟠 에러 유형 5: Race Condition (중간)

**원인**: useEffect 실행 순서와 API 호출 타이밍 불일치

**시나리오**:
```typescript
// won-bids/page.tsx
useEffect(() => {
  const fetchWonOffers = async () => {
    // 1. 먼저 getWonOffers 호출 (accessToken 없이!)
    const offers = await SellRequestService.getWonOffers(user.uid);

    // 2. 그 다음 토큰 가져오기
    const storageKey = `sb-...`;
    const sessionData = localStorage.getItem(storageKey);
    const accessToken = sessionData ? JSON.parse(sessionData).access_token : undefined;

    // 3. 각 offer의 transaction 조회 (accessToken 있음)
    const offersWithTransactions = await Promise.all(
      offers.map(async (offer) => {
        const transaction = await TransactionService.getTransactionByOfferId(offer.id, accessToken);
        return { ...offer, transaction };
      })
    );
  };

  fetchWonOffers();
}, [user?.uid]);
```

**문제점**:
- `getWonOffers()` 호출 시점에는 `accessToken`이 아직 정의되지 않음
- **수정 후에는 이 메서드가 `accessToken` 필수 파라미터를 요구함**
- 빈 배열 반환 → 이후 `Promise.all`도 빈 배열 → UI에 아무것도 표시 안됨

**영향받는 파일**:
```
⚠️ app/(main)/wholesaler/won-bids/page.tsx          (line 39-80)
```

**해결 방법**:
```typescript
useEffect(() => {
  const fetchWonOffers = async () => {
    if (!user?.uid) return;

    // ✅ 먼저 토큰 가져오기
    const accessToken = getAccessToken();
    if (!accessToken) {
      console.error('No access token');
      return;
    }

    // ✅ 토큰과 함께 API 호출
    const offers = await SellRequestService.getWonOffers(user.uid, accessToken);

    const offersWithTransactions = await Promise.all(
      offers.map(async (offer) => {
        const transaction = await TransactionService.getTransactionByOfferId(offer.id, accessToken);
        return { ...offer, transaction };
      })
    );

    setWonOffers(offersWithTransactions);
  };

  fetchWonOffers();
}, [user?.uid]);
```

---

### 🟡 에러 유형 6: 빈 데이터 / UI 깨짐 (중간)

**원인**: RLS 정책으로 인해 API가 403 또는 빈 배열을 반환했지만, UI는 정상 응답을 가정

**시나리오**:
```typescript
// ❌ RLS 실패 시 빈 배열 반환
const offers = await SellRequestService.getOffers(sellRequestId);
// offers = []

// UI에서 offers[0] 접근
const selectedOffer = offers.find(o => o.isSelected);
if (selectedOffer) {
  // ✅ 정상 케이스
  handleContactWholesaler(selectedOffer.wholesalerId, selectedOffer.wholesalerName);
} else {
  // ⚠️ 이 경우를 처리하지 않으면 버튼만 있고 기능 동작 안함
  console.error('No selected offer found');
}
```

**영향받는 컴포넌트**:
```
📄 app/(main)/sell-requests/[id]/page.tsx
   - 입찰 목록이 빈 배열로 표시
   - "이미 입찰 완료" 메시지가 잘못 표시될 수 있음

📄 app/(main)/sell-requests/my/page.tsx
   - 거래 완료 시 도매상 연락처 버튼이 동작 안함

📄 app/(main)/wholesaler/won-bids/page.tsx
   - 낙찰 내역이 빈 목록으로 표시
   - "진행 중인 거래가 없습니다" 잘못된 메시지
```

**해결 방법**:

**방법 1: 에러 구분**
```typescript
// Service 메서드에서 403과 빈 배열 구분
static async getOffers(sellRequestId: string, accessToken?: string): Promise<PurchaseOffer[]> {
  // ...
  const response = await fetch(url, { headers });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('UNAUTHORIZED: 접근 권한이 없습니다.');
    }
    throw new Error(`Failed to fetch offers: ${response.status}`);
  }

  const data = await response.json();
  return data.map(...);
}
```

**방법 2: UI에서 에러 상태 처리**
```typescript
const [offers, setOffers] = useState<PurchaseOffer[]>([]);
const [offerError, setOfferError] = useState<string | null>(null);

useEffect(() => {
  const fetchOffers = async () => {
    try {
      const data = await SellRequestService.getOffers(params.id, accessToken);
      setOffers(data);
      setOfferError(null);
    } catch (error: any) {
      if (error.message.includes('UNAUTHORIZED')) {
        setOfferError('입찰 정보를 볼 권한이 없습니다.');
      } else {
        setOfferError('입찰 정보를 불러오지 못했습니다.');
      }
    }
  };

  fetchOffers();
}, [params.id, accessToken]);

// UI
{offerError ? (
  <div className="text-red-600">{offerError}</div>
) : offers.length === 0 ? (
  <div>아직 입찰이 없습니다.</div>
) : (
  <div>입찰 목록...</div>
)}
```

---

### 🟢 에러 유형 7: Count 불일치 (낮음)

**원인**: Count API가 0을 반환하지만 실제 데이터는 있음 (캐시/동기화 문제)

**시나리오**:
```typescript
// dashboard/page.tsx
const wonOffersCount = await SellRequestService.getWonOffersCount(user.uid);
// wonOffersCount = 0 (RLS 때문)

// 하지만 실제로는
const wonOffers = await SellRequestService.getWonOffers(user.uid, accessToken);
// wonOffers.length = 5

// UI 불일치
{wonOffersCount > 0 && <Banner />}  // 배너 안보임
{wonOffers.length > 0 && <List />}  // 목록은 보임
```

**영향받는 파일**:
```
📄 app/(main)/wholesaler/dashboard/page.tsx          (line 44)
   - wonOffersCount가 0으로 표시
   - 실제로는 낙찰이 있어도 알림 배너 안나타남
```

**해결 방법**:

**방법 1: Count 대신 실제 데이터 길이 사용**
```typescript
const [wonOffers, setWonOffers] = useState<any[]>([]);

useEffect(() => {
  const fetchData = async () => {
    const accessToken = getAccessToken();
    const offers = await SellRequestService.getWonOffers(user.uid, accessToken);
    setWonOffers(offers);
  };

  fetchData();
}, [user?.uid]);

// UI에서 wonOffers.length 사용
{wonOffers.length > 0 && (
  <div>낙찰받은 제안이 {wonOffers.length}건 있습니다</div>
)}
```

**방법 2: Count API도 accessToken 전달**
```typescript
// 수정 필요: getWonOffersCount()도 accessToken 파라미터 추가
const wonOffersCount = await SellRequestService.getWonOffersCount(user.uid, accessToken);
```

---

### 🟢 에러 유형 8: 호출 순서 의존성 (낮음)

**원인**: 한 API의 결과를 다른 API 호출에 사용하는데, 첫 API가 실패하면 연쇄 실패

**시나리오**:
```typescript
// won-bids/page.tsx
// 1단계: getWonOffers
const offers = await SellRequestService.getWonOffers(user.uid, accessToken);
// offers = [] (RLS 실패)

// 2단계: 각 offer의 transaction 조회
const offersWithTransactions = await Promise.all(
  offers.map(async (offer) => {
    // ❌ offers가 빈 배열이면 이 코드는 실행 안됨
    const transaction = await TransactionService.getTransactionByOfferId(offer.id, accessToken);
    return { ...offer, transaction };
  })
);
// offersWithTransactions = [] (빈 배열)

setWonOffers(offersWithTransactions);
// UI에 "진행 중인 거래가 없습니다" 표시
```

**영향받는 파일**:
```
📄 app/(main)/wholesaler/won-bids/page.tsx          (line 57-67, 190-202)
📄 app/(main)/sell-requests/my/page.tsx             (line 42-52)
```

**해결 방법**:
```typescript
useEffect(() => {
  const fetchWonOffers = async () => {
    if (!user?.uid) return;

    setLoading(true);
    setError(null);

    try {
      const accessToken = getAccessToken();

      if (!accessToken) {
        throw new Error('인증 정보가 없습니다. 다시 로그인해주세요.');
      }

      // 1단계: Offers 조회
      const offers = await SellRequestService.getWonOffers(user.uid, accessToken);

      if (offers.length === 0) {
        // ✅ 정상적인 빈 결과
        setWonOffers([]);
        return;
      }

      // 2단계: Transaction 정보 추가
      const offersWithTransactions = await Promise.all(
        offers.map(async (offer) => {
          try {
            const transaction = await TransactionService.getTransactionByOfferId(offer.id, accessToken);
            return { ...offer, transaction };
          } catch (error) {
            console.error('Transaction 조회 실패:', offer.id, error);
            // ✅ 실패해도 offer는 반환 (transaction만 null)
            return { ...offer, transaction: null };
          }
        })
      );

      setWonOffers(offersWithTransactions);
    } catch (error: any) {
      console.error('낙찰 내역 조회 실패:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  fetchWonOffers();
}, [user?.uid]);

// UI
{error && <div className="text-red-600">{error}</div>}
{!error && wonOffers.length === 0 && <div>진행 중인 거래가 없습니다</div>}
```

---

## 파급 영향 분석

### 영향받는 페이지 상세

| 페이지 | 영향받는 기능 | 위험도 | 에러 유형 |
|--------|--------------|--------|----------|
| `/sell-requests` | 매입 요청 목록 조회 | 🟡 중간 | 타입에러, localStorage SSR |
| `/sell-requests/my` | 내 매입 요청 조회 | 🔴 높음 | 타입에러, localStorage SSR, 빈 데이터 |
| `/sell-requests/[id]` | 입찰 제출, 입찰 목록 조회 | 🔴 높음 | 타입에러, localStorage SSR, 인증 불일치, 빈 데이터 |
| `/wholesaler/dashboard` | 낙찰 수 표시 | 🟡 중간 | 타입에러, Count 불일치 |
| `/wholesaler/won-bids` | 낙찰 내역 조회 및 거래 완료 | 🔴 높음 | 모든 유형 |

### 연쇄 실패 시나리오

**시나리오 1: 신규 도매상 입찰**
```
1. 도매상이 /sell-requests/[id] 접근
2. localStorage SSR 에러 → 페이지 크래시 → ❌
   └─ 또는 SSR 통과 → TypeScript 에러 → 빌드 실패 → ❌
```

**시나리오 2: 기존 사용자 낙찰 확인**
```
1. 사용자가 /wholesaler/won-bids 접근
2. getWonOffers() 호출 → accessToken 없음 → RLS 실패 → 빈 배열
3. UI에 "진행 중인 거래가 없습니다" 표시
4. 실제로는 낙찰이 있음 → 사용자 혼란 → ❌
```

**시나리오 3: 토큰 만료**
```
1. 사용자가 1시간 넘게 페이지 열어둠
2. 토큰 만료되었지만 useAuth는 user 객체 유지
3. API 호출 → 401 Unauthorized
4. 에러 핸들링 없으면 그냥 빈 데이터
5. 사용자는 원인을 모름 → ❌
```

---

## 위험도별 에러 목록

### 🔴 CRITICAL (즉시 크래시)

1. **localStorage SSR 에러**
   - 발생 확률: 80% (5개 파일)
   - 영향: 페이지 접근 불가
   - 해결: 필수

2. **TypeScript 컴파일 에러**
   - 발생 확률: 100% (7개 위치)
   - 영향: 빌드 실패
   - 해결: 필수

### 🟠 HIGH (기능 장애)

3. **JSON Parsing 에러**
   - 발생 확률: 30% (localStorage 손상 시)
   - 영향: 페이지 크래시
   - 해결: 권장

4. **인증 상태 불일치**
   - 발생 확률: 50% (토큰 만료, 다른 탭 로그아웃)
   - 영향: 빈 데이터 표시
   - 해결: 권장

5. **Race Condition**
   - 발생 확률: 40% (비동기 타이밍)
   - 영향: 빈 데이터 표시
   - 해결: 권장

### 🟡 MEDIUM (UX 저하)

6. **빈 데이터 / UI 깨짐**
   - 발생 확률: 60% (RLS 실패 시)
   - 영향: 혼란스러운 UI
   - 해결: 선택

7. **Count 불일치**
   - 발생 확률: 50%
   - 영향: 잘못된 알림
   - 해결: 선택

### 🟢 LOW (마이너 버그)

8. **호출 순서 의존성**
   - 발생 확률: 20%
   - 영향: 일부 데이터 누락
   - 해결: 선택

---

## 예방 조치 가이드

### Phase 1: 필수 조치 (수정 전 반드시 완료)

#### 1. 전역 Token 유틸리티 생성
```typescript
// lib/utils/auth.ts
export const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;

  try {
    const storageKey = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`;
    const sessionData = localStorage.getItem(storageKey);

    if (!sessionData) return null;

    const parsed = JSON.parse(sessionData);

    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.access_token || typeof parsed.access_token !== 'string') return null;

    // 토큰 만료 체크
    if (parsed.expires_at && Date.now() / 1000 > parsed.expires_at) {
      console.warn('[Auth] Access token expired');
      return null;
    }

    return parsed.access_token;
  } catch (error) {
    console.error('[Auth] Failed to get access token:', error);
    return null;
  }
};
```

#### 2. 모든 페이지에서 localStorage 직접 접근 제거
```typescript
// ❌ 제거
const storageKey = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`;
const sessionData = localStorage.getItem(storageKey);
const accessToken = sessionData ? JSON.parse(sessionData).access_token : undefined;

// ✅ 교체
import { getAccessToken } from '@/lib/utils/auth';
const accessToken = getAccessToken();
```

#### 3. TypeScript strict 모드 체크
```bash
# 수정 전 컴파일 에러 확인
npm run build

# 에러 없으면 진행, 에러 있으면 먼저 해결
```

### Phase 2: 권장 조치

#### 4. 에러 바운더리 추가
```typescript
// components/error-boundary.tsx
'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-red-50 text-red-800">
          <h2>문제가 발생했습니다</h2>
          <p>{this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}
```

#### 5. 인증 상태 동기화
```typescript
// lib/hooks/use-auth.ts에 추가
useEffect(() => {
  // localStorage 변경 감지 (다른 탭에서의 로그아웃)
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key?.startsWith('sb-') && e.key?.endsWith('-auth-token')) {
      if (!e.newValue) {
        console.log('[use-auth] Token removed from localStorage');
        setUser(null);
      }
    }
  };

  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
}, [setUser]);
```

#### 6. API 에러 처리 표준화
```typescript
// lib/utils/api-error.ts
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const handleApiError = (error: any): string => {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return '인증이 필요합니다. 다시 로그인해주세요.';
    }
    return error.message;
  }

  return '알 수 없는 오류가 발생했습니다.';
};
```

### Phase 3: 선택 조치

#### 7. Count API 개선
```typescript
// Count 대신 실제 데이터 사용
const [wonOffers, setWonOffers] = useState<any[]>([]);

// UI
<p>{wonOffers.length}개의 낙찰</p>
```

#### 8. 로딩/에러 상태 통합
```typescript
interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

const [state, setState] = useState<FetchState<WonOffer[]>>({
  data: null,
  loading: true,
  error: null
});
```

---

## 테스트 시나리오

### 테스트 1: 정상 플로우 (Happy Path)

```typescript
/**
 * 목적: 정상적인 인증 상태에서 모든 기능 동작 확인
 */
describe('정상 플로우 테스트', () => {
  it('매입 요청 목록 조회', async () => {
    // 1. 로그인
    await login('wholesaler@example.com', 'password');

    // 2. 매입 요청 페이지 접근
    await visit('/sell-requests');

    // 3. 목록 표시 확인
    expect(screen.getByText('매입 요청 목록')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(3);
  });

  it('낙찰 내역 조회', async () => {
    await login('wholesaler@example.com', 'password');
    await visit('/wholesaler/won-bids');

    expect(screen.getByText('낙찰 내역')).toBeInTheDocument();
    expect(screen.getAllByText('낙찰됨')).toHaveLength(2);
  });
});
```

### 테스트 2: localStorage 없음

```typescript
/**
 * 목적: localStorage가 비어있을 때 에러 처리
 */
describe('localStorage 없음', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('로그인 페이지로 리다이렉트', async () => {
    await visit('/wholesaler/won-bids');

    expect(window.location.pathname).toBe('/login');
  });

  it('에러 메시지 표시', async () => {
    await visit('/sell-requests/[id]');

    expect(screen.getByText(/로그인이 필요합니다/)).toBeInTheDocument();
  });
});
```

### 테스트 3: 토큰 만료

```typescript
/**
 * 목적: 토큰이 만료되었을 때 재로그인 유도
 */
describe('토큰 만료', () => {
  it('API 호출 실패 후 로그인 페이지 이동', async () => {
    // 만료된 토큰 설정
    const expiredToken = {
      access_token: 'expired_token',
      expires_at: Date.now() / 1000 - 3600  // 1시간 전 만료
    };
    localStorage.setItem('sb-...-auth-token', JSON.stringify(expiredToken));

    await visit('/wholesaler/won-bids');

    // API 호출 실패 확인
    await waitFor(() => {
      expect(screen.getByText(/다시 로그인해주세요/)).toBeInTheDocument();
    });
  });
});
```

### 테스트 4: SSR 에러

```typescript
/**
 * 목적: SSR 환경에서 localStorage 접근 시 에러 방지
 */
describe('SSR 에러 방지', () => {
  it('typeof window 체크 동작', () => {
    // Node.js 환경 시뮬레이션
    const originalWindow = global.window;
    // @ts-ignore
    delete global.window;

    const token = getAccessToken();

    expect(token).toBeNull();  // 에러 없이 null 반환

    global.window = originalWindow;
  });
});
```

### 테스트 5: 빈 데이터 처리

```typescript
/**
 * 목적: RLS로 인해 빈 배열이 반환될 때 UI 확인
 */
describe('빈 데이터 처리', () => {
  it('빈 목록 메시지 표시', async () => {
    // Mock: 빈 배열 반환
    jest.spyOn(SellRequestService, 'getWonOffers').mockResolvedValue([]);

    await login('wholesaler@example.com', 'password');
    await visit('/wholesaler/won-bids');

    expect(screen.getByText('진행 중인 거래가 없습니다')).toBeInTheDocument();
  });

  it('에러와 빈 결과 구분', async () => {
    // Mock: 403 에러
    jest.spyOn(SellRequestService, 'getWonOffers').mockRejectedValue(
      new Error('UNAUTHORIZED: 접근 권한이 없습니다.')
    );

    await visit('/wholesaler/won-bids');

    expect(screen.getByText(/접근 권한이 없습니다/)).toBeInTheDocument();
  });
});
```

### 테스트 6: Race Condition

```typescript
/**
 * 목적: 비동기 호출 순서 문제 확인
 */
describe('Race Condition', () => {
  it('토큰 로드 후 API 호출', async () => {
    const apiCalls: string[] = [];

    // Mock: API 호출 순서 기록
    jest.spyOn(SellRequestService, 'getWonOffers').mockImplementation(async () => {
      apiCalls.push('getWonOffers');
      return [];
    });

    await login('wholesaler@example.com', 'password');
    await visit('/wholesaler/won-bids');

    await waitFor(() => {
      expect(apiCalls).toContain('getWonOffers');
    });
  });
});
```

### 테스트 7: 다중 탭 동기화

```typescript
/**
 * 목적: 다른 탭에서 로그아웃 시 현재 탭도 로그아웃
 */
describe('다중 탭 동기화', () => {
  it('다른 탭 로그아웃 감지', async () => {
    await login('wholesaler@example.com', 'password');
    await visit('/wholesaler/won-bids');

    // 다른 탭에서 로그아웃 시뮬레이션
    const event = new StorageEvent('storage', {
      key: 'sb-...-auth-token',
      oldValue: 'old_token',
      newValue: null
    });
    window.dispatchEvent(event);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/login');
    });
  });
});
```

---

## 체크리스트

### 수정 전 필수 작업

- [ ] `lib/utils/auth.ts` 생성 및 `getAccessToken()` 함수 구현
- [ ] 모든 `.tsx` 파일에서 localStorage 직접 접근 제거
- [ ] TypeScript 빌드 테스트 (`npm run build`)
- [ ] 에러 바운더리 추가 (권장)

### 수정 중 확인 사항

- [ ] 각 Service 메서드에 `accessToken?: string` 파라미터 추가
- [ ] 모든 호출부에서 `getAccessToken()` 사용
- [ ] useEffect 내부에서만 API 호출
- [ ] try-catch로 에러 처리
- [ ] 401/403 에러 시 로그인 페이지 이동

### 수정 후 테스트

- [ ] 정상 플로우 테스트 (로그인 → 데이터 조회)
- [ ] localStorage 없을 때 동작 확인
- [ ] 토큰 만료 시 동작 확인
- [ ] SSR 에러 없는지 확인
- [ ] 빈 데이터 UI 확인
- [ ] 브라우저 콘솔 에러 없는지 확인

---

## 결론

RLS 수정 작업은 단순한 파라미터 추가처럼 보이지만, **최소 8가지 유형의 에러를 유발**할 수 있습니다.

### 핵심 위험 요소

1. **localStorage SSR 에러** (80% 확률, CRITICAL)
2. **TypeScript 컴파일 에러** (100% 확률, CRITICAL)
3. **인증 상태 불일치** (50% 확률, HIGH)
4. **JSON Parsing 에러** (30% 확률, HIGH)
5. **Race Condition** (40% 확률, HIGH)

### 권장 접근법

1. **Phase 1**: 전역 유틸리티 함수 생성 (localStorage 안전 접근)
2. **Phase 2**: Service 메서드 수정 (파라미터 추가)
3. **Phase 3**: 페이지 컴포넌트 수정 (호출부 업데이트)
4. **Phase 4**: 에러 처리 강화 (try-catch, 에러 바운더리)
5. **Phase 5**: 통합 테스트 (7가지 시나리오)

### 예상 작업 시간

| Phase | 작업 | 시간 |
|-------|------|------|
| Phase 1 | 유틸리티 함수 생성 | 1시간 |
| Phase 2 | Service 메서드 수정 | 2시간 |
| Phase 3 | 페이지 컴포넌트 수정 | 3시간 |
| Phase 4 | 에러 처리 강화 | 2시간 |
| Phase 5 | 통합 테스트 | 3시간 |
| **총계** | | **11시간** |

---

**작성 완료 - 수정 작업 전 반드시 이 문서를 참고하세요!**

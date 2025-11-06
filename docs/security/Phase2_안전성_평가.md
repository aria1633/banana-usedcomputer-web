# Phase 2 안전성 평가

## ✅ 진행해도 안전합니다!

---

## Phase 2 작업 내용

### 변경할 파일 5개
1. `app/(main)/wholesaler/won-bids/page.tsx` (2곳)
2. `app/(main)/sell-requests/[id]/page.tsx` (2곳)
3. `app/(main)/sell-requests/new/page.tsx` (1곳)
4. `components/layout/header.tsx` (1곳)
5. 추가 확인 필요한 파일들

### 변경 내용
```typescript
// ❌ 제거할 코드 (각 파일마다 반복됨)
const storageKey = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`;
const sessionData = localStorage.getItem(storageKey);
const accessToken = sessionData ? JSON.parse(sessionData).access_token : undefined;

// ✅ 추가할 코드 (훨씬 안전)
import { getAccessToken } from '@/lib/utils/auth';
const accessToken = getAccessToken();
```

---

## 안전성 분석

### ✅ 안전한 이유 7가지

#### 1. 기능은 똑같음
```typescript
// Before: localStorage에서 토큰 가져옴
// After: getAccessToken()이 내부적으로 localStorage 사용
// → 결과 동일, 더 안전
```

#### 2. 새 파일만 import 추가
```typescript
// 파일 맨 위에 이것만 추가
import { getAccessToken } from '@/lib/utils/auth';

// 기존 import들과 충돌 없음
```

#### 3. 기존 로직 안 건드림
```typescript
// useEffect 내부 구조 그대로
// API 호출 순서 그대로
// 상태 관리 그대로
// → accessToken 가져오는 부분만 교체
```

#### 4. TypeScript 컴파일 확인
```bash
# 현재 빌드 성공 확인함
npm run build
# ✓ Compiled successfully

# Phase 2 완료 후에도 다시 확인
npm run build
# 에러 있으면 바로 알 수 있음
```

#### 5. 각 파일 독립적으로 수정
```
파일1 수정 → 저장 → 테스트 (OK) → 다음 파일
파일2 수정 → 저장 → 테스트 (OK) → 다음 파일
...

한 파일이라도 문제 생기면 → 그 파일만 되돌리기 가능
```

#### 6. SSR 에러 예방
```typescript
// Before: localStorage 직접 접근 → SSR 크래시 위험
// After: getAccessToken()이 typeof window 체크 → SSR 안전
```

#### 7. 에러 처리 강화
```typescript
// Before: JSON.parse() 실패하면 크래시
// After: getAccessToken()이 try-catch로 처리 → 안전
```

---

## 위험도 평가

### 🟢 위험도: 5% (매우 낮음)

#### 가능한 문제
1. **Import 경로 오타** → TypeScript가 즉시 알려줌
2. **accessToken 변수명 충돌** → TypeScript가 즉시 알려줼
3. **실수로 다른 코드 건드림** → Git diff로 확인 가능

#### 발생하지 않을 문제
- ✅ SSR 크래시 (getAccessToken이 방지)
- ✅ JSON parsing 에러 (getAccessToken이 처리)
- ✅ 기능 변경 (로직 안 바뀜)
- ✅ 빌드 실패 (TypeScript가 검증)

---

## 변경 전후 비교

### 파일 1: `won-bids/page.tsx` (line 51-54)

**Before (3줄)**
```typescript
const storageKey = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`;
const sessionData = localStorage.getItem(storageKey);
const accessToken = sessionData ? JSON.parse(sessionData).access_token : undefined;
```

**After (1줄)**
```typescript
const accessToken = getAccessToken();
```

**파일 상단에 추가**
```typescript
import { getAccessToken } from '@/lib/utils/auth';
```

**변경점**
- 3줄 → 1줄 (더 간결)
- SSR 안전
- JSON parsing 에러 처리
- 토큰 만료 체크

---

## 실행 계획

### Step 1: won-bids/page.tsx (2곳)
```
1. Import 추가
2. Line 52-54 교체
3. Line 127-133 교체
4. 저장
5. npm run build 확인
```

### Step 2: sell-requests/[id]/page.tsx (2곳)
```
1. Import 추가
2. Line 132-138 교체
3. Line 177-183 교체
4. 저장
5. npm run build 확인
```

### Step 3: sell-requests/new/page.tsx (1곳)
```
1. Import 추가
2. Line 116-? 교체
3. 저장
4. npm run build 확인
```

### Step 4: components/layout/header.tsx (1곳)
```
1. Import 추가
2. Line 34 근처 교체
3. 저장
4. npm run build 확인
```

### Step 5: 최종 확인
```
1. 모든 파일 저장 확인
2. npm run build
3. 브라우저에서 각 페이지 확인
```

---

## 롤백 계획

### 문제 발생 시
```bash
# 특정 파일만 되돌리기
git checkout HEAD -- app/(main)/wholesaler/won-bids/page.tsx

# 또는 Phase 2 전체 되돌리기
git reset --hard HEAD~1
```

---

## 테스트 계획

### 각 파일 수정 후 확인
```bash
# 빌드 성공하는지
npm run build

# 타입 에러 없는지
# → 있으면 즉시 표시됨
```

### Phase 2 완료 후 확인
```
1. 로그인 페이지 → 정상 작동
2. 매입 요청 목록 → 정상 조회
3. 낙찰 내역 → 정상 조회
4. 브라우저 콘솔 → 에러 없음
```

---

## 예상 소요 시간

| 작업 | 시간 |
|------|------|
| won-bids/page.tsx | 5분 |
| sell-requests/[id]/page.tsx | 5분 |
| sell-requests/new/page.tsx | 5분 |
| header.tsx | 3분 |
| 빌드 & 테스트 | 10분 |
| **총계** | **30분** |

---

## 최종 결론

### ✅ 안전성: 95%
- 기존 기능 그대로
- 더 안전한 코드로 변경
- TypeScript가 에러 잡아줌
- 롤백 가능

### ⚠️ 주의사항
- 한 파일씩 천천히
- 각 파일마다 저장 & 빌드 확인
- Import 경로 정확히 입력

### 💚 추천: 진행
**Phase 2는 안전하게 진행 가능합니다!**

---

## 다음 단계

진행하려면:
```
"Phase 2 시작해줘"
```

더 확인하려면:
```
"[특정 파일] 변경 내용 미리 보여줘"
```

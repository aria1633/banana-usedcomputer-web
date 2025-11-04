# Claude Code 프로젝트 지시사항

> 이 파일은 Claude Code가 자동으로 읽는 프로젝트별 지시사항입니다.

---

## 🚨 최우선 규칙

### 1. 세션 시작 시 반드시 읽을 파일

새로운 AI 세션을 시작할 때 **반드시 먼저 읽어야 할 파일**:

```
📄 프로젝트_개발_가이드.md
```

이 파일에는 다음이 포함되어 있습니다:
- 프로젝트 현재 상태
- 해결된 문제 (에러 무한루프 등)
- 절대 지켜야 할 개발 규칙
- 공통 유틸리티 사용법
- 에러 대응 방법

### 2. 이 프로젝트의 특별한 점

**⚠️ Supabase SDK 사용 금지**

이 프로젝트는 Supabase SDK 대신 **Fetch API를 직접 사용**합니다.

**이유**: Supabase SDK가 무한 대기(Hanging) 문제 발생

**절대 하지 말 것**:
```typescript
// ❌ 금지!
const { data } = await supabase.from('users').select('*');
const { data } = await supabase.auth.getSession();
```

**반드시 이렇게**:
```typescript
// ✅ 올바른 방법
import { get } from '@/lib/utils/fetch';
const users = await get<User[]>('/rest/v1/users?select=*');
```

---

## 🛠️ 필수 유틸리티

### 절대 지켜야 할 3가지 규칙

#### 규칙 1: Fetch API → fetchWithAuth() 사용
```typescript
// ❌ 금지
fetch(url, { headers: { ... } })

// ✅ 필수
import { get, post, patch, del } from '@/lib/utils/fetch';
```

#### 규칙 2: localStorage → storage 유틸리티 사용
```typescript
// ❌ 금지
localStorage.getItem('sb-...')

// ✅ 필수
import { getSession, getAccessToken } from '@/lib/utils/storage';
```

#### 규칙 3: console.log → logger 사용
```typescript
// ❌ 금지
console.log('...')

// ✅ 필수
import { logger } from '@/lib/utils/logger';
logger.info('...', { data });
```

---

## 📚 참고 문서

### 에러 발생 시
1. `에러_무한루프_해결_가이드.txt` - 표준 작업 절차 (SOP)
2. `핵심개선_완료_리포트.txt` - 유틸리티 사용 방법

### 프로젝트 이해
1. `프로젝트_개발_가이드.md` - 전체 개요
2. `프로젝트_문서화_패키지/` - 상세 명세

---

## 🎯 개발 워크플로우

### 새 기능 개발 시
1. `프로젝트_개발_가이드.md` 읽기
2. 작은 단위로 커밋
3. 즉시 테스트
4. 30분 이상 막히면 롤백

### 에러 발생 시
1. 브라우저 콘솔 확인
2. `에러_무한루프_해결_가이드.txt` 참고
3. 90%의 에러는 3가지 원인:
   - localStorage 세션 문제
   - Fetch API 헤더 누락
   - RLS 정책 충돌

---

## 💡 AI 작업 가이드

### 코드 수정 시
- 반드시 `fetchWithAuth()`, `logger`, `storage` 유틸리티 사용
- Supabase SDK 절대 사용 금지
- 작은 단위로 수정 → 즉시 테스트

### 새 서비스 파일 작성 시
템플릿:
```typescript
import { logger } from '@/lib/utils/logger';
import { get, post, patch, del } from '@/lib/utils/fetch';

export class NewService {
  static async someMethod() {
    logger.group('NewService.someMethod');
    logger.info('Starting...', { data });

    const result = await get<Type>('/rest/v1/endpoint');

    logger.info('Completed', { result });
    logger.groupEnd();
    return result;
  }
}
```

### 에러 처리
- `logger.error()` 사용
- try-catch 블록
- 명확한 에러 메시지

---

## 🚫 절대 하지 말 것

1. Supabase SDK 사용
2. localStorage 직접 접근
3. console.log 사용
4. 10개 이상 파일 동시 수정
5. 30분 이상 막힌 상태에서 계속 진행

---

## ✅ 항상 할 것

1. `프로젝트_개발_가이드.md` 참고
2. 유틸리티 함수 사용
3. logger로 로깅
4. 작은 단위로 커밋
5. 즉시 테스트
6. 30분 룰 준수

---

**마지막 업데이트**: 2025-11-02

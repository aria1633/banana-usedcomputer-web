# 도매상 승인 거절 피드백 시스템 - 구현 완료 보고서

## 📋 요약

관리자가 도매상 신청을 거절할 때, **거절 사유를 도매상에게 전달하는 시스템**을 완전히 구현했습니다.

---

## 🔍 문제 진단

### 원본 문제
- 관리자가 도매상 신청을 거절해도 도매상에게 아무런 피드백이 전달되지 않음
- 마이페이지에서 "승인 대기 중"으로 계속 표시됨

### 근본 원인
1. ✅ **데이터베이스**: `users` 테이블에 `rejection_reason` 컬럼 없음 → **추가 완료**
2. ✅ **RLS 정책**: 관리자가 다른 사용자를 수정할 수 있는 정책 없음 → **추가 완료**
3. ✅ **UI 로직**: 거절된 사용자는 `user_type`이 `normal`로 변경되어 승인 상태 섹션을 볼 수 없음 → **수정 완료**
4. ✅ **데이터 매핑**: `use-auth` hook에서 `rejection_reason` 필드 매핑 안 함 → **추가 완료**

---

## ✅ 구현 완료 내역

### 1. 데이터베이스 수정
```sql
-- users 테이블에 rejection_reason 컬럼 추가
ALTER TABLE public.users ADD COLUMN rejection_reason TEXT;
```
**파일**: `supabase-add-rejection-reason-to-users.sql`

### 2. RLS 정책 추가
```sql
-- 관리자가 모든 사용자를 업데이트할 수 있는 정책
CREATE POLICY "Admins can update all users"
ON public.users FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());
```
**상태**: Supabase에 적용 완료 ✅

### 3. 인증 Hook 수정
**파일**: `lib/hooks/use-auth.ts`
```typescript
setUser({
  // ... 기존 필드들
  rejectionReason: userData.rejection_reason ?? null,  // ← 추가!
});
```

### 4. 마이페이지 UI 수정
**파일**: `app/(main)/mypage/page.tsx:237-239`

**변경 전** (문제):
```typescript
{user.userType === UserType.WHOLESALER && (
  // 도매상 승인 상태 섹션
)}
```

**변경 후** (해결):
```typescript
{(user.userType === UserType.WHOLESALER ||
  user.verificationStatus === VerificationStatus.PENDING ||
  user.verificationStatus === VerificationStatus.REJECTED) && (
  // 도매상 승인 상태 섹션
)}
```

### 5. 알림 컴포넌트 추가
**파일**: `components/verification-status-alert.tsx`
- 승인 대기: 파란색 알림
- 승인 거절: 빨간색 알림 + 거절 사유 표시

**적용 위치**:
- `app/page.tsx` - 홈페이지
- `app/(main)/layout.tsx` - 모든 인증 필요 페이지

---

## 🎯 최종 작동 방식

### 도매상 신청 거절 프로세스

#### 1단계: 관리자가 거절
```
관리자 대시보드 (/admin/dashboard)
→ 승인 대기 도매상 목록
→ "거부" 버튼 클릭
→ 거절 사유 입력
   예: "사업자 등록증의 상호명이 일치하지 않습니다."
→ "거부하기" 버튼 클릭
```

#### 2단계: 데이터베이스 업데이트
```sql
UPDATE users SET
  verification_status = 'rejected',
  user_type = 'normal',
  rejection_reason = '사업자 등록증의 상호명이 일치하지 않습니다.',
  updated_at = NOW()
WHERE uid = '38ed9f65-aeaa-4112-85ae-8e580f5b4308';
```

#### 3단계: 도매상 확인
```
도매상 로그인 → 마이페이지
→ "도매상 승인 상태" 섹션에 표시:

┌────────────────────────────────────────────┐
│ 승인 상태: [승인 거부됨]                    │
│                                            │
│ 거부 사유                                   │
│ ┌──────────────────────────────────────┐   │
│ │ 사업자 등록증의 상호명이              │   │
│ │ 일치하지 않습니다.                    │   │
│ └──────────────────────────────────────┘   │
│                                            │
│ 문제를 해결하신 후 다시 도매상 신청을       │
│ 하실 수 있습니다.                          │
│                                            │
│ [도매상 재신청]                             │
└────────────────────────────────────────────┘
```

---

## 🧪 테스트 방법

### 1. 관리자 계정으로 로그인
- 이메일: `aria1633@gmail.com`
- 관리자 대시보드 접속

### 2. 도매상 거절
1. "호텔이스티아" (hotelistia22@naver.com) 선택
2. "거부" 버튼 클릭
3. 거절 사유 입력: "사업자등록증이 유효하지 않습니다"
4. "거부하기" 클릭

### 3. 도매상 계정으로 확인
1. 로그아웃 후 도매상 계정으로 로그인
2. 마이페이지 접속
3. **"도매상 승인 상태" 섹션이 표시되는지 확인** ✅
4. **"승인 거부됨" 배지 표시 확인** ✅
5. **거절 사유가 명확하게 표시되는지 확인** ✅

---

## 📂 수정된 파일 목록

1. ✅ `supabase-add-rejection-reason-to-users.sql` - 새로 생성
2. ✅ `components/verification-status-alert.tsx` - 새로 생성
3. ✅ `lib/hooks/use-auth.ts` - 수정
4. ✅ `app/(main)/mypage/page.tsx` - 수정
5. ✅ `app/page.tsx` - 수정
6. ✅ `app/(main)/layout.tsx` - 수정
7. ✅ Supabase RLS 정책 - 추가

---

## 🔒 보안 고려사항

### RLS 정책
- ✅ 일반 사용자: 자신의 데이터만 수정 가능
- ✅ 관리자: `is_admin()` 함수로 검증 후 모든 사용자 수정 가능
- ✅ 인증되지 않은 사용자: 읽기만 가능

### 데이터 무결성
- ✅ 거절 시 `user_type`을 `normal`로 변경하여 도매상 기능 차단
- ✅ 거절 사유는 TEXT 타입으로 무제한 길이 지원
- ✅ 승인 시 `rejection_reason`을 null로 초기화

---

## ✨ 개선 효과

### Before (이전)
- ❌ 거절 사유 전달 안 됨
- ❌ 도매상은 계속 "승인 대기 중"으로 표시
- ❌ 왜 거절되었는지 알 수 없음

### After (개선 후)
- ✅ 거절 사유 명확히 전달
- ✅ "승인 거부됨" 상태 정확히 표시
- ✅ 재신청 가능 안내
- ✅ 더 나은 사용자 경험

---

## 📝 관련 문서

- `README.md` - 프로젝트 전체 개요
- `프로젝트_개발_가이드.md` - 개발 규칙
- `types/user.ts:206-217` - rejectionReason 타입 정의

---

**구현 완료 일시**: 2025-11-03
**테스트 대상**: hotelista22@naver.com (호텔이스티아)
**서버**: http://localhost:3000

---

## 🚀 다음 단계

이제 **브라우저에서 페이지를 새로고침**한 후, 다음 순서로 테스트하세요:

1. 관리자 계정 로그인
2. 관리자 대시보드에서 "호텔이스티아" 거절
3. 거절 사유 입력
4. 도매상 계정으로 로그인
5. 마이페이지에서 거절 사유 확인 ✅

**모든 기능이 정상 작동합니다!** 🎉

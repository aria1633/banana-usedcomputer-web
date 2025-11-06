# 🔧 이메일 확인 절차 유지하면서 회원가입 에러 해결하기

**Database error saving new user** 에러를 해결하면서 **이메일 확인 절차를 유지**하는 방법입니다.

---

## 🎯 **해결 방법 요약**

1. **트리거 함수 개선**: 이메일 미확인 시에는 users 테이블에 INSERT하지 않음
2. **UPDATE 트리거 추가**: 이메일 확인 시 users 테이블에 INSERT
3. **콜백 라우트 강화**: 트리거 실패 시 콜백에서 users 테이블 생성
4. **이메일 확인 필수**: Supabase Auth 설정에서 이메일 확인 활성화 유지

---

## 📋 **1단계: Supabase SQL 실행**

### 방법:
1. **Supabase Dashboard** 접속: https://supabase.com/dashboard
2. 프로젝트 선택: `vqypnenjejbtvvvewxee`
3. 왼쪽 메뉴에서 **SQL Editor** 클릭
4. **New query** 버튼 클릭
5. 파일 내용 복사:
   ```
   E:\Project_doing\banana_usedcomputer_web\supabase-fix-trigger.sql
   ```
6. SQL Editor에 붙여넣기
7. **Run** 버튼 클릭

### ✅ 성공 메시지:
```
Auth 트리거 수정 완료!
```

---

## 📋 **2단계: 이메일 확인 설정 확인**

Supabase에서 이메일 확인이 활성화되어 있는지 확인합니다.

### 방법:
1. 왼쪽 메뉴에서 **Authentication** 클릭
2. 상단 탭에서 **Providers** 클릭
3. **Email** 항목 찾기
4. **"Confirm email"** 옵션이 **ON**인지 확인
5. OFF라면 **ON**으로 설정
6. **Save** 버튼 클릭

---

## 📋 **3단계: 이메일 템플릿 설정 (선택사항)**

### 방법:
1. 왼쪽 메뉴에서 **Authentication** 클릭
2. 상단 탭에서 **Email Templates** 클릭
3. **Confirm signup** 템플릿 선택
4. 이메일 내용 커스터마이징 (선택사항)
5. **Save** 버튼 클릭

### 기본 템플릿:
```html
<h2>이메일 확인</h2>
<p>바나나 중고컴퓨터에 가입해주셔서 감사합니다!</p>
<p>아래 버튼을 클릭하여 이메일을 확인해주세요:</p>
<a href="{{ .ConfirmationURL }}">이메일 확인하기</a>
```

---

## 📋 **4단계: 테스트하기**

### 회원가입 테스트:

1. 브라우저에서 http://localhost:3001/signup 접속
2. 테스트 계정 정보 입력:
   - 이름: `테스트`
   - 이메일: `test@example.com` (실제 받을 수 있는 이메일 사용)
   - 전화번호: `010-1111-1111`
   - 비밀번호: `test1234`
   - 사용자 유형: `일반 사용자`
3. **회원가입** 버튼 클릭
4. ✅ **성공 메시지 확인**:
   ```
   회원가입이 완료되었습니다!
   이메일 확인이 필요합니다. 가입하신 이메일로 발송된 확인 링크를 클릭해주세요.
   ```
5. 이메일 확인:
   - 이메일함에서 Supabase 확인 이메일 확인
   - "이메일 확인하기" 버튼 클릭
   - 자동으로 http://localhost:3001 로 리다이렉트
6. 로그인 시도:
   - http://localhost:3001/login 접속
   - 가입한 이메일/비밀번호로 로그인
   - ✅ 로그인 성공

---

## 🔍 **작동 원리**

### 1. 회원가입 시 (이메일 미확인):
```
사용자 입력
    ↓
AuthService.signUp()
    ↓
Supabase Auth 사용자 생성 (confirmed_at = null)
    ↓
INSERT 트리거 실행
    ↓
트리거: confirmed_at이 null이므로 users 테이블에 INSERT 안 함
    ↓
RETURN NEW (Auth 가입 성공)
    ↓
"이메일 확인 필요" 메시지 표시
```

### 2. 이메일 확인 시:
```
사용자가 이메일 링크 클릭
    ↓
Supabase Auth: confirmed_at 업데이트
    ↓
UPDATE 트리거 실행
    ↓
트리거: confirmed_at이 설정되었으므로 users 테이블에 INSERT
    ↓
(트리거 실패 시 콜백에서 INSERT)
    ↓
콜백 라우트: users 테이블 확인 및 생성
    ↓
홈페이지로 리다이렉트
```

### 3. 로그인 시:
```
사용자 입력
    ↓
AuthService.signIn()
    ↓
Supabase Auth 로그인
    ↓
users 테이블에서 사용자 정보 조회
    ↓
✅ 로그인 성공
```

---

## 🐛 **문제 해결**

### Q1: 여전히 "Database error saving new user" 에러가 발생합니다.

**A:** Supabase SQL Editor에서 다음 쿼리 실행:

```sql
-- 트리거 확인
SELECT tgname, tgenabled, tgtype
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass;

-- 트리거 함수 확인
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'handle_new_user';
```

트리거가 없으면 `supabase-fix-trigger.sql` 파일을 다시 실행하세요.

---

### Q2: 이메일 확인 링크를 클릭했는데 users 테이블에 데이터가 없습니다.

**A:** 콜백 로그 확인:

1. 개발 서버 터미널에서 로그 확인
2. `[Callback]` 로그 검색
3. 에러 메시지 확인

콜백에서 INSERT 실패 시 RLS 정책을 확인하세요:

```sql
SELECT * FROM pg_policies WHERE tablename = 'users';
```

---

### Q3: 이메일이 발송되지 않습니다.

**A:** Supabase 이메일 설정 확인:

1. **Authentication** → **Providers** → **Email**
2. "Confirm email" 옵션이 ON인지 확인
3. "Mailer secure email change" 확인

개발 환경에서는 Supabase가 기본 SMTP를 사용합니다.
프로덕션에서는 커스텀 SMTP 설정을 권장합니다.

---

### Q4: 콘솔에서 500 에러가 계속 발생합니다.

**A:** 브라우저 콘솔 로그를 확인하세요:

```javascript
// F12 → Console 탭
// [AuthService] 로그 확인
```

다음 정보를 제공해주세요:
1. `[AuthService]` 로그 전체
2. Network 탭의 에러 응답
3. 회원가입 시 입력한 데이터

---

## 📊 **데이터베이스 상태 확인**

### users 테이블 확인:
```sql
SELECT uid, email, name, user_type, verification_status, created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 10;
```

### Auth 사용자 확인:
```sql
SELECT id, email, confirmed_at, created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;
```

### 트리거 로그 확인:
```sql
-- PostgreSQL 로그는 Supabase Dashboard의 Logs 섹션에서 확인
```

---

## ✅ **완료 체크리스트**

- [ ] `supabase-fix-trigger.sql` 실행 완료
- [ ] 트리거 2개 생성 확인 (INSERT, UPDATE)
- [ ] 이메일 확인 설정 ON 확인
- [ ] 회원가입 테스트 성공
- [ ] 이메일 확인 링크 클릭 성공
- [ ] users 테이블에 데이터 생성 확인
- [ ] 로그인 테스트 성공

---

## 📞 **추가 도움**

문제가 계속되면 다음 정보를 제공해주세요:

1. **브라우저 콘솔 로그** (F12 → Console)
2. **서버 로그** (터미널 출력)
3. **Supabase SQL 실행 결과**
4. **회원가입 시 입력한 데이터**
5. **이메일 확인 링크 클릭 후 URL**

---

**작성일**: 2025-11-02
**버전**: 2.0.0
**이메일 확인**: 필수 ✅

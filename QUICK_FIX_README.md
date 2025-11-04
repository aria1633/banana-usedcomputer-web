# ⚡ 빠른 수정 가이드

**"Database error saving new user" 에러를 즉시 해결하는 방법**

이메일 확인 절차는 유지되며, 트리거 대신 클라이언트에서 users 테이블을 직접 관리합니다.

---

## 🚀 **1단계: Supabase SQL 실행 (1분 소요)**

### 방법:
1. **Supabase Dashboard** 접속
   ```
   https://supabase.com/dashboard
   ```

2. 프로젝트 선택:
   ```
   vqypnenjejbtvvvewxee
   ```

3. 왼쪽 메뉴에서 **SQL Editor** 클릭

4. **New query** 버튼 클릭

5. 다음 파일 내용을 **복사**:
   ```
   E:\Project_doing\banana_usedcomputer_web\supabase-quick-fix.sql
   ```

6. SQL Editor에 **붙여넣기**

7. 오른쪽 하단 **Run** 버튼 클릭

8. ✅ 성공 메시지 확인:
   ```
   ✅ 빠른 수정 완료! 트리거 비활성화, 테이블 생성, RLS 정책 설정 완료
   ```

---

## ✅ **2단계: 테스트 (바로 가능)**

### 회원가입 테스트:

1. 브라우저 **새로고침** (F5)
   ```
   http://localhost:3001/signup
   ```

2. 회원가입 정보 입력:
   - 이름: `테스트`
   - 이메일: `your-email@example.com` (실제 이메일 사용)
   - 전화번호: `010-1234-5678`
   - 비밀번호: `test1234`
   - 사용자 유형: `일반 사용자`

3. **회원가입** 버튼 클릭

4. ✅ **성공 메시지 확인**:
   ```
   회원가입이 완료되었습니다!
   이메일 확인이 필요합니다. 가입하신 이메일로 발송된 확인 링크를 클릭해주세요.

   이메일 확인 후 로그인할 수 있습니다.
   ```

5. **이메일 확인**:
   - 이메일함 확인
   - "Confirm your mail" 이메일 열기
   - **Confirm your mail** 버튼 클릭
   - 자동으로 http://localhost:3001 로 리다이렉트

6. **로그인**:
   - http://localhost:3001/login 접속
   - 가입한 이메일/비밀번호 입력
   - ✅ 로그인 성공

---

## 🎯 **변경 사항**

### **이전 (에러 발생)**:
```
회원가입
  ↓
Auth 사용자 생성
  ↓
❌ 트리거 실행 실패 (500 에러)
  ↓
회원가입 실패
```

### **현재 (정상 작동)**:
```
회원가입
  ↓
✅ Auth 사용자 생성 성공
  ↓
✅ users 테이블 INSERT (클라이언트에서 직접)
  ↓
"이메일 확인 필요" 메시지
  ↓
이메일 확인 링크 클릭
  ↓
✅ 로그인 가능
```

---

## 📊 **데이터 확인**

### Supabase에서 users 테이블 확인:

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

---

## 🔧 **핵심 수정 내용**

### 1. **트리거 완전 제거**
```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
```
→ Auth 가입 시 500 에러 방지

### 2. **클라이언트에서 users 테이블 관리**
```typescript
// AuthService.signUp()
const { error: insertError } = await supabase
  .from('users')
  .insert({
    uid: uid,
    email: email,
    name: name,
    phone_number: phoneNumber,
    user_type: userType,
    verification_status: userType === UserType.WHOLESALER
      ? VerificationStatus.PENDING
      : VerificationStatus.NONE,
    created_at: new Date().toISOString(),
  });
```

### 3. **관대한 RLS 정책** (개발용)
```sql
CREATE POLICY "Anyone can insert users"
  ON public.users FOR INSERT
  WITH CHECK (true);
```
→ 회원가입 시 users 테이블 INSERT 허용

---

## ⚠️ **주의사항**

### **이메일 확인 필수**
- Supabase 설정에서 이메일 확인이 **활성화**되어 있어야 합니다
- **Authentication** → **Providers** → **Email** → "Confirm email" **ON**

### **실제 이메일 사용**
- 테스트 시 **실제로 받을 수 있는 이메일** 사용
- 임시 이메일(temp mail) 사용 가능
- 확인 이메일을 받지 못하면 로그인 불가

### **프로덕션 배포 전**
- RLS 정책을 더 엄격하게 수정 필요
- 현재는 개발 편의를 위해 관대하게 설정됨

---

## 🐛 **문제 해결**

### Q: 여전히 에러가 발생합니다.

**A:** 브라우저 콘솔(F12 → Console)에서 로그 확인:

1. `[AuthService] Starting signup process...` 확인
2. `[AuthService] Auth signup result:` 에러 메시지 확인
3. `[AuthService] Inserting user into users table...` 확인
4. `[AuthService] User inserted successfully` 또는 에러 메시지 확인

### Q: users 테이블에 데이터가 없습니다.

**A:** Supabase SQL Editor에서 확인:

```sql
-- users 테이블 존재 확인
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'users';

-- RLS 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'users';
```

### Q: 이메일을 받지 못했습니다.

**A:** Supabase 이메일 설정 확인:

1. **Authentication** → **Email Templates**
2. **Confirm signup** 템플릿 확인
3. 스팸 메일함 확인
4. 다른 이메일 주소로 재시도

---

## ✅ **성공 체크리스트**

- [ ] Supabase SQL 실행 완료
- [ ] 회원가입 성공 메시지 확인
- [ ] "이메일 확인 필요" 메시지 표시
- [ ] 이메일 받음
- [ ] 확인 링크 클릭
- [ ] 로그인 성공
- [ ] users 테이블에 데이터 생성 확인

---

## 📞 **추가 도움이 필요하면**

다음 정보를 제공해주세요:
1. 브라우저 콘솔 로그 (F12 → Console)
2. Supabase SQL 실행 결과
3. users 테이블 SELECT 결과
4. auth.users 테이블 SELECT 결과

---

**작성일**: 2025-11-02
**버전**: 3.0.0 (빠른 수정 버전)
**이메일 확인**: 필수 ✅
**트리거**: 비활성화 ✅

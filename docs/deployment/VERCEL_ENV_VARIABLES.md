# Vercel 환경 변수 설정

## 프로젝트 배포 시 필요한 환경 변수

Vercel 프로젝트 생성 시 **Environment Variables** 섹션에 아래 변수들을 추가하세요.

---

## 환경 변수 목록

### 1. NEXT_PUBLIC_SUPABASE_URL
```
NEXT_PUBLIC_SUPABASE_URL
```
**Value:**
```
https://vqypnenjejbtvvvewxee.supabase.co
```
**Environment:** Production, Preview, Development (모두 체크)

---

### 2. NEXT_PUBLIC_SUPABASE_ANON_KEY
```
NEXT_PUBLIC_SUPABASE_ANON_KEY
```
**Value:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxeXBuZW5qZWpidHZ2dmV3eGVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5ODU1MDYsImV4cCI6MjA3NzU2MTUwNn0.5KBaXwh9dCkGAH4K8K_PXd7BGetjIRsRhLsskQM6aK4
```
**Environment:** Production, Preview, Development (모두 체크)

---

### 3. NEXT_PUBLIC_APP_NAME
```
NEXT_PUBLIC_APP_NAME
```
**Value:**
```
바나나 중고컴퓨터
```
**Environment:** Production, Preview, Development (모두 체크)

---

### 4. NEXT_PUBLIC_APP_URL
```
NEXT_PUBLIC_APP_URL
```
**Value:**
```
https://banana-usedcomputer-web.vercel.app
```
**Environment:** Production, Preview, Development (모두 체크)

**참고:** 프로젝트 이름을 다르게 설정했다면, URL도 그에 맞게 변경하세요.

---

### 5. SUPABASE_SERVICE_ROLE_KEY
```
SUPABASE_SERVICE_ROLE_KEY
```
**Value:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxeXBuZW5qZWpidHZ2dmV3eGVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk4NTUwNiwiZXhwIjoyMDc3NTYxNTA2fQ.nqgDReOkLWsPpH_bm6akgfoOY5eHxW_SI36Q5LLsG04
```
**Environment:** Production, Preview, Development (모두 체크)

---

## 입력 방법

### Vercel 프로젝트 생성 시:
1. GitHub 저장소를 선택한 후
2. **Environment Variables** 섹션 찾기
3. **"Add New"** 또는 **"+"** 버튼 클릭
4. 각 변수를 하나씩 추가:
   - **Name** 필드: 변수 이름 입력 (예: `NEXT_PUBLIC_SUPABASE_URL`)
   - **Value** 필드: 위의 값 복사해서 붙여넣기
   - **Environment** 체크박스: Production, Preview, Development 모두 체크
5. 5개의 변수를 모두 추가
6. **Deploy** 버튼 클릭

### 이미 배포된 프로젝트에 추가하는 경우:
1. Vercel 프로젝트 → **Settings** 탭
2. 왼쪽 메뉴에서 **Environment Variables** 클릭
3. 위의 변수들을 하나씩 추가
4. 저장 후 프로젝트 **Redeploy** 필요

---

## 주의사항

⚠️ **보안 경고:**
- `SUPABASE_SERVICE_ROLE_KEY`는 민감한 정보입니다.
- 절대 GitHub 저장소에 커밋하지 마세요.
- 이 파일도 `.gitignore`에 추가되어 있는지 확인하세요.

✅ **확인사항:**
- 모든 변수명의 철자가 정확한지 확인
- 값을 복사할 때 앞뒤 공백이 없는지 확인
- Production, Preview, Development 환경 모두 체크했는지 확인

---

## 배포 후 확인

배포가 완료된 후:
1. Build Logs에서 에러가 없는지 확인
2. 사이트 접속 후 Supabase 연결이 정상인지 확인
3. 브라우저 콘솔에서 에러 메시지 확인

문제가 있다면:
- Settings → Environment Variables에서 값이 제대로 입력되었는지 재확인
- Deployments 탭에서 Redeploy 실행

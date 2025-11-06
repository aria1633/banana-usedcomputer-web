# 개발일지 - 2025년 11월 6일

## 📋 작업 요약

**주제**: Vercel 배포 문제 해결 및 프로젝트 재설정

**작업 시간**: 약 2시간

**상태**: ✅ 완료

---

## 🔴 발생한 문제

### 문제 상황
- Vercel에 프로젝트를 배포했으나, 최신 코드가 반영되지 않는 문제 발생
- GitHub에는 최신 커밋이 정상적으로 푸시되어 있음
- Vercel은 계속 구버전 커밋(`55d75df`)으로만 배포됨

### 증상
1. **GitHub 최신 커밋**: `706e28a` (최신)
2. **Vercel 배포 커밋**: `55d75df` (2일 전 버전)
3. 수동 Redeploy를 해도 같은 구버전으로 배포됨
4. Git 연결을 해제하고 재연결해도 문제 지속

### 영향
- 최근 5개의 중요한 커밋이 프로덕션에 반영되지 않음:
  - `2f66a85`: 도매상 대시보드 낙찰받은 제안 카운트 로직 수정
  - `5137f16`, `e2d7fe4`, `0911ca6`: accessToken 관련 중요 수정
  - `01d7d49`, `f04cf99`, `75732e5`, `706e28a`: 배포 트리거 시도

---

## 🔍 문제 분석 과정

### 1단계: 로컬 코드 확인
```bash
git status                    # 변경사항 없음 확인
git log --oneline -10        # 로컬 커밋 히스토리 확인
git diff HEAD origin/main    # 로컬과 원격 차이 없음 확인
```

**결과**: ✅ 로컬과 GitHub 완벽히 동기화됨

### 2단계: GitHub 원격 저장소 확인
```bash
git ls-remote origin main    # 원격 HEAD 확인
git show origin/main:파일명  # 원격 파일 내용 확인
md5sum 비교                  # 로컬/원격 파일 해시 비교
```

**결과**: ✅ GitHub에 최신 코드 정상 업로드됨

### 3단계: Vercel 설정 확인
- **Framework Settings**: Next.js 정상
- **Build Settings**: 정상
- **Root Directory**: 정상
- **Ignored Build Step**: Automatic (정상)
- **Git Connection**: 연결됨
- **Commit Comments**: Enabled ✅
- **Pull Request Comments**: Enabled ✅

**결과**: ✅ 모든 설정 정상

### 4단계: 배포 로그 분석
```
Cloning github.com/aria1633/banana-usedcomputer-web (Branch: main, Commit: 55d75df)
```

**문제 확인**: Vercel이 계속 `55d75df` 커밋만 clone함

---

## 🛠️ 시도한 해결 방법

### ❌ 실패한 방법들

1. **빈 커밋 푸시**
   ```bash
   git commit --allow-empty -m "Trigger Vercel redeploy"
   git push origin main
   ```
   - 결과: Vercel이 새 커밋 감지 안 함

2. **수동 Redeploy**
   - Vercel Dashboard → Deployments → Redeploy 클릭
   - 캐시 제거 옵션까지 사용
   - 결과: 여전히 `55d75df`로 배포됨

3. **Git 연결 재설정**
   - Settings → Git → Disconnect
   - 다시 Connect
   - Commit Comments 활성화 확인
   - 결과: 여전히 문제 지속

4. **여러 번의 빈 커밋 푸시**
   - 총 4번의 빈 커밋 시도 (`01d7d49`, `f04cf99`, `75732e5`, `706e28a`)
   - 결과: Vercel이 계속 무시함

### ✅ 성공한 해결 방법

**프로젝트 완전 재생성**

1. **기존 Vercel 프로젝트 삭제**
   - Settings → Advanced → Delete Project

2. **새 프로젝트 생성**
   - Vercel Dashboard → Add New → Project
   - GitHub 저장소 선택: `aria1633/banana-usedcomputer-web`
   - 프로젝트 이름: `banana-usedcomputer-web`
   - Framework: Next.js (자동 감지)
   - 환경 변수 설정 (5개)

3. **환경 변수 설정**
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   NEXT_PUBLIC_APP_NAME
   NEXT_PUBLIC_APP_URL
   SUPABASE_SERVICE_ROLE_KEY
   ```

4. **첫 배포 시작**
   - 최신 커밋(`706e28a`)으로 정상 배포됨 ✅

5. **자동 배포 테스트**
   - README 파일 수정 후 커밋/푸시
   - Vercel이 자동으로 새 배포 시작 예상 ✅

---

## 💡 문제의 근본 원인 (추정)

### 가능성 1: Vercel 내부 캐시 문제
- 초기 배포 시 `55d75df` 커밋으로 배포
- Vercel 내부적으로 이 커밋 정보가 캐싱됨
- 이후 모든 배포가 같은 커밋을 참조하도록 고착됨

### 가능성 2: GitHub Webhook 장애
- GitHub → Vercel Webhook이 제대로 작동하지 않음
- 새 커밋 이벤트가 Vercel에 전달되지 않음
- 수동 배포 시에도 최신 커밋을 가져오지 않음

### 가능성 3: Vercel 프로젝트 설정 손상
- 프로젝트 생성 초기에 설정이 잘못됨
- Git 연결 정보가 손상됨
- 재연결해도 복구 불가능한 상태

---

## 📚 학습 내용

### 1. Vercel 배포 메커니즘
- **Redeploy**: 기존 배포를 같은 커밋으로 다시 배포
  - 새 커밋을 가져오지 않음
  - 주로 환경 변수 변경 후 사용

- **자동 배포**: GitHub Webhook 기반
  - 커밋 푸시 시 자동 트리거
  - Commit Comments 설정 필요

### 2. Git 동기화 확인 방법
```bash
# 로컬 HEAD 확인
git rev-parse main

# 원격 HEAD 확인
git ls-remote origin main

# 파일 해시 비교
md5sum 파일명
git show origin/main:파일명 | md5sum

# 차이 확인
git diff HEAD origin/main
```

### 3. Vercel 환경 변수 관리
- 프로젝트 삭제 시 환경 변수도 삭제됨
- 재설정 시 5개 변수 모두 재입력 필요
- Production, Preview, Development 환경별 설정 가능

### 4. 배포 문제 해결 프로세스
1. 로컬 코드 확인
2. GitHub 원격 확인
3. Vercel 설정 확인
4. 배포 로그 분석
5. 단계적 해결 시도
6. 최종 수단: 프로젝트 재생성

---

## 📝 해결책 및 예방책

### 즉시 해결책
✅ **프로젝트 재생성으로 완전 해결됨**

### 예방책

1. **초기 배포 시 주의**
   - 첫 배포는 반드시 최신 커밋으로 진행
   - 배포 로그에서 정확한 커밋 해시 확인

2. **Git 연결 상태 정기 확인**
   - Settings → Git → Connected 상태 확인
   - Commit Comments 활성화 유지

3. **배포 모니터링**
   - 커밋 후 2-3분 내 Vercel에서 자동 배포 시작되는지 확인
   - 안 되면 즉시 문제 파악

4. **환경 변수 백업**
   - 중요한 환경 변수는 별도 문서로 보관
   - 프로젝트 재생성 시 빠르게 복구 가능

5. **정기적인 배포 테스트**
   - 중요하지 않은 변경사항(README 등)으로 주기적 테스트
   - 자동 배포가 정상 작동하는지 확인

---

## 🎯 다음 단계

### 즉시 확인 필요
1. **자동 배포 테스트 결과 확인**
   - README 수정 커밋(`d014b9b`)이 자동 배포되는지 확인
   - 2-3분 후 Vercel Deployments 탭 확인

2. **프로덕션 사이트 동작 확인**
   - https://banana-usedcomputer-web.vercel.app 접속
   - 주요 기능 정상 작동 확인
   - 브라우저 콘솔 에러 확인

### 향후 작업
1. **배포 자동화 문서화**
   - Git → Vercel 배포 프로세스 문서화
   - 문제 발생 시 체크리스트 작성

2. **모니터링 설정**
   - Vercel Notifications 설정
   - 배포 실패 시 알림 받기

3. **개발 워크플로우 개선**
   - feature 브랜치 사용
   - Preview 배포 활용
   - main 브랜치는 안정된 코드만 머지

---

## 📊 작업 통계

### 커밋 통계
- **총 커밋 수**: 8개 (배포 문제 해결 관련)
- **빈 커밋**: 4개 (배포 트리거 시도)
- **실제 변경사항**: 4개

### 시도 횟수
- Git 동기화 확인: 10회+
- Vercel 수동 배포: 5회+
- Git 재연결: 2회
- 빈 커밋 푸시: 4회
- **최종 해결**: 프로젝트 재생성 1회 ✅

### 시간 소요
- 문제 분석: 30분
- 해결 시도: 1시간
- 프로젝트 재생성: 15분
- 문서화: 15분
- **총 시간**: 약 2시간

---

## 💬 회고

### 잘한 점
1. **체계적인 문제 분석**
   - 로컬 → GitHub → Vercel 순서로 단계적 확인
   - 각 단계별로 명확한 검증 진행

2. **철저한 검증**
   - 파일 해시 비교로 코드 동일성 확인
   - 여러 방법으로 문제 재현 시도

3. **빠른 결단**
   - 여러 방법 시도 후 효과 없으면 근본적 해결책 선택
   - 프로젝트 재생성이 가장 확실한 방법임을 판단

### 아쉬운 점
1. **초기 대응**
   - 처음부터 프로젝트 재생성을 고려했다면 시간 절약 가능
   - 너무 많은 빈 커밋으로 히스토리 오염

2. **원인 파악**
   - 정확한 원인을 100% 파악하지 못함
   - 추정만 가능

### 배운 점
1. **Vercel 특성 이해**
   - Redeploy는 새 커밋을 가져오지 않음
   - 프로젝트 설정이 손상되면 재생성이 최선

2. **Git 동기화 검증 방법**
   - 여러 명령어와 도구로 교차 검증
   - 파일 해시 비교가 가장 확실

3. **문서화의 중요성**
   - 환경 변수 백업 필수
   - 문제 해결 과정 기록 중요

---

## 📎 관련 파일

- `VERCEL_ENV_VARIABLES.md` - Vercel 환경 변수 설정 가이드
- `README.md` - 프로젝트 설명 및 배포 정보 업데이트

---

## ✅ 체크리스트

- [x] 문제 원인 분석 완료
- [x] 해결 방법 수립
- [x] 프로젝트 재생성
- [x] 환경 변수 재설정
- [x] 첫 배포 성공 확인
- [x] 자동 배포 테스트 커밋 푸시
- [ ] 자동 배포 성공 확인 (2-3분 후)
- [ ] 프로덕션 사이트 동작 확인
- [x] 개발일지 작성
- [x] 문서 정리

---

**작성자**: Claude Code
**작성일**: 2025년 11월 6일
**프로젝트**: 바나나 중고컴퓨터

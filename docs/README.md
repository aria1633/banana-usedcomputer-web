# 📚 프로젝트 문서 디렉토리

바나나 중고컴퓨터 프로젝트의 모든 개발 문서를 정리한 디렉토리입니다.

---

## 📁 폴더 구조

```
docs/
├── README.md                    # 이 파일
├── dev-logs/                    # 개발 일지
├── guides/                      # 개발 가이드
├── architecture/                # 아키텍처 문서
├── deployment/                  # 배포 관련 문서
├── security/                    # 보안 및 RLS 관련
└── troubleshooting/             # 문제 해결 가이드
```

---

## 📖 문서 카테고리

### 🗓️ dev-logs/ - 개발 일지
프로젝트 개발 과정에서의 주요 작업과 문제 해결 과정을 기록합니다.

**주요 문서:**
- `2025-11-02_개발일지.md` - 초기 개발 진행 상황
- `2025-11-06_vercel-deployment-fix.md` - Vercel 배포 문제 해결

### 📘 guides/ - 개발 가이드
프로젝트 개발 시 필수적으로 참고해야 하는 가이드 문서들입니다.

**⭐ 필독 문서:**
- `프로젝트_개발_가이드.md` - **가장 중요! 새 세션 시작 시 필수**
- `SUPABASE_SDK_CONVERSION_GUIDE.txt` - Supabase Fetch API 사용 가이드
- `SETUP_GUIDE.md` - 프로젝트 초기 설정
- `SETUP_GUIDE_EMAIL_CONFIRM.md` - 이메일 인증 설정

**AI 세션 시작 시 필수:**
```
1순위: 프로젝트_개발_가이드.md
2순위: SUPABASE_SDK_CONVERSION_GUIDE.txt
3순위: 에러_무한루프_해결_가이드.txt (troubleshooting/)
```

### 🏗️ architecture/ - 아키텍처 문서
시스템 설계 및 아키텍처 관련 문서입니다.

**향후 추가 예정:**
- 데이터베이스 스키마
- API 설계
- 컴포넌트 구조

### 🚀 deployment/ - 배포 관련 문서
배포 프로세스 및 환경 설정 문서입니다.

**주요 문서:**
- `VERCEL_ENV_VARIABLES.md` - Vercel 환경 변수 설정 가이드

### 🔒 security/ - 보안 및 RLS 문서
Row Level Security(RLS) 정책 및 보안 관련 문서입니다.

**주요 문서:**
- `RLS_수정_완료_보고서.md` - RLS 수정 완료 보고
- `RLS_QUICK_REFERENCE.md` - RLS 빠른 참조
- `RLS_ANALYSIS_REPORT.md` - RLS 분석 보고서
- `RLS_FIXES_GUIDE.md` - RLS 수정 가이드
- `Phase2_안전성_평가.md` - 안전성 평가 문서

### 🛠️ troubleshooting/ - 문제 해결 가이드
프로젝트 개발 중 발생하는 문제들의 해결 방법을 정리합니다.

**주요 문서:**
- `에러_무한루프_해결_가이드.txt` - **에러 발생 시 필독**
- `핵심개선_완료_리포트.txt` - 핵심 개선 사항
- `QUICK_FIX_README.md` - 빠른 수정 가이드
- `REJECTION_FEEDBACK_COMPLETE.md` - 피드백 처리 완료

---

## 🎯 상황별 읽어야 할 문서

### 새로운 AI 세션을 시작할 때
1. **필수**: `guides/프로젝트_개발_가이드.md` ⭐⭐⭐
2. **권장**: `guides/SUPABASE_SDK_CONVERSION_GUIDE.txt`
3. **참고**: `README.md` (프로젝트 루트)

### 에러가 발생했을 때
1. **1순위**: `troubleshooting/에러_무한루프_해결_가이드.txt`
2. **2순위**: 브라우저 콘솔 확인
3. **3순위**: `troubleshooting/QUICK_FIX_README.md`

### 배포 문제가 있을 때
1. `deployment/VERCEL_ENV_VARIABLES.md`
2. `dev-logs/2025-11-06_vercel-deployment-fix.md`
3. Vercel 설정 확인

### RLS 정책을 수정할 때
1. `security/RLS_QUICK_REFERENCE.md`
2. `security/RLS_FIXES_GUIDE.md`
3. `security/RLS_수정_완료_보고서.md`

### 프로젝트 초기 설정 시
1. `guides/SETUP_GUIDE.md`
2. `guides/SETUP_GUIDE_EMAIL_CONFIRM.md`
3. `deployment/VERCEL_ENV_VARIABLES.md`

---

## 📋 문서 작성 규칙

### 개발일지 작성 기준
- **파일명**: `YYYY-MM-DD_주제.md`
- **위치**: `dev-logs/`
- **작성 시점**: 주요 작업 완료 시, 중요한 문제 해결 시

### 가이드 문서 작성 기준
- **목적**: 재사용 가능한 지식 정리
- **위치**: 목적에 맞는 폴더
- **형식**: Markdown, 명확한 제목과 예제 포함

### 문서 업데이트
- 중요한 변경사항 발생 시 즉시 업데이트
- 날짜 표시 및 버전 관리
- 관련 문서들과의 링크 유지

---

## 🔍 문서 검색 팁

### 키워드로 찾기
```bash
# 특정 키워드가 포함된 문서 찾기
grep -r "키워드" docs/

# Markdown 파일만 검색
grep -r "키워드" docs/ --include="*.md"
```

### 카테고리별로 찾기
```bash
# 가이드 문서 목록
ls docs/guides/

# 최근 개발일지
ls -lt docs/dev-logs/
```

---

## 📌 중요 문서 요약

### 🌟 최우선 문서 (항상 참고)
1. **프로젝트_개발_가이드.md** - 개발 철학과 핵심 규칙
2. **에러_무한루프_해결_가이드.txt** - 90%의 에러 해결법
3. **SUPABASE_SDK_CONVERSION_GUIDE.txt** - Fetch API 사용법

### ⚡ 빠른 참조
- **RLS_QUICK_REFERENCE.md** - RLS 정책 빠른 참조
- **VERCEL_ENV_VARIABLES.md** - 환경 변수 설정

### 📊 분석 및 보고서
- **RLS_수정_완료_보고서.md** - RLS 수정 완료 상태
- **핵심개선_완료_리포트.txt** - 주요 개선 사항
- **2025-11-06_vercel-deployment-fix.md** - 배포 문제 해결 과정

---

## 🔄 문서 유지보수

### 정기 점검 항목
- [ ] 오래된 문서 아카이빙
- [ ] 링크 깨짐 확인
- [ ] 최신 정보 반영
- [ ] 중복 문서 통합

### 문서 품질 기준
- ✅ 명확한 제목과 목차
- ✅ 실용적인 예제 포함
- ✅ 최신 정보 반영
- ✅ 다른 문서와의 연계

---

## 📞 문의

문서 관련 문의나 개선 제안은 프로젝트 관리자에게 연락하세요.

---

**마지막 업데이트**: 2025-11-06
**관리자**: 프로젝트 팀

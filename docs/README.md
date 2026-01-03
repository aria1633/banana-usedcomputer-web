# 바나나 중고컴퓨터 - 개발 문서 인덱스

프로젝트의 모든 개발 문서를 정리한 디렉토리입니다.

---

## 문서 트리 구조

```
banana_usedcomputer_web/
│
├── docs/                                    # 개발 문서
│   ├── README.md                            # 문서 인덱스 (현재 파일)
│   │
│   ├── guides/                              # 가이드 문서
│   │   ├── SETUP_GUIDE.md                   # 프로젝트 초기 설정 가이드
│   │   ├── SETUP_GUIDE_EMAIL_CONFIRM.md     # 이메일 인증 설정 가이드
│   │   ├── SUPABASE_SDK_CONVERSION_GUIDE.txt # Firebase→Supabase 전환 가이드
│   │   └── 프로젝트_개발_가이드.md            # 전체 개발 가이드 ⭐
│   │
│   ├── security/                            # 보안 관련 문서
│   │   ├── RLS_QUICK_REFERENCE.md           # RLS 빠른 참조 ⭐
│   │   ├── RLS_ANALYSIS_REPORT.md           # RLS 분석 리포트
│   │   ├── RLS_FIXES_GUIDE.md               # RLS 수정 가이드
│   │   ├── RLS_AUDIT_INDEX.md               # RLS 감사 인덱스
│   │   ├── RLS_수정_작업_가이드.md            # RLS 수정 작업 상세
│   │   ├── RLS_수정_완료_보고서.md            # RLS 수정 완료 보고
│   │   ├── RLS_FIX_POTENTIAL_ERRORS_ANALYSIS.md # 잠재적 오류 분석
│   │   ├── Phase2_안전성_평가.md              # 2단계 안전성 평가
│   │   ├── 수정_안전성_확인서.md              # 안전성 확인서
│   │   └── 간단_요약.md                      # 보안 작업 요약
│   │
│   ├── deployment/                          # 배포 관련 문서
│   │   └── VERCEL_ENV_VARIABLES.md          # Vercel 환경변수 설정
│   │
│   ├── troubleshooting/                     # 문제해결 문서
│   │   ├── QUICK_FIX_README.md              # 빠른 수정 가이드
│   │   ├── REJECTION_FEEDBACK_COMPLETE.md   # 거절 피드백 기능 완료
│   │   ├── 에러_무한루프_해결_가이드.txt       # 무한루프 에러 해결 ⭐
│   │   └── 핵심개선_완료_리포트.txt           # 핵심 개선 완료 보고
│   │
│   └── dev-logs/                            # 개발 일지
│       ├── 개발일지_2025-11-02.md            # 초기 개발
│       ├── 2025-11-06_vercel-deployment-fix.md # Vercel 배포 수정
│       ├── 2025-11-09_inquiry-contact-features.md # 문의/연락 기능
│       ├── 2025-11-18_banner-password-product-features.md # 배너/비밀번호/상품
│       └── 2026-01-02_channel-separation-feature.md # 채널 분리 기능 ⭐ NEW
│
├── 프로젝트_문서화_패키지/                    # 프로젝트 문서화 패키지
│   ├── 01_데이터모델_TypeScript_인터페이스.md # 데이터 모델 정의
│   └── 02_화면별_상세_기능_명세서.md          # 화면별 기능 명세
│
└── *.sql                                    # SQL 마이그레이션 파일 (루트)
    ├── supabase-setup.sql                   # 초기 테이블 설정
    ├── supabase-fix-trigger.sql             # 트리거 수정
    ├── supabase-quick-fix.sql               # 빠른 수정
    ├── supabase-add-rejection-reason.sql    # 거절 사유 추가
    ├── supabase-add-rejection-reason-to-users.sql # users 테이블 거절 사유
    ├── supabase-add-transactions-table.sql  # 거래 테이블 추가
    ├── supabase-check-and-clean-transactions.sql # 거래 데이터 정리
    ├── supabase-recreate-transactions-table.sql # 거래 테이블 재생성
    ├── supabase-add-category-to-sell-requests.sql # 판매요청 카테고리
    └── supabase-create-banners-table.sql    # 배너 테이블 생성
```

---

## 새 세션 시작 시 필수 문서

```
1순위: guides/프로젝트_개발_가이드.md          ⭐⭐⭐
2순위: guides/SUPABASE_SDK_CONVERSION_GUIDE.txt
3순위: troubleshooting/에러_무한루프_해결_가이드.txt
```

---

## 문서 카테고리별 안내

### 1. 가이드 (guides/)
프로젝트 설정 및 개발에 필요한 가이드 문서

| 문서 | 설명 |
|------|------|
| [SETUP_GUIDE.md](guides/SETUP_GUIDE.md) | 프로젝트 초기 설정 방법 |
| [SETUP_GUIDE_EMAIL_CONFIRM.md](guides/SETUP_GUIDE_EMAIL_CONFIRM.md) | 이메일 인증 설정 |
| [SUPABASE_SDK_CONVERSION_GUIDE.txt](guides/SUPABASE_SDK_CONVERSION_GUIDE.txt) | Supabase Fetch API 가이드 |
| [프로젝트_개발_가이드.md](guides/프로젝트_개발_가이드.md) | **필독** 전체 개발 가이드라인 |

### 2. 보안 (security/)
Row Level Security(RLS) 및 보안 관련 문서

| 문서 | 설명 |
|------|------|
| [RLS_QUICK_REFERENCE.md](security/RLS_QUICK_REFERENCE.md) | RLS 빠른 참조 가이드 |
| [RLS_ANALYSIS_REPORT.md](security/RLS_ANALYSIS_REPORT.md) | RLS 정책 분석 리포트 |
| [RLS_FIXES_GUIDE.md](security/RLS_FIXES_GUIDE.md) | RLS 수정 가이드 |
| [간단_요약.md](security/간단_요약.md) | 보안 작업 요약 |

### 3. 배포 (deployment/)
Vercel 배포 관련 설정 문서

| 문서 | 설명 |
|------|------|
| [VERCEL_ENV_VARIABLES.md](deployment/VERCEL_ENV_VARIABLES.md) | Vercel 환경변수 설정 |

### 4. 문제해결 (troubleshooting/)
발생한 이슈와 해결 방법 문서

| 문서 | 설명 |
|------|------|
| [QUICK_FIX_README.md](troubleshooting/QUICK_FIX_README.md) | 빠른 수정 가이드 |
| [에러_무한루프_해결_가이드.txt](troubleshooting/에러_무한루프_해결_가이드.txt) | **필독** 에러 발생 시 |
| [REJECTION_FEEDBACK_COMPLETE.md](troubleshooting/REJECTION_FEEDBACK_COMPLETE.md) | 거절 피드백 기능 |

### 5. 개발 일지 (dev-logs/)
날짜별 개발 작업 기록

| 날짜 | 문서 | 주요 작업 |
|------|------|----------|
| 2025-11-02 | [개발일지_2025-11-02.md](dev-logs/개발일지_2025-11-02.md) | 초기 개발 |
| 2025-11-06 | [2025-11-06_vercel-deployment-fix.md](dev-logs/2025-11-06_vercel-deployment-fix.md) | Vercel 배포 수정 |
| 2025-11-09 | [2025-11-09_inquiry-contact-features.md](dev-logs/2025-11-09_inquiry-contact-features.md) | 문의/연락 기능 |
| 2025-11-18 | [2025-11-18_banner-password-product-features.md](dev-logs/2025-11-18_banner-password-product-features.md) | 배너/비밀번호/상품 |
| **2026-01-02** | [2026-01-02_channel-separation-feature.md](dev-logs/2026-01-02_channel-separation-feature.md) | **채널 분리 기능** |

---

## 주요 기능 문서

### 채널 분리 시스템 (2026-01-02 구현)

| 채널 | 등록 경로 | 노출 위치 |
|------|----------|----------|
| `wholesale` | `/business/products/new` | 도매 마켓 (`/business/market`) |
| `retail` | `/consumer/products/new` | 일반 사용자 마켓 (`/consumer/products`) |

**핵심 페이지:**
- `/business` - 도매상 대시보드 (4개 퀵액션 카드)
- `/business/market` - 모든 도매상 상품 보기
- `/business/products` - 내 도매 상품 관리
- `/consumer/products` - 일반 사용자 소매 상품

자세한 내용: [2026-01-02_channel-separation-feature.md](dev-logs/2026-01-02_channel-separation-feature.md)

---

## SQL 마이그레이션 파일

프로젝트 루트의 SQL 파일들은 Supabase 데이터베이스 스키마 변경 이력입니다.

| 파일 | 설명 |
|------|------|
| `supabase-setup.sql` | 초기 테이블 구조 설정 |
| `supabase-create-banners-table.sql` | 배너 테이블 생성 |
| `supabase-add-transactions-table.sql` | 거래 테이블 추가 |
| `supabase-add-category-to-sell-requests.sql` | 판매요청에 카테고리 추가 |
| `supabase-add-rejection-reason-to-users.sql` | 사용자 거절 사유 필드 |

---

## 상황별 문서 가이드

### 에러 발생 시
1. `troubleshooting/에러_무한루프_해결_가이드.txt`
2. 브라우저 콘솔 확인
3. `troubleshooting/QUICK_FIX_README.md`

### RLS 정책 수정 시
1. `security/RLS_QUICK_REFERENCE.md`
2. `security/RLS_FIXES_GUIDE.md`
3. `security/RLS_수정_완료_보고서.md`

### 배포 문제 시
1. `deployment/VERCEL_ENV_VARIABLES.md`
2. `dev-logs/2025-11-06_vercel-deployment-fix.md`

---

## 문서 작성 규칙

1. **개발 일지**: `docs/dev-logs/YYYY-MM-DD_feature-name.md` 형식
2. **가이드 문서**: `docs/guides/` 디렉토리에 저장
3. **보안 문서**: `docs/security/` 디렉토리에 저장
4. **SQL 파일**: 프로젝트 루트에 `supabase-*.sql` 형식으로 저장

---

*마지막 업데이트: 2026-01-02*

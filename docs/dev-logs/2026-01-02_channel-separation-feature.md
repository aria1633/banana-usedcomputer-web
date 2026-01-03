# 개발일지 2026-01-02

## 작업 개요
도매/소매 채널 분리 기능 구현 및 데이터베이스 초기화

---

## 1. 채널 분리 기능 구현

### 1.1 요구사항
- 도매상 커뮤니티에서 다른 도매상 상품도 볼 수 있어야 함
- 일반 사용자(소매) 커뮤니티에서는 도매 상품이 노출되면 안됨
- 도매상 계정 하나로 양쪽 모두에서 상품 등록 가능
- 도매/소매 상품이 별도로 분류되어야 함

### 1.2 데이터베이스 변경
**products 테이블에 channel 컬럼 추가**
```sql
ALTER TABLE products
ADD COLUMN channel TEXT DEFAULT 'wholesale'
CHECK (channel IN ('wholesale', 'retail'));
```
- `wholesale`: 도매 커뮤니티 전용
- `retail`: 소매(일반 사용자) 커뮤니티 전용

### 1.3 타입 변경
**types/product.ts**
- `Product` 인터페이스에 `channel?: 'wholesale' | 'retail'` 필드 추가
- `ProductChannel` 타입 export 추가

### 1.4 서비스 계층 변경
**lib/services/product.service.ts**
새로운 메서드 추가:
- `getProductsByChannel(channel)` - 채널별 상품 조회
- `getAllWholesaleProducts()` - 모든 도매 상품 조회
- `getAllRetailProducts()` - 모든 소매 상품 조회
- `getProductsBySellerAndChannel(sellerId, channel)` - 판매자+채널별 조회

`createProduct` 메서드에 channel 필드 추가

### 1.5 페이지 변경

#### 도매상 대시보드 (`/business`)
퀵 액션 카드 4개로 확장:
1. 상품 등록 → `/business/products/new`
2. **도매 마켓** → `/business/market` (신규)
3. 매입 요청 확인 → `/consumer/sell-requests`
4. 내 상품 관리 → `/business/products`

#### 도매 마켓 (`/business/market`) - 신규
- 모든 도매상의 wholesale 상품 표시
- 다른 도매상 상품 확인 가능
- 본인 상품에 "내 상품" 배지 표시
- 판매자 정보 표시

#### 내 상품 관리 (`/business/products`)
- 본인이 등록한 wholesale 상품만 표시
- 수정/삭제 버튼 표시
- 기존 토글 버튼 제거

#### 일반 사용자 상품 목록 (`/consumer/products`)
- retail 채널 상품만 표시
- 도매상 로그인 시 "+ 소매 상품 등록" 버튼 표시

#### 소매 상품 등록 (`/consumer/products/new`) - 신규
- 도매상이 일반 사용자 마켓에 소매가로 상품 등록
- channel: 'retail'로 자동 설정

---

## 2. 기존 페이지 수정

### 2.1 consumer/sell-requests 404 오류 수정
- `app/consumer/sell-requests/page.tsx` 생성
- `app/consumer/sell-requests/[id]/page.tsx` 생성

---

## 3. 데이터베이스 초기화

### 3.1 실행된 작업
모든 테이블 데이터 삭제 (스키마 유지):
```sql
TRUNCATE TABLE
  transactions,
  purchase_offers,
  sell_requests,
  products,
  banners,
  users
CASCADE;
```

### 3.2 Storage 파일 삭제
- product-images
- sell-request-images
- business-documents
- banner-images
- business-registrations

### 3.3 결과
| 테이블 | 삭제 전 | 삭제 후 |
|--------|---------|---------|
| users | N개 | 0 |
| products | N개 | 0 |
| sell_requests | N개 | 0 |
| purchase_offers | N개 | 0 |
| transactions | N개 | 0 |
| banners | N개 | 0 |
| Storage 파일 | N개 | 0 |

스키마(테이블 구조, 인덱스, RLS 정책)는 모두 유지됨

---

## 4. 파일 변경 목록

### 신규 파일
- `app/business/market/page.tsx`
- `app/consumer/products/new/page.tsx`
- `app/consumer/sell-requests/page.tsx`
- `app/consumer/sell-requests/[id]/page.tsx`

### 수정 파일
- `types/product.ts`
- `lib/services/product.service.ts`
- `app/business/page.tsx`
- `app/business/products/page.tsx`
- `app/business/products/new/page.tsx`
- `app/consumer/products/page.tsx`

---

## 5. 채널 분리 요약

| 등록 경로 | channel | 노출 위치 |
|-----------|---------|-----------|
| `/business/products/new` | wholesale | 도매 마켓만 |
| `/consumer/products/new` | retail | 일반 사용자 마켓만 |

| 페이지 | 표시 상품 |
|--------|-----------|
| `/business/market` | 모든 도매상의 wholesale 상품 |
| `/business/products` | 본인의 wholesale 상품만 |
| `/consumer/products` | 모든 retail 상품 |

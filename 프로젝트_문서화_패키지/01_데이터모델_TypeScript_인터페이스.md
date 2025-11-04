# 데이터 모델 - TypeScript 인터페이스 변환

Flutter 프로젝트의 모든 데이터 모델을 TypeScript/Next.js용 인터페이스로 변환한 문서입니다.

---

## 📋 목차

1. [UserModel - 사용자 정보](#1-usermodel---사용자-정보)
2. [ProductModel - 상품 정보](#2-productmodel---상품-정보)
3. [InquiryModel - 문의 정보](#3-inquirymodel---문의-정보)
4. [BusinessVerificationModel - 사업자 인증](#4-businessverificationmodel---사업자-인증)
5. [SellRequestModel - 매입 요청](#5-sellrequestmodel---매입-요청)
6. [PurchaseOfferModel - 매입 제안](#6-purchaseoffermodel---매입-제안)
7. [Firestore 변환 헬퍼 함수](#7-firestore-변환-헬퍼-함수)

---

## 1. UserModel - 사용자 정보

### TypeScript 인터페이스

```typescript
// types/user.ts

/**
 * 사용자 타입 열거형
 * - normal: 일반 사용자 (상품 조회, 문의만 가능)
 * - wholesaler: 도매상 (상품 등록, 판매 가능)
 * - admin: 관리자 (모든 권한, 사업자 인증 승인 등)
 */
export enum UserType {
  NORMAL = 'normal',
  WHOLESALER = 'wholesaler',
  ADMIN = 'admin',
}

/**
 * 사업자 인증 상태
 * - none: 인증 신청하지 않음 (기본값)
 * - pending: 인증 심사 대기 중
 * - approved: 인증 승인됨
 * - rejected: 인증 거부됨
 */
export enum VerificationStatus {
  NONE = 'none',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/**
 * 사용자 정보 인터페이스
 */
export interface User {
  uid: string;                           // Firebase Auth 사용자 고유 ID
  email: string;                         // 이메일 주소
  name: string;                          // 사용자 이름 또는 닉네임
  phoneNumber?: string | null;           // 연락처 전화번호 (선택)
  userType: UserType;                    // 사용자 유형
  verificationStatus: VerificationStatus; // 사업자 인증 상태
  createdAt: Date;                       // 계정 생성 일시
  updatedAt?: Date | null;               // 마지막 정보 수정 일시
}

/**
 * Firestore 문서 형식 (서버에서 가져온 그대로)
 */
export interface UserFirestore {
  uid: string;
  email: string;
  name: string;
  phoneNumber?: string | null;
  userType: string;
  verificationStatus: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp | null;
}
```

### 변환 함수 (Firestore ↔ TypeScript)

```typescript
// lib/converters/user.converter.ts
import {
  DocumentSnapshot,
  Timestamp,
  QueryDocumentSnapshot
} from 'firebase/firestore';

/**
 * Firestore 문서를 User 객체로 변환
 */
export function firestoreToUser(doc: DocumentSnapshot): User | null {
  if (!doc.exists()) return null;

  const data = doc.data()!;

  return {
    uid: doc.id,
    email: data.email ?? '',
    name: data.name ?? '',
    phoneNumber: data.phoneNumber ?? null,
    userType: (data.userType as UserType) ?? UserType.NORMAL,
    verificationStatus: (data.verificationStatus as VerificationStatus) ?? VerificationStatus.NONE,
    createdAt: data.createdAt?.toDate() ?? new Date(),
    updatedAt: data.updatedAt?.toDate() ?? null,
  };
}

/**
 * User 객체를 Firestore 저장 형식으로 변환
 */
export function userToFirestore(user: Omit<User, 'uid'>): Record<string, any> {
  return {
    email: user.email,
    name: user.name,
    phoneNumber: user.phoneNumber ?? null,
    userType: user.userType,
    verificationStatus: user.verificationStatus,
    createdAt: Timestamp.fromDate(user.createdAt),
    updatedAt: user.updatedAt ? Timestamp.fromDate(user.updatedAt) : null,
  };
}
```

---

## 2. ProductModel - 상품 정보

### TypeScript 인터페이스

```typescript
// types/product.ts

/**
 * 중고 컴퓨터 제품 정보
 */
export interface Product {
  id: string;              // Firestore 문서 ID
  sellerId: string;        // 판매자(도매상) 사용자 ID
  sellerName: string;      // 판매자 이름 (캐시 데이터)
  title: string;           // 제품명
  description: string;     // 제품 상세 설명
  price: number;           // 제품 가격 (원 단위)
  quantity: number;        // 재고 수량
  imageUrls: string[];     // 제품 이미지 URL 목록
  category: string;        // 제품 카테고리
  isAvailable: boolean;    // 판매 가능 여부
  createdAt: Date;         // 제품 등록 일시
  updatedAt?: Date | null; // 마지막 수정 일시
}

/**
 * Firestore 문서 형식
 */
export interface ProductFirestore {
  sellerId: string;
  sellerName: string;
  title: string;
  description: string;
  price: number;
  quantity: number;
  imageUrls: string[];
  category: string;
  isAvailable: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp | null;
}
```

### 변환 함수

```typescript
// lib/converters/product.converter.ts

export function firestoreToProduct(doc: DocumentSnapshot): Product | null {
  if (!doc.exists()) return null;

  const data = doc.data()!;

  return {
    id: doc.id,
    sellerId: data.sellerId ?? '',
    sellerName: data.sellerName ?? '',
    title: data.title ?? '',
    description: data.description ?? '',
    price: data.price ?? 0,
    quantity: data.quantity ?? 0,
    imageUrls: Array.isArray(data.imageUrls) ? data.imageUrls : [],
    category: data.category ?? '기타',
    isAvailable: data.isAvailable ?? true,
    createdAt: data.createdAt?.toDate() ?? new Date(),
    updatedAt: data.updatedAt?.toDate() ?? null,
  };
}

export function productToFirestore(product: Omit<Product, 'id'>): Record<string, any> {
  return {
    sellerId: product.sellerId,
    sellerName: product.sellerName,
    title: product.title,
    description: product.description,
    price: product.price,
    quantity: product.quantity,
    imageUrls: product.imageUrls,
    category: product.category,
    isAvailable: product.isAvailable,
    createdAt: Timestamp.fromDate(product.createdAt),
    updatedAt: product.updatedAt ? Timestamp.fromDate(product.updatedAt) : null,
  };
}
```

---

## 3. InquiryModel - 문의 정보

### TypeScript 인터페이스

```typescript
// types/inquiry.ts

/**
 * 문의 처리 상태
 */
export enum InquiryStatus {
  PENDING = 'pending',   // 답변 대기 중
  ANSWERED = 'answered', // 답변 완료
}

/**
 * 제품 문의 정보
 */
export interface Inquiry {
  id: string;               // Firestore 문서 ID
  productId: string;        // 문의 대상 제품 ID
  productTitle: string;     // 제품명 (캐시)
  customerId: string;       // 문의자 ID
  customerName: string;     // 문의자 이름
  sellerId: string;         // 판매자 ID
  sellerName: string;       // 판매자 이름 (캐시)
  question: string;         // 문의 내용
  answer?: string | null;   // 답변 내용
  status: InquiryStatus;    // 문의 처리 상태
  createdAt: Date;          // 문의 작성 일시
  answeredAt?: Date | null; // 답변 작성 일시
}
```

### 변환 함수

```typescript
// lib/converters/inquiry.converter.ts

export function firestoreToInquiry(doc: DocumentSnapshot): Inquiry | null {
  if (!doc.exists()) return null;

  const data = doc.data()!;

  return {
    id: doc.id,
    productId: data.productId ?? '',
    productTitle: data.productTitle ?? '',
    customerId: data.customerId ?? '',
    customerName: data.customerName ?? '',
    sellerId: data.sellerId ?? '',
    sellerName: data.sellerName ?? '',
    question: data.question ?? '',
    answer: data.answer ?? null,
    status: (data.status as InquiryStatus) ?? InquiryStatus.PENDING,
    createdAt: data.createdAt?.toDate() ?? new Date(),
    answeredAt: data.answeredAt?.toDate() ?? null,
  };
}

export function inquiryToFirestore(inquiry: Omit<Inquiry, 'id'>): Record<string, any> {
  return {
    productId: inquiry.productId,
    productTitle: inquiry.productTitle,
    customerId: inquiry.customerId,
    customerName: inquiry.customerName,
    sellerId: inquiry.sellerId,
    sellerName: inquiry.sellerName,
    question: inquiry.question,
    answer: inquiry.answer ?? null,
    status: inquiry.status,
    createdAt: Timestamp.fromDate(inquiry.createdAt),
    answeredAt: inquiry.answeredAt ? Timestamp.fromDate(inquiry.answeredAt) : null,
  };
}
```

---

## 4. BusinessVerificationModel - 사업자 인증

### TypeScript 인터페이스

```typescript
// types/business-verification.ts

/**
 * 사업자 인증 승인 상태
 */
export enum BusinessVerificationStatus {
  PENDING = 'pending',   // 승인 대기 중
  APPROVED = 'approved', // 승인됨
  REJECTED = 'rejected', // 거부됨
}

/**
 * 사업자 인증 신청 정보
 */
export interface BusinessVerification {
  id: string;                              // Firestore 문서 ID
  userId: string;                          // 신청자 ID
  userName: string;                        // 신청자 이름
  businessNumber: string;                  // 사업자등록번호 (10자리)
  companyName: string;                     // 상호명
  representativeName: string;              // 대표자명
  documentUrl: string;                     // 사업자등록증 이미지 URL
  status: BusinessVerificationStatus;      // 승인 처리 상태
  rejectionReason?: string | null;         // 거부 사유
  createdAt: Date;                         // 신청 일시
  processedAt?: Date | null;               // 승인/거부 처리 일시
  processedBy?: string | null;             // 처리한 관리자 ID
}
```

### 변환 함수

```typescript
// lib/converters/business-verification.converter.ts

export function firestoreToBusinessVerification(
  doc: DocumentSnapshot
): BusinessVerification | null {
  if (!doc.exists()) return null;

  const data = doc.data()!;

  return {
    id: doc.id,
    userId: data.userId ?? '',
    userName: data.userName ?? '',
    businessNumber: data.businessNumber ?? '',
    companyName: data.companyName ?? '',
    representativeName: data.representativeName ?? '',
    documentUrl: data.documentUrl ?? '',
    status: (data.status as BusinessVerificationStatus) ?? BusinessVerificationStatus.PENDING,
    rejectionReason: data.rejectionReason ?? null,
    createdAt: data.createdAt?.toDate() ?? new Date(),
    processedAt: data.processedAt?.toDate() ?? null,
    processedBy: data.processedBy ?? null,
  };
}

export function businessVerificationToFirestore(
  verification: Omit<BusinessVerification, 'id'>
): Record<string, any> {
  return {
    userId: verification.userId,
    userName: verification.userName,
    businessNumber: verification.businessNumber,
    companyName: verification.companyName,
    representativeName: verification.representativeName,
    documentUrl: verification.documentUrl,
    status: verification.status,
    rejectionReason: verification.rejectionReason ?? null,
    createdAt: Timestamp.fromDate(verification.createdAt),
    processedAt: verification.processedAt ? Timestamp.fromDate(verification.processedAt) : null,
    processedBy: verification.processedBy ?? null,
  };
}
```

---

## 5. SellRequestModel - 매입 요청

### TypeScript 인터페이스

```typescript
// types/sell-request.ts

/**
 * 매입 요청 상태
 */
export enum SellRequestStatus {
  OPEN = 'open',         // 매입 요청 진행 중
  CLOSED = 'closed',     // 거래 완료 또는 요청 종료
  CANCELLED = 'cancelled', // 요청 취소됨
}

/**
 * 일반 사용자가 중고 컴퓨터 매입을 요청하는 데이터
 * 역경매 시스템: 일반 사용자가 매물을 올리면 도매상들이 매입가를 제시
 */
export interface SellRequest {
  id: string;                          // 매입 요청 고유 ID
  sellerId: string;                    // 매입 요청한 일반 사용자 ID
  sellerName: string;                  // 매입 요청한 사용자 이름
  title: string;                       // 매입 요청 제목
  description: string;                 // 상세 설명 (사양, 상태 등)
  imageUrls: string[];                 // 상품 이미지 URL 목록
  desiredPrice?: string | null;        // 희망 가격 (선택 사항)
  status: SellRequestStatus;           // 매입 요청 상태
  selectedWholesalerId?: string | null; // 선택된 도매상 ID (거래 확정 시)
  createdAt: Date;                     // 생성 일시
  updatedAt?: Date | null;             // 수정 일시
  closedAt?: Date | null;              // 종료 일시
}
```

### 변환 함수

```typescript
// lib/converters/sell-request.converter.ts

export function firestoreToSellRequest(doc: DocumentSnapshot): SellRequest | null {
  if (!doc.exists()) return null;

  const data = doc.data()!;

  return {
    id: doc.id,
    sellerId: data.sellerId ?? '',
    sellerName: data.sellerName ?? '',
    title: data.title ?? '',
    description: data.description ?? '',
    imageUrls: Array.isArray(data.imageUrls) ? data.imageUrls : [],
    desiredPrice: data.desiredPrice ?? null,
    status: (data.status as SellRequestStatus) ?? SellRequestStatus.OPEN,
    selectedWholesalerId: data.selectedWholesalerId ?? null,
    createdAt: data.createdAt?.toDate() ?? new Date(),
    updatedAt: data.updatedAt?.toDate() ?? null,
    closedAt: data.closedAt?.toDate() ?? null,
  };
}

export function sellRequestToFirestore(
  request: Omit<SellRequest, 'id'>
): Record<string, any> {
  return {
    sellerId: request.sellerId,
    sellerName: request.sellerName,
    title: request.title,
    description: request.description,
    imageUrls: request.imageUrls,
    desiredPrice: request.desiredPrice ?? null,
    status: request.status,
    selectedWholesalerId: request.selectedWholesalerId ?? null,
    createdAt: Timestamp.fromDate(request.createdAt),
    updatedAt: request.updatedAt ? Timestamp.fromDate(request.updatedAt) : null,
    closedAt: request.closedAt ? Timestamp.fromDate(request.closedAt) : null,
  };
}
```

---

## 6. PurchaseOfferModel - 매입 제안

### TypeScript 인터페이스

```typescript
// types/purchase-offer.ts

/**
 * 매입 제안 데이터
 * 도매상이 일반 사용자의 매입 요청에 대해 제시하는 매입가
 * 블라인드 처리: 매입 요청한 사용자만 제안을 볼 수 있음
 */
export interface PurchaseOffer {
  id: string;                // 제안 고유 ID
  sellRequestId: string;     // 매입 요청 ID
  wholesalerId: string;      // 제안한 도매상 ID
  wholesalerName: string;    // 제안한 도매상 이름
  offerPrice: number;        // 제시 매입가 (원)
  message?: string | null;   // 도매상이 남긴 메시지
  isSelected: boolean;       // 거래 확정 여부
  createdAt: Date;           // 제안 생성 일시
  updatedAt?: Date | null;   // 수정 일시
}
```

### 변환 함수

```typescript
// lib/converters/purchase-offer.converter.ts

export function firestoreToPurchaseOffer(doc: DocumentSnapshot): PurchaseOffer | null {
  if (!doc.exists()) return null;

  const data = doc.data()!;

  return {
    id: doc.id,
    sellRequestId: data.sellRequestId ?? '',
    wholesalerId: data.wholesalerId ?? '',
    wholesalerName: data.wholesalerName ?? '',
    offerPrice: data.offerPrice ?? 0,
    message: data.message ?? null,
    isSelected: data.isSelected ?? false,
    createdAt: data.createdAt?.toDate() ?? new Date(),
    updatedAt: data.updatedAt?.toDate() ?? null,
  };
}

export function purchaseOfferToFirestore(
  offer: Omit<PurchaseOffer, 'id'>
): Record<string, any> {
  return {
    sellRequestId: offer.sellRequestId,
    wholesalerId: offer.wholesalerId,
    wholesalerName: offer.wholesalerName,
    offerPrice: offer.offerPrice,
    message: offer.message ?? null,
    isSelected: offer.isSelected,
    createdAt: Timestamp.fromDate(offer.createdAt),
    updatedAt: offer.updatedAt ? Timestamp.fromDate(offer.updatedAt) : null,
  };
}
```

---

## 7. Firestore 변환 헬퍼 함수

### 공통 유틸리티

```typescript
// lib/utils/firestore.utils.ts

import { Timestamp } from 'firebase/firestore';

/**
 * Date를 Firestore Timestamp로 변환
 */
export function dateToTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

/**
 * Firestore Timestamp를 Date로 변환
 */
export function timestampToDate(timestamp: Timestamp | null | undefined): Date | null {
  return timestamp?.toDate() ?? null;
}

/**
 * 안전한 배열 변환
 */
export function safeArrayConversion<T>(value: any, defaultValue: T[] = []): T[] {
  return Array.isArray(value) ? value : defaultValue;
}

/**
 * 안전한 문자열 변환
 */
export function safeStringConversion(value: any, defaultValue: string = ''): string {
  return typeof value === 'string' ? value : defaultValue;
}

/**
 * 안전한 숫자 변환
 */
export function safeNumberConversion(value: any, defaultValue: number = 0): number {
  return typeof value === 'number' ? value : defaultValue;
}
```

---

## 📝 사용 예시

### React 컴포넌트에서 사용

```typescript
// app/products/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { firestoreToProduct } from '@/lib/converters/product.converter';
import { Product } from '@/types/product';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const snapshot = await getDocs(collection(db, 'products'));
        const productList = snapshot.docs
          .map(firestoreToProduct)
          .filter((p): p is Product => p !== null);

        setProducts(productList);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {products.map((product) => (
        <div key={product.id}>
          <h2>{product.title}</h2>
          <p>{product.price.toLocaleString()}원</p>
        </div>
      ))}
    </div>
  );
}
```

---

## ✅ 체크리스트

완료된 TypeScript 변환:

- ✅ UserModel → User 인터페이스
- ✅ ProductModel → Product 인터페이스
- ✅ InquiryModel → Inquiry 인터페이스
- ✅ BusinessVerificationModel → BusinessVerification 인터페이스
- ✅ SellRequestModel → SellRequest 인터페이스
- ✅ PurchaseOfferModel → PurchaseOffer 인터페이스
- ✅ 모든 Enum 타입 변환
- ✅ Firestore 변환 함수 작성
- ✅ 유틸리티 함수 작성

---

**작성일**: 2025-11-01
**버전**: 1.0.0

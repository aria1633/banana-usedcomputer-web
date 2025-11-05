// types/transaction.ts
// 거래(Transaction) 타입 정의

/**
 * 거래 상태
 */
export enum TransactionStatus {
  IN_PROGRESS = 'in_progress',  // 진행 중
  COMPLETED = 'completed',      // 완료
  CANCELLED = 'cancelled',      // 취소
}

/**
 * 거래 인터페이스
 * 낙찰 후 실제 거래 진행 상태를 관리
 */
export interface Transaction {
  /** 거래 ID */
  id: string;

  /** 매입 요청 ID (외래 키) */
  sellRequestId: string;

  /** 낙찰받은 제안 ID (외래 키) */
  purchaseOfferId: string;

  /** 도매상 ID (외래 키) */
  wholesalerId: string;

  /** 판매자 ID (외래 키) */
  sellerId: string;

  /** 거래 상태 */
  status: TransactionStatus;

  /** 거래 메모 (선택) */
  notes?: string | null;

  /** 생성일 */
  createdAt: Date;

  /** 완료일 */
  completedAt?: Date | null;

  /** 취소일 */
  cancelledAt?: Date | null;

  /** 수정일 */
  updatedAt?: Date | null;
}

/**
 * 거래 생성 요청 DTO
 */
export interface CreateTransactionRequest {
  sellRequestId: string;
  purchaseOfferId: string;
  wholesalerId: string;
  sellerId: string;
  notes?: string | null;
}

/**
 * 거래 상태 업데이트 요청 DTO
 */
export interface UpdateTransactionStatusRequest {
  transactionId: string;
  status: TransactionStatus;
  notes?: string | null;
}

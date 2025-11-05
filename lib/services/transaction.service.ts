// lib/services/transaction.service.ts
// 거래(Transaction) 관리 서비스

import {
  Transaction,
  TransactionStatus,
  CreateTransactionRequest,
  UpdateTransactionStatusRequest
} from '@/types/transaction';

/**
 * 거래 관리 서비스
 */
export class TransactionService {
  private static readonly TRANSACTIONS_COLLECTION = 'transactions';

  /**
   * Supabase 테이블 데이터를 Transaction 객체로 변환
   */
  private static mapToTransaction(data: any): Transaction {
    return {
      id: data.id,
      sellRequestId: data.sell_request_id,
      purchaseOfferId: data.purchase_offer_id,
      wholesalerId: data.wholesaler_id,
      sellerId: data.seller_id,
      status: data.status as TransactionStatus,
      notes: data.notes || null,
      createdAt: new Date(data.created_at),
      completedAt: data.completed_at ? new Date(data.completed_at) : null,
      cancelledAt: data.cancelled_at ? new Date(data.cancelled_at) : null,
      updatedAt: data.updated_at ? new Date(data.updated_at) : null,
    };
  }

  /**
   * 거래 생성 (낙찰 시 자동 생성)
   */
  static async createTransaction(
    request: CreateTransactionRequest,
    accessToken: string
  ): Promise<string> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const payload = {
      sell_request_id: request.sellRequestId,
      purchase_offer_id: request.purchaseOfferId,
      wholesaler_id: request.wholesalerId,
      seller_id: request.sellerId,
      status: TransactionStatus.IN_PROGRESS,
      notes: request.notes || null,
      created_at: new Date().toISOString(),
    };

    const response = await fetch(
      `${supabaseUrl}/rest/v1/${this.TRANSACTIONS_COLLECTION}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TransactionService] Create transaction failed:', errorText);
      throw new Error(`거래 생성 실패: ${response.status}`);
    }

    const data = await response.json();
    return data[0].id;
  }

  /**
   * 도매상의 모든 거래 조회
   */
  static async getTransactionsByWholesaler(
    wholesalerId: string,
    status?: TransactionStatus
  ): Promise<Transaction[]> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // 쿼리 파라미터 구성
    let queryParams = `wholesaler_id=eq.${wholesalerId}&order=created_at.desc`;
    if (status) {
      queryParams += `&status=eq.${status}`;
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/${this.TRANSACTIONS_COLLECTION}?${queryParams}`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`거래 조회 실패: ${response.status}`);
    }

    const data = await response.json();
    return data.map(this.mapToTransaction);
  }

  /**
   * purchase_offer_id로 거래 조회
   */
  static async getTransactionByOfferId(
    offerId: string,
    accessToken?: string
  ): Promise<Transaction | null> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const headers: Record<string, string> = {
      'apikey': supabaseKey,
      'Content-Type': 'application/json',
    };

    // accessToken이 있으면 인증 헤더 추가
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/${this.TRANSACTIONS_COLLECTION}?purchase_offer_id=eq.${offerId}`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      throw new Error(`거래 조회 실패: ${response.status}`);
    }

    const data = await response.json();
    if (data.length === 0) {
      return null;
    }

    return this.mapToTransaction(data[0]);
  }

  /**
   * 거래 상태 업데이트
   */
  static async updateTransactionStatus(
    request: UpdateTransactionStatusRequest,
    accessToken: string
  ): Promise<void> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const now = new Date().toISOString();
    const payload: any = {
      status: request.status,
      updated_at: now,
    };

    // 상태에 따라 타임스탬프 설정
    if (request.status === TransactionStatus.COMPLETED) {
      payload.completed_at = now;
    } else if (request.status === TransactionStatus.CANCELLED) {
      payload.cancelled_at = now;
    }

    // notes가 있으면 추가
    if (request.notes !== undefined) {
      payload.notes = request.notes;
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/${this.TRANSACTIONS_COLLECTION}?id=eq.${request.transactionId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TransactionService] Update transaction failed:', errorText);
      throw new Error(`거래 상태 업데이트 실패: ${response.status}`);
    }
  }

  /**
   * 거래 완료 처리 (도매상용)
   */
  static async completeTransaction(
    transactionId: string,
    accessToken: string,
    notes?: string
  ): Promise<void> {
    await this.updateTransactionStatus(
      {
        transactionId,
        status: TransactionStatus.COMPLETED,
        notes,
      },
      accessToken
    );
  }

  /**
   * 거래 취소 처리
   */
  static async cancelTransaction(
    transactionId: string,
    accessToken: string,
    notes?: string
  ): Promise<void> {
    await this.updateTransactionStatus(
      {
        transactionId,
        status: TransactionStatus.CANCELLED,
        notes,
      },
      accessToken
    );
  }

  /**
   * 특정 거래 조회 (ID로)
   */
  static async getTransaction(transactionId: string): Promise<Transaction | null> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const response = await fetch(
      `${supabaseUrl}/rest/v1/${this.TRANSACTIONS_COLLECTION}?id=eq.${transactionId}`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`거래 조회 실패: ${response.status}`);
    }

    const data = await response.json();
    if (data.length === 0) {
      return null;
    }

    return this.mapToTransaction(data[0]);
  }
}

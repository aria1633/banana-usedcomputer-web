// lib/services/sell-request.service.ts

import { supabase } from '@/lib/supabase/config';
import { SellRequest, SellRequestStatus, SellRequestCategory } from '@/types/sell-request';
import { PurchaseOffer } from '@/types/purchase-offer';

export class SellRequestService {
  private static SELL_REQUESTS_COLLECTION = 'sell_requests';
  private static PURCHASE_OFFERS_COLLECTION = 'purchase_offers';

  /**
   * 매입 요청 생성 - Fetch API 사용
   */
  static async createSellRequest(
    requestData: Omit<SellRequest, 'id'>,
    accessToken: string
  ): Promise<string> {
    try {
      console.log('[SellRequestService] createSellRequest 시작 (Fetch API)');

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      const payload = {
        seller_id: requestData.sellerId,
        seller_name: requestData.sellerName,
        title: requestData.title,
        description: requestData.description,
        image_urls: requestData.imageUrls,
        desired_price: requestData.desiredPrice,
        category: requestData.category,
        status: requestData.status,
        created_at: requestData.createdAt.toISOString(),
      };

      console.log('[SellRequestService] Request payload:', payload);

      const response = await fetch(
        `${supabaseUrl}/rest/v1/${this.SELL_REQUESTS_COLLECTION}`,
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

      console.log('[SellRequestService] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SellRequestService] Insert failed:', errorText);
        throw new Error(`Insert failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[SellRequestService] Insert success:', data);

      if (!data || !data[0]?.id) {
        throw new Error('매입 요청 생성 실패: ID를 받지 못했습니다');
      }

      return data[0].id;
    } catch (error) {
      console.error('[SellRequestService] createSellRequest error:', error);
      throw new Error(`매입 요청 생성 실패: ${error}`);
    }
  }

  /**
   * 매입 요청 상세 조회 - Fetch API 사용
   */
  static async getSellRequest(requestId: string, accessToken?: string): Promise<SellRequest | null> {
    try {
      console.log('[SellRequestService] getSellRequest 시작 (Fetch API):', requestId);

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      const headers: Record<string, string> = {
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
      };

      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(
        `${supabaseUrl}/rest/v1/${this.SELL_REQUESTS_COLLECTION}?id=eq.${requestId}`,
        {
          method: 'GET',
          headers,
        }
      );

      console.log('[SellRequestService] getSellRequest response status:', response.status);

      if (!response.ok) {
        if (response.status === 404) {
          console.log('[SellRequestService] 문서를 찾을 수 없음:', requestId);
          return null;
        }
        const errorText = await response.text();
        console.error('[SellRequestService] Fetch failed:', errorText);
        throw new Error(`Fetch failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[SellRequestService] Fetch success, data:', data);

      if (!data || data.length === 0) {
        console.log('[SellRequestService] 문서가 비어있음');
        return null;
      }

      const result = this.mapToSellRequest(data[0]);
      console.log('[SellRequestService] 변환된 데이터:', result);

      return result;
    } catch (error) {
      console.error('[SellRequestService] getSellRequest error:', error);
      throw new Error(`매입 요청 조회 실패: ${error}`);
    }
  }

  /**
   * 매입 요청 목록 조회 (도매상용 - 진행 중인 요청만) - Fetch API 사용
   */
  static async getAllSellRequests(accessToken?: string): Promise<SellRequest[]> {
    try {
      console.log('[SellRequestService] getAllSellRequests 시작 (Fetch API)');

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      const headers: Record<string, string> = {
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
      };

      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(
        `${supabaseUrl}/rest/v1/${this.SELL_REQUESTS_COLLECTION}?status=eq.${SellRequestStatus.OPEN}&order=created_at.desc`,
        {
          method: 'GET',
          headers,
        }
      );

      console.log('[SellRequestService] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SellRequestService] Fetch failed:', errorText);
        throw new Error(`Fetch failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[SellRequestService] Fetch success, count:', data.length);

      return data.map((item: any) => this.mapToSellRequest(item));
    } catch (error) {
      console.error('[SellRequestService] getAllSellRequests error:', error);
      throw new Error(`매입 요청 목록 조회 실패: ${error}`);
    }
  }

  /**
   * 내 매입 요청 목록 조회 (일반 사용자용) - Fetch API 사용
   */
  static async getMySellRequests(userId: string, accessToken?: string): Promise<SellRequest[]> {
    try {
      console.log('[SellRequestService] getMySellRequests 시작 (Fetch API):', userId);

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      const headers: Record<string, string> = {
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
      };

      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(
        `${supabaseUrl}/rest/v1/${this.SELL_REQUESTS_COLLECTION}?seller_id=eq.${userId}&order=created_at.desc`,
        {
          method: 'GET',
          headers,
        }
      );

      console.log('[SellRequestService] getMySellRequests response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SellRequestService] Fetch failed:', errorText);
        throw new Error(`Fetch failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[SellRequestService] Fetch success, count:', data.length);

      return data.map((item: any) => this.mapToSellRequest(item));
    } catch (error) {
      console.error('[SellRequestService] getMySellRequests error:', error);
      throw new Error(`내 매입 요청 목록 조회 실패: ${error}`);
    }
  }

  /**
   * 실시간 매입 요청 목록 구독
   */
  static subscribeToSellRequests(
    callback: (requests: SellRequest[]) => void,
    userId?: string,
    statusFilter?: SellRequestStatus
  ): () => void {
    // 초기 데이터 로드
    const loadInitialData = async () => {
      let query = supabase
        .from(this.SELL_REQUESTS_COLLECTION)
        .select('*')
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('seller_id', userId);
      }

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (!error && data) {
        callback(data.map((item) => this.mapToSellRequest(item)));
      }
    };

    loadInitialData();

    // Realtime 구독
    const filters: string[] = [];
    if (userId) filters.push(`seller_id=eq.${userId}`);
    if (statusFilter) filters.push(`status=eq.${statusFilter}`);

    const channel = supabase
      .channel('sell-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: this.SELL_REQUESTS_COLLECTION,
          filter: filters.join(',') || undefined,
        },
        () => {
          loadInitialData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * 매입 제안 생성 (도매상) - Fetch API 사용
   */
  static async createOffer(
    offerData: Omit<PurchaseOffer, 'id'>,
    accessToken: string
  ): Promise<string> {
    try {
      console.log('[SellRequestService] createOffer 시작 (Fetch API)');

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      const payload = {
        sell_request_id: offerData.sellRequestId,
        wholesaler_id: offerData.wholesalerId,
        wholesaler_name: offerData.wholesalerName,
        offer_price: offerData.offerPrice,
        message: offerData.message,
        is_selected: offerData.isSelected,
        created_at: offerData.createdAt.toISOString(),
      };

      console.log('[SellRequestService] createOffer payload:', payload);

      const response = await fetch(
        `${supabaseUrl}/rest/v1/${this.PURCHASE_OFFERS_COLLECTION}`,
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

      console.log('[SellRequestService] createOffer response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SellRequestService] createOffer failed:', errorText);
        throw new Error(`매입 제안 생성 실패: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[SellRequestService] createOffer success:', data);

      if (!data || !data[0]?.id) {
        throw new Error('매입 제안 생성 실패: ID를 받지 못했습니다');
      }

      return data[0].id;
    } catch (error) {
      console.error('[SellRequestService] createOffer error:', error);
      throw new Error(`매입 제안 생성 실패: ${error}`);
    }
  }

  /**
   * 매입 요청에 대한 제안 목록 조회 - Fetch API 사용
   */
  static async getOffers(sellRequestId: string, accessToken?: string): Promise<PurchaseOffer[]> {
    try {
      console.log('[SellRequestService] getOffers 시작 (Fetch API):', sellRequestId);

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      const headers: Record<string, string> = {
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
      };

      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(
        `${supabaseUrl}/rest/v1/${this.PURCHASE_OFFERS_COLLECTION}?sell_request_id=eq.${sellRequestId}&order=offer_price.desc`,
        {
          method: 'GET',
          headers,
        }
      );

      console.log('[SellRequestService] getOffers response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SellRequestService] Fetch failed:', errorText);
        throw new Error(`Fetch failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[SellRequestService] Fetch success, offers count:', data.length);

      return data.map((item: any) => this.mapToPurchaseOffer(item));
    } catch (error) {
      console.error('[SellRequestService] getOffers error:', error);
      throw new Error(`매입 제안 조회 실패: ${error}`);
    }
  }

  /**
   * 실시간 매입 제안 목록 구독
   */
  static subscribeToOffers(
    sellRequestId: string,
    callback: (offers: PurchaseOffer[]) => void
  ): () => void {
    // 초기 데이터 로드
    const loadInitialData = async () => {
      const { data, error } = await supabase
        .from(this.PURCHASE_OFFERS_COLLECTION)
        .select('*')
        .eq('sell_request_id', sellRequestId)
        .order('offer_price', { ascending: false });

      if (!error && data) {
        callback(data.map((item) => this.mapToPurchaseOffer(item)));
      }
    };

    loadInitialData();

    // Realtime 구독
    const channel = supabase
      .channel('purchase-offers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: this.PURCHASE_OFFERS_COLLECTION,
          filter: `sell_request_id=eq.${sellRequestId}`,
        },
        () => {
          loadInitialData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * 거래 확정 (일반 사용자가 도매상 선택) - Fetch API 사용
   * 두 테이블 업데이트를 순차적으로 실행
   */
  static async selectWholesaler(
    sellRequestId: string,
    wholesalerId: string,
    offerId: string,
    accessToken: string
  ): Promise<void> {
    try {
      console.log('[SellRequestService] selectWholesaler 시작 (Fetch API)');

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const now = new Date().toISOString();

      // 1. 매입 요청 상태 업데이트
      console.log('[SellRequestService] Updating sell request status...');
      const sellRequestPayload = {
        status: SellRequestStatus.CLOSED,
        selected_wholesaler_id: wholesalerId,
        closed_at: now,
        updated_at: now,
      };

      const sellRequestResponse = await fetch(
        `${supabaseUrl}/rest/v1/${this.SELL_REQUESTS_COLLECTION}?id=eq.${sellRequestId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'apikey': supabaseKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify(sellRequestPayload),
        }
      );

      console.log('[SellRequestService] Sell request update status:', sellRequestResponse.status);

      if (!sellRequestResponse.ok) {
        const errorText = await sellRequestResponse.text();
        console.error('[SellRequestService] Sell request update failed:', errorText);
        throw new Error(`매입 요청 상태 업데이트 실패: ${sellRequestResponse.status} - ${errorText}`);
      }

      // 2. 선택된 제안 표시
      console.log('[SellRequestService] Updating offer selection...');
      const offerPayload = {
        is_selected: true,
        updated_at: now,
      };

      const offerResponse = await fetch(
        `${supabaseUrl}/rest/v1/${this.PURCHASE_OFFERS_COLLECTION}?id=eq.${offerId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'apikey': supabaseKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify(offerPayload),
        }
      );

      console.log('[SellRequestService] Offer update status:', offerResponse.status);

      if (!offerResponse.ok) {
        const errorText = await offerResponse.text();
        console.error('[SellRequestService] Offer update failed:', errorText);
        // 롤백이 필요하지만 클라이언트에서는 어렵습니다
        // 서버 측 RPC 함수를 사용하거나 관리자가 수동으로 처리
        throw new Error(`제안 선택 표시 실패: ${offerResponse.status} - ${errorText}`);
      }

      console.log('[SellRequestService] selectWholesaler 완료');
    } catch (error) {
      console.error('[SellRequestService] selectWholesaler error:', error);
      throw new Error(`거래 확정 실패: ${error}`);
    }
  }

  /**
   * 매입 요청 취소 - Fetch API 사용
   */
  static async cancelSellRequest(requestId: string, accessToken: string): Promise<void> {
    try {
      console.log('[SellRequestService] cancelSellRequest 시작 (Fetch API):', requestId);

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const now = new Date().toISOString();

      const payload = {
        status: SellRequestStatus.CANCELLED,
        closed_at: now,
        updated_at: now,
      };

      const response = await fetch(
        `${supabaseUrl}/rest/v1/${this.SELL_REQUESTS_COLLECTION}?id=eq.${requestId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'apikey': supabaseKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify(payload),
        }
      );

      console.log('[SellRequestService] cancelSellRequest response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SellRequestService] Cancel failed:', errorText);
        throw new Error(`매입 요청 취소 실패: ${response.status} - ${errorText}`);
      }

      console.log('[SellRequestService] cancelSellRequest 완료');
    } catch (error) {
      console.error('[SellRequestService] cancelSellRequest error:', error);
      throw new Error(`매입 요청 취소 실패: ${error}`);
    }
  }

  /**
   * 도매상의 제안 개수 조회 - Fetch API 사용
   */
  static async getOfferCount(sellRequestId: string, accessToken?: string): Promise<number> {
    try {
      console.log('[SellRequestService] getOfferCount 시작 (Fetch API):', sellRequestId);

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      const headers: Record<string, string> = {
        'apikey': supabaseKey,
        'Prefer': 'count=exact',
      };

      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(
        `${supabaseUrl}/rest/v1/${this.PURCHASE_OFFERS_COLLECTION}?sell_request_id=eq.${sellRequestId}`,
        {
          method: 'HEAD',
          headers,
        }
      );

      console.log('[SellRequestService] getOfferCount response status:', response.status);

      if (!response.ok) {
        console.error('[SellRequestService] Count failed:', response.status);
        return 0;
      }

      // Content-Range 헤더에서 count 추출 (예: "0-9/10" or "*/10")
      const contentRange = response.headers.get('Content-Range');
      console.log('[SellRequestService] Content-Range:', contentRange);

      if (contentRange) {
        const match = contentRange.match(/\/(\d+)$/);
        if (match) {
          const count = parseInt(match[1], 10);
          console.log('[SellRequestService] Offer count:', count);
          return count;
        }
      }

      return 0;
    } catch (error) {
      console.error('[SellRequestService] getOfferCount error:', error);
      return 0;
    }
  }

  /**
   * 진행 중인 매입 요청 개수 조회 - Fetch API 사용
   */
  static async getOpenSellRequestCount(accessToken?: string): Promise<number> {
    try {
      console.log('[SellRequestService] getOpenSellRequestCount 시작 (Fetch API)');

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      const headers: Record<string, string> = {
        'apikey': supabaseKey,
        'Prefer': 'count=exact',
      };

      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(
        `${supabaseUrl}/rest/v1/${this.SELL_REQUESTS_COLLECTION}?status=eq.${SellRequestStatus.OPEN}`,
        {
          method: 'HEAD',
          headers,
        }
      );

      console.log('[SellRequestService] getOpenSellRequestCount response status:', response.status);

      if (!response.ok) {
        console.error('[SellRequestService] Count failed:', response.status);
        return 0;
      }

      // Content-Range 헤더에서 count 추출 (예: "0-9/10" or "*/10")
      const contentRange = response.headers.get('Content-Range');
      console.log('[SellRequestService] Content-Range:', contentRange);

      if (contentRange) {
        const match = contentRange.match(/\/(\d+)$/);
        if (match) {
          const count = parseInt(match[1], 10);
          console.log('[SellRequestService] Open sell request count:', count);
          return count;
        }
      }

      return 0;
    } catch (error) {
      console.error('[SellRequestService] getOpenSellRequestCount error:', error);
      return 0;
    }
  }

  /**
   * 도매상이 낙찰받은 매입 제안 조회 - Fetch API 사용
   */
  static async getWonOffers(wholesalerId: string, accessToken?: string): Promise<Array<PurchaseOffer & { sellRequest: SellRequest }>> {
    try {
      console.log('[SellRequestService] getWonOffers 시작 (Fetch API):', wholesalerId);

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      const headers: Record<string, string> = {
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
      };

      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      // 낙찰받은 제안 조회
      const response = await fetch(
        `${supabaseUrl}/rest/v1/${this.PURCHASE_OFFERS_COLLECTION}?wholesaler_id=eq.${wholesalerId}&is_selected=eq.true&order=created_at.desc`,
        {
          method: 'GET',
          headers,
        }
      );

      console.log('[SellRequestService] getWonOffers response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SellRequestService] Fetch failed:', errorText);
        throw new Error(`Fetch failed: ${response.status} - ${errorText}`);
      }

      const offers = await response.json();
      console.log('[SellRequestService] Won offers count:', offers.length);

      // 각 제안에 대한 매입 요청 정보 조회
      const result = await Promise.all(
        offers.map(async (offer: any) => {
          const sellRequest = await this.getSellRequest(offer.sell_request_id, accessToken);
          return {
            ...this.mapToPurchaseOffer(offer),
            sellRequest: sellRequest!,
          };
        })
      );

      console.log('[SellRequestService] getWonOffers 완료, result count:', result.length);
      return result;
    } catch (error) {
      console.error('[SellRequestService] getWonOffers error:', error);
      throw new Error(`낙찰받은 제안 조회 실패: ${error}`);
    }
  }

  /**
   * 도매상이 낙찰받은 매입 제안 개수 조회 (진행중인 거래만) - Fetch API 사용
   *
   * 낙찰받은 제안 중 다음 조건을 만족하는 것만 카운트합니다:
   * 1. transaction이 없는 경우 (아직 거래 시작 전)
   * 2. transaction이 있고 status가 'in_progress'인 경우
   *
   * 'completed' 상태의 거래는 제외됩니다.
   */
  static async getWonOffersCount(wholesalerId: string, accessToken?: string): Promise<number> {
    try {
      console.log('[SellRequestService] getWonOffersCount 시작 (진행중인 거래만):', wholesalerId);

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      const headers: Record<string, string> = {
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
      };

      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      // 1단계: 낙찰받은 제안(is_selected=true) 조회
      const offersResponse = await fetch(
        `${supabaseUrl}/rest/v1/${this.PURCHASE_OFFERS_COLLECTION}?wholesaler_id=eq.${wholesalerId}&is_selected=eq.true&select=id`,
        {
          method: 'GET',
          headers,
        }
      );

      console.log('[SellRequestService] Offers response status:', offersResponse.status);

      if (!offersResponse.ok) {
        console.error('[SellRequestService] Offers fetch failed:', offersResponse.status);
        return 0;
      }

      const offers = await offersResponse.json();
      console.log('[SellRequestService] Total won offers:', offers.length);

      if (offers.length === 0) {
        return 0;
      }

      const offerIds = offers.map((offer: any) => offer.id);

      // 2단계: transactions 테이블에서 completed 상태인 거래 개수 조회
      const completedTransactionsResponse = await fetch(
        `${supabaseUrl}/rest/v1/transactions?purchase_offer_id=in.(${offerIds.join(',')})&status=eq.completed`,
        {
          method: 'HEAD',
          headers: {
            ...headers,
            'Prefer': 'count=exact',
          },
        }
      );

      console.log('[SellRequestService] Completed transactions response status:', completedTransactionsResponse.status);

      let completedCount = 0;
      if (completedTransactionsResponse.ok) {
        const contentRange = completedTransactionsResponse.headers.get('Content-Range');
        console.log('[SellRequestService] Completed Content-Range:', contentRange);

        if (contentRange) {
          const match = contentRange.match(/\/(\d+)$/);
          if (match) {
            completedCount = parseInt(match[1], 10);
          }
        }
      }

      console.log('[SellRequestService] Completed transactions count:', completedCount);

      // 3단계: 전체 낙찰 개수에서 completed 개수를 뺌
      // (transaction이 없거나 in_progress인 경우 = 전체 - completed)
      const inProgressCount = offers.length - completedCount;
      console.log('[SellRequestService] In-progress count (total - completed):', inProgressCount);

      return inProgressCount;
    } catch (error) {
      console.error('[SellRequestService] getWonOffersCount error:', error);
      return 0;
    }
  }

  /**
   * DB 데이터를 SellRequest 타입으로 변환
   */
  private static mapToSellRequest(data: Record<string, unknown>): SellRequest {
    return {
      id: data.id as string,
      sellerId: data.seller_id as string,
      sellerName: data.seller_name as string,
      title: data.title as string,
      description: data.description as string,
      imageUrls: data.image_urls as string[],
      desiredPrice: (data.desired_price as string) ?? null,
      category: (data.category as SellRequestCategory) ?? SellRequestCategory.COMPUTER,
      status: data.status as SellRequestStatus,
      selectedWholesalerId: (data.selected_wholesaler_id as string) ?? null,
      createdAt: new Date(data.created_at as string),
      updatedAt: data.updated_at ? new Date(data.updated_at as string) : null,
      closedAt: data.closed_at ? new Date(data.closed_at as string) : null,
    };
  }

  /**
   * DB 데이터를 PurchaseOffer 타입으로 변환
   */
  private static mapToPurchaseOffer(
    data: Record<string, unknown>
  ): PurchaseOffer {
    return {
      id: data.id as string,
      sellRequestId: data.sell_request_id as string,
      wholesalerId: data.wholesaler_id as string,
      wholesalerName: data.wholesaler_name as string,
      offerPrice: data.offer_price as number,
      message: (data.message as string) ?? null,
      isSelected: data.is_selected as boolean,
      createdAt: new Date(data.created_at as string),
      updatedAt: data.updated_at ? new Date(data.updated_at as string) : null,
    };
  }
}

// lib/services/inquiry.service.ts

import { Inquiry, InquiryStatus } from '@/types/inquiry';
import { logger } from '@/lib/utils/logger';
import { fetchWithAuth, get, post, patch } from '@/lib/utils/fetch';

export class InquiryService {
  private static COLLECTION = 'inquiries';

  /**
   * 문의 등록 (Create)
   */
  static async createInquiry(
    inquiryData: Omit<Inquiry, 'id' | 'createdAt' | 'answeredAt'>
  ): Promise<string> {
    try {
      logger.group('InquiryService.createInquiry');
      logger.info('Creating inquiry', { productId: inquiryData.productId });

      const payload = {
        product_id: inquiryData.productId,
        product_title: inquiryData.productTitle,
        customer_id: inquiryData.customerId,
        customer_name: inquiryData.customerName,
        seller_id: inquiryData.sellerId,
        seller_name: inquiryData.sellerName,
        question: inquiryData.question,
        status: inquiryData.status,
      };

      logger.info('Request payload', payload);

      const response = await fetchWithAuth(`/rest/v1/${this.COLLECTION}`, {
        method: 'POST',
        requireAuth: true,
        headers: {
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Insert failed', { error: errorText });
        throw new Error(`문의 등록 실패: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      logger.success('Inquiry created', { id: data[0].id });
      logger.groupEnd();

      return data[0].id;
    } catch (error) {
      logger.error('Create inquiry error', error);
      logger.groupEnd();
      throw error;
    }
  }

  /**
   * 특정 상품의 모든 문의 조회
   */
  static async getInquiriesByProduct(productId: string): Promise<Inquiry[]> {
    try {
      logger.group('InquiryService.getInquiriesByProduct');
      logger.info('Fetching inquiries', { productId });

      const response = await get<any[]>(
        `/rest/v1/${this.COLLECTION}?product_id=eq.${productId}&order=created_at.desc&select=*`
      );

      const inquiries: Inquiry[] = response.map((item) => ({
        id: item.id,
        productId: item.product_id,
        productTitle: item.product_title,
        customerId: item.customer_id,
        customerName: item.customer_name,
        sellerId: item.seller_id,
        sellerName: item.seller_name,
        question: item.question,
        answer: item.answer || null,
        status: item.status as InquiryStatus,
        createdAt: new Date(item.created_at),
        answeredAt: item.answered_at ? new Date(item.answered_at) : null,
      }));

      logger.success('Inquiries fetched', { count: inquiries.length });
      logger.groupEnd();

      return inquiries;
    } catch (error) {
      logger.error('Get inquiries error', error);
      logger.groupEnd();
      throw error;
    }
  }

  /**
   * 판매자가 받은 문의 조회
   */
  static async getInquiriesBySeller(sellerId: string): Promise<Inquiry[]> {
    try {
      logger.group('InquiryService.getInquiriesBySeller');
      logger.info('Fetching seller inquiries', { sellerId });

      const response = await get<any[]>(
        `/rest/v1/${this.COLLECTION}?seller_id=eq.${sellerId}&order=created_at.desc&select=*`
      );

      const inquiries: Inquiry[] = response.map((item) => ({
        id: item.id,
        productId: item.product_id,
        productTitle: item.product_title,
        customerId: item.customer_id,
        customerName: item.customer_name,
        sellerId: item.seller_id,
        sellerName: item.seller_name,
        question: item.question,
        answer: item.answer || null,
        status: item.status as InquiryStatus,
        createdAt: new Date(item.created_at),
        answeredAt: item.answered_at ? new Date(item.answered_at) : null,
      }));

      logger.success('Seller inquiries fetched', { count: inquiries.length });
      logger.groupEnd();

      return inquiries;
    } catch (error) {
      logger.error('Get seller inquiries error', error);
      logger.groupEnd();
      throw error;
    }
  }

  /**
   * 고객이 작성한 문의 조회
   */
  static async getInquiriesByCustomer(customerId: string): Promise<Inquiry[]> {
    try {
      logger.group('InquiryService.getInquiriesByCustomer');
      logger.info('Fetching customer inquiries', { customerId });

      const response = await get<any[]>(
        `/rest/v1/${this.COLLECTION}?customer_id=eq.${customerId}&order=created_at.desc&select=*`
      );

      const inquiries: Inquiry[] = response.map((item) => ({
        id: item.id,
        productId: item.product_id,
        productTitle: item.product_title,
        customerId: item.customer_id,
        customerName: item.customer_name,
        sellerId: item.seller_id,
        sellerName: item.seller_name,
        question: item.question,
        answer: item.answer || null,
        status: item.status as InquiryStatus,
        createdAt: new Date(item.created_at),
        answeredAt: item.answered_at ? new Date(item.answered_at) : null,
      }));

      logger.success('Customer inquiries fetched', { count: inquiries.length });
      logger.groupEnd();

      return inquiries;
    } catch (error) {
      logger.error('Get customer inquiries error', error);
      logger.groupEnd();
      throw error;
    }
  }

  /**
   * 문의 답변 작성 (판매자만 가능)
   */
  static async answerInquiry(
    inquiryId: string,
    answer: string
  ): Promise<void> {
    try {
      logger.group('InquiryService.answerInquiry');
      logger.info('Answering inquiry', { inquiryId });

      const payload = {
        answer,
        status: InquiryStatus.ANSWERED,
        answered_at: new Date().toISOString(),
      };

      logger.info('Request payload', payload);

      const response = await fetchWithAuth(
        `/rest/v1/${this.COLLECTION}?id=eq.${inquiryId}`,
        {
          method: 'PATCH',
          requireAuth: true,
          headers: {
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Answer failed', { error: errorText });
        throw new Error(`답변 등록 실패: ${response.status} - ${errorText}`);
      }

      logger.success('Answer submitted');
      logger.groupEnd();
    } catch (error) {
      logger.error('Answer inquiry error', error);
      logger.groupEnd();
      throw error;
    }
  }
}

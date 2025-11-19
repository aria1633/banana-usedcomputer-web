// lib/services/product.service.ts

import { Product } from '@/types/product';
import { logger } from '@/lib/utils/logger';
import { fetchWithAuth, get, post, patch, del, getCount } from '@/lib/utils/fetch';
import { StorageService } from '@/lib/services/storage.service';
import { getAccessToken } from '@/lib/utils/auth';

export class ProductService {
  private static COLLECTION = 'products';

  /**
   * 상품 등록 (Create)
   */
  static async createProduct(
    productData: Omit<Product, 'id'>,
    accessToken: string
  ): Promise<string> {
    try {
      logger.group('ProductService.createProduct');
      logger.info('Creating product', { title: productData.title });

      const payload = {
        seller_id: productData.sellerId,
        seller_name: productData.sellerName,
        title: productData.title,
        description: productData.description,
        price: productData.price,
        quantity: productData.quantity,
        image_urls: productData.imageUrls,
        category: productData.category,
        is_available: productData.isAvailable,
        created_at: productData.createdAt.toISOString(),
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
        throw new Error(`Insert failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      logger.info('Insert success', { productId: data[0]?.id });

      if (!data || !data[0]?.id) {
        throw new Error('상품 등록 실패: ID를 받지 못했습니다');
      }

      logger.groupEnd();
      return data[0].id;
    } catch (error) {
      logger.groupEnd();
      logger.error('createProduct error', { error });
      throw new Error(`상품 등록 실패: ${error}`);
    }
  }

  /**
   * 상품 상세 조회 (Read - Single)
   */
  static async getProduct(productId: string): Promise<Product | null> {
    try {
      logger.info('Getting product', { productId });

      const data = await get<any[]>(`/rest/v1/${this.COLLECTION}?id=eq.${productId}`);

      if (!data || data.length === 0) {
        logger.warn('Product not found', { productId });
        return null;
      }

      return this.mapToProduct(data[0]);
    } catch (error: any) {
      if (error.message.includes('404')) {
        return null;
      }
      logger.error('getProduct error', { error, productId });
      throw new Error(`상품 조회 실패: ${error}`);
    }
  }

  /**
   * 모든 상품 조회 (Read - Multiple)
   */
  static async getAllProducts(): Promise<Product[]> {
    try {
      logger.info('Getting all products');

      const data = await get<any[]>(
        `/rest/v1/${this.COLLECTION}?is_available=eq.true&order=created_at.desc`
      );

      logger.info('Fetched products', { count: data.length });

      return data.map((item: any) => this.mapToProduct(item));
    } catch (error) {
      logger.error('getAllProducts error', { error });
      throw new Error(`상품 목록 조회 실패: ${error}`);
    }
  }

  /**
   * 실시간 상품 목록 구독 (Polling 방식)
   */
  static subscribeToProducts(
    callback: (products: Product[]) => void,
    sellerId?: string
  ): () => void {
    logger.info('subscribeToProducts started', { sellerId });

    // 초기 데이터 로드
    const loadInitialData = async () => {
      try {
        logger.info('loadInitialData started');

        let url = `/rest/v1/products?is_available=eq.true&order=created_at.desc`;
        if (sellerId) {
          url += `&seller_id=eq.${sellerId}`;
        }

        const data = await get<any[]>(url);
        logger.info('Fetch data', { count: data.length });

        // 데이터 매핑
        const products = data.map((item: any) => this.mapToProduct(item));
        logger.info('Calling callback with products', { count: products.length });
        callback(products);
      } catch (error) {
        logger.error('상품 구독 에러', { error });
        callback([]); // 예외 발생 시에도 빈 배열 전달
      }
    };

    logger.info('Calling loadInitialData');
    loadInitialData();

    // 30초마다 갱신 (Polling)
    const intervalId = setInterval(() => {
      loadInitialData();
    }, 30000);

    // Unsubscribe 함수 반환
    return () => {
      logger.info('Unsubscribing from products');
      clearInterval(intervalId);
    };
  }

  /**
   * 상품 수정 (Update)
   */
  static async updateProduct(
    productId: string,
    updates: Partial<Omit<Product, 'id'>>
  ): Promise<void> {
    try {
      logger.group('ProductService.updateProduct');
      logger.info('Updating product', { productId, updates });

      const updateData: Record<string, unknown> = {};

      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined)
        updateData.description = updates.description;
      if (updates.price !== undefined) updateData.price = updates.price;
      if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
      if (updates.imageUrls !== undefined)
        updateData.image_urls = updates.imageUrls;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.isAvailable !== undefined)
        updateData.is_available = updates.isAvailable;

      updateData.updated_at = new Date().toISOString();

      await patch(`/rest/v1/${this.COLLECTION}?id=eq.${productId}`, {
        requireAuth: true,
        body: JSON.stringify(updateData),
      });

      logger.info('Product updated successfully', { productId });
      logger.groupEnd();
    } catch (error) {
      logger.groupEnd();
      logger.error('updateProduct error', { error, productId });
      throw new Error(`상품 수정 실패: ${error}`);
    }
  }

  /**
   * 상품 삭제 (Delete)
   * 이미지 파일과 데이터베이스 레코드를 함께 삭제
   */
  static async deleteProduct(productId: string): Promise<void> {
    try {
      logger.group('ProductService.deleteProduct');
      logger.info('Deleting product', { productId });

      // 1. 먼저 상품 정보를 조회하여 이미지 URL 가져오기
      const product = await this.getProduct(productId);

      if (!product) {
        logger.warn('Product not found', { productId });
        throw new Error('삭제할 상품을 찾을 수 없습니다.');
      }

      logger.info('Product found, image count:', { count: product.imageUrls?.length || 0 });

      // 2. Storage에서 이미지 삭제
      if (product.imageUrls && product.imageUrls.length > 0) {
        try {
          const accessToken = getAccessToken();
          if (!accessToken) {
            logger.warn('No access token, skipping image deletion');
          } else {
            logger.info('Deleting images from storage', { urls: product.imageUrls });
            await StorageService.deleteImages(
              product.imageUrls,
              'product-images',
              accessToken
            );
            logger.info('Images deleted successfully');
          }
        } catch (imageError) {
          // 이미지 삭제 실패해도 계속 진행 (데이터는 삭제)
          logger.error('Failed to delete images, but continuing', { error: imageError });
        }
      }

      // 3. 데이터베이스에서 상품 레코드 삭제
      await del(`/rest/v1/${this.COLLECTION}?id=eq.${productId}`, {
        requireAuth: true,
      });

      logger.info('Product deleted successfully', { productId });
      logger.groupEnd();
    } catch (error) {
      logger.groupEnd();
      logger.error('deleteProduct error', { error, productId });
      throw new Error(`상품 삭제 실패: ${error}`);
    }
  }

  /**
   * 도매상의 상품 개수 조회
   */
  static async getProductCountBySeller(sellerId: string): Promise<number> {
    try {
      logger.info('Getting product count by seller', { sellerId });

      const count = await getCount(
        `/rest/v1/${this.COLLECTION}?seller_id=eq.${sellerId}&is_available=eq.true`
      );

      logger.info('Product count retrieved', { sellerId, count });

      return count;
    } catch (error) {
      logger.error('getProductCountBySeller error', { error, sellerId });
      return 0;
    }
  }

  /**
   * 상품 검색 (Search)
   */
  static async searchProducts(keyword: string): Promise<Product[]> {
    try {
      logger.info('Searching products', { keyword });

      if (!keyword.trim()) {
        return this.getAllProducts();
      }

      // Supabase의 ilike를 사용한 대소문자 구분 없는 검색
      // title 또는 description에 키워드가 포함된 상품 검색
      const data = await get<any[]>(
        `/rest/v1/${this.COLLECTION}?is_available=eq.true&or=(title.ilike.*${encodeURIComponent(keyword)}*,description.ilike.*${encodeURIComponent(keyword)}*)&order=created_at.desc`
      );

      logger.info('Search results', { count: data.length, keyword });

      return data.map((item: any) => this.mapToProduct(item));
    } catch (error) {
      logger.error('searchProducts error', { error, keyword });
      throw new Error(`상품 검색 실패: ${error}`);
    }
  }

  /**
   * DB 데이터를 Product 타입으로 변환
   */
  private static mapToProduct(data: Record<string, unknown>): Product {
    return {
      id: data.id as string,
      sellerId: data.seller_id as string,
      sellerName: data.seller_name as string,
      title: data.title as string,
      description: data.description as string,
      price: data.price as number,
      quantity: data.quantity as number,
      imageUrls: data.image_urls as string[],
      category: data.category as string,
      isAvailable: data.is_available as boolean,
      createdAt: new Date(data.created_at as string),
      updatedAt: data.updated_at ? new Date(data.updated_at as string) : null,
    };
  }
}

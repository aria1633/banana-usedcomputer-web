// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/types/product';
import { ProductService } from '@/lib/services/product.service';
import Link from 'next/link';
import Image from 'next/image';
import { Header } from '@/components/layout/header';
import { Banner } from '@/components/layout/banner';
import { VerificationStatusAlert } from '@/components/verification-status-alert';
import { useAuth } from '@/lib/hooks/use-auth';
import { logger } from '@/lib/utils/logger';

export default function HomePage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  logger.info('HomePage rendering', { productsCount: products.length, loading });

  useEffect(() => {
    logger.group('HomePage - Product Subscription Setup');
    logger.info('Setting up product subscription');

    // 상품 데이터 수신 시 콜백
    const handleProductsUpdate = (data: Product[]) => {
      logger.info('Received products from subscription', { count: data.length });
      setProducts(data);
      setLoading(false);
      logger.info('Updated state', { loading: false, productsCount: data.length });
    };

    // 구독 시작
    const unsubscribe = ProductService.subscribeToProducts(handleProductsUpdate);

    logger.info('Product subscription registered');
    logger.groupEnd();

    // 클린업
    return () => {
      logger.info('Cleaning up product subscription');
      unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Banner />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 사업자 인증 상태 알림 */}
        {user && <VerificationStatusAlert user={user} />}

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">최신 등록 상품</h2>
          <p className="mt-2 text-gray-600">검증된 도매상의 중고 컴퓨터를 만나보세요</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="mt-4 text-lg text-gray-600">상품 로딩 중...</p>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-xl text-gray-500 mb-2">아직 등록된 상품이 없습니다</p>
            <p className="text-gray-400">도매상이 상품을 등록하면 여기에 표시됩니다</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="bg-white rounded-lg shadow hover:shadow-xl transition-shadow overflow-hidden group"
              >
                <div className="aspect-video bg-gray-200 relative overflow-hidden">
                  {product.imageUrls[0] && !imageErrors.has(product.id) ? (
                    <Image
                      src={product.imageUrls[0]}
                      alt={product.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      unoptimized
                      onError={() => {
                        setImageErrors(prev => new Set(prev).add(product.id));
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  {/* 상태 배지 */}
                  <div className="absolute top-2 left-2">
                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      판매중
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg text-gray-900 line-clamp-1 group-hover:text-primary transition">
                    {product.title}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-2 mt-1 h-10">
                    {product.description}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-bold text-primary">
                        {product.price.toLocaleString()}
                      </span>
                      <span className="text-lg text-gray-600">원</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {product.sellerName}
                    </span>
                    <span className="text-xs text-gray-400">
                      재고 {product.quantity}개
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* 더보기 버튼 */}
        {products.length > 0 && (
          <div className="mt-12 text-center">
            <Link
              href="/products"
              className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition"
            >
              더 많은 상품 보기
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}
      </main>

      {/* 푸터 */}
      <footer className="bg-gray-800 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-400">© 2025 바나나 중고컴퓨터. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

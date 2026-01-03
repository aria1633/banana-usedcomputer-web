// app/business/market/page.tsx
// 도매 마켓 - 모든 도매상의 상품을 볼 수 있는 페이지
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/hooks/use-auth';
import { ProductService } from '@/lib/services/product.service';
import { Product } from '@/types/product';
import { VerificationStatus } from '@/types/user';
import { isAdmin } from '@/lib/utils/auth';

export default function BusinessMarketPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  // 관리자이거나 사업자 인증된 경우 허용
  const isApproved = isAdmin(user) || user?.verificationStatus === VerificationStatus.APPROVED;

  useEffect(() => {
    const loadProducts = async () => {
      if (!user || !isApproved) {
        setLoading(false);
        return;
      }

      try {
        // 도매 마켓: 모든 도매상의 wholesale 상품 조회
        const data = await ProductService.getAllWholesaleProducts();
        setProducts(data);
      } catch (error) {
        console.error('Failed to load products:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [user, isApproved]);

  if (!isApproved) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-lg text-yellow-800 mb-4">사업자 인증이 필요합니다.</p>
          <Link
            href="/business-verification"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            사업자 인증하기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">도매 마켓</h1>
        <p className="text-gray-600 mt-1">다른 도매상들의 상품을 확인하세요</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="text-6xl mb-4">🏪</div>
          <p className="text-xl font-semibold text-gray-700 mb-2">등록된 상품이 없습니다</p>
          <p className="text-gray-500">아직 도매 마켓에 등록된 상품이 없습니다.</p>
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-gray-600">총 {products.length}개의 상품</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => {
              const isMyProduct = product.sellerId === user?.uid;
              return (
                <Link
                  key={product.id}
                  href={`/business/market/${product.id}`}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition"
                >
                  <div className="aspect-video bg-gray-100 relative">
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
                    <div className="absolute top-2 left-2 flex gap-2">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        product.isAvailable ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
                      }`}>
                        {product.isAvailable ? '판매중' : '판매중지'}
                      </span>
                      {isMyProduct && (
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-500 text-white">
                          내 상품
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition">{product.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mt-1 h-10">{product.description}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-lg font-bold text-gray-900">
                        {product.price.toLocaleString()}원
                      </span>
                      <span className="text-sm text-gray-500">재고 {product.quantity}개</span>
                    </div>
                    {/* 판매자 정보 */}
                    <div className="mt-2 pt-2 border-t border-gray-100 text-sm text-gray-500">
                      판매자: {product.sellerName}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

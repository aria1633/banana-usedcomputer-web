// app/(main)/products/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/types/product';
import { ProductService } from '@/lib/services/product.service';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/hooks/use-auth';
import { UserType, VerificationStatus } from '@/types/user';
import { useSearchParams } from 'next/navigation';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category');
  const myProductsParam = searchParams.get('myProducts');

  useEffect(() => {
    const unsubscribe = ProductService.subscribeToProducts((data) => {
      setProducts(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredProducts = products.filter((product) => {
    // 검색어 필터
    const matchesSearch = !searchTerm ||
      product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase());

    // 카테고리 필터
    const matchesCategory = !categoryParam || product.category === categoryParam;

    // 내 상품 필터 (도매상이 본인의 상품만 보기)
    const matchesMyProducts = !myProductsParam ||
      (user?.uid && product.sellerId === user.uid);

    return matchesSearch && matchesCategory && matchesMyProducts;
  });

  const canCreateProduct = user?.userType === UserType.WHOLESALER &&
                           user?.verificationStatus === VerificationStatus.APPROVED;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {myProductsParam
              ? '내 상품 관리'
              : categoryParam
              ? `${categoryParam} 상품`
              : '중고 컴퓨터 상품 목록'}
          </h1>
          <p className="mt-2 text-gray-600">
            {myProductsParam
              ? '등록한 상품을 수정하거나 삭제할 수 있습니다'
              : categoryParam
              ? `검증된 도매상의 ${categoryParam}`
              : '검증된 도매상의 중고 컴퓨터'}
          </p>
        </div>
        {canCreateProduct && (
          <Link
            href="/products/new"
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition"
          >
            + 상품 등록
          </Link>
        )}
      </div>

      {/* 검색 바 */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="상품명 또는 설명으로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="mt-4 text-lg text-gray-600">상품 로딩 중...</p>
          </div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">
            {searchTerm ? '검색 결과가 없습니다.' : '등록된 상품이 없습니다.'}
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-gray-600">
            총 {filteredProducts.length}개의 상품
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
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
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
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
        </>
      )}
    </div>
  );
}

// app/consumer/products/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { Product } from '@/types/product';
import { ProductService } from '@/lib/services/product.service';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { UserType, VerificationStatus } from '@/types/user';

function ProductsContent() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category');
  const searchParam = searchParams.get('search');

  // 도매상이고 인증된 경우에만 상품 등록 가능
  const canRegisterProduct = user?.userType === UserType.WHOLESALER &&
                             user?.verificationStatus === VerificationStatus.APPROVED;

  useEffect(() => {
    if (searchParam) {
      setSearchTerm(searchParam);
    }
  }, [searchParam]);

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        // 일반 사용자 커뮤니티: 소매(retail) 상품만 표시
        // 도매 상품은 도매상 커뮤니티에서만 볼 수 있음
        let data: Product[];
        if (searchParam) {
          // 검색 결과에서도 소매 상품만 필터링
          const allResults = await ProductService.searchProducts(searchParam);
          data = allResults.filter(p => p.channel === 'retail');
        } else {
          data = await ProductService.getAllRetailProducts();
        }
        setProducts(data);
      } catch (error) {
        console.error('Failed to load products:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [searchParam]);

  const filteredProducts = products.filter((product) => {
    const matchesCategory = !categoryParam || product.category === categoryParam;
    const matchesSearch = !searchTerm ||
      product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 헤더 */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {categoryParam ? `${categoryParam} 상품` : '중고 컴퓨터 상품'}
          </h1>
          <p className="mt-2 text-gray-600">
            검증된 도매상의 중고 컴퓨터를 만나보세요
          </p>
        </div>
        {canRegisterProduct && (
          <Link
            href="/consumer/products/new"
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition font-medium whitespace-nowrap"
          >
            + 소매 상품 등록
          </Link>
        )}
      </div>

      {/* 카테고리 필터 */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <Link
          href="/consumer/products"
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
            !categoryParam
              ? 'bg-amber-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          전체
        </Link>
        {['노트북', '데스크탑', '모니터', '스마트폰', '부품'].map((cat) => (
          <Link
            key={cat}
            href={`/consumer/products?category=${cat}`}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
              categoryParam === cat
                ? 'bg-amber-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat}
          </Link>
        ))}
      </div>

      {/* 검색 바 */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="상품명 또는 설명으로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-amber-500"></div>
            <p className="mt-4 text-lg text-gray-600">상품 로딩 중...</p>
          </div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-gray-500">
            {searchTerm ? '검색 결과가 없습니다.' : '등록된 상품이 없습니다.'}
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-gray-600">
            총 {filteredProducts.length}개의 상품
          </div>

          {/* 데스크탑 그리드 뷰 */}
          <div className="hidden lg:grid lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <Link
                key={product.id}
                href={`/consumer/products/${product.id}`}
                className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all overflow-hidden group border border-gray-100"
              >
                <div className="aspect-video bg-gray-100 relative overflow-hidden">
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
                  <div className="absolute top-2 left-2">
                    <span className="bg-green-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                      판매중
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg text-gray-900 line-clamp-1 group-hover:text-amber-600 transition">
                    {product.title}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-2 mt-1 h-10">
                    {product.description}
                  </p>
                  <div className="mt-4">
                    <span className="text-2xl font-bold text-amber-600">
                      {product.price.toLocaleString()}
                    </span>
                    <span className="text-lg text-gray-600">원</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-sm text-gray-500">{product.sellerName}</span>
                    <span className="text-xs text-gray-400">재고 {product.quantity}개</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* 모바일 리스트 뷰 */}
          <div className="lg:hidden flex flex-col gap-3">
            {filteredProducts.map((product) => (
              <Link
                key={product.id}
                href={`/consumer/products/${product.id}`}
                className="bg-white rounded-xl shadow-sm active:scale-[0.98] transition-transform overflow-hidden border border-gray-100"
              >
                <div className="flex gap-3 p-3">
                  <div className="relative w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                    {product.imageUrls[0] && !imageErrors.has(product.id) ? (
                      <Image
                        src={product.imageUrls[0]}
                        alt={product.title}
                        fill
                        className="object-cover"
                        unoptimized
                        onError={() => {
                          setImageErrors(prev => new Set(prev).add(product.id));
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                    <div>
                      <h3 className="font-bold text-base text-gray-900 line-clamp-1">{product.title}</h3>
                      <p className="text-xs text-gray-600 line-clamp-2 mt-1">{product.description}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-amber-600">
                        {product.price.toLocaleString()}원
                      </span>
                      <span className="text-xs text-gray-500">재고 {product.quantity}</span>
                    </div>
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

export default function ConsumerProductsPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-64 mb-8"></div>
          <div className="grid grid-cols-4 gap-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-gray-200 rounded-xl h-64"></div>
            ))}
          </div>
        </div>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}

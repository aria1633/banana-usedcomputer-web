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
import { isAdmin } from '@/lib/utils/auth';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
  const isAdminUser = isAdmin(user);

  // 디버깅: 관리자 권한 확인
  useEffect(() => {
    console.log('[ProductsPage] User info:', {
      hasUser: !!user,
      userType: user?.userType,
      isAdminUser,
      UserTypeADMIN: UserType.ADMIN
    });
  }, [user, isAdminUser]);

  const handleDelete = async (productId: string, e: any) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('이 상품을 삭제하시겠습니까?')) {
      return;
    }

    setDeletingId(productId);
    try {
      await ProductService.deleteProduct(productId);
      setProducts(prev => prev.filter(p => p.id !== productId));
      alert('삭제되었습니다.');
    } catch (error) {
      console.error('Delete error:', error);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      {/* 헤더 섹션 */}
      <div className="mb-6 lg:mb-8">
        {/* 데스크탑 헤더 */}
        <div className="hidden lg:flex items-center justify-between">
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

        {/* 모바일 헤더 */}
        <div className="lg:hidden">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-gray-900">
              {myProductsParam
                ? '내 상품'
                : categoryParam
                ? categoryParam
                : '상품 목록'}
            </h1>
            {canCreateProduct && (
              <Link
                href="/products/new"
                className="px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 transition active:scale-95"
              >
                + 등록
              </Link>
            )}
          </div>
          <p className="text-sm text-gray-600">
            {myProductsParam
              ? '등록한 상품 관리'
              : categoryParam
              ? `검증된 ${categoryParam}`
              : '검증된 도매상의 중고'}
          </p>
        </div>
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

          {/* 데스크탑 그리드 뷰 */}
          <div className="hidden lg:grid lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div key={product.id} className="relative">
                <Link
                  href={`/products/${product.id}`}
                  className="block bg-white rounded-lg shadow hover:shadow-xl transition-shadow overflow-hidden group"
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
                    {isAdminUser && (
                      <div className="absolute top-2 right-2">
                        <button
                          onClick={(e) => handleDelete(product.id, e)}
                          disabled={deletingId === product.id}
                          className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                          title="삭제"
                        >
                          {deletingId === product.id ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
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
              </div>
            ))}
          </div>

          {/* 모바일 리스트 뷰 */}
          <div className="lg:hidden flex flex-col gap-3">
            {filteredProducts.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="bg-white rounded-xl shadow-soft active:scale-[0.98] transition-transform overflow-hidden relative"
              >
                <div className="flex gap-3 p-3">
                  {/* 이미지 */}
                  <div className="relative w-24 h-24 flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden">
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

                  {/* 정보 */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                    <div>
                      <h3 className="font-bold text-base text-gray-900 line-clamp-1 mb-1">
                        {product.title}
                      </h3>
                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed mb-2">
                        {product.description}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-baseline gap-1 mb-2">
                        <span className="text-xl font-extrabold text-gradient">
                          {product.price.toLocaleString()}
                        </span>
                        <span className="text-sm font-medium text-gray-600">원</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-700 truncate">
                          {product.sellerName}
                        </span>
                        <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
                          재고 {product.quantity}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 관리자 삭제 버튼 (모바일) */}
                {isAdminUser && (
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={(e) => handleDelete(product.id, e)}
                      disabled={deletingId === product.id}
                      className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed z-10"
                      title="삭제"
                    >
                      {deletingId === product.id ? (
                        <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

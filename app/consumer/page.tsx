// app/consumer/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/types/product';
import { ProductService } from '@/lib/services/product.service';
import { UserService } from '@/lib/services/user.service';
import Link from 'next/link';
import Image from 'next/image';
import { Banner } from '@/components/layout/banner';
import { VerificationStatusAlert } from '@/components/verification-status-alert';
import { useAuth } from '@/lib/hooks/use-auth';

export default function ConsumerHomePage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [sellerNames, setSellerNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const handleProductsUpdate = async (data: Product[]) => {
      setProducts(data);
      setLoading(false);

      // 판매자 정보 가져오기
      const sellerIds = [...new Set(data.map(p => p.sellerId))];
      const names: Record<string, string> = {};

      await Promise.all(
        sellerIds.map(async (sellerId) => {
          try {
            const seller = await UserService.getUserByUid(sellerId);
            if (seller) {
              names[sellerId] = seller.name;
            }
          } catch (error) {
            console.error(`Failed to fetch seller ${sellerId}:`, error);
          }
        })
      );

      setSellerNames(names);
    };

    // 소매 상품만 구독 (도매 상품은 도매상 전용 마켓에서만 표시)
    const unsubscribe = ProductService.subscribeToProducts(handleProductsUpdate, undefined, 'retail');
    return () => unsubscribe();
  }, []);

  return (
    <>
      <Banner />

      {/* 히어로 섹션 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 relative overflow-hidden rounded-2xl px-4 sm:px-6 lg:px-8 py-6 md:py-8 border border-amber-100">
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-gray-900 mb-3">
              중고 컴퓨터,
              <span className="text-amber-600 block mt-1">최고가로 판매하세요</span>
            </h1>
            <p className="text-sm md:text-base text-gray-700 mb-4 max-w-2xl mx-auto">
              검증된 도매상들이 경쟁적으로 가격을 제시하는 역경매 시스템
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link
                href="/consumer/sell-requests/new"
                className="px-6 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-all hover:shadow-lg"
              >
                내 컴퓨터 팔기
              </Link>
              <Link
                href="/consumer/products"
                className="px-6 py-3 bg-white text-gray-900 rounded-xl font-bold hover:shadow-lg transition-all border-2 border-gray-200"
              >
                상품 둘러보기
              </Link>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* 사업자 인증 상태 알림 */}
        {user && <VerificationStatusAlert user={user} />}

        <div className="mb-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">최신 등록 상품</h2>
          <p className="text-base text-gray-600">검증된 도매상의 중고 컴퓨터를 만나보세요</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-amber-500"></div>
              <p className="mt-6 text-xl text-gray-600 font-medium">상품 로딩 중...</p>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="text-8xl mb-6">📦</div>
            <p className="text-2xl font-semibold text-gray-700 mb-2">아직 등록된 상품이 없습니다</p>
            <p className="text-gray-500">도매상이 상품을 등록하면 여기에 표시됩니다</p>
          </div>
        ) : (
          <>
            {/* 데스크탑 그리드 뷰 */}
            <div className="hidden lg:grid lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`/consumer/products/${product.id}`}
                  className="bg-white rounded-2xl shadow-sm hover:shadow-lg overflow-hidden group border border-gray-100 transition-all"
                >
                  <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
                    {product.imageUrls[0] && !imageErrors.has(product.id) ? (
                      <Image
                        src={product.imageUrls[0]}
                        alt={product.title}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                        unoptimized
                        onError={() => {
                          setImageErrors(prev => new Set(prev).add(product.id));
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <span className="bg-green-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                        판매중
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-lg text-gray-900 line-clamp-1 group-hover:text-amber-600 transition-colors">
                      {product.title}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mt-2 h-10 leading-relaxed">
                      {product.description}
                    </p>
                    <div className="mt-5 flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-amber-600">
                        {product.price.toLocaleString()}
                      </span>
                      <span className="text-lg font-medium text-gray-600">원</span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                          <span className="text-xs">🏪</span>
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {sellerNames[product.sellerId] || product.sellerName}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        재고 {product.quantity}개
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* 모바일 리스트 뷰 */}
            <div className="lg:hidden flex flex-col gap-4">
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`/consumer/products/${product.id}`}
                  className="bg-white rounded-xl shadow-sm active:scale-[0.98] transition-transform overflow-hidden border border-gray-100"
                >
                  <div className="flex gap-4 p-3">
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
                      <div className="absolute top-1 left-1">
                        <span className="bg-green-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                          판매중
                        </span>
                      </div>
                    </div>

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
                          <span className="text-xl font-extrabold text-amber-600">
                            {product.price.toLocaleString()}
                          </span>
                          <span className="text-sm font-medium text-gray-600">원</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center">
                              <span className="text-[10px]">🏪</span>
                            </div>
                            <span className="text-xs font-medium text-gray-700 truncate max-w-[120px]">
                              {sellerNames[product.sellerId] || product.sellerName}
                            </span>
                          </div>
                          <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
                            재고 {product.quantity}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* 더보기 버튼 */}
        {products.length > 0 && (
          <div className="mt-10 text-center">
            <Link
              href="/consumer/products"
              className="inline-flex items-center gap-3 px-8 py-4 bg-white border-2 border-gray-200 rounded-xl text-gray-900 font-semibold hover:shadow-lg transition-all hover:border-amber-300"
            >
              더 많은 상품 보기
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}
      </main>

      {/* 푸터 */}
      <footer className="bg-gray-900 text-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-2xl font-bold mb-4">🍌 바나나 중고컴퓨터</h3>
              <p className="text-gray-400 leading-relaxed mb-4">
                검증된 도매상과 일반 사용자를 연결하는 중고 컴퓨터 역경매 플랫폼
              </p>
              <div className="text-gray-400 text-sm space-y-1">
                <p>대표: 김영남</p>
                <p>사업자등록번호: 296-08-00820</p>
                <p>통신판매업신고: 2021-서울구로-1261</p>
                <p className="text-xs leading-relaxed">주소: 서울특별시 도봉구 쌍문동 삼양로 572, 1층</p>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">서비스</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/consumer/products" className="hover:text-white transition">상품 구매</Link></li>
                <li><Link href="/consumer/sell-requests/new" className="hover:text-white transition">매입 요청</Link></li>
                <li><Link href="/signup" className="hover:text-white transition">도매상 등록</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">고객센터</h4>
              <ul className="space-y-2 text-gray-400">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <a href="tel:010-6442-6375" className="hover:text-white transition">010-6442-6375</a>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href="mailto:mrcompany4717@gmail.com" className="hover:text-white transition text-sm">mrcompany4717@gmail.com</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-8 text-center">
            <p className="text-gray-500 text-sm">© 2025 바나나 중고컴퓨터. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  );
}

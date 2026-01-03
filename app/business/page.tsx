// app/business/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/use-auth';
import { VerificationStatus } from '@/types/user';
import { SellRequestService } from '@/lib/services/sell-request.service';
import { ProductService } from '@/lib/services/product.service';
import { SellRequest } from '@/types/sell-request';
import { Product } from '@/types/product';
import { isAdmin } from '@/lib/utils/auth';

export default function BusinessHomePage() {
  const { user } = useAuth();
  const [sellRequests, setSellRequests] = useState<SellRequest[]>([]);
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // 관리자이거나 사업자 인증된 경우 허용
  const isApproved = isAdmin(user) || user?.verificationStatus === VerificationStatus.APPROVED;
  const isPending = user?.verificationStatus === VerificationStatus.PENDING;

  useEffect(() => {
    const loadData = async () => {
      if (!user || !isApproved) {
        setLoading(false);
        return;
      }

      try {
        const [requests, products] = await Promise.all([
          SellRequestService.getAllSellRequests(),
          ProductService.getProductsBySeller(user.uid),
        ]);
        setSellRequests(requests.slice(0, 5));
        setMyProducts(products.slice(0, 5));
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, isApproved]);

  // 인증 대기 중
  if (isPending) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold text-yellow-800 mb-3">사업자 인증 심사 중</h2>
          <p className="text-yellow-700 mb-6">
            제출하신 사업자등록증을 검토 중입니다.<br />
            승인이 완료되면 모든 기능을 이용하실 수 있습니다.
          </p>
          <Link href="/mypage" className="text-blue-600 hover:underline">
            마이페이지에서 상태 확인하기 →
          </Link>
        </div>
      </div>
    );
  }

  // 인증 필요
  if (!isApproved) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-2xl font-bold text-blue-800 mb-3">사업자 인증이 필요합니다</h2>
          <p className="text-blue-700 mb-6">
            도매상으로 활동하시려면 사업자등록증을 제출해주세요.<br />
            인증 완료 후 상품 등록 및 입찰이 가능합니다.
          </p>
          <Link
            href="/business-verification"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            사업자 인증하기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 환영 메시지 */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white mb-8">
        <h1 className="text-3xl font-bold mb-2">안녕하세요, {user?.name}님!</h1>
        <p className="text-blue-100">도매 셀러 대시보드에 오신 것을 환영합니다.</p>
      </div>

      {/* 퀵 액션 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link
          href="/business/products/new"
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition group"
        >
          <div className="text-4xl mb-3">📦</div>
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition">상품 등록</h3>
          <p className="text-sm text-gray-600 mt-1">새로운 상품을 등록하세요</p>
        </Link>

        <Link
          href="/business/market"
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition group"
        >
          <div className="text-4xl mb-3">🏪</div>
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition">도매 마켓</h3>
          <p className="text-sm text-gray-600 mt-1">다른 도매상 상품 보기</p>
        </Link>

        <Link
          href="/business/sell-requests"
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition group"
        >
          <div className="text-4xl mb-3">🔍</div>
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition">매입 요청 확인</h3>
          <p className="text-sm text-gray-600 mt-1">새로운 매입 요청에 입찰하세요</p>
        </Link>

        <Link
          href="/business/products"
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition group"
        >
          <div className="text-4xl mb-3">📋</div>
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition">내 상품 관리</h3>
          <p className="text-sm text-gray-600 mt-1">등록한 상품을 관리하세요</p>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 최신 매입 요청 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">최신 매입 요청</h2>
              <Link href="/business/sell-requests" className="text-sm text-blue-600 hover:underline">
                전체보기 →
              </Link>
            </div>
            {sellRequests.length === 0 ? (
              <p className="text-gray-500 py-4 text-center">아직 매입 요청이 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {sellRequests.map((request) => (
                  <Link
                    key={request.id}
                    href={`/business/sell-requests/${request.id}`}
                    className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900 line-clamp-1">{request.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">{request.sellerName}</p>
                      </div>
                      {request.desiredPrice && (
                        <span className="text-sm font-semibold text-blue-600">{request.desiredPrice}</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 내 상품 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">내 상품</h2>
              <Link href="/business/products" className="text-sm text-blue-600 hover:underline">
                전체보기 →
              </Link>
            </div>
            {myProducts.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500 mb-4">아직 등록한 상품이 없습니다.</p>
                <Link
                  href="/business/products/new"
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
                >
                  첫 상품 등록하기
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {myProducts.map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.id}`}
                    className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900 line-clamp-1">{product.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">재고 {product.quantity}개</p>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {product.price.toLocaleString()}원
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

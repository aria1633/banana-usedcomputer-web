// app/(main)/wholesaler/dashboard/page.tsx
'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import { UserType, VerificationStatus } from '@/types/user';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProductService } from '@/lib/services/product.service';
import { SellRequestService } from '@/lib/services/sell-request.service';
import { getAccessToken } from '@/lib/utils/auth';

export default function WholesalerDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [productCount, setProductCount] = useState<number>(0);
  const [sellRequestCount, setSellRequestCount] = useState<number>(0);
  const [wonOffersCount, setWonOffersCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      if (user.userType !== UserType.WHOLESALER) {
        router.push('/');
      } else if (user.verificationStatus !== VerificationStatus.APPROVED) {
        router.push('/business-verification');
      }
    }
  }, [user, router]);

  useEffect(() => {
    const fetchCounts = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        console.log('도매상 대시보드: 카운트 조회 시작', user.uid);
        const accessToken = getAccessToken();

        const [products, sellRequests, wonOffers] = await Promise.all([
          ProductService.getProductCountBySeller(user.uid),
          SellRequestService.getOpenSellRequestCount(accessToken || undefined),
          SellRequestService.getWonOffersCount(user.uid, accessToken || undefined),
        ]);

        console.log('도매상 대시보드: 카운트 조회 완료', { products, sellRequests, wonOffers });

        setProductCount(products);
        setSellRequestCount(sellRequests);
        setWonOffersCount(wonOffers);
      } catch (error) {
        console.error('카운트 조회 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchCounts();
    }
  }, [user?.uid, authLoading]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-lg text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user || user.userType !== UserType.WHOLESALER || user.verificationStatus !== VerificationStatus.APPROVED) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">도매상 대시보드</h1>
        <p className="mt-2 text-gray-600">상품 및 매입 요청 관리</p>
      </div>

      {/* 낙찰 알림 배너 */}
      {wonOffersCount > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-green-50 border-l-4 border-green-500 p-4 rounded-lg shadow-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-green-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-semibold text-green-800">
                축하합니다! 낙찰받은 제안이 {wonOffersCount}건 있습니다
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  사용자가 회원님의 매입 제안을 승인했습니다. 판매자와 연락하여 거래를 진행하세요.
                </p>
              </div>
              <div className="mt-3">
                <Link
                  href="/wholesaler/won-bids"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition"
                >
                  낙찰 내역 확인하기 →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 내 상품 수 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">등록한 상품</p>
              {loading ? (
                <div className="mt-2 h-9 flex items-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                <p className="text-3xl font-bold text-primary mt-2">{productCount}</p>
              )}
            </div>
            <div className="bg-primary/10 p-3 rounded-full">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
          <Link
            href="/products"
            className="mt-4 block text-sm text-primary hover:underline"
          >
            상품 관리 →
          </Link>
        </div>

        {/* 낙찰받은 제안 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">낙찰받은 제안</p>
              {loading ? (
                <div className="mt-2 h-9 flex items-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <p className="text-3xl font-bold text-blue-600 mt-2">{wonOffersCount}</p>
              )}
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <Link
            href="/wholesaler/won-bids"
            className="mt-4 block text-sm text-primary hover:underline"
          >
            낙찰 내역 보기 →
          </Link>
        </div>

        {/* 매입 요청 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">진행 중인 매입 요청</p>
              {loading ? (
                <div className="mt-2 h-9 flex items-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                </div>
              ) : (
                <p className="text-3xl font-bold text-gray-900 mt-2">{sellRequestCount}</p>
              )}
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <Link
            href="/sell-requests"
            className="mt-4 block text-sm text-primary hover:underline"
          >
            매입 요청 보기 →
          </Link>
        </div>
      </div>

      {/* 빠른 작업 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">빠른 작업</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/products/new"
              className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition"
            >
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">새 상품 등록</h3>
                <p className="text-sm text-gray-600">중고 컴퓨터 상품 등록</p>
              </div>
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </Link>

            <Link
              href="/sell-requests"
              className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition"
            >
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">매입 요청 확인</h3>
                <p className="text-sm text-gray-600">새로운 매입 요청 보기</p>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              href="/products"
              className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition"
            >
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">내 상품 관리</h3>
                <p className="text-sm text-gray-600">등록한 상품 수정/삭제</p>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

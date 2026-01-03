// app/business/bids/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/hooks/use-auth';
import { SellRequestService } from '@/lib/services/sell-request.service';
import { PurchaseOffer } from '@/types/purchase-offer';
import { SellRequest } from '@/types/sell-request';
import { VerificationStatus } from '@/types/user';
import { supabase } from '@/lib/supabase/config';
import { isAdmin } from '@/lib/utils/auth';

type OfferWithRequest = PurchaseOffer & { sellRequest: SellRequest };

export default function BusinessBidsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'pending' | 'won'>('pending');
  const [pendingOffers, setPendingOffers] = useState<OfferWithRequest[]>([]);
  const [wonOffers, setWonOffers] = useState<OfferWithRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  // 관리자이거나 사업자 인증된 경우 허용
  const isApproved = isAdmin(user) || user?.verificationStatus === VerificationStatus.APPROVED;

  useEffect(() => {
    const loadOffers = async () => {
      if (!user || !isApproved) {
        setLoading(false);
        return;
      }

      try {
        // 낙찰받은 입찰 조회
        const won = await SellRequestService.getWonOffers(user.uid);
        setWonOffers(won);

        // 진행 중인 입찰 조회 (isSelected = false)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        const response = await fetch(
          `${supabaseUrl}/rest/v1/purchase_offers?wholesaler_id=eq.${user.uid}&is_selected=eq.false&order=created_at.desc`,
          {
            method: 'GET',
            headers: {
              'apikey': supabaseKey,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const offers = await response.json();

          // 각 제안에 대한 매입 요청 정보 조회
          const pendingWithRequests = await Promise.all(
            offers.map(async (offer: Record<string, unknown>) => {
              const sellRequest = await SellRequestService.getSellRequest(offer.sell_request_id as string);
              return {
                id: offer.id as string,
                sellRequestId: offer.sell_request_id as string,
                wholesalerId: offer.wholesaler_id as string,
                wholesalerName: offer.wholesaler_name as string,
                offerPrice: offer.offer_price as number,
                message: (offer.message as string) ?? null,
                isSelected: offer.is_selected as boolean,
                createdAt: new Date(offer.created_at as string),
                updatedAt: offer.updated_at ? new Date(offer.updated_at as string) : null,
                sellRequest: sellRequest!,
              };
            })
          );

          // 매입 요청이 아직 open 상태인 것만 필터링
          const activePending = pendingWithRequests.filter(
            (offer) => offer.sellRequest && offer.sellRequest.status === 'open'
          );

          setPendingOffers(activePending);
        }
      } catch (error) {
        console.error('Failed to load offers:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOffers();
  }, [user, isApproved]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString() + '원';
  };

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
        <h1 className="text-2xl font-bold text-gray-900">입찰 관리</h1>
        <p className="text-gray-600 mt-1">내가 참여한 입찰 현황을 확인하세요</p>
      </div>

      {/* 탭 */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('pending')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
              activeTab === 'pending'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            진행 중인 입찰
            {pendingOffers.length > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-600 py-0.5 px-2 rounded-full text-xs">
                {pendingOffers.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('won')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
              activeTab === 'won'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            낙찰된 입찰
            {wonOffers.length > 0 && (
              <span className="ml-2 bg-green-100 text-green-600 py-0.5 px-2 rounded-full text-xs">
                {wonOffers.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600"></div>
        </div>
      ) : activeTab === 'pending' ? (
        // 진행 중인 입찰
        pendingOffers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-xl font-semibold text-gray-700 mb-2">진행 중인 입찰이 없습니다</p>
            <p className="text-gray-500 mb-6">새로운 매입 요청에 입찰해보세요!</p>
            <Link
              href="/business/sell-requests"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
            >
              매입 요청 보러가기
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingOffers.map((offer) => (
              <div
                key={offer.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition"
              >
                <div className="flex flex-col md:flex-row">
                  {/* 이미지 */}
                  <div className="md:w-48 h-48 md:h-auto bg-gray-100 relative flex-shrink-0">
                    {offer.sellRequest?.imageUrls?.[0] && !imageErrors.has(offer.id) ? (
                      <Image
                        src={offer.sellRequest.imageUrls[0]}
                        alt={offer.sellRequest.title}
                        fill
                        className="object-cover"
                        unoptimized
                        onError={() => {
                          setImageErrors(prev => new Set(prev).add(offer.id));
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* 내용 */}
                  <div className="flex-1 p-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                            대기 중
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatDate(offer.createdAt)}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {offer.sellRequest?.title || '제목 없음'}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {offer.sellRequest?.description || '설명 없음'}
                        </p>
                        {offer.message && (
                          <p className="mt-2 text-sm text-gray-500 italic">
                            내 메시지: &quot;{offer.message}&quot;
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="text-sm text-gray-500 mb-1">내 제시가</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatPrice(offer.offerPrice)}
                        </p>
                        {offer.sellRequest?.desiredPrice && (
                          <p className="text-sm text-gray-500 mt-1">
                            희망가: {offer.sellRequest.desiredPrice}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <Link
                        href={`/business/sell-requests/${offer.sellRequestId}`}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                      >
                        상세 보기
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        // 낙찰된 입찰
        wonOffers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="text-6xl mb-4">🏆</div>
            <p className="text-xl font-semibold text-gray-700 mb-2">낙찰된 입찰이 없습니다</p>
            <p className="text-gray-500">매입 요청에 적극적으로 입찰해보세요!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {wonOffers.map((offer) => (
              <div
                key={offer.id}
                className="bg-white rounded-xl shadow-sm border border-green-200 overflow-hidden hover:shadow-md transition"
              >
                <div className="flex flex-col md:flex-row">
                  {/* 이미지 */}
                  <div className="md:w-48 h-48 md:h-auto bg-gray-100 relative flex-shrink-0">
                    {offer.sellRequest?.imageUrls?.[0] && !imageErrors.has(offer.id) ? (
                      <Image
                        src={offer.sellRequest.imageUrls[0]}
                        alt={offer.sellRequest.title}
                        fill
                        className="object-cover"
                        unoptimized
                        onError={() => {
                          setImageErrors(prev => new Set(prev).add(offer.id));
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
                      <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded shadow">
                        낙찰
                      </span>
                    </div>
                  </div>

                  {/* 내용 */}
                  <div className="flex-1 p-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                            낙찰 완료
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatDate(offer.createdAt)}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {offer.sellRequest?.title || '제목 없음'}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {offer.sellRequest?.description || '설명 없음'}
                        </p>
                        <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>판매자: {offer.sellRequest?.sellerName}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm text-gray-500 mb-1">낙찰가</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatPrice(offer.offerPrice)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                      <Link
                        href={`/business/sell-requests/${offer.sellRequestId}`}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                      >
                        상세 보기
                      </Link>
                      <Link
                        href={`/transactions/${offer.sellRequestId}`}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
                      >
                        거래 진행
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* 안내 사항 */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">입찰 안내</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• 진행 중인 입찰: 아직 판매자가 선택하지 않은 입찰입니다.</li>
          <li>• 낙찰된 입찰: 판매자가 선택하여 거래가 확정된 입찰입니다.</li>
          <li>• 낙찰 후에는 판매자와 연락하여 거래를 진행해주세요.</li>
          <li>• 블라인드 입찰로 다른 도매상의 제시가는 볼 수 없습니다.</li>
        </ul>
      </div>
    </div>
  );
}

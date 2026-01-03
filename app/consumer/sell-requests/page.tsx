// app/consumer/sell-requests/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { SellRequest, SellRequestStatus, SellRequestCategory } from '@/types/sell-request';
import { PurchaseOffer } from '@/types/purchase-offer';
import { SellRequestService } from '@/lib/services/sell-request.service';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/hooks/use-auth';
import { UserType, VerificationStatus } from '@/types/user';
import { getAccessToken, isAdmin } from '@/lib/utils/auth';

// 낙찰 정보를 포함한 매입 요청 타입
interface SellRequestWithOffer extends SellRequest {
  selectedOffer?: PurchaseOffer;
}

type StatusFilter = 'all' | 'open' | 'closed';

export default function ConsumerSellRequestsPage() {
  const [sellRequests, setSellRequests] = useState<SellRequestWithOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<SellRequestCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    const fetchSellRequests = async () => {
      // 로그인 확인이 완료될 때까지 대기
      if (authLoading) return;

      try {
        console.log('[ConsumerSellRequestsPage] Fetching sell requests...');
        const accessToken = getAccessToken();

        let data: SellRequest[];

        // 로그인한 사용자는 자신의 매입 요청만 조회
        if (user) {
          data = await SellRequestService.getMySellRequests(user.uid, accessToken || undefined);
          console.log('[ConsumerSellRequestsPage] Fetched my requests:', data.length);

          // 낙찰된 요청(CLOSED)에 대해 낙찰 정보 조회
          const requestsWithOffers: SellRequestWithOffer[] = await Promise.all(
            data.map(async (request) => {
              if (request.status === SellRequestStatus.CLOSED && request.selectedWholesalerId) {
                try {
                  const offers = await SellRequestService.getOffers(request.id, accessToken || undefined);
                  const selectedOffer = offers.find(o => o.isSelected);
                  return { ...request, selectedOffer };
                } catch (e) {
                  console.error('[ConsumerSellRequestsPage] Failed to fetch offer:', e);
                  return request;
                }
              }
              return request;
            })
          );
          setSellRequests(requestsWithOffers);
        } else {
          // 비로그인 사용자는 진행 중인 전체 요청 조회 (브라우징용)
          data = await SellRequestService.getAllSellRequests(accessToken || undefined);
          console.log('[ConsumerSellRequestsPage] Fetched all open requests:', data.length);
          setSellRequests(data);
        }
      } catch (error) {
        console.error('[ConsumerSellRequestsPage] Fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSellRequests();
  }, [user, authLoading]);

  const canCreateRequest = user?.userType === UserType.NORMAL;
  const isAdminUser = isAdmin(user);

  const handleDelete = async (requestId: string, e: any) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('이 매입 요청을 삭제하시겠습니까?')) {
      return;
    }

    setDeletingId(requestId);
    try {
      const accessToken = getAccessToken();
      if (!accessToken) {
        alert('로그인이 필요합니다.');
        return;
      }

      await SellRequestService.deleteSellRequest(requestId, accessToken);
      setSellRequests(prev => prev.filter(r => r.id !== requestId));
      alert('삭제되었습니다.');
    } catch (error) {
      console.error('Delete error:', error);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  // 상태별 필터링 (로그인 사용자만)
  const getStatusFilteredRequests = () => {
    if (!user) return sellRequests; // 비로그인은 전체 (OPEN만 가져옴)

    switch (statusFilter) {
      case 'open':
        return sellRequests.filter(r => r.status === SellRequestStatus.OPEN);
      case 'closed':
        return sellRequests.filter(r => r.status === SellRequestStatus.CLOSED);
      default:
        return sellRequests;
    }
  };

  // 카테고리 필터링
  const filteredSellRequests = selectedCategory === 'all'
    ? getStatusFilteredRequests()
    : getStatusFilteredRequests().filter(request => request.category === selectedCategory);

  // 상태별 개수
  const openCount = sellRequests.filter(r => r.status === SellRequestStatus.OPEN).length;
  const closedCount = sellRequests.filter(r => r.status === SellRequestStatus.CLOSED).length;

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-lg text-gray-600">매입 요청 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {user ? '내 매입 요청' : '매입 요청 둘러보기'}
          </h1>
          <p className="mt-2 text-gray-600">
            {user
              ? '내가 등록한 매입 요청의 진행 상황과 낙찰 결과를 확인하세요'
              : '중고 컴퓨터를 팔고 싶으신가요? 여러 도매상이 경쟁적으로 가격을 제시합니다'}
          </p>
        </div>
        {canCreateRequest && (
          <Link
            href="/consumer/sell-requests/new"
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition"
          >
            + 매입 요청 등록
          </Link>
        )}
      </div>

      {/* 상태 필터 탭 (로그인 사용자만) */}
      {user && (
        <div className="mb-6 flex gap-2 border-b border-gray-200 pb-4">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-t-lg font-medium transition ${
              statusFilter === 'all'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            전체 ({sellRequests.length})
          </button>
          <button
            onClick={() => setStatusFilter('open')}
            className={`px-4 py-2 rounded-t-lg font-medium transition ${
              statusFilter === 'open'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            진행중 ({openCount})
          </button>
          <button
            onClick={() => setStatusFilter('closed')}
            className={`px-4 py-2 rounded-t-lg font-medium transition ${
              statusFilter === 'closed'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            낙찰완료 ({closedCount})
          </button>
        </div>
      )}

      {/* 안내 배너 */}
      {!user && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">로그인이 필요합니다</h3>
              <p className="mt-1 text-sm text-blue-700">
                매입 요청을 등록하려면 로그인해주세요.
              </p>
              <div className="mt-2">
                <Link href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                  로그인하기 →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 카테고리 필터 */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-lg transition ${
            selectedCategory === 'all'
              ? 'bg-primary text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          전체
        </button>
        <button
          onClick={() => setSelectedCategory(SellRequestCategory.COMPUTER)}
          className={`px-4 py-2 rounded-lg transition ${
            selectedCategory === SellRequestCategory.COMPUTER
              ? 'bg-primary text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          컴퓨터 관련
        </button>
        <button
          onClick={() => setSelectedCategory(SellRequestCategory.SMARTPHONE)}
          className={`px-4 py-2 rounded-lg transition ${
            selectedCategory === SellRequestCategory.SMARTPHONE
              ? 'bg-primary text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          스마트폰
        </button>
      </div>

      {filteredSellRequests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="text-6xl mb-4">{statusFilter === 'closed' ? '📋' : '💰'}</div>
          <p className="text-xl text-gray-500 mb-2">
            {user
              ? statusFilter === 'closed'
                ? '낙찰 완료된 요청이 없습니다'
                : statusFilter === 'open'
                  ? '진행 중인 매입 요청이 없습니다'
                  : '등록한 매입 요청이 없습니다'
              : '진행 중인 매입 요청이 없습니다'}
          </p>
          <p className="text-gray-400">
            {canCreateRequest
              ? '첫 번째 매입 요청을 등록해보세요!'
              : user
                ? '도매상 입찰을 기다려주세요!'
                : '로그인 후 매입 요청을 등록할 수 있습니다'}
          </p>
          {canCreateRequest && (
            <Link
              href="/consumer/sell-requests/new"
              className="mt-4 inline-block px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition"
            >
              매입 요청 등록하기
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-gray-600">
            총 {filteredSellRequests.length}개의 {user ? (statusFilter === 'closed' ? '낙찰 완료' : statusFilter === 'open' ? '진행 중' : '') : '진행 중'} 요청
            {(selectedCategory !== 'all' || (user && statusFilter !== 'all')) && (
              <span className="ml-2 text-gray-400">
                (전체 {sellRequests.length}개)
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSellRequests.map((request) => (
              <div key={request.id} className="relative">
                <Link
                  href={`/consumer/sell-requests/${request.id}`}
                  className="block bg-white rounded-lg shadow hover:shadow-xl transition-shadow overflow-hidden group"
                >
                  <div className="aspect-video bg-gray-200 relative overflow-hidden">
                    {request.imageUrls[0] && !imageErrors.has(request.id) ? (
                      <Image
                        src={request.imageUrls[0]}
                        alt={request.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized
                        onError={() => {
                          setImageErrors(prev => new Set(prev).add(request.id));
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    {/* 상태 및 카테고리 배지 */}
                    <div className="absolute top-2 left-2 flex gap-2">
                      {request.status === SellRequestStatus.CLOSED ? (
                        <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          낙찰완료
                        </span>
                      ) : (
                        <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                          입찰 진행중
                        </span>
                      )}
                      <span className={`text-white text-xs px-2 py-1 rounded-full ${
                        request.category === SellRequestCategory.SMARTPHONE
                          ? 'bg-purple-500'
                          : 'bg-blue-500'
                      }`}>
                        {request.category === SellRequestCategory.SMARTPHONE ? '스마트폰' : '컴퓨터'}
                      </span>
                    </div>
                    {/* 관리자 삭제 버튼 */}
                    {isAdminUser && (
                      <div className="absolute top-2 right-2">
                        <button
                          onClick={(e) => handleDelete(request.id, e)}
                          disabled={deletingId === request.id}
                          className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                          title="삭제"
                        >
                          {deletingId === request.id ? (
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
                    {request.title}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-2 mt-1 h-10">
                    {request.description}
                  </p>
                  <div className="mt-4">
                    {/* 낙찰 완료 시 낙찰 정보 표시 */}
                    {request.status === SellRequestStatus.CLOSED && request.selectedOffer ? (
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm font-medium text-blue-800">낙찰 정보</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-blue-700">{request.selectedOffer.wholesalerName}</span>
                          <span className="text-lg font-bold text-blue-900">
                            {request.selectedOffer.offerPrice.toLocaleString()}원
                          </span>
                        </div>
                      </div>
                    ) : request.status === SellRequestStatus.CLOSED ? (
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                        <span className="text-sm text-blue-700">낙찰 완료</span>
                      </div>
                    ) : request.desiredPrice ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">희망가:</span>
                        <span className="text-lg font-bold text-gray-900">
                          {request.desiredPrice}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-3 pt-3 border-t flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {user ? '나의 요청' : request.sellerName}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Link>
            </div>
            ))}
          </div>
        </>
      )}

      {/* 역경매 시스템 안내 */}
      <div className="mt-12 bg-gradient-to-r from-primary to-purple-600 rounded-lg p-8 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">역경매 시스템이란?</h2>
          <p className="text-lg mb-6 text-white/90">
            일반 사용자가 중고 컴퓨터를 팔고 싶을 때 매물을 올리면,<br />
            여러 도매상들이 경쟁적으로 <strong>매입 가격을 제시</strong>하는 시스템입니다.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-3xl mb-2">1</div>
              <div className="font-semibold mb-1">매입 요청 등록</div>
              <div className="text-sm text-white/80">판매할 컴퓨터 정보 입력</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-3xl mb-2">2</div>
              <div className="font-semibold mb-1">도매상 입찰</div>
              <div className="text-sm text-white/80">여러 도매상이 가격 제시</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-3xl mb-2">3</div>
              <div className="font-semibold mb-1">도매상 선택</div>
              <div className="text-sm text-white/80">가장 좋은 조건 선택</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

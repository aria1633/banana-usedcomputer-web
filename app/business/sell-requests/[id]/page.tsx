// app/business/sell-requests/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SellRequestService } from '@/lib/services/sell-request.service';
import { SellRequest, SellRequestStatus } from '@/types/sell-request';
import { PurchaseOffer } from '@/types/purchase-offer';
import { useAuth } from '@/lib/hooks/use-auth';
import { VerificationStatus } from '@/types/user';
import Image from 'next/image';
import Link from 'next/link';
import { getAccessToken, isAdmin } from '@/lib/utils/auth';

export default function BusinessSellRequestDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const [sellRequest, setSellRequest] = useState<SellRequest | null>(null);
  const [myOffer, setMyOffer] = useState<PurchaseOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  // 입찰 제안 폼 상태
  const [offerPrice, setOfferPrice] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 관리자이거나 사업자 인증된 경우 허용
  const isApproved = isAdmin(user) || user?.verificationStatus === VerificationStatus.APPROVED;
  const hasAlreadyOffered = !!myOffer;
  const canSubmitOffer = isApproved && sellRequest?.status === SellRequestStatus.OPEN && !hasAlreadyOffered;

  useEffect(() => {
    const fetchSellRequest = async () => {
      try {
        const accessToken = getAccessToken();
        const data = await SellRequestService.getSellRequest(params.id, accessToken || undefined);
        if (!data) {
          setError('매입 요청을 찾을 수 없습니다.');
        } else {
          setSellRequest(data);
        }
      } catch (err: unknown) {
        console.error('매입 요청 조회 실패:', err);
        setError('매입 요청 정보를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchSellRequest();
  }, [params.id]);

  useEffect(() => {
    // 도매상의 입찰 정보 조회
    if (user && isApproved) {
      const fetchMyOffer = async () => {
        try {
          const accessToken = getAccessToken();
          const offers = await SellRequestService.getOffers(params.id, accessToken || undefined);
          const mine = offers.find(offer => offer.wholesalerId === user.uid);
          if (mine) {
            setMyOffer(mine);
          }
        } catch (error) {
          console.error('입찰 정보 조회 실패:', error);
        }
      };

      fetchMyOffer();
    }
  }, [params.id, user, isApproved]);

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !canSubmitOffer) return;

    const price = parseInt(offerPrice);
    if (isNaN(price) || price <= 0) {
      alert('올바른 가격을 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const accessToken = getAccessToken();
      if (!accessToken) {
        throw new Error('세션 정보를 찾을 수 없습니다. 다시 로그인해주세요.');
      }

      await SellRequestService.createOffer({
        sellRequestId: params.id,
        wholesalerId: user.uid,
        wholesalerName: user.name,
        offerPrice: price,
        message: offerMessage || null,
        isSelected: false,
        createdAt: new Date(),
      }, accessToken);

      // 입찰 후 내 입찰 정보 재조회
      const updatedOffers = await SellRequestService.getOffers(params.id, accessToken);
      const mine = updatedOffers.find(offer => offer.wholesalerId === user.uid);
      if (mine) {
        setMyOffer(mine);
      }

      alert('입찰 제안이 제출되었습니다!');
      setOfferPrice('');
      setOfferMessage('');
    } catch (err) {
      console.error('입찰 제안 실패:', err);
      alert('입찰 제안에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-lg text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !sellRequest) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-lg text-red-800 mb-4">{error || '매입 요청을 찾을 수 없습니다.'}</p>
          <button
            onClick={() => router.push('/business/sell-requests')}
            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 뒤로가기 버튼 */}
      <button
        onClick={() => router.push('/business/sell-requests')}
        className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        목록으로
      </button>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 md:p-8">
          {/* 왼쪽: 이미지 섹션 */}
          <div>
            {/* 메인 이미지 */}
            <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden relative mb-4">
              {sellRequest.imageUrls.length > 0 && !imageErrors.has(selectedImageIndex) ? (
                <Image
                  src={sellRequest.imageUrls[selectedImageIndex]}
                  alt={sellRequest.title}
                  fill
                  className="object-cover"
                  priority
                  unoptimized
                  onError={() => {
                    setImageErrors(prev => new Set(prev).add(selectedImageIndex));
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

            {/* 썸네일 이미지 */}
            {sellRequest.imageUrls.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {sellRequest.imageUrls.map((url, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`aspect-square bg-gray-200 rounded-lg overflow-hidden relative border-2 transition ${
                      selectedImageIndex === index
                        ? 'border-blue-600'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    {!imageErrors.has(index) ? (
                      <Image
                        src={url}
                        alt={`${sellRequest.title} ${index + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                        onError={() => {
                          setImageErrors(prev => new Set(prev).add(index));
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-300">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 오른쪽: 매입 요청 정보 */}
          <div className="flex flex-col">
            {/* 상태 배지 */}
            <div className="mb-2">
              <span
                className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${
                  sellRequest.status === SellRequestStatus.OPEN
                    ? 'bg-green-100 text-green-800'
                    : sellRequest.status === SellRequestStatus.CLOSED
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {sellRequest.status === SellRequestStatus.OPEN
                  ? '입찰 진행중'
                  : sellRequest.status === SellRequestStatus.CLOSED
                  ? '거래 완료'
                  : '취소됨'}
              </span>
            </div>

            {/* 제목 */}
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{sellRequest.title}</h1>

            {/* 희망가 */}
            {sellRequest.desiredPrice && (
              <div className="mb-6">
                <p className="text-sm text-gray-500 mb-1">희망 매입가</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-blue-600">
                    {sellRequest.desiredPrice}
                  </span>
                </div>
              </div>
            )}

            {/* 요청자 정보 */}
            <div className="border-t border-b border-gray-200 py-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">요청자</p>
                  <p className="font-semibold text-gray-900">{sellRequest.sellerName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">등록일</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(sellRequest.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* 입찰 제안 폼 또는 입찰 완료 메시지 */}
            {sellRequest.status === SellRequestStatus.OPEN && (
              <>
                {submitting ? (
                  // 입찰 처리 중
                  <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-xl p-6 mb-6 shadow-md">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center">
                          <svg className="w-7 h-7 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-yellow-900 mb-1">입찰 처리 중...</h3>
                        <p className="text-sm text-yellow-700">서버와 동기화하고 있습니다.</p>
                      </div>
                    </div>
                  </div>
                ) : hasAlreadyOffered && myOffer ? (
                  // 이미 입찰한 경우
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-6 mb-6 shadow-md">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="mb-4">
                          <h3 className="text-xl font-bold text-green-900 mb-1">
                            입찰 완료
                          </h3>
                          <p className="text-sm text-green-700">
                            이 매입 요청에 입찰하셨습니다.
                          </p>
                        </div>

                        <div className="bg-white rounded-lg border border-green-200 p-4 shadow-sm">
                          <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">입찰 금액</p>
                              <p className="text-3xl font-bold text-blue-600">{myOffer.offerPrice.toLocaleString()}<span className="text-lg text-gray-600 ml-1">원</span></p>
                            </div>
                            <div className="text-right">
                              <div className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                입찰 완료
                              </div>
                            </div>
                          </div>

                          {myOffer.message && (
                            <div className="mb-3 pb-3 border-b border-gray-200">
                              <p className="text-xs text-gray-500 mb-1">전달 메시지</p>
                              <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{myOffer.message}</p>
                            </div>
                          )}

                          <div>
                            <p className="text-xs text-gray-500">제출일시</p>
                            <p className="text-sm text-gray-700 font-medium">
                              {new Date(myOffer.createdAt).toLocaleString('ko-KR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
                          <div className="flex items-start gap-2">
                            <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-amber-900 mb-1">수정 및 재입찰 불가</p>
                              <p className="text-xs text-amber-800">
                                제출된 입찰은 수정하거나 취소할 수 없습니다.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // 아직 입찰하지 않은 경우
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-gray-900 mb-3">매입 제안하기</h3>
                    <form onSubmit={handleSubmitOffer} className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          제안 금액 (원)
                        </label>
                        <input
                          type="number"
                          value={offerPrice}
                          onChange={(e) => setOfferPrice(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="예: 500000"
                          required
                          disabled={submitting}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          메시지 (선택)
                        </label>
                        <textarea
                          value={offerMessage}
                          onChange={(e) => setOfferMessage(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                          placeholder="추가 메시지를 입력하세요"
                          disabled={submitting}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        {submitting ? '제출 중...' : '제안 제출'}
                      </button>
                      <p className="text-xs text-gray-600 mt-2">
                        한 번 제출한 입찰은 수정 및 취소가 불가능합니다.
                      </p>
                    </form>
                  </div>
                )}
              </>
            )}

            {sellRequest.status === SellRequestStatus.CLOSED && (
              <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 mb-6">
                <p className="text-gray-700 font-medium">이 매입 요청은 이미 거래가 완료되었습니다.</p>
              </div>
            )}

            {/* 안내 사항 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                경쟁력 있는 가격을 제시하여 거래 기회를 얻으세요.
                블라인드 입찰로 다른 도매상의 제시가는 공개되지 않습니다.
              </p>
            </div>
          </div>
        </div>

        {/* 상세 설명 */}
        <div className="border-t border-gray-200 p-6 md:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">상세 설명</h2>
          <div className="prose max-w-none">
            <p className="text-gray-700 whitespace-pre-wrap">{sellRequest.description}</p>
          </div>
        </div>
      </div>

      {/* 목록으로 돌아가기 버튼 */}
      <div className="mt-8 text-center">
        <Link
          href="/business/sell-requests"
          className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18" />
          </svg>
          매입 요청 목록으로
        </Link>
      </div>
    </div>
  );
}

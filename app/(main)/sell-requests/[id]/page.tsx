// app/(main)/sell-requests/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SellRequestService } from '@/lib/services/sell-request.service';
import { SellRequest, SellRequestStatus } from '@/types/sell-request';
import { PurchaseOffer } from '@/types/purchase-offer';
import { useAuth } from '@/lib/hooks/use-auth';
import { UserType, VerificationStatus } from '@/types/user';
import Image from 'next/image';
import Link from 'next/link';
import { ContactWholesalerModal } from '@/components/contact-wholesaler-modal';
import { getAccessToken } from '@/lib/utils/auth';

export default function SellRequestDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const [sellRequest, setSellRequest] = useState<SellRequest | null>(null);
  const [offers, setOffers] = useState<PurchaseOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  // 입찰 제안 폼 상태
  const [offerPrice, setOfferPrice] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 도매상 연락처 모달 상태
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [selectedWholesaler, setSelectedWholesaler] = useState<{ id: string; name: string } | null>(null);

  const isWholesaler = user?.userType === UserType.WHOLESALER &&
                       user?.verificationStatus === VerificationStatus.APPROVED;
  const isOwner = user?.uid === sellRequest?.sellerId;
  const canViewOffers = isOwner; // 블라인드 처리: 요청자만 입찰 볼 수 있음

  // 현재 도매상이 이미 입찰했는지 확인
  const myOffer = offers.find(offer => offer.wholesalerId === user?.uid);
  const hasAlreadyOffered = !!myOffer;

  const canSubmitOffer = isWholesaler && !isOwner && sellRequest?.status === SellRequestStatus.OPEN && !hasAlreadyOffered;

  // 디버깅: 입찰 상태 로그
  useEffect(() => {
    if (isWholesaler && !isOwner) {
      console.log('입찰 상태 확인:', {
        offers,
        myOffer,
        hasAlreadyOffered,
        canSubmitOffer,
        userId: user?.uid
      });
    }
  }, [offers, myOffer, hasAlreadyOffered, canSubmitOffer, isWholesaler, isOwner, user?.uid]);

  useEffect(() => {
    const fetchSellRequest = async () => {
      try {
        const data = await SellRequestService.getSellRequest(params.id);
        if (!data) {
          setError('매입 요청을 찾을 수 없습니다.');
        } else {
          console.log('매입 요청 데이터:', {
            id: data.id,
            title: data.title,
            imageUrls: data.imageUrls,
            imageCount: data.imageUrls?.length || 0,
            hasImages: data.imageUrls && data.imageUrls.length > 0
          });
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
    // 요청자는 모든 입찰을 볼 수 있고, 도매상은 자신의 입찰만 확인 가능
    if (user && (canViewOffers || isWholesaler)) {
      console.log('[SellRequestDetail] 입찰 정보 조회 시작:', {
        userId: user.uid,
        requestId: params.id,
        isWholesaler,
        isOwner,
        canViewOffers
      });

      const fetchOffers = async () => {
        try {
          const data = await SellRequestService.getOffers(params.id);
          console.log('[SellRequestDetail] 받은 입찰 데이터:', data);

          // 도매상은 자신의 입찰만 필터링
          if (isWholesaler && !isOwner) {
            const myOffers = data.filter(offer => offer.wholesalerId === user.uid);
            console.log('[SellRequestDetail] 내 입찰:', myOffers);
            setOffers(myOffers);
          } else {
            setOffers(data);
          }
        } catch (error) {
          console.error('[SellRequestDetail] Fetch offers error:', error);
        }
      };

      fetchOffers();
    }
  }, [params.id, canViewOffers, isWholesaler, isOwner, user]);

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
      // Get JWT token
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

      // ✅ 입찰 후 offers 재조회 - 즉시 UI 업데이트
      const updatedOffers = await SellRequestService.getOffers(params.id);
      const myOffers = updatedOffers.filter(offer => offer.wholesalerId === user.uid);
      setOffers(myOffers);

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

  const handleSelectOffer = async (offer: PurchaseOffer) => {
    if (!isOwner || !sellRequest) return;

    const confirmed = confirm(
      `${offer.wholesalerName}의 ${offer.offerPrice.toLocaleString()}원 제안을 선택하시겠습니까?\n선택 후에는 변경할 수 없습니다.`
    );

    if (!confirmed) return;

    try {
      // Get JWT token
      const accessToken = getAccessToken();
      if (!accessToken) {
        throw new Error('세션 정보를 찾을 수 없습니다. 다시 로그인해주세요.');
      }

      await SellRequestService.selectWholesaler(
        sellRequest.id,
        offer.wholesalerId,
        offer.id,
        accessToken
      );

      alert('거래가 확정되었습니다! 도매상이 연락드릴 예정입니다.');
      router.push('/sell-requests');
    } catch (err) {
      console.error('거래 확정 실패:', err);
      alert('거래 확정에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleContactWholesaler = (wholesalerId: string, wholesalerName: string) => {
    setSelectedWholesaler({ id: wholesalerId, name: wholesalerName });
    setContactModalOpen(true);
  };

  const handleCloseModal = () => {
    setContactModalOpen(false);
    setSelectedWholesaler(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
            onClick={() => router.push('/sell-requests')}
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
        onClick={() => router.back()}
        className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        뒤로가기
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
                        ? 'border-primary'
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
                  <span className="text-3xl font-bold text-primary">
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

              {/* 거래 완료 시 도매상 연락처 버튼 (요청자만) */}
              {isOwner && sellRequest.status === SellRequestStatus.CLOSED && sellRequest.selectedWholesalerId && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <svg
                            className="w-5 h-5 text-green-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="text-sm font-semibold text-green-800">
                            거래가 확정되었습니다
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          낙찰받은 도매상과 연락하여 거래를 진행하세요.
                        </p>
                        <button
                          onClick={() => {
                            const selectedOffer = offers.find(o => o.isSelected);
                            if (selectedOffer) {
                              handleContactWholesaler(selectedOffer.wholesalerId, selectedOffer.wholesalerName);
                            }
                          }}
                          className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition font-medium flex items-center justify-center gap-2"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                          도매상 연락처 보기
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 입찰 제안 폼 또는 입찰 완료 메시지 (도매상용) */}
            {isWholesaler && !isOwner && sellRequest?.status === SellRequestStatus.OPEN && (
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
                        <div className="mb-4">
                          <h3 className="text-xl font-bold text-yellow-900 mb-1">
                            입찰 처리 중...
                          </h3>
                          <p className="text-sm text-yellow-700">
                            서버와 동기화하고 있습니다. 잠시만 기다려주세요.
                          </p>
                        </div>

                        <div className="bg-white rounded-lg border border-yellow-200 p-4 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-yellow-500 rounded-full animate-pulse" style={{ width: '70%' }}></div>
                              </div>
                            </div>
                            <div className="text-xs text-gray-600 font-medium">
                              처리 중
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-3">
                            입찰 금액: <span className="font-semibold text-gray-700">{parseInt(offerPrice).toLocaleString()}원</span>
                          </p>
                          {offerMessage && (
                            <p className="text-xs text-gray-500 mt-1">
                              메시지: <span className="font-medium text-gray-700">{offerMessage}</span>
                            </p>
                          )}
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                          <div className="flex items-start gap-2">
                            <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="flex-1">
                              <p className="text-xs text-blue-800">
                                입찰 정보를 서버에 저장하고 있습니다. 이 페이지를 벗어나지 마세요.
                              </p>
                            </div>
                          </div>
                        </div>
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
                            이미 입찰 완료된 상품입니다
                          </h3>
                          <p className="text-sm text-green-700">
                            귀하는 이미 이 매입 요청에 입찰하셨습니다.
                          </p>
                        </div>

                        <div className="bg-white rounded-lg border border-green-200 p-4 mb-4 shadow-sm">
                          <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">입찰 금액</p>
                              <p className="text-3xl font-bold text-primary">{myOffer.offerPrice.toLocaleString()}<span className="text-lg text-gray-600 ml-1">원</span></p>
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

                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-amber-900 mb-1">수정 및 재입찰 불가</p>
                              <p className="text-xs text-amber-800">
                                제출된 입찰은 수정하거나 취소할 수 없습니다. 요청자가 귀하의 제안을 선택하면 연락드릴 예정입니다.
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          rows={3}
                          placeholder="추가 메시지를 입력하세요"
                          disabled={submitting}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition disabled:opacity-50"
                      >
                        {submitting ? '제출 중...' : '제안 제출'}
                      </button>
                      <p className="text-xs text-gray-600 mt-2">
                        ⚠️ 한 번 제출한 입찰은 수정 및 취소가 불가능합니다.
                      </p>
                    </form>
                  </div>
                )}
              </>
            )}

            {/* 안내 사항 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                💡 {isOwner
                  ? '여러 도매상의 제안을 확인하고 가장 좋은 조건을 선택하세요.'
                  : isWholesaler
                  ? '경쟁력 있는 가격을 제시하여 거래 기회를 얻으세요.'
                  : '도매상만 입찰 제안을 할 수 있습니다.'}
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

        {/* 입찰 목록 (요청자만 볼 수 있음) */}
        {canViewOffers && offers.length > 0 && (
          <div className="border-t border-gray-200 p-6 md:p-8 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              받은 입찰 ({offers.length}개)
            </h3>
            <div className="space-y-3">
              {offers.map((offer) => (
                <div
                  key={offer.id}
                  className={`bg-white border-2 rounded-lg p-4 ${
                    offer.isSelected ? 'border-green-500' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{offer.wholesalerName}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(offer.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        {offer.offerPrice.toLocaleString()}원
                      </p>
                      {offer.isSelected && (
                        <span className="text-sm text-green-600 font-semibold">✓ 선택됨</span>
                      )}
                    </div>
                  </div>
                  {offer.message && (
                    <p className="text-sm text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                      {offer.message}
                    </p>
                  )}
                  {!offer.isSelected && sellRequest.status === SellRequestStatus.OPEN && (
                    <button
                      onClick={() => handleSelectOffer(offer)}
                      className="mt-3 w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
                    >
                      이 제안 선택하기
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 목록으로 돌아가기 버튼 */}
      <div className="mt-8 text-center">
        <Link
          href="/sell-requests"
          className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18" />
          </svg>
          매입 요청 목록으로
        </Link>
      </div>

      {/* 도매상 연락처 모달 */}
      {selectedWholesaler && (
        <ContactWholesalerModal
          isOpen={contactModalOpen}
          onClose={handleCloseModal}
          wholesalerId={selectedWholesaler.id}
          wholesalerName={selectedWholesaler.name}
        />
      )}
    </div>
  );
}

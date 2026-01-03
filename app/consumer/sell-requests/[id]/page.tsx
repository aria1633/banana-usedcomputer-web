// app/consumer/sell-requests/[id]/page.tsx
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

export default function ConsumerSellRequestDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const [sellRequest, setSellRequest] = useState<SellRequest | null>(null);
  const [offers, setOffers] = useState<PurchaseOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  // 도매상 연락처 모달 상태
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [selectedWholesaler, setSelectedWholesaler] = useState<{ id: string; name: string } | null>(null);

  const isOwner = user?.uid === sellRequest?.sellerId;
  const canViewOffers = isOwner;

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
    if (user && canViewOffers) {
      const fetchOffers = async () => {
        try {
          const accessToken = getAccessToken();
          const data = await SellRequestService.getOffers(params.id, accessToken || undefined);
          setOffers(data);
        } catch (error) {
          console.error('[ConsumerSellRequestDetail] Fetch offers error:', error);
        }
      };

      fetchOffers();
    }
  }, [params.id, canViewOffers, user]);

  const handleSelectOffer = async (offer: PurchaseOffer) => {
    if (!isOwner || !sellRequest) return;

    const confirmed = confirm(
      `${offer.wholesalerName}의 ${offer.offerPrice.toLocaleString()}원 제안을 선택하시겠습니까?\n선택 후에는 변경할 수 없습니다.`
    );

    if (!confirmed) return;

    try {
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
      router.push('/consumer/sell-requests');
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
            onClick={() => router.push('/consumer/sell-requests')}
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

            {/* 안내 사항 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                {isOwner
                  ? '여러 도매상의 제안을 확인하고 가장 좋은 조건을 선택하세요.'
                  : '이 매입 요청에 대한 도매상들의 입찰을 기다리고 있습니다.'}
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
                        <span className="text-sm text-green-600 font-semibold">선택됨</span>
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
          href="/consumer/sell-requests"
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

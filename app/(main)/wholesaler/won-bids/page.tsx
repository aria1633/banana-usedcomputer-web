// app/(main)/wholesaler/won-bids/page.tsx
'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import { UserType, VerificationStatus } from '@/types/user';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SellRequestService } from '@/lib/services/sell-request.service';
import { PurchaseOffer } from '@/types/purchase-offer';
import { SellRequest } from '@/types/sell-request';
import { ContactSellerModal } from '@/components/contact-seller-modal';

type WonOffer = PurchaseOffer & { sellRequest: SellRequest };

export default function WonBidsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [wonOffers, setWonOffers] = useState<WonOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<{ id: string; name: string } | null>(null);

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
    const fetchWonOffers = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        console.log('낙찰 내역: 조회 시작', user.uid);
        const offers = await SellRequestService.getWonOffers(user.uid);
        console.log('낙찰 내역: 조회 완료', offers.length);
        setWonOffers(offers);
      } catch (error) {
        console.error('낙찰 내역 조회 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchWonOffers();
    }
  }, [user?.uid, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-lg text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  const handleContactSeller = (sellerId: string, sellerName: string) => {
    setSelectedSeller({ id: sellerId, name: sellerName });
    setContactModalOpen(true);
  };

  const handleCloseModal = () => {
    setContactModalOpen(false);
    setSelectedSeller(null);
  };

  if (!user || user.userType !== UserType.WHOLESALER || user.verificationStatus !== VerificationStatus.APPROVED) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">낙찰 내역</h1>
          <p className="mt-2 text-gray-600">사용자가 승인한 나의 매입 제안 목록</p>
        </div>
        <Link
          href="/wholesaler/dashboard"
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition"
        >
          ← 대시보드로
        </Link>
      </div>

      {wonOffers.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">낙찰받은 제안이 없습니다</h3>
          <p className="mt-2 text-sm text-gray-500">
            매입 요청에 입찰하고 사용자가 승인하면 여기에 표시됩니다.
          </p>
          <div className="mt-6">
            <Link
              href="/sell-requests"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 transition"
            >
              매입 요청 보기
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {wonOffers.map((wonOffer) => (
            <div key={wonOffer.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* 낙찰 배지 */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        낙찰됨
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(wonOffer.createdAt).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    {/* 매입 요청 제목 */}
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {wonOffer.sellRequest.title}
                    </h3>

                    {/* 판매자 정보 */}
                    <div className="flex items-center text-sm text-gray-600 mb-3">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                          clipRule="evenodd"
                        />
                      </svg>
                      판매자: {wonOffer.sellRequest.sellerName}
                    </div>

                    {/* 매입 요청 설명 */}
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {wonOffer.sellRequest.description}
                    </p>

                    {/* 가격 정보 */}
                    <div className="flex items-center gap-4 mb-4">
                      {wonOffer.sellRequest.desiredPrice && (
                        <div>
                          <span className="text-xs text-gray-500">희망 가격</span>
                          <p className="text-sm font-medium text-gray-700">
                            {parseInt(wonOffer.sellRequest.desiredPrice).toLocaleString()}원
                          </p>
                        </div>
                      )}
                      <div>
                        <span className="text-xs text-gray-500">나의 제안 가격</span>
                        <p className="text-lg font-bold text-primary">
                          {wonOffer.offerPrice.toLocaleString()}원
                        </p>
                      </div>
                    </div>

                    {/* 나의 메시지 */}
                    {wonOffer.message && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-md">
                        <p className="text-xs text-gray-500 mb-1">나의 메시지</p>
                        <p className="text-sm text-gray-700">{wonOffer.message}</p>
                      </div>
                    )}
                  </div>

                  {/* 이미지 */}
                  {wonOffer.sellRequest.imageUrls &&
                    wonOffer.sellRequest.imageUrls.length > 0 && (
                      <div className="ml-6 flex-shrink-0">
                        <img
                          src={wonOffer.sellRequest.imageUrls[0]}
                          alt={wonOffer.sellRequest.title}
                          className="w-32 h-32 object-cover rounded-lg"
                        />
                      </div>
                    )}
                </div>

                {/* 액션 버튼 */}
                <div className="mt-6 pt-4 border-t border-gray-200 flex gap-3">
                  <Link
                    href={`/sell-requests/${wonOffer.sellRequest.id}`}
                    className="flex-1 px-4 py-2 text-sm font-medium text-center text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition"
                  >
                    상세 보기
                  </Link>
                  <button
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition"
                    onClick={() => handleContactSeller(wonOffer.sellRequest.sellerId, wonOffer.sellRequest.sellerName)}
                  >
                    판매자 연락하기
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 판매자 연락처 모달 */}
      {selectedSeller && (
        <ContactSellerModal
          isOpen={contactModalOpen}
          onClose={handleCloseModal}
          sellerId={selectedSeller.id}
          sellerName={selectedSeller.name}
        />
      )}
    </div>
  );
}

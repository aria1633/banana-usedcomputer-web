// app/(main)/wholesaler/won-bids/page.tsx
'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import { UserType, VerificationStatus } from '@/types/user';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SellRequestService } from '@/lib/services/sell-request.service';
import { TransactionService } from '@/lib/services/transaction.service';
import { PurchaseOffer } from '@/types/purchase-offer';
import { SellRequest } from '@/types/sell-request';
import { Transaction, TransactionStatus } from '@/types/transaction';
import { ContactSellerModal } from '@/components/contact-seller-modal';
import { getAccessToken } from '@/lib/utils/auth';

type WonOffer = PurchaseOffer & { sellRequest: SellRequest; transaction?: Transaction | null };

export default function WonBidsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [wonOffers, setWonOffers] = useState<WonOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<{ id: string; name: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'in_progress' | 'completed'>('in_progress');
  const [completingOfferId, setCompletingOfferId] = useState<string | null>(null);

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

        // Get JWT token
        const accessToken = getAccessToken();

        const offers = await SellRequestService.getWonOffers(user.uid, accessToken || undefined);
        console.log('낙찰 내역: 조회 완료', offers.length);

        // 각 offer에 대한 transaction 정보 조회
        const offersWithTransactions = await Promise.all(
          offers.map(async (offer) => {
            try {
              const transaction = await TransactionService.getTransactionByOfferId(offer.id, accessToken);
              return { ...offer, transaction };
            } catch (error) {
              console.error('거래 정보 조회 실패:', offer.id, error);
              return { ...offer, transaction: null };
            }
          })
        );

        setWonOffers(offersWithTransactions);
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

  const handleCompleteTransaction = async (wonOffer: WonOffer) => {
    if (!user?.uid) return;

    console.log('[거래 완료] 시작:', {
      offerId: wonOffer.id,
      currentTransaction: wonOffer.transaction,
      sellRequestId: wonOffer.sellRequestId,
    });

    // 이미 완료된 거래인지 확인
    if (wonOffer.transaction?.status === TransactionStatus.COMPLETED) {
      alert('이미 완료된 거래입니다.');
      return;
    }

    const confirmed = confirm(
      `"${wonOffer.sellRequest.title}" 거래를 완료 처리하시겠습니까?\n완료 후에는 과거 이력으로 이동합니다.`
    );

    if (!confirmed) return;

    setCompletingOfferId(wonOffer.id);
    try {
      // Get JWT token
      const accessToken = getAccessToken();
      if (!accessToken) {
        throw new Error('세션 정보를 찾을 수 없습니다. 다시 로그인해주세요.');
      }

      console.log('[거래 완료] 토큰 획득 성공');

      // 거래 상태에 따라 처리
      let transactionId: string;

      if (!wonOffer.transaction) {
        console.log('[거래 완료] transaction 없음, 서버 재확인 중...');
        // 거래가 없는 경우: 서버에 다시 한 번 확인 (캐시 문제 방지)
        const existingTransaction = await TransactionService.getTransactionByOfferId(wonOffer.id, accessToken);
        console.log('[거래 완료] 서버 확인 결과:', existingTransaction);

        if (existingTransaction) {
          // 이미 존재하는 거래가 있으면 그것을 사용
          transactionId = existingTransaction.id;
          console.log('[거래 완료] 기존 transaction 발견:', transactionId);
          if (existingTransaction.status !== TransactionStatus.COMPLETED) {
            console.log('[거래 완료] 완료 처리 시작...');
            await TransactionService.completeTransaction(transactionId, accessToken);
            console.log('[거래 완료] 완료 처리 성공!');
          }
        } else {
          // 정말 거래가 없으면 생성 후 완료 처리
          console.log('[거래 완료] 새 transaction 생성 중...');
          transactionId = await TransactionService.createTransaction(
            {
              sellRequestId: wonOffer.sellRequestId,
              purchaseOfferId: wonOffer.id,
              wholesalerId: user.uid,
              sellerId: wonOffer.sellRequest.sellerId,
            },
            accessToken
          );
          console.log('[거래 완료] 생성 완료:', transactionId);
          console.log('[거래 완료] 완료 처리 시작...');
          await TransactionService.completeTransaction(transactionId, accessToken);
          console.log('[거래 완료] 완료 처리 성공!');
        }
      } else if (wonOffer.transaction.status === TransactionStatus.IN_PROGRESS) {
        // 진행 중인 거래만 완료 처리
        console.log('[거래 완료] 진행 중인 transaction 완료 처리:', wonOffer.transaction.id);
        await TransactionService.completeTransaction(wonOffer.transaction.id, accessToken);
        console.log('[거래 완료] 완료 처리 성공!');
      } else {
        // 이미 완료된 경우
        throw new Error('이미 완료된 거래입니다.');
      }

      console.log('[거래 완료] 목록 새로고침 시작...');

      // DB 업데이트가 완료될 시간을 주기 위해 약간의 딜레이
      await new Promise(resolve => setTimeout(resolve, 500));

      // 목록 새로고침
      const offers = await SellRequestService.getWonOffers(user.uid, accessToken);
      console.log('[거래 완료] getWonOffers 결과:', offers.length);

      const offersWithTransactions = await Promise.all(
        offers.map(async (offer) => {
          try {
            const transaction = await TransactionService.getTransactionByOfferId(offer.id, accessToken);
            console.log(`[거래 완료] offer ${offer.id} transaction:`, transaction);
            return { ...offer, transaction };
          } catch (error) {
            console.error('[거래 완료] transaction 조회 실패:', offer.id, error);
            return { ...offer, transaction: null };
          }
        })
      );

      console.log('[거래 완료] offersWithTransactions:', offersWithTransactions.map(o => ({
        id: o.id,
        hasTransaction: !!o.transaction,
        transactionStatus: o.transaction?.status
      })));

      setWonOffers(offersWithTransactions);
      console.log('[거래 완료] 상태 업데이트 완료');

      // 완료됨 탭으로 자동 전환
      setActiveTab('completed');
      console.log('[거래 완료] 탭 전환 완료');

      alert('거래가 완료 처리되었습니다!');
    } catch (error) {
      console.error('[거래 완료] 에러 발생:', error);
      alert(`거래 완료 처리에 실패했습니다.\n${error instanceof Error ? error.message : '다시 시도해주세요.'}`);
    } finally {
      setCompletingOfferId(null);
      console.log('[거래 완료] 종료');
    }
  };

  // 필터링된 낙찰 목록
  const filteredOffers = wonOffers.filter((offer) => {
    if (activeTab === 'in_progress') {
      return !offer.transaction || offer.transaction.status === TransactionStatus.IN_PROGRESS;
    } else {
      return offer.transaction?.status === TransactionStatus.COMPLETED;
    }
  });

  const inProgressCount = wonOffers.filter(
    (offer) => !offer.transaction || offer.transaction.status === TransactionStatus.IN_PROGRESS
  ).length;

  const completedCount = wonOffers.filter(
    (offer) => offer.transaction?.status === TransactionStatus.COMPLETED
  ).length;

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

      {/* 탭 메뉴 */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('in_progress')}
              className={`flex-1 py-4 px-6 text-center font-medium text-sm border-b-2 transition ${
                activeTab === 'in_progress'
                  ? 'border-primary text-primary bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>진행 중</span>
                <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                  {inProgressCount}
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`flex-1 py-4 px-6 text-center font-medium text-sm border-b-2 transition ${
                activeTab === 'completed'
                  ? 'border-primary text-primary bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>완료됨</span>
                <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                  {completedCount}
                </span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {filteredOffers.length === 0 ? (
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
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {activeTab === 'in_progress' ? '진행 중인 거래가 없습니다' : '완료된 거래가 없습니다'}
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            {activeTab === 'in_progress'
              ? '매입 요청에 입찰하고 사용자가 승인하면 여기에 표시됩니다.'
              : '거래를 완료하면 여기에 표시됩니다.'}
          </p>
          {activeTab === 'in_progress' && (
            <div className="mt-6">
              <Link
                href="/sell-requests"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 transition"
              >
                매입 요청 보기
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOffers.map((wonOffer) => (
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
                  {activeTab === 'in_progress' && (
                    <button
                      className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      onClick={() => handleCompleteTransaction(wonOffer)}
                      disabled={completingOfferId === wonOffer.id}
                    >
                      {completingOfferId === wonOffer.id ? (
                        <>
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          처리 중...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          거래 완료
                        </>
                      )}
                    </button>
                  )}
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

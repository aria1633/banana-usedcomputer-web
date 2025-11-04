// app/(main)/sell-requests/my/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { SellRequest } from '@/types/sell-request';
import { SellRequestService } from '@/lib/services/sell-request.service';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/hooks/use-auth';
import { UserType } from '@/types/user';
import { ContactWholesalerModal } from '@/components/contact-wholesaler-modal';
import { PurchaseOffer } from '@/types/purchase-offer';

export default function MySellRequestsPage() {
  const [sellRequests, setSellRequests] = useState<SellRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  // 도매상 연락처 모달 상태
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [selectedWholesaler, setSelectedWholesaler] = useState<{ id: string; name: string } | null>(null);
  const [offersMap, setOffersMap] = useState<Map<string, PurchaseOffer[]>>(new Map());

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchMySellRequests = async () => {
      try {
        console.log('[MySellRequestsPage] Fetching my sell requests...');
        const data = await SellRequestService.getMySellRequests(user.uid);
        console.log('[MySellRequestsPage] Fetched:', data.length, 'requests');
        setSellRequests(data);

        // closed 상태인 요청들의 입찰 정보 가져오기
        const closedRequests = data.filter(req => req.status === 'closed' && req.selectedWholesalerId);
        if (closedRequests.length > 0) {
          const newOffersMap = new Map<string, PurchaseOffer[]>();
          await Promise.all(
            closedRequests.map(async (req) => {
              try {
                const offers = await SellRequestService.getOffers(req.id);
                newOffersMap.set(req.id, offers);
              } catch (error) {
                console.error('[MySellRequestsPage] Failed to fetch offers for:', req.id, error);
              }
            })
          );
          setOffersMap(newOffersMap);
        }
      } catch (error) {
        console.error('[MySellRequestsPage] Fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMySellRequests();
  }, [user]);

  const handleContactWholesaler = (requestId: string) => {
    const offers = offersMap.get(requestId);
    const selectedOffer = offers?.find(o => o.isSelected);
    if (selectedOffer) {
      setSelectedWholesaler({ id: selectedOffer.wholesalerId, name: selectedOffer.wholesalerName });
      setContactModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setContactModalOpen(false);
    setSelectedWholesaler(null);
  };

  const canCreateRequest = user?.userType === UserType.NORMAL;

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-lg text-yellow-800 mb-4">
            로그인이 필요한 서비스입니다.
          </p>
          <Link
            href="/login"
            className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            로그인하기
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-lg text-gray-600">내 요청 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">내 매입 요청</h1>
          <p className="mt-2 text-gray-600">
            내가 등록한 매입 요청을 확인하고 관리하세요
          </p>
        </div>
        {canCreateRequest && (
          <Link
            href="/sell-requests/new"
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition"
          >
            + 매입 요청 등록
          </Link>
        )}
      </div>

      {sellRequests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="text-6xl mb-4">📦</div>
          <p className="text-xl text-gray-500 mb-2">등록한 매입 요청이 없습니다</p>
          <p className="text-gray-400 mb-4">
            중고 컴퓨터를 판매하고 싶으신가요?
          </p>
          {canCreateRequest && (
            <Link
              href="/sell-requests/new"
              className="inline-block px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition"
            >
              매입 요청 등록하기
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-gray-600">
            총 {sellRequests.length}개의 요청
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sellRequests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-lg shadow hover:shadow-xl transition-shadow overflow-hidden group flex flex-col"
              >
                <Link href={`/sell-requests/${request.id}`} className="flex-1">
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
                    {/* 상태 배지 */}
                    <div className="absolute top-2 left-2">
                      <span className={`text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                        request.status === 'open'
                          ? 'bg-green-500'
                          : request.status === 'closed'
                          ? 'bg-blue-500'
                          : 'bg-gray-500'
                      }`}>
                        {request.status === 'open' && '입찰 진행중'}
                        {request.status === 'closed' && '거래 완료'}
                        {request.status === 'cancelled' && '취소됨'}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg text-gray-900 line-clamp-1 group-hover:text-primary transition">
                      {request.title}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mt-1 h-10">
                      {request.description}
                    </p>
                    <div className="mt-4">
                      {request.desiredPrice && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">희망가:</span>
                          <span className="text-lg font-bold text-gray-900">
                            {request.desiredPrice}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        {request.sellerName}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Link>

                {/* 거래 완료 시 도매상 연락처 버튼 */}
                {request.status === 'closed' && request.selectedWholesalerId && (
                  <div className="px-4 pb-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContactWholesaler(request.id);
                      }}
                      className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition font-medium text-sm flex items-center justify-center gap-2"
                    >
                      <svg
                        className="w-4 h-4"
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
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* 안내 사항 */}
      <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">💡 매입 요청 관리</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• 각 요청을 클릭하면 상세 정보와 도매상 입찰 현황을 확인할 수 있습니다</li>
          <li>• 진행 중인 요청은 언제든지 취소할 수 있습니다</li>
          <li>• 도매상들의 입찰이 들어오면 가장 좋은 조건을 선택하세요</li>
          <li>• 거래가 완료되면 상태가 자동으로 변경됩니다</li>
          <li>• 거래 완료 시 "도매상 연락처 보기" 버튼으로 낙찰받은 도매상에게 연락하세요</li>
        </ul>
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

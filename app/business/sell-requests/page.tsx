// app/business/sell-requests/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { SellRequest, SellRequestStatus, SellRequestCategory } from '@/types/sell-request';
import { SellRequestService } from '@/lib/services/sell-request.service';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/hooks/use-auth';
import { VerificationStatus } from '@/types/user';
import { getAccessToken, isAdmin } from '@/lib/utils/auth';

export default function BusinessSellRequestsPage() {
  const [sellRequests, setSellRequests] = useState<SellRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<SellRequestCategory | 'all'>('all');
  const { user } = useAuth();

  // 관리자이거나 사업자 인증된 경우 허용
  const isApproved = isAdmin(user) || user?.verificationStatus === VerificationStatus.APPROVED;

  useEffect(() => {
    const fetchSellRequests = async () => {
      try {
        console.log('[BusinessSellRequestsPage] Fetching sell requests...');
        const accessToken = getAccessToken();
        const data = await SellRequestService.getAllSellRequests(accessToken || undefined);
        console.log('[BusinessSellRequestsPage] Fetched:', data.length, 'requests');
        setSellRequests(data);
      } catch (error) {
        console.error('[BusinessSellRequestsPage] Fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSellRequests();
  }, []);

  // 카테고리 필터링
  const filteredSellRequests = selectedCategory === 'all'
    ? sellRequests
    : sellRequests.filter(request => request.category === selectedCategory);

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
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-lg text-gray-600">매입 요청 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">매입 요청 목록</h1>
        <p className="mt-2 text-gray-600">
          일반 사용자가 올린 매입 요청에 입찰하세요
        </p>
      </div>

      {/* 카테고리 필터 */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-lg transition ${
            selectedCategory === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          전체
        </button>
        <button
          onClick={() => setSelectedCategory(SellRequestCategory.COMPUTER)}
          className={`px-4 py-2 rounded-lg transition ${
            selectedCategory === SellRequestCategory.COMPUTER
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          컴퓨터 관련
        </button>
        <button
          onClick={() => setSelectedCategory(SellRequestCategory.SMARTPHONE)}
          className={`px-4 py-2 rounded-lg transition ${
            selectedCategory === SellRequestCategory.SMARTPHONE
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          스마트폰
        </button>
      </div>

      {filteredSellRequests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="text-6xl mb-4">📋</div>
          <p className="text-xl text-gray-500 mb-2">진행 중인 매입 요청이 없습니다</p>
          <p className="text-gray-400">
            일반 사용자가 매입 요청을 등록하면 여기에 표시됩니다
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-gray-600">
            총 {filteredSellRequests.length}개의 진행 중인 요청
            {selectedCategory !== 'all' && (
              <span className="ml-2 text-gray-400">
                (전체 {sellRequests.length}개)
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSellRequests.map((request) => (
              <Link
                key={request.id}
                href={`/business/sell-requests/${request.id}`}
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
                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      입찰 진행중
                    </span>
                    <span className={`text-white text-xs px-2 py-1 rounded-full ${
                      request.category === SellRequestCategory.SMARTPHONE
                        ? 'bg-purple-500'
                        : 'bg-blue-500'
                    }`}>
                      {request.category === SellRequestCategory.SMARTPHONE ? '스마트폰' : '컴퓨터'}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg text-gray-900 line-clamp-1 group-hover:text-blue-600 transition">
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
            ))}
          </div>
        </>
      )}

      {/* 입찰 안내 */}
      <div className="mt-12 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg p-8 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">입찰 안내</h2>
          <p className="text-lg mb-6 text-white/90">
            원하는 매입 요청을 클릭하여 가격을 제시하세요.<br />
            블라인드 입찰로 다른 도매상의 제시가는 공개되지 않습니다.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-3xl mb-2">1</div>
              <div className="font-semibold mb-1">매입 요청 선택</div>
              <div className="text-sm text-white/80">관심있는 매물 클릭</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-3xl mb-2">2</div>
              <div className="font-semibold mb-1">가격 제시</div>
              <div className="text-sm text-white/80">매입 희망가 입력</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-3xl mb-2">3</div>
              <div className="font-semibold mb-1">낙찰 대기</div>
              <div className="text-sm text-white/80">판매자 선택 대기</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

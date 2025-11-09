// components/ContactSellerModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { UserService } from '@/lib/services/user.service';
import { User } from '@/types/user';
import { logger } from '@/lib/utils/logger';

interface ContactSellerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellerId: string;
  sellerName: string;
}

export default function ContactSellerModal({
  isOpen,
  onClose,
  sellerId,
  sellerName,
}: ContactSellerModalProps) {
  const [seller, setSeller] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && sellerId) {
      fetchSellerInfo();
    }
  }, [isOpen, sellerId]);

  const fetchSellerInfo = async () => {
    try {
      setLoading(true);
      setError('');
      const sellerData = await UserService.getUserByUid(sellerId);
      setSeller(sellerData);
    } catch (err) {
      logger.error('판매자 정보 조회 실패', err);
      setError('판매자 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert(`${label}이(가) 클립보드에 복사되었습니다.`);
    }).catch(() => {
      alert('복사에 실패했습니다.');
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* 모달 컨텐츠 */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">판매자 연락처</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 내용 */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-4 text-gray-600">정보를 불러오는 중...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          ) : seller ? (
            <div className="space-y-6">
              {/* 판매자 이름 */}
              <div>
                <p className="text-sm text-gray-500 mb-1">판매자명</p>
                <p className="text-lg font-semibold text-gray-900">{seller.name}</p>
              </div>

              {/* 이메일 */}
              <div>
                <p className="text-sm text-gray-500 mb-2">이메일</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-gray-900 break-all">{seller.email}</p>
                  </div>
                  <button
                    onClick={() => handleCopyToClipboard(seller.email, '이메일')}
                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition"
                    title="복사"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 전화번호 */}
              {seller.phoneNumber ? (
                <div>
                  <p className="text-sm text-gray-500 mb-2">전화번호</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-gray-900">{seller.phoneNumber}</p>
                    </div>
                    <button
                      onClick={() => handleCopyToClipboard(seller.phoneNumber!, '전화번호')}
                      className="px-4 py-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition"
                      title="복사"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <a
                      href={`tel:${seller.phoneNumber}`}
                      className="px-4 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg transition"
                      title="전화 걸기"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    판매자가 전화번호를 등록하지 않았습니다. 이메일로 문의해주세요.
                  </p>
                </div>
              )}

              {/* 안내 메시지 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  판매자에게 직접 연락하여 상품에 대해 문의하거나 거래를 진행할 수 있습니다.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">판매자 정보를 찾을 수 없습니다.</p>
            </div>
          )}

          {/* 닫기 버튼 */}
          <div className="mt-6">
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

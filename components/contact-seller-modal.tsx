// components/contact-seller-modal.tsx
'use client';

import { User } from '@/types/user';
import { useEffect, useState } from 'react';
import { UserService } from '@/lib/services/user.service';

interface ContactSellerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellerId: string;
  sellerName: string;
}

export function ContactSellerModal({
  isOpen,
  onClose,
  sellerId,
  sellerName,
}: ContactSellerModalProps) {
  const [seller, setSeller] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<{ email: boolean; phone: boolean }>({
    email: false,
    phone: false,
  });

  useEffect(() => {
    const fetchSeller = async () => {
      if (!isOpen || !sellerId) return;

      setLoading(true);
      try {
        console.log('[ContactSellerModal] Fetching seller info:', sellerId);
        const sellerData = await UserService.getUserByUid(sellerId);
        setSeller(sellerData);
        console.log('[ContactSellerModal] Seller info loaded:', sellerData);
      } catch (error) {
        console.error('[ContactSellerModal] Failed to fetch seller:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchSeller();
    }
  }, [isOpen, sellerId]);

  const handleCopy = async (text: string, type: 'email' | 'phone') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied({ ...copied, [type]: true });
      setTimeout(() => {
        setCopied({ ...copied, [type]: false });
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 배경 오버레이 */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* 헤더 */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                판매자 연락처
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 transition"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* 본문 */}
          <div className="px-6 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : seller ? (
              <div className="space-y-4">
                {/* 판매자 이름 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    판매자 이름
                  </label>
                  <div className="flex items-center p-3 bg-gray-50 rounded-md">
                    <svg
                      className="w-5 h-5 text-gray-400 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-gray-900 font-medium">{seller.name}</span>
                  </div>
                </div>

                {/* 이메일 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    이메일
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center p-3 bg-gray-50 rounded-md">
                      <svg
                        className="w-5 h-5 text-gray-400 mr-2"
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
                      <span className="text-gray-900 break-all">{seller.email}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(seller.email, 'email')}
                      className="px-3 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition text-sm font-medium whitespace-nowrap"
                    >
                      {copied.email ? '복사됨!' : '복사'}
                    </button>
                  </div>
                  <a
                    href={`mailto:${seller.email}`}
                    className="mt-2 inline-flex items-center text-sm text-primary hover:underline"
                  >
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    이메일로 연락하기
                  </a>
                </div>

                {/* 전화번호 */}
                {seller.phoneNumber ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      전화번호
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center p-3 bg-gray-50 rounded-md">
                        <svg
                          className="w-5 h-5 text-gray-400 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                          />
                        </svg>
                        <span className="text-gray-900">{seller.phoneNumber}</span>
                      </div>
                      <button
                        onClick={() => handleCopy(seller.phoneNumber!, 'phone')}
                        className="px-3 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition text-sm font-medium whitespace-nowrap"
                      >
                        {copied.phone ? '복사됨!' : '복사'}
                      </button>
                    </div>
                    <a
                      href={`tel:${seller.phoneNumber}`}
                      className="mt-2 inline-flex items-center text-sm text-primary hover:underline"
                    >
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                      전화로 연락하기
                    </a>
                  </div>
                ) : (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      판매자가 전화번호를 등록하지 않았습니다. 이메일로 연락해주세요.
                    </p>
                  </div>
                )}

                {/* 안내 메시지 */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-start">
                    <svg
                      className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">거래 안내</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>판매자와 직접 연락하여 거래 일정을 조율하세요.</li>
                        <li>거래 전 제품 상태를 꼭 확인하세요.</li>
                        <li>안전한 거래를 위해 공개된 장소에서 만나세요.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-gray-500">판매자 정보를 불러올 수 없습니다.</p>
              </div>
            )}
          </div>

          {/* 푸터 */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition font-medium"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

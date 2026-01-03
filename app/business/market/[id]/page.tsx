// app/business/market/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProductService } from '@/lib/services/product.service';
import { UserService } from '@/lib/services/user.service';
import { Product } from '@/types/product';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/use-auth';
import { VerificationStatus } from '@/types/user';
import { isAdmin } from '@/lib/utils/auth';

export default function BusinessMarketProductDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [sellerName, setSellerName] = useState<string>('');
  const [sellerPhone, setSellerPhone] = useState<string>('');

  // 관리자이거나 사업자 인증된 경우 허용
  const isApproved = isAdmin(user) || user?.verificationStatus === VerificationStatus.APPROVED;

  // 본인의 상품인지 확인
  const isOwner = user && product && user.uid === product.sellerId;

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const data = await ProductService.getProduct(params.id);
        if (!data) {
          setError('상품을 찾을 수 없습니다.');
        } else {
          setProduct(data);

          // 판매자 정보를 실시간으로 가져오기
          try {
            const seller = await UserService.getUserByUid(data.sellerId);
            if (seller) {
              setSellerName(seller.name);
              setSellerPhone(seller.phoneNumber || '');
            }
          } catch (err) {
            console.error('판매자 정보 조회 실패:', err);
            setSellerName(data.sellerName);
          }
        }
      } catch (err: unknown) {
        console.error('상품 조회 실패:', err);
        setError('상품 정보를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [params.id]);

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600"></div>
          <p className="mt-4 text-lg text-gray-600">상품 정보 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-lg text-red-800 mb-4">{error || '상품을 찾을 수 없습니다.'}</p>
          <button
            onClick={() => router.push('/business/market')}
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
              {product.imageUrls.length > 0 && !imageErrors.has(selectedImageIndex) ? (
                <Image
                  src={product.imageUrls[selectedImageIndex]}
                  alt={product.title}
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
              {/* 도매 상품 배지 */}
              <div className="absolute top-3 left-3">
                <span className="bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                  도매 상품
                </span>
              </div>
            </div>

            {/* 썸네일 이미지 */}
            {product.imageUrls.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {product.imageUrls.map((url, index) => (
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
                        alt={`${product.title} ${index + 1}`}
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

          {/* 오른쪽: 상품 정보 */}
          <div className="flex flex-col">
            {/* 카테고리 */}
            <div className="mb-2">
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                {product.category}
              </span>
            </div>

            {/* 상품명 */}
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.title}</h1>

            {/* 가격 */}
            <div className="mb-6">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-blue-600">
                  {product.price.toLocaleString()}
                </span>
                <span className="text-2xl text-gray-600">원</span>
              </div>
            </div>

            {/* 판매자 정보 */}
            <div className="border-t border-b border-gray-200 py-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">판매자</p>
                  <p className="font-semibold text-gray-900">{sellerName || product.sellerName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">재고 수량</p>
                  <p className="font-semibold text-gray-900">{product.quantity}개</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">등록일</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(product.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">상태</p>
                  <p className="font-semibold text-green-600">
                    {product.isAvailable ? '판매중' : '품절'}
                  </p>
                </div>
              </div>
            </div>

            {/* 버튼 영역 */}
            <div className="space-y-3 mb-6">
              {isOwner ? (
                /* 본인 상품일 경우 수정 버튼 표시 */
                <Link
                  href={`/products/${product.id}/edit`}
                  className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  상품 수정
                </Link>
              ) : product.isAvailable && sellerPhone ? (
                <>
                  <a
                    href={`tel:${sellerPhone}`}
                    className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    전화 연결: {sellerPhone}
                  </a>
                </>
              ) : !product.isAvailable ? (
                <div className="w-full px-6 py-4 bg-gray-200 text-gray-500 rounded-lg font-semibold text-center">
                  현재 판매중이 아닙니다
                </div>
              ) : null}
            </div>

            {/* 도매 거래 안내 */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                <strong>B2B 도매 거래</strong> - 도매상 간 거래 상품입니다. 가격 협의 및 대량 구매는 판매자에게 직접 연락하세요.
              </p>
            </div>
          </div>
        </div>

        {/* 상세 설명 */}
        <div className="border-t border-gray-200 p-6 md:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">상품 상세 설명</h2>
          <div className="prose max-w-none">
            <p className="text-gray-700 whitespace-pre-wrap">{product.description}</p>
          </div>
        </div>

        {/* 추가 정보 */}
        <div className="border-t border-gray-200 p-6 md:p-8 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">도매 거래 안내</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              검증된 도매상 간의 B2B 거래 상품입니다.
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              대량 구매 시 가격 협의가 가능합니다.
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              거래 조건은 판매자와 직접 협의하세요.
            </li>
          </ul>
        </div>
      </div>

      {/* 목록으로 돌아가기 버튼 */}
      <div className="mt-8 text-center">
        <Link
          href="/business/market"
          className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18" />
          </svg>
          도매 마켓으로
        </Link>
      </div>
    </div>
  );
}

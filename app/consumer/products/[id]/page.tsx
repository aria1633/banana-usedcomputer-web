// app/consumer/products/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProductService } from '@/lib/services/product.service';
import { UserService } from '@/lib/services/user.service';
import { Product } from '@/types/product';
import Image from 'next/image';
import Link from 'next/link';
import InquiryModal from '@/components/InquiryModal';
import ContactSellerModal from '@/components/ContactSellerModal';
import { useAuth } from '@/lib/hooks/use-auth';

export default function ConsumerProductDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [sellerName, setSellerName] = useState<string>('');

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const data = await ProductService.getProduct(params.id);
        if (!data) {
          setError('상품을 찾을 수 없습니다.');
        } else {
          setProduct(data);
          try {
            const seller = await UserService.getUserByUid(data.sellerId);
            if (seller) {
              setSellerName(seller.name);
            }
          } catch (err) {
            setSellerName(data.sellerName);
          }
        }
      } catch (err) {
        setError('상품 정보를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-amber-500"></div>
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
            onClick={() => router.push('/consumer/products')}
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
      {/* 뒤로가기 */}
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        뒤로가기
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 md:p-8">
          {/* 이미지 섹션 */}
          <div>
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative mb-4">
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>

            {product.imageUrls.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {product.imageUrls.map((url, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`aspect-square bg-gray-100 rounded-lg overflow-hidden relative border-2 transition ${
                      selectedImageIndex === index ? 'border-amber-500' : 'border-transparent hover:border-gray-300'
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
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 상품 정보 */}
          <div className="flex flex-col">
            <div className="mb-2">
              <span className="inline-block px-3 py-1 bg-amber-100 text-amber-700 text-sm font-medium rounded-full">
                {product.category}
              </span>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.title}</h1>

            <div className="mb-6">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-amber-600">
                  {product.price.toLocaleString()}
                </span>
                <span className="text-2xl text-gray-600">원</span>
              </div>
            </div>

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

            <div className="space-y-3 mb-6">
              {product.isAvailable ? (
                <>
                  <button
                    onClick={() => setIsInquiryModalOpen(true)}
                    className="w-full px-6 py-4 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition flex items-center justify-center gap-2"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    구매 문의하기
                  </button>
                  <button
                    onClick={() => setIsContactModalOpen(true)}
                    className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                  >
                    판매자에게 연락하기
                  </button>
                </>
              ) : (
                <div className="w-full px-6 py-4 bg-gray-200 text-gray-500 rounded-lg font-semibold text-center">
                  현재 판매중이 아닙니다
                </div>
              )}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                구매 전 판매자와 충분히 상담하시고, 제품 상태를 꼼꼼히 확인하세요.
              </p>
            </div>
          </div>
        </div>

        {/* 상세 설명 */}
        <div className="border-t border-gray-200 p-6 md:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">상품 상세 설명</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{product.description}</p>
        </div>

        {/* 거래 안내 */}
        <div className="border-t border-gray-200 p-6 md:p-8 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">거래 안내</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start">
              <svg className="w-5 h-5 text-amber-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              검증된 도매상이 판매하는 상품입니다.
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-amber-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              실물과 차이가 있을 수 있으니 구매 전 반드시 확인하세요.
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-amber-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              거래 관련 문의는 판매자에게 직접 연락하세요.
            </li>
          </ul>
        </div>
      </div>

      {/* 목록으로 버튼 */}
      <div className="mt-8 text-center">
        <Link
          href="/consumer/products"
          className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18" />
          </svg>
          상품 목록으로
        </Link>
      </div>

      {/* 모달 */}
      <InquiryModal
        isOpen={isInquiryModalOpen}
        onClose={() => setIsInquiryModalOpen(false)}
        productId={product.id}
        productTitle={product.title}
        sellerId={product.sellerId}
        sellerName={product.sellerName}
      />

      <ContactSellerModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        sellerId={product.sellerId}
        sellerName={product.sellerName}
      />
    </div>
  );
}

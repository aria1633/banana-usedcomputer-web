// app/business/products/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/hooks/use-auth';
import { ProductService } from '@/lib/services/product.service';
import { Product, ProductChannel } from '@/types/product';
import { VerificationStatus } from '@/types/user';
import { isAdmin } from '@/lib/utils/auth';

type ChannelFilter = 'all' | ProductChannel;

export default function BusinessProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');

  // 관리자이거나 사업자 인증된 경우 허용
  const isApproved = isAdmin(user) || user?.verificationStatus === VerificationStatus.APPROVED;

  useEffect(() => {
    const loadProducts = async () => {
      if (!user || !isApproved) {
        setLoading(false);
        return;
      }

      try {
        // 내 상품 관리: 본인이 등록한 모든 상품 조회 (소매 + 도매)
        const data = await ProductService.getProductsBySeller(user.uid);
        setProducts(data);
      } catch (error) {
        console.error('Failed to load products:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [user, isApproved]);

  // 채널 필터 적용
  const filteredProducts = products.filter(product => {
    if (channelFilter === 'all') return true;
    return product.channel === channelFilter;
  });

  const handleDelete = async (productId: string) => {
    if (!confirm('이 상품을 삭제하시겠습니까?')) return;

    setDeletingId(productId);
    try {
      await ProductService.deleteProduct(productId);
      setProducts(prev => prev.filter(p => p.id !== productId));
      alert('삭제되었습니다.');
    } catch (error) {
      console.error('Delete error:', error);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">내 상품 관리</h1>
          <p className="text-gray-600 mt-1">등록한 상품을 관리하세요</p>
        </div>
        <Link
          href="/business/products/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          + 상품 등록
        </Link>
      </div>

      {/* 채널 필터 탭 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setChannelFilter('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${
            channelFilter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          전체 ({products.length})
        </button>
        <button
          onClick={() => setChannelFilter('retail')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${
            channelFilter === 'retail'
              ? 'bg-amber-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          소매 ({products.filter(p => p.channel === 'retail').length})
        </button>
        <button
          onClick={() => setChannelFilter('wholesale')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${
            channelFilter === 'wholesale'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          도매 ({products.filter(p => p.channel === 'wholesale').length})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600"></div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="text-6xl mb-4">📦</div>
          <p className="text-xl font-semibold text-gray-700 mb-2">
            {products.length === 0 ? '등록된 상품이 없습니다' : '해당 채널에 등록된 상품이 없습니다'}
          </p>
          <p className="text-gray-500 mb-6">
            {products.length === 0 ? '첫 상품을 등록해보세요!' : '다른 채널을 선택하거나 새 상품을 등록하세요'}
          </p>
          <Link
            href="/business/products/new"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            상품 등록하기
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-gray-600">총 {filteredProducts.length}개의 상품</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group">
                <div className="aspect-video bg-gray-100 relative">
                  {product.imageUrls[0] && !imageErrors.has(product.id) ? (
                    <Image
                      src={product.imageUrls[0]}
                      alt={product.title}
                      fill
                      className="object-cover"
                      unoptimized
                      onError={() => {
                        setImageErrors(prev => new Set(prev).add(product.id));
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      product.channel === 'retail'
                        ? 'bg-amber-500 text-white'
                        : 'bg-green-600 text-white'
                    }`}>
                      {product.channel === 'retail' ? '소매' : '도매'}
                    </span>
                  </div>
                  <div className="absolute top-2 right-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      product.isAvailable ? 'bg-blue-500 text-white' : 'bg-gray-500 text-white'
                    }`}>
                      {product.isAvailable ? '판매중' : '판매중지'}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 line-clamp-1">{product.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2 mt-1 h-10">{product.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-900">
                      {product.price.toLocaleString()}원
                    </span>
                    <span className="text-sm text-gray-500">재고 {product.quantity}개</span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Link
                      href={`/products/${product.id}/edit`}
                      className="flex-1 text-center py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                    >
                      수정
                    </Link>
                    <button
                      onClick={() => handleDelete(product.id)}
                      disabled={deletingId === product.id}
                      className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition disabled:opacity-50"
                    >
                      {deletingId === product.id ? '삭제중...' : '삭제'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

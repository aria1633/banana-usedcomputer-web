// components/mobile/banner-mobile.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Banner as BannerType } from '@/types/banner';
import { BannerService } from '@/lib/services/banner.service';

// 기본 배너
const DEFAULT_BANNER: BannerType = {
  id: 'default',
  title: '믿을 수 있는 중고 컴퓨터 거래',
  description: '검증된 도매상과 안전하게 거래하세요',
  imageUrl: '',
  linkUrl: '/sell-requests/new',
  buttonText: '매입 요청하기',
  isActive: true,
  displayOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export function BannerMobile() {
  const [banners, setBanners] = useState<BannerType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // 배너 불러오기
  useEffect(() => {
    const loadBanners = async () => {
      try {
        const data = await BannerService.getActiveBanners();
        if (data.length > 0) {
          setBanners(data);
        } else {
          setBanners([DEFAULT_BANNER]);
        }
      } catch (error) {
        console.error('Failed to load banners:', error);
        setBanners([DEFAULT_BANNER]);
      } finally {
        setLoading(false);
      }
    };

    loadBanners();
  }, []);

  // 자동 슬라이드 (2개 이상일 때만)
  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setIsTransitioning(true);
      setCurrentIndex((prev) => (prev + 1) % banners.length);
      setTimeout(() => setIsTransitioning(false), 600);
    }, 5000);

    return () => clearInterval(interval);
  }, [banners.length]);

  const handleIndicatorClick = (index: number) => {
    if (isTransitioning || index === currentIndex) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
    setTimeout(() => setIsTransitioning(false), 600);
  };

  if (loading) {
    return (
      <div className="px-4 mt-4">
        <div className="bg-gray-200 animate-pulse rounded-xl h-48"></div>
      </div>
    );
  }

  const currentBanner = banners[currentIndex];
  const isDefault = currentBanner.id === 'default';

  return (
    <div className="px-4 mt-4">
      <div className="relative overflow-hidden">
        {/* 배너 컨텐츠 */}
        <div className="relative">
          {banners.map((banner, index) => {
            const isDefault = banner.id === 'default';
            const isActive = index === currentIndex;

            return (
              <div
                key={banner.id}
                className={`absolute inset-0 transition-all duration-600 ease-in-out ${
                  isActive
                    ? 'opacity-100 translate-x-0 z-10'
                    : index < currentIndex
                    ? 'opacity-0 -translate-x-full z-0'
                    : 'opacity-0 translate-x-full z-0'
                }`}
              >
                <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl overflow-hidden">
                  {isDefault ? (
                    // 기본 배너 (모바일 최적화)
                    <div className="px-4 py-6">
                      <div className="text-center">
                        <div className="text-4xl mb-3">🖥️</div>
                        <h2 className="text-lg font-bold mb-2">
                          {banner.title}
                        </h2>
                        <p className="text-sm mb-4 text-white/90">
                          {banner.description}
                        </p>

                        {/* 통계 카드 - 가로 스크롤 */}
                        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                          <div className="flex-shrink-0 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 min-w-[80px]">
                            <div className="text-lg font-bold">1,000+</div>
                            <div className="text-xs text-white/80">거래완료</div>
                          </div>
                          <div className="flex-shrink-0 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 min-w-[80px]">
                            <div className="text-lg font-bold">500+</div>
                            <div className="text-xs text-white/80">등록상품</div>
                          </div>
                          <div className="flex-shrink-0 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 min-w-[80px]">
                            <div className="text-lg font-bold">100+</div>
                            <div className="text-xs text-white/80">인증도매상</div>
                          </div>
                        </div>

                        <Link
                          href={banner.linkUrl || '/sell-requests/new'}
                          className="inline-block bg-white text-amber-600 px-5 py-2.5 rounded-lg font-semibold hover:bg-white/90 transition-all text-sm"
                        >
                          {banner.buttonText || '매입 요청하기'}
                        </Link>
                      </div>
                    </div>
                  ) : (
                    // 커스텀 배너 (이미지만)
                    <Link
                      href={banner.linkUrl || '#'}
                      className="block relative h-48 cursor-pointer"
                    >
                      <Image
                        src={banner.imageUrl}
                        alt={banner.title}
                        fill
                        className="object-cover rounded-xl"
                        unoptimized
                        priority={isActive}
                      />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}

          {/* 높이 유지를 위한 숨겨진 요소 */}
          <div className="invisible">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl overflow-hidden">
              {isDefault ? (
                <div className="px-4 py-6">
                  <div className="text-center">
                    <div className="text-4xl mb-3">🖥️</div>
                    <h2 className="text-lg font-bold mb-2">
                      {currentBanner.title}
                    </h2>
                    <p className="text-sm mb-4 text-white/90">
                      {currentBanner.description}
                    </p>
                    <div className="flex gap-2 mb-4">
                      <div className="flex-shrink-0 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 min-w-[80px]">
                        <div className="text-lg font-bold">1,000+</div>
                        <div className="text-xs text-white/80">거래완료</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-48"></div>
              )}
            </div>
          </div>
        </div>

        {/* 인디케이터 (2개 이상일 때만 표시) */}
        {banners.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => handleIndicatorClick(index)}
                disabled={isTransitioning}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  index === currentIndex
                    ? 'bg-white w-6'
                    : 'bg-white/50'
                } ${isTransitioning ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                aria-label={`배너 ${index + 1}로 이동`}
              />
            ))}
          </div>
        )}
      </div>

      {/* 스크롤바 숨기기 스타일 */}
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

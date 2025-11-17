// components/layout/banner.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Banner as BannerType } from '@/types/banner';
import { BannerService } from '@/lib/services/banner.service';

// 기본 배너 (데이터베이스에 배너가 없을 경우)
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

export function Banner() {
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
    }, 5000); // 5초마다 변경

    return () => clearInterval(interval);
  }, [banners.length]);

  const handleSlideChange = (direction: 'prev' | 'next') => {
    if (isTransitioning) return;

    setIsTransitioning(true);

    if (direction === 'next') {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    } else {
      setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
    }

    setTimeout(() => setIsTransitioning(false), 600);
  };

  const handlePrev = () => {
    handleSlideChange('prev');
  };

  const handleNext = () => {
    handleSlideChange('next');
  };

  const handleIndicatorClick = (index: number) => {
    if (isTransitioning || index === currentIndex) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
    setTimeout(() => setIsTransitioning(false), 600);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-gray-200 animate-pulse rounded-2xl h-64"></div>
      </div>
    );
  }

  const currentBanner = banners[currentIndex];
  const isDefault = currentBanner.id === 'default';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
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
                <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl overflow-hidden">
                  {isDefault ? (
                    // 기본 배너 (기존 디자인)
                    <div className="px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-center">
                        <div>
                          <h2 className="text-xl md:text-2xl font-bold mb-2 md:mb-3">
                            {banner.title}
                          </h2>
                          <p className="text-sm md:text-base mb-3 md:mb-4 text-white/90">
                            {banner.description}
                          </p>
                          <div className="flex flex-wrap gap-2 md:gap-3">
                            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-2.5 md:px-3 py-1.5 md:py-2">
                              <div className="text-lg md:text-xl font-bold">1,000+</div>
                              <div className="text-xs text-white/80">거래 완료</div>
                            </div>
                            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-2.5 md:px-3 py-1.5 md:py-2">
                              <div className="text-lg md:text-xl font-bold">500+</div>
                              <div className="text-xs text-white/80">등록 상품</div>
                            </div>
                            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-2.5 md:px-3 py-1.5 md:py-2">
                              <div className="text-lg md:text-xl font-bold">100+</div>
                              <div className="text-xs text-white/80">인증 도매상</div>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-white/20">
                          <div className="text-center">
                            <div className="text-4xl md:text-5xl mb-2 md:mb-3">🖥️</div>
                            <h3 className="text-base md:text-lg font-bold mb-1.5">역경매 시스템</h3>
                            <p className="text-xs md:text-sm text-white/90 mb-3">
                              컴퓨터를 팔고 싶으세요?<br />
                              여러 도매상이 경쟁적으로 가격을 제시합니다!
                            </p>
                            <Link
                              href={banner.linkUrl || '/sell-requests/new'}
                              className="inline-block bg-white text-amber-600 px-5 md:px-6 py-2 md:py-2.5 rounded-lg font-semibold hover:bg-white/90 transition-all hover:scale-105"
                            >
                              {banner.buttonText || '매입 요청하기'}
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // 커스텀 배너 (이미지만)
                    <Link
                      href={banner.linkUrl || '#'}
                      className="block relative h-64 md:h-80 cursor-pointer"
                    >
                      <Image
                        src={banner.imageUrl}
                        alt={banner.title}
                        fill
                        className="object-cover rounded-2xl"
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
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl overflow-hidden">
              {isDefault ? (
                <div className="px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-center">
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold mb-2 md:mb-3">
                        {currentBanner.title}
                      </h2>
                      <p className="text-sm md:text-base mb-3 md:mb-4 text-white/90">
                        {currentBanner.description}
                      </p>
                      <div className="flex flex-wrap gap-2 md:gap-3">
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg px-2.5 md:px-3 py-1.5 md:py-2">
                          <div className="text-lg md:text-xl font-bold">1,000+</div>
                          <div className="text-xs text-white/80">거래 완료</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-white/20">
                      <div className="text-center">
                        <div className="text-4xl md:text-5xl mb-2 md:mb-3">🖥️</div>
                        <h3 className="text-base md:text-lg font-bold mb-1.5">역경매 시스템</h3>
                        <p className="text-xs md:text-sm text-white/90 mb-3">
                          컴퓨터를 팔고 싶으세요?
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-64 md:h-80"></div>
              )}
            </div>
          </div>
        </div>

        {/* 네비게이션 버튼 (2개 이상일 때만 표시) */}
        {banners.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all z-10"
              aria-label="이전 배너"
            >
              <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all z-10"
              aria-label="다음 배너"
            >
              <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* 인디케이터 */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {banners.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handleIndicatorClick(index)}
                  disabled={isTransitioning}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentIndex
                      ? 'bg-white w-8'
                      : 'bg-white/50 hover:bg-white/75'
                  } ${isTransitioning ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  aria-label={`배너 ${index + 1}로 이동`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

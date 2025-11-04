// components/layout/banner.tsx
'use client';

import Link from 'next/link';

export function Banner() {
  return (
    <div className="bg-gradient-to-r from-primary to-purple-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* 광고 텍스트 */}
          <div>
            <h2 className="text-3xl font-bold mb-4">
              믿을 수 있는 중고 컴퓨터 거래
            </h2>
            <p className="text-lg mb-6 text-white/90">
              검증된 도매상과 안전하게 거래하세요
            </p>
            <div className="flex gap-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3">
                <div className="text-2xl font-bold">1,000+</div>
                <div className="text-sm text-white/80">거래 완료</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3">
                <div className="text-2xl font-bold">500+</div>
                <div className="text-sm text-white/80">등록 상품</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3">
                <div className="text-2xl font-bold">100+</div>
                <div className="text-sm text-white/80">인증 도매상</div>
              </div>
            </div>
          </div>

          {/* 광고 이미지 영역 */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 border border-white/20">
            <div className="text-center">
              <div className="text-6xl mb-4">🖥️</div>
              <h3 className="text-xl font-bold mb-2">역경매 시스템</h3>
              <p className="text-white/90 mb-4">
                컴퓨터를 팔고 싶으세요?<br />
                여러 도매상이 경쟁적으로 가격을 제시합니다!
              </p>
              <Link
                href="/sell-requests/new"
                className="inline-block bg-white text-primary px-6 py-2 rounded-md font-semibold hover:bg-white/90 transition"
              >
                매입 요청하기
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

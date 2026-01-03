// app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/use-auth';
import { UserType } from '@/types/user';

export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // 로그인 상태면 사용자 유형에 따라 자동 리다이렉트
  useEffect(() => {
    if (!isLoading && user) {
      // localStorage에서 선호 경로 확인
      const preferredPath = localStorage.getItem('preferred_home');

      if (preferredPath) {
        router.push(preferredPath);
      } else if (user.userType === UserType.WHOLESALER) {
        router.push('/business');
      } else if (user.userType === UserType.ADMIN) {
        router.push('/admin/dashboard');
      } else {
        router.push('/consumer');
      }
    }
  }, [user, isLoading, router]);

  // 로딩 중이거나 리다이렉트 중일 때
  if (isLoading || user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-amber-500"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      {/* 헤더 */}
      <header className="absolute top-0 left-0 right-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              <span className="text-gradient">🍌 바나나 중고컴퓨터</span>
            </h1>
            <div className="flex gap-4">
              <Link
                href="/login"
                className="px-6 py-2.5 text-gray-700 hover:text-gray-900 font-medium transition"
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="px-6 py-2.5 gradient-primary text-white rounded-lg hover:shadow-lg transition-all font-medium"
              >
                회원가입
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
            중고 컴퓨터
            <span className="text-gradient block mt-2">도매 매칭 플랫폼</span>
          </h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            검증된 도매상과 일반 소비자를 연결하는 역경매 시스템
          </p>
        </div>

        {/* 선택 버튼 영역 */}
        <div className="grid md:grid-cols-2 gap-6 md:gap-8 w-full max-w-4xl">
          {/* 일반 소비자 버튼 */}
          <Link
            href="/consumer"
            onClick={() => localStorage.setItem('preferred_home', '/consumer')}
            className="group relative bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-transparent hover:border-amber-400"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-400/10 to-orange-400/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative p-8 md:p-10">
              <div className="text-6xl md:text-7xl mb-6">🖥️</div>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                컴퓨터 구매하기
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                중고 컴퓨터를 구매하거나<br />
                내 컴퓨터를 최고가로 판매하세요
              </p>
              <ul className="text-sm text-gray-500 space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  검증된 도매상의 상품 구매
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  역경매로 내 컴퓨터 판매
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  경쟁 입찰로 최고가 보장
                </li>
              </ul>
              <div className="flex items-center text-amber-600 font-semibold group-hover:translate-x-2 transition-transform">
                일반 사용자로 시작하기
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* 도매 셀러 버튼 */}
          <Link
            href="/business"
            onClick={() => localStorage.setItem('preferred_home', '/business')}
            className="group relative bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-transparent hover:border-blue-400"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative p-8 md:p-10">
              <div className="text-6xl md:text-7xl mb-6">🏢</div>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                도매 셀러 입장
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                상품을 등록하고 판매하거나<br />
                매입 요청에 입찰하세요
              </p>
              <ul className="text-sm text-gray-500 space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  상품 등록 및 재고 관리
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  매입 요청에 블라인드 입찰
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  사업자 인증으로 신뢰 확보
                </li>
              </ul>
              <div className="flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform">
                도매상으로 시작하기
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        {/* 하단 정보 */}
        <div className="mt-16 text-center text-gray-500 text-sm">
          <p>© 2025 바나나 중고컴퓨터. All rights reserved.</p>
        </div>
      </main>
    </div>
  );
}

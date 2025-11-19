// components/layout/header.tsx
'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthService } from '@/lib/services/auth.service';
import { useAuthStore } from '@/lib/store/auth.store';
import { UserType, VerificationStatus } from '@/types/user';
import { useState, useEffect, Suspense } from 'react';
import { HeaderMobile } from '@/components/mobile/header-mobile';

function HeaderContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuthStore();
  const [showRejectionBanner, setShowRejectionBanner] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');

  console.log('[Header] Rendering with:', { hasUser: !!user, isLoading });

  // URL의 검색어 파라미터 로드
  useEffect(() => {
    const keyword = searchParams.get('search');
    if (keyword) {
      setSearchKeyword(keyword);
    }
  }, [searchParams]);

  // 거부 사유 알림 배너 표시 여부 확인
  useEffect(() => {
    if (!user) {
      setShowRejectionBanner(false);
      return;
    }

    // REJECTED 상태이고 거부 사유가 있으면 배너 표시
    if (
      user.verificationStatus === VerificationStatus.REJECTED &&
      user.rejectionReason
    ) {
      // 로컬스토리지에서 이 사용자가 이미 배너를 닫았는지 확인
      const dismissedKey = `rejection-banner-dismissed-${user.uid}`;
      const isDismissed = localStorage.getItem(dismissedKey);

      if (!isDismissed) {
        setShowRejectionBanner(true);
      }
    } else {
      setShowRejectionBanner(false);
    }
  }, [user]);

  const handleDismissRejectionBanner = () => {
    if (user) {
      const dismissedKey = `rejection-banner-dismissed-${user.uid}`;
      localStorage.setItem(dismissedKey, 'true');
      setShowRejectionBanner(false);
    }
  };

  const handleLogout = async () => {
    console.log('[Header] Logout button clicked');
    try {
      console.log('[Header] Calling AuthService.signOut()');
      await AuthService.signOut();
      console.log('[Header] SignOut successful, clearing user state');
      setUser(null);
      console.log('[Header] Redirecting to home');
      router.push('/');
    } catch (error) {
      console.error('[Header] 로그아웃 실패:', error);
      // 에러가 발생해도 클라이언트 측 상태는 클리어
      setUser(null);
      router.push('/');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchKeyword.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchKeyword.trim())}`);
    } else {
      router.push('/products');
    }
  };

  return (
    <>
      {/* 모바일 헤더 */}
      <div className="lg:hidden">
        <HeaderMobile />
      </div>

      {/* 데스크탑 헤더 */}
      <header className="hidden lg:block glass border-b border-white/20 sticky top-0 z-50 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 상단 바 */}
          <div className="flex justify-between items-center h-20">
            {/* 로고 */}
            <Link href="/" className="flex items-center group">
              <h1 className="text-3xl font-bold">
                <span className="text-gradient transition-all group-hover:scale-105 inline-block">
                  🍌 바나나 중고컴퓨터
                </span>
              </h1>
            </Link>

            {/* 네비게이션 */}
            <nav className="flex items-center gap-6 text-lg">
              {!isLoading ? (
                <>
                  {user ? (
                    <>
                      {/* 로그인 상태 */}
                      <Link
                        href="/products"
                        className="text-gray-700 hover:text-primary transition-all font-medium relative group"
                      >
                        상품 목록
                        <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-primary group-hover:w-full transition-all duration-300"></span>
                      </Link>

                      {/* 사용자 타입별 메뉴 */}
                      {user.userType === UserType.ADMIN && (
                        <>
                          <Link
                            href="/admin/dashboard"
                            className="text-gray-700 hover:text-primary transition"
                          >
                            관리자
                          </Link>
                          <Link
                            href="/admin/users"
                            className="text-gray-700 hover:text-primary transition"
                          >
                            회원관리
                          </Link>
                          <Link
                            href="/admin/banners"
                            className="text-gray-700 hover:text-primary transition"
                          >
                            배너관리
                          </Link>
                        </>
                      )}

                      {user.userType === UserType.WHOLESALER &&
                        user.verificationStatus === VerificationStatus.APPROVED && (
                          <>
                            <Link
                              href="/wholesaler/dashboard"
                              className="text-gray-700 hover:text-primary transition"
                            >
                              도매상 대시보드
                            </Link>
                            <Link
                              href="/products/new"
                              className="text-gray-700 hover:text-primary transition"
                            >
                              상품 등록
                            </Link>
                          </>
                        )}

                      {user.userType === UserType.NORMAL && (
                        <>
                          <Link
                            href="/sell-requests/new"
                            className="text-gray-700 hover:text-primary transition"
                          >
                            매입 요청
                          </Link>
                          <Link
                            href="/sell-requests/my"
                            className="text-gray-700 hover:text-primary transition"
                          >
                            내 요청
                          </Link>
                        </>
                      )}

                      <div className="flex items-center gap-3 border-l pl-6">
                        <span className="text-sm text-gray-600">{user.name}님</span>
                        <Link
                          href="/mypage"
                          className="text-sm text-gray-600 hover:text-gray-900 transition"
                        >
                          마이페이지
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="text-sm text-gray-600 hover:text-gray-900 transition"
                        >
                          로그아웃
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* 비로그인 상태 */}
                      <Link
                        href="/login"
                        className="text-gray-700 hover:text-primary transition font-medium"
                      >
                        로그인
                      </Link>
                      <Link
                        href="/signup"
                        className="px-6 py-2.5 gradient-primary text-white rounded-lg hover:shadow-lg transition-all font-medium hover:scale-105"
                      >
                        회원가입
                      </Link>
                    </>
                  )}
                </>
              ) : (
                <div className="text-gray-500">로딩 중...</div>
              )}
            </nav>
          </div>

          {/* 검색바 및 카테고리 메뉴 */}
          <div className="border-t border-gray-200/50 py-4">
            <div className="flex items-center justify-between gap-8">
              {/* 카테고리 링크 */}
              <div className="flex gap-8 text-lg">
                <Link href="/" className="text-gray-700 hover:text-primary transition-all font-medium relative group">
                  전체상품
                  <span className="absolute -bottom-3 left-0 w-0 h-0.5 bg-gradient-primary group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link href="/sell-requests" className="text-gray-700 hover:text-primary transition-all font-medium relative group">
                  매입요청
                  <span className="absolute -bottom-3 left-0 w-0 h-0.5 bg-gradient-primary group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link href="/products?category=노트북" className="text-gray-700 hover:text-primary transition-all font-medium relative group">
                  노트북
                  <span className="absolute -bottom-3 left-0 w-0 h-0.5 bg-gradient-primary group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link href="/products?category=데스크탑" className="text-gray-700 hover:text-primary transition-all font-medium relative group">
                  데스크탑
                  <span className="absolute -bottom-3 left-0 w-0 h-0.5 bg-gradient-primary group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link href="/products?category=모니터" className="text-gray-700 hover:text-primary transition-all font-medium relative group">
                  모니터
                  <span className="absolute -bottom-3 left-0 w-0 h-0.5 bg-gradient-primary group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link href="/products?category=스마트폰" className="text-gray-700 hover:text-primary transition-all font-medium relative group">
                  스마트폰
                  <span className="absolute -bottom-3 left-0 w-0 h-0.5 bg-gradient-primary group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link href="/products?category=부품" className="text-gray-700 hover:text-primary transition-all font-medium relative group">
                  부품
                  <span className="absolute -bottom-3 left-0 w-0 h-0.5 bg-gradient-primary group-hover:w-full transition-all duration-300"></span>
                </Link>
              </div>

              {/* 검색바 */}
              <form onSubmit={handleSearch} className="flex-shrink-0">
                <div className="relative">
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    placeholder="상품 검색..."
                    className="w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                  <button
                    type="submit"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition"
                    aria-label="검색"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* 도매상 승인 거부 알림 배너 */}
      {showRejectionBanner && user && user.rejectionReason && (
        <div className="bg-red-50 border-b border-red-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-red-800">
                  도매상 신청이 거부되었습니다
                </h3>
                <p className="mt-1 text-sm text-red-700 whitespace-pre-line">
                  {user.rejectionReason}
                </p>
                <p className="mt-2 text-xs text-red-600">
                  문제를 해결하신 후 다시 도매상 신청을 하실 수 있습니다.
                </p>
              </div>
              <button
                onClick={handleDismissRejectionBanner}
                className="flex-shrink-0 text-red-400 hover:text-red-600 transition"
                aria-label="알림 닫기"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        </div>
      )}
    </>
  );
}

export function Header() {
  return (
    <Suspense fallback={
      <header className="glass border-b border-white/20 sticky top-0 z-50 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="text-2xl font-bold text-gradient">🍌 바나나 중고컴퓨터</div>
          </div>
        </div>
      </header>
    }>
      <HeaderContent />
    </Suspense>
  );
}

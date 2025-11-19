// components/mobile/header-mobile.tsx
'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthService } from '@/lib/services/auth.service';
import { useAuthStore } from '@/lib/store/auth.store';
import { UserType, VerificationStatus } from '@/types/user';
import { useState, useEffect } from 'react';

export function HeaderMobile() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [showRejectionBanner, setShowRejectionBanner] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 거부 사유 알림 배너 표시 여부 확인
  useEffect(() => {
    if (!user) {
      setShowRejectionBanner(false);
      return;
    }

    if (
      user.verificationStatus === VerificationStatus.REJECTED &&
      user.rejectionReason
    ) {
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
    try {
      await AuthService.signOut();
      setUser(null);
      setIsMenuOpen(false);
      router.push('/');
    } catch (error) {
      console.error('[HeaderMobile] 로그아웃 실패:', error);
      setUser(null);
      router.push('/');
    }
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  // 메뉴가 열려있을 때 body 스크롤 방지
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  return (
    <>
      <header className="glass border-b border-white/20 sticky top-0 z-50 shadow-soft">
        <div className="px-4 py-3">
          <div className="flex justify-between items-center">
            {/* 로고 */}
            <Link href="/" className="flex items-center" onClick={closeMenu}>
              <h1 className="text-xl font-bold">
                <span className="text-gradient">🍌 바나나</span>
              </h1>
            </Link>

            {/* 햄버거 메뉴 버튼 */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="메뉴"
            >
              {isMenuOpen ? (
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 전체화면 모바일 메뉴 */}
      <div
        className={`fixed inset-0 z-40 transition-all duration-300 ${
          isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
      >
        {/* 오버레이 */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={closeMenu}
        />

        {/* 메뉴 패널 */}
        <div
          className={`absolute top-[57px] right-0 w-full max-w-sm h-[calc(100vh-57px)] bg-white shadow-2xl transition-transform duration-300 overflow-y-auto ${
            isMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="p-6">
            {!isLoading ? (
              <>
                {user ? (
                  <>
                    {/* 사용자 정보 */}
                    <div className="mb-6 pb-6 border-b border-gray-200">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center">
                          <span className="text-white text-xl font-bold">
                            {user.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{user.name}님</p>
                          <p className="text-sm text-gray-600">
                            {user.userType === UserType.ADMIN && '관리자'}
                            {user.userType === UserType.WHOLESALER && '도매상'}
                            {user.userType === UserType.NORMAL && '일반회원'}
                          </p>
                        </div>
                      </div>
                      {user.verificationStatus === VerificationStatus.PENDING && (
                        <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                          <p className="text-xs text-yellow-800">사업자 인증 대기중</p>
                        </div>
                      )}
                      {user.verificationStatus === VerificationStatus.APPROVED && user.userType === UserType.WHOLESALER && (
                        <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-2">
                          <p className="text-xs text-green-800 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            인증된 도매상
                          </p>
                        </div>
                      )}
                    </div>

                    {/* 메뉴 리스트 */}
                    <nav className="space-y-1">
                      <Link
                        href="/products"
                        onClick={closeMenu}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        상품 목록
                      </Link>

                      {/* 관리자 메뉴 */}
                      {user.userType === UserType.ADMIN && (
                        <>
                          <div className="pt-4 pb-2 px-4">
                            <p className="text-xs font-semibold text-gray-500 uppercase">관리자</p>
                          </div>
                          <Link
                            href="/admin/dashboard"
                            onClick={closeMenu}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            관리자 대시보드
                          </Link>
                          <Link
                            href="/admin/users"
                            onClick={closeMenu}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            회원관리
                          </Link>
                          <Link
                            href="/admin/banners"
                            onClick={closeMenu}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            배너관리
                          </Link>
                        </>
                      )}

                      {/* 도매상 메뉴 */}
                      {user.userType === UserType.WHOLESALER &&
                        user.verificationStatus === VerificationStatus.APPROVED && (
                          <>
                            <div className="pt-4 pb-2 px-4">
                              <p className="text-xs font-semibold text-gray-500 uppercase">도매상</p>
                            </div>
                            <Link
                              href="/wholesaler/dashboard"
                              onClick={closeMenu}
                              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                              도매상 대시보드
                            </Link>
                            <Link
                              href="/products/new"
                              onClick={closeMenu}
                              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              상품 등록
                            </Link>
                          </>
                        )}

                      {/* 일반회원 메뉴 */}
                      {user.userType === UserType.NORMAL && (
                        <>
                          <div className="pt-4 pb-2 px-4">
                            <p className="text-xs font-semibold text-gray-500 uppercase">매입요청</p>
                          </div>
                          <Link
                            href="/sell-requests/new"
                            onClick={closeMenu}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            매입 요청하기
                          </Link>
                          <Link
                            href="/sell-requests/my"
                            onClick={closeMenu}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            내 요청
                          </Link>
                        </>
                      )}

                      {/* 공통 메뉴 */}
                      <div className="pt-4 pb-2 px-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase">내 정보</p>
                      </div>
                      <Link
                        href="/mypage"
                        onClick={closeMenu}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        마이페이지
                      </Link>

                      {/* 로그아웃 */}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 transition-colors text-red-600 font-medium mt-4"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        로그아웃
                      </button>
                    </nav>
                  </>
                ) : (
                  <>
                    {/* 비로그인 상태 */}
                    <nav className="space-y-3">
                      <Link
                        href="/login"
                        onClick={closeMenu}
                        className="block w-full px-6 py-3 text-center border-2 border-primary text-primary rounded-lg font-semibold hover:bg-primary hover:text-white transition-colors"
                      >
                        로그인
                      </Link>
                      <Link
                        href="/signup"
                        onClick={closeMenu}
                        className="block w-full px-6 py-3 text-center gradient-primary text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                      >
                        회원가입
                      </Link>

                      <div className="pt-6">
                        <Link
                          href="/products"
                          onClick={closeMenu}
                          className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          상품 둘러보기
                        </Link>
                      </div>
                    </nav>
                  </>
                )}
              </>
            ) : (
              <div className="text-center py-10">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-primary"></div>
                <p className="mt-4 text-gray-600">로딩 중...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 도매상 승인 거부 알림 배너 (모바일 최적화) */}
      {showRejectionBanner && user && user.rejectionReason && (
        <div className="bg-red-50 border-b border-red-200">
          <div className="px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 pt-0.5">
                <svg
                  className="w-5 h-5 text-red-600"
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
                <p className="mt-1 text-xs text-red-700 whitespace-pre-line">
                  {user.rejectionReason}
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

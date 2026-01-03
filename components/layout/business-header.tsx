// components/layout/business-header.tsx
'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthService } from '@/lib/services/auth.service';
import { useAuthStore } from '@/lib/store/auth.store';
import { VerificationStatus } from '@/types/user';
import { useState, Suspense } from 'react';
import { isAdmin } from '@/lib/utils/auth';

function BusinessHeaderContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isAdminUser = isAdmin(user);
  const isApproved = isAdminUser || user?.verificationStatus === VerificationStatus.APPROVED;
  const isPending = user?.verificationStatus === VerificationStatus.PENDING;
  const isRejected = user?.verificationStatus === VerificationStatus.REJECTED;

  const handleLogout = async () => {
    try {
      await AuthService.signOut();
      setUser(null);
      localStorage.removeItem('preferred_home');
      router.push('/');
    } catch (error) {
      console.error('로그아웃 실패:', error);
      setUser(null);
      router.push('/');
    }
  };

  return (
    <>
      {/* 모바일 헤더 */}
      <header className="lg:hidden bg-slate-900 text-white sticky top-0 z-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/business" className="flex items-center">
              <span className="text-xl font-bold">🍌 바나나</span>
              <span className="ml-2 text-xs bg-blue-600 px-2 py-0.5 rounded">셀러</span>
            </Link>
            <div className="flex items-center gap-3">
              {!isLoading && user ? (
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-2 text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              ) : (
                <Link href="/login" className="text-sm text-gray-300">로그인</Link>
              )}
            </div>
          </div>
        </div>

        {/* 모바일 메뉴 */}
        {isMobileMenuOpen && user && (
          <div className="border-t border-slate-700 bg-slate-800 px-4 py-3">
            <nav className="space-y-3">
              {isApproved ? (
                <>
                  <Link href="/business/products" className="block text-gray-200 py-2">내 상품 관리</Link>
                  <Link href="/business/products/new" className="block text-gray-200 py-2">상품 등록</Link>
                  <Link href="/business/bids" className="block text-gray-200 py-2">입찰 관리</Link>
                </>
              ) : (
                <Link href="/business/verification" className="block text-yellow-400 py-2">사업자 인증하기</Link>
              )}
              {/* 관리자 전용 메뉴 */}
              {isAdminUser && (
                <>
                  <hr className="my-2 border-slate-600" />
                  <p className="text-xs text-red-400 font-semibold">관리자 메뉴</p>
                  <Link href="/business/admin/verifications" className="block text-red-300 py-2">사업자 인증 관리</Link>
                  <Link href="/business/admin/users" className="block text-red-300 py-2">회원 관리</Link>
                </>
              )}
              <hr className="my-2 border-slate-600" />
              <Link href="/business/mypage" className="block text-gray-300 py-2">마이페이지</Link>
              <button onClick={handleLogout} className="block text-gray-400 py-2 w-full text-left">로그아웃</button>
            </nav>
          </div>
        )}
      </header>

      {/* 데스크탑 헤더 */}
      <header className="hidden lg:block bg-slate-900 text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 상단 바 */}
          <div className="flex justify-between items-center h-16">
            {/* 로고 */}
            <Link href="/business" className="flex items-center group">
              <h1 className="text-2xl font-bold">
                🍌 바나나 중고컴퓨터
              </h1>
              <span className="ml-3 text-xs bg-blue-600 text-white px-2 py-1 rounded-full font-medium">
                도매 셀러
              </span>
            </Link>

            {/* 네비게이션 */}
            <nav className="flex items-center gap-6">
              {!isLoading ? (
                <>
                  {user ? (
                    <>
                      {isApproved ? (
                        <>
                          <Link href="/business/products" className="text-gray-300 hover:text-white transition font-medium">
                            내 상품 관리
                          </Link>
                          <Link href="/business/products/new" className="text-gray-300 hover:text-white transition font-medium">
                            상품 등록
                          </Link>
                          <Link href="/business/bids" className="text-gray-300 hover:text-white transition font-medium">
                            입찰 관리
                          </Link>
                        </>
                      ) : (
                        <Link href="/business/verification" className="text-yellow-400 hover:text-yellow-300 transition font-medium">
                          사업자 인증 필요
                        </Link>
                      )}
                      {/* 관리자 전용 메뉴 */}
                      {isAdminUser && (
                        <>
                          <div className="border-l border-slate-600 pl-4 flex items-center gap-4">
                            <span className="text-xs text-red-400 font-bold">관리자</span>
                            <Link href="/business/admin/verifications" className="text-red-300 hover:text-red-200 transition font-medium text-sm">
                              인증관리
                            </Link>
                            <Link href="/business/admin/users" className="text-red-300 hover:text-red-200 transition font-medium text-sm">
                              회원관리
                            </Link>
                          </div>
                        </>
                      )}
                      <div className="flex items-center gap-3 border-l border-slate-700 pl-6">
                        <span className="text-sm text-gray-400">{user.name}님</span>
                        <Link href="/business/mypage" className="text-sm text-gray-400 hover:text-white transition">
                          마이페이지
                        </Link>
                        <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white transition">
                          로그아웃
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <Link href="/login" className="text-gray-300 hover:text-white transition font-medium">
                        로그인
                      </Link>
                      <Link href="/signup" className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
                        회원가입
                      </Link>
                    </>
                  )}
                </>
              ) : (
                <div className="text-gray-400">로딩 중...</div>
              )}
            </nav>
          </div>

          {/* 상태 바 및 메뉴 */}
          <div className="border-t border-slate-700 py-3">
            <div className="flex items-center justify-between">
              {/* 인증 상태 표시 */}
              <div className="flex items-center gap-4">
                {isApproved && (
                  <span className="flex items-center gap-2 text-sm text-green-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    사업자 인증 완료
                  </span>
                )}
                {isPending && (
                  <span className="flex items-center gap-2 text-sm text-yellow-400">
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    인증 심사 중
                  </span>
                )}
                {isRejected && (
                  <span className="flex items-center gap-2 text-sm text-red-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    인증 거부됨 - 재신청 필요
                  </span>
                )}
              </div>

              {/* 빠른 통계 (인증된 경우만) */}
              {isApproved && (
                <div className="flex items-center gap-6 text-sm text-gray-400">
                  <span>매입 요청 확인하기</span>
                  <Link href="/consumer/sell-requests" className="text-blue-400 hover:text-blue-300 transition">
                    매입 요청 목록 →
                  </Link>
                </div>
              )}

              {/* 일반 사용자 전환 링크 */}
              <Link href="/consumer" className="text-xs text-gray-500 hover:text-amber-400 transition">
                일반 사용자로 전환 →
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* 거부 사유 배너 */}
      {isRejected && user?.rejectionReason && (
        <div className="bg-red-900/50 border-b border-red-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm text-red-200 font-medium">인증 거부 사유: {user.rejectionReason}</p>
                <Link href="/business/verification" className="text-xs text-red-300 hover:text-red-100 underline mt-1 inline-block">
                  다시 신청하기
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function BusinessHeader() {
  return (
    <Suspense fallback={
      <header className="bg-slate-900 text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="text-2xl font-bold">🍌 바나나 중고컴퓨터</div>
          </div>
        </div>
      </header>
    }>
      <BusinessHeaderContent />
    </Suspense>
  );
}

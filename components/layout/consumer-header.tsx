// components/layout/consumer-header.tsx
'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthService } from '@/lib/services/auth.service';
import { useAuthStore } from '@/lib/store/auth.store';
import { useState, useEffect, Suspense } from 'react';

function ConsumerHeaderContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuthStore();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // URL의 검색어 파라미터 로드
  useEffect(() => {
    const keyword = searchParams.get('search');
    if (keyword) {
      setSearchKeyword(keyword);
    }
  }, [searchParams]);

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchKeyword.trim()) {
      router.push(`/consumer/products?search=${encodeURIComponent(searchKeyword.trim())}`);
    } else {
      router.push('/consumer/products');
    }
  };

  return (
    <>
      {/* 모바일 헤더 */}
      <header className="lg:hidden bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/consumer" className="flex items-center">
              <span className="text-xl font-bold text-gradient">🍌 바나나</span>
            </Link>
            <div className="flex items-center gap-3">
              {!isLoading && user ? (
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-2 text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              ) : (
                <Link href="/login" className="text-sm text-gray-600">로그인</Link>
              )}
            </div>
          </div>

          {/* 모바일 검색바 */}
          <form onSubmit={handleSearch} className="mt-3">
            <div className="relative">
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="상품 검색..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <button type="submit" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </form>
        </div>

        {/* 모바일 메뉴 */}
        {isMobileMenuOpen && user && (
          <div className="border-t border-gray-200 bg-white px-4 py-3">
            <nav className="space-y-3">
              <Link href="/consumer/products" className="block text-gray-700 py-2">상품 목록</Link>
              <Link href="/consumer/sell-requests" className="block text-gray-700 py-2">매입 요청</Link>
              <Link href="/consumer/sell-requests/new" className="block text-gray-700 py-2">내 컴퓨터 팔기</Link>
              <hr className="my-2" />
              <Link href="/mypage" className="block text-gray-700 py-2">마이페이지</Link>
              <button onClick={handleLogout} className="block text-gray-500 py-2 w-full text-left">로그아웃</button>
            </nav>
          </div>
        )}
      </header>

      {/* 데스크탑 헤더 */}
      <header className="hidden lg:block bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 상단 바 */}
          <div className="flex justify-between items-center h-16">
            {/* 로고 */}
            <Link href="/consumer" className="flex items-center group">
              <h1 className="text-2xl font-bold">
                <span className="text-gradient">🍌 바나나 중고컴퓨터</span>
              </h1>
              <span className="ml-3 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                일반 사용자
              </span>
            </Link>

            {/* 네비게이션 */}
            <nav className="flex items-center gap-6">
              {!isLoading ? (
                <>
                  {user ? (
                    <>
                      <Link href="/consumer/products" className="text-gray-700 hover:text-amber-600 transition font-medium">
                        상품 목록
                      </Link>
                      <Link href="/consumer/sell-requests" className="text-gray-700 hover:text-amber-600 transition font-medium">
                        매입 요청
                      </Link>
                      <Link href="/consumer/sell-requests/new" className="text-gray-700 hover:text-amber-600 transition font-medium">
                        내 컴퓨터 팔기
                      </Link>
                      <div className="flex items-center gap-3 border-l pl-6">
                        <span className="text-sm text-gray-600">{user.name}님</span>
                        <Link href="/mypage" className="text-sm text-gray-600 hover:text-gray-900 transition">
                          마이페이지
                        </Link>
                        <button onClick={handleLogout} className="text-sm text-gray-600 hover:text-gray-900 transition">
                          로그아웃
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <Link href="/consumer/products" className="text-gray-700 hover:text-amber-600 transition font-medium">
                        상품 보기
                      </Link>
                      <Link href="/login" className="text-gray-700 hover:text-amber-600 transition font-medium">
                        로그인
                      </Link>
                      <Link href="/signup" className="px-5 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition font-medium">
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

          {/* 카테고리 및 검색바 */}
          <div className="border-t border-gray-100 py-3">
            <div className="flex items-center justify-between gap-8">
              {/* 카테고리 링크 */}
              <div className="flex gap-6 text-sm">
                <Link href="/consumer/products" className="text-gray-600 hover:text-amber-600 transition font-medium">
                  전체상품
                </Link>
                <Link href="/consumer/products?category=노트북" className="text-gray-600 hover:text-amber-600 transition">
                  노트북
                </Link>
                <Link href="/consumer/products?category=데스크탑" className="text-gray-600 hover:text-amber-600 transition">
                  데스크탑
                </Link>
                <Link href="/consumer/products?category=모니터" className="text-gray-600 hover:text-amber-600 transition">
                  모니터
                </Link>
                <Link href="/consumer/products?category=스마트폰" className="text-gray-600 hover:text-amber-600 transition">
                  스마트폰
                </Link>
                <Link href="/consumer/products?category=부품" className="text-gray-600 hover:text-amber-600 transition">
                  부품
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
                    className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition text-sm"
                  />
                  <button type="submit" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-amber-500 transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </div>
              </form>

              {/* 도매상 전환 링크 */}
              <Link href="/business" className="text-xs text-gray-500 hover:text-blue-600 transition">
                도매상으로 전환 →
              </Link>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

export function ConsumerHeader() {
  return (
    <Suspense fallback={
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="text-2xl font-bold text-gradient">🍌 바나나 중고컴퓨터</div>
          </div>
        </div>
      </header>
    }>
      <ConsumerHeaderContent />
    </Suspense>
  );
}

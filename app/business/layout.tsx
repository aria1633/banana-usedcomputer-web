// app/business/layout.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BusinessHeader } from '@/components/layout/business-header';
import { useAuth } from '@/lib/hooks/use-auth';
import { UserType, VerificationStatus } from '@/types/user';

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // 비로그인 또는 일반 사용자 접근 시 리다이렉트
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.userType === UserType.NORMAL) {
        // 일반 사용자가 business에 접근하면 consumer로 리다이렉트
        router.push('/consumer');
      }
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user || user.userType === UserType.NORMAL) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <BusinessHeader />
      {children}
    </div>
  );
}

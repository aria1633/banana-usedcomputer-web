// lib/hooks/use-auth.ts
'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/config';
import { useAuthStore } from '@/lib/store/auth.store';
import { UserType, VerificationStatus } from '@/types/user';

export function useAuth() {
  const { user, isLoading, setUser, setLoading, refreshUser } = useAuthStore();

  useEffect(() => {
    let mounted = true;
    console.log('[use-auth] useEffect started, initial isLoading:', isLoading);

    // 페이지 포커스 시 사용자 정보 갱신
    const handleFocus = () => {
      console.log('[use-auth] Page focused, refreshing user data');
      refreshUser();
    };

    // 페이지 가시성 변경 시 사용자 정보 갱신 (탭 전환 등)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[use-auth] Page became visible, refreshing user data');
        refreshUser();
      }
    };

    // 페이지 포커스 및 가시성 변경 이벤트 리스너 등록
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 초기 세션 확인
    const checkSession = async () => {
      console.log('[use-auth] checkSession started');
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('[use-auth] getSession result:', { hasSession: !!session, error: sessionError });

        if (sessionError) {
          console.error('세션 확인 에러:', sessionError);
          if (mounted) {
            console.log('[use-auth] Setting user to null and loading to false (sessionError)');
            setUser(null);
            setLoading(false);
          }
          return;
        }

        if (session?.user) {
          console.log('[use-auth] Session found, fetching user data for:', session.user.id);

          const sessionToken = session.access_token;

          // fetch API로 사용자 정보 가져오기 (session token 사용)
          const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?uid=eq.${session.user.id}`;
          const response = await fetch(url, {
            headers: {
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              'Authorization': `Bearer ${sessionToken}`,
              'Content-Type': 'application/json',
            },
          });

          console.log('[use-auth] Fetch response status:', response.status);

          let userData = null;
          if (response.ok) {
            const data = await response.json();
            userData = data[0];
          }

          console.log('[use-auth] User data result:', { hasData: !!userData });

          if (mounted) {
            if (userData) {
              console.log('[use-auth] Setting user and loading to false (userData found)');
              setUser({
                uid: userData.uid,
                email: userData.email,
                name: userData.name,
                phoneNumber: userData.phone_number ?? null,
                businessRegistrationUrl: userData.business_registration_url ?? null,
                userType: userData.user_type as UserType,
                verificationStatus: userData.verification_status as VerificationStatus,
                rejectionReason: userData.rejection_reason ?? null,
                createdAt: new Date(userData.created_at),
                updatedAt: userData.updated_at ? new Date(userData.updated_at) : null,
              });
            } else {
              console.log('[use-auth] Setting user to null (no userData)');
              setUser(null);
            }
            console.log('[use-auth] Setting loading to false (after user data processing)');
            setLoading(false);
          }
        } else {
          console.log('[use-auth] No session found');
          if (mounted) {
            console.log('[use-auth] Setting user to null and loading to false (no session)');
            setUser(null);
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('인증 확인 에러:', error);
        if (mounted) {
          console.log('[use-auth] Setting user to null and loading to false (catch error)');
          setUser(null);
          setLoading(false);
        }
      }
    };

    console.log('[use-auth] Calling checkSession()');
    checkSession();

    // Supabase 인증 상태 변화 구독
    console.log('[use-auth] Setting up onAuthStateChange subscription');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[use-auth] Auth state changed:', event, 'has session:', !!session);
      if (!mounted) return;

      if (session?.user) {
        try {
          const sessionToken = session.access_token;

          // fetch API로 사용자 정보 가져오기 (session token 사용)
          const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?uid=eq.${session.user.id}`;
          const response = await fetch(url, {
            headers: {
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              'Authorization': `Bearer ${sessionToken}`,
              'Content-Type': 'application/json',
            },
          });

          let userData = null;
          if (response.ok) {
            const data = await response.json();
            userData = data[0];
          }

          console.log('[use-auth] onAuthStateChange - User data result:', { hasData: !!userData });

          if (mounted) {
            if (userData) {
              console.log('[use-auth] onAuthStateChange - Setting user (userData found)');
              setUser({
                uid: userData.uid,
                email: userData.email,
                name: userData.name,
                phoneNumber: userData.phone_number ?? null,
                businessRegistrationUrl: userData.business_registration_url ?? null,
                userType: userData.user_type as UserType,
                verificationStatus: userData.verification_status as VerificationStatus,
                rejectionReason: userData.rejection_reason ?? null,
                createdAt: new Date(userData.created_at),
                updatedAt: userData.updated_at ? new Date(userData.updated_at) : null,
              });
            } else {
              console.log('[use-auth] onAuthStateChange - Setting user to null (no userData)');
              setUser(null);
            }
          }
        } catch (error) {
          console.error('사용자 정보 로드 실패:', error);
          if (mounted) {
            console.log('[use-auth] onAuthStateChange - Setting user to null (error)');
            setUser(null);
          }
        }
      } else {
        console.log('[use-auth] onAuthStateChange - No session, setting user to null');
        if (mounted) setUser(null);
      }
    });

    return () => {
      console.log('[use-auth] Cleanup - unsubscribing');
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [setUser, setLoading, refreshUser]);

  console.log('[use-auth] Returning:', { hasUser: !!user, isLoading });
  return { user, isLoading, refreshUser };
}

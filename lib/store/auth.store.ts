// lib/store/auth.store.ts

import { create } from 'zustand';
import { User } from '@/types/user';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),

  // 사용자 정보 갱신 함수
  refreshUser: async () => {
    const currentUser = get().user;
    if (!currentUser) return;

    try {
      console.log('[AuthStore] Refreshing user data for:', currentUser.uid);

      // localStorage에서 토큰 가져오기
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        console.log('[AuthStore] No access token found');
        return;
      }

      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?uid=eq.${currentUser.uid}`;
      const response = await fetch(url, {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('[AuthStore] Failed to refresh user:', response.status);
        return;
      }

      const data = await response.json();
      const userData = data[0];

      if (userData) {
        console.log('[AuthStore] User data refreshed successfully');
        set({
          user: {
            uid: userData.uid,
            email: userData.email,
            name: userData.name,
            phoneNumber: userData.phone_number ?? null,
            businessRegistrationUrl: userData.business_registration_url ?? null,
            userType: userData.user_type,
            verificationStatus: userData.verification_status,
            rejectionReason: userData.rejection_reason ?? null,
            createdAt: new Date(userData.created_at),
            updatedAt: userData.updated_at ? new Date(userData.updated_at) : null,
          },
        });
      }
    } catch (error) {
      console.error('[AuthStore] Error refreshing user:', error);
    }
  },
}));

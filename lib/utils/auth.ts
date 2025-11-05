/**
 * Authentication Utility Functions
 *
 * 이 파일은 안전한 토큰 접근을 위한 유틸리티 함수를 제공합니다.
 * SSR 환경에서도 안전하게 작동하도록 설계되었습니다.
 */

/**
 * localStorage에서 Supabase 액세스 토큰을 안전하게 가져옵니다.
 *
 * 특징:
 * - SSR 환경에서 안전 (typeof window 체크)
 * - JSON parsing 에러 처리
 * - 토큰 만료 체크
 * - 타입 검증
 *
 * @returns {string | null} 유효한 액세스 토큰 또는 null
 *
 * @example
 * ```typescript
 * const accessToken = getAccessToken();
 * if (!accessToken) {
 *   router.push('/login');
 *   return;
 * }
 *
 * const data = await SomeService.getData(userId, accessToken);
 * ```
 */
export const getAccessToken = (): string | null => {
  // SSR 환경 체크 (서버에서는 localStorage 접근 불가)
  if (typeof window === 'undefined') {
    console.warn('[Auth] getAccessToken called in SSR context');
    return null;
  }

  try {
    // Supabase localStorage key 생성
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      console.error('[Auth] NEXT_PUBLIC_SUPABASE_URL is not defined');
      return null;
    }

    // URL에서 프로젝트 ID 추출
    const projectId = supabaseUrl.split('//')[1]?.split('.')[0];
    if (!projectId) {
      console.error('[Auth] Failed to extract project ID from Supabase URL');
      return null;
    }

    const storageKey = `sb-${projectId}-auth-token`;

    // localStorage에서 세션 데이터 가져오기
    const sessionData = localStorage.getItem(storageKey);

    if (!sessionData) {
      // 토큰 없음 (로그인 안됨)
      return null;
    }

    // JSON parsing (에러 처리)
    let parsed: any;
    try {
      parsed = JSON.parse(sessionData);
    } catch (parseError) {
      console.error('[Auth] Failed to parse session data:', parseError);
      // 손상된 데이터 제거
      localStorage.removeItem(storageKey);
      return null;
    }

    // 타입 검증
    if (!parsed || typeof parsed !== 'object') {
      console.error('[Auth] Invalid session data format');
      localStorage.removeItem(storageKey);
      return null;
    }

    // access_token 존재 및 타입 확인
    if (!parsed.access_token || typeof parsed.access_token !== 'string') {
      console.error('[Auth] No valid access_token found in session');
      return null;
    }

    // 토큰 만료 체크 (optional)
    if (parsed.expires_at) {
      const expiresAt = typeof parsed.expires_at === 'number'
        ? parsed.expires_at
        : parseInt(parsed.expires_at);

      const currentTime = Date.now() / 1000; // 초 단위로 변환

      if (currentTime > expiresAt) {
        console.warn('[Auth] Access token has expired');
        // 만료된 토큰 제거
        localStorage.removeItem(storageKey);
        return null;
      }
    }

    // 유효한 토큰 반환
    return parsed.access_token;

  } catch (error) {
    // 예상치 못한 에러 처리
    console.error('[Auth] Unexpected error in getAccessToken:', error);
    return null;
  }
};

/**
 * 현재 사용자가 인증되었는지 확인합니다.
 *
 * @returns {boolean} 유효한 토큰이 있으면 true, 없으면 false
 *
 * @example
 * ```typescript
 * if (!isAuthenticated()) {
 *   router.push('/login');
 *   return;
 * }
 * ```
 */
export const isAuthenticated = (): boolean => {
  return getAccessToken() !== null;
};

/**
 * localStorage에서 Supabase 세션을 제거합니다.
 * (주의: 이 함수는 로컬 토큰만 제거하며, 실제 로그아웃은 Supabase auth.signOut()을 사용해야 합니다)
 *
 * @example
 * ```typescript
 * clearAuthToken();
 * await supabase.auth.signOut();
 * router.push('/login');
 * ```
 */
export const clearAuthToken = (): void => {
  if (typeof window === 'undefined') return;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return;

    const projectId = supabaseUrl.split('//')[1]?.split('.')[0];
    if (!projectId) return;

    const storageKey = `sb-${projectId}-auth-token`;
    localStorage.removeItem(storageKey);

    console.log('[Auth] Token cleared from localStorage');
  } catch (error) {
    console.error('[Auth] Failed to clear token:', error);
  }
};

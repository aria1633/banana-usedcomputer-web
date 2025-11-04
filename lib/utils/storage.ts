/**
 * localStorage 세션 관리 유틸리티
 *
 * 목적:
 * 1. localStorage 접근 일관성 확보
 * 2. 세션 토큰 자동 파싱/검증
 * 3. 만료된 세션 자동 감지
 * 4. 개발 환경에서 변경 추적
 * 5. SSR 안전성 확보
 */

import { logger } from './logger';

// Supabase 프로젝트 ID 추출 (URL에서)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const projectId = SUPABASE_URL.split('//')[1]?.split('.')[0] || '';

// localStorage 키
const STORAGE_KEY = `sb-${projectId}-auth-token`;

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  token_type: string;
  user: {
    id: string;
    email: string;
    [key: string]: any;
  };
}

/**
 * localStorage 사용 가능 여부 확인 (SSR 대응)
 */
function isLocalStorageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

/**
 * localStorage에서 세션 데이터 읽기
 *
 * @returns Session 객체 또는 null
 *
 * @example
 * const session = getSession();
 * if (session) {
 *   console.log('Access token:', session.access_token);
 * }
 */
export function getSession(): Session | null {
  if (!isLocalStorageAvailable()) {
    return null;
  }

  try {
    const sessionData = localStorage.getItem(STORAGE_KEY);

    if (!sessionData) {
      return null;
    }

    const session: Session = JSON.parse(sessionData);

    // 세션 유효성 검증
    if (!session.access_token || !session.user?.id) {
      logger.warn('Invalid session data found in localStorage', {
        hasAccessToken: !!session.access_token,
        hasUserId: !!session.user?.id,
      });
      clearSession();
      return null;
    }

    // 만료 확인 (선택적)
    if (session.expires_at && session.expires_at < Date.now() / 1000) {
      logger.warn('Session expired', {
        expiresAt: new Date(session.expires_at * 1000).toISOString(),
      });
      clearSession();
      return null;
    }

    return session;
  } catch (error) {
    logger.error('Failed to parse session from localStorage', { error });
    clearSession();
    return null;
  }
}

/**
 * localStorage에서 Access Token만 추출
 *
 * @returns Access Token 문자열 또는 null
 *
 * @example
 * const token = getAccessToken();
 * if (token) {
 *   headers['Authorization'] = `Bearer ${token}`;
 * }
 */
export function getAccessToken(): string | null {
  const session = getSession();
  return session?.access_token || null;
}

/**
 * localStorage에서 Refresh Token 추출
 */
export function getRefreshToken(): string | null {
  const session = getSession();
  return session?.refresh_token || null;
}

/**
 * localStorage에서 현재 사용자 ID 추출
 *
 * @returns User ID (UUID) 또는 null
 *
 * @example
 * const userId = getUserId();
 * if (userId) {
 *   fetchUserProfile(userId);
 * }
 */
export function getUserId(): string | null {
  const session = getSession();
  return session?.user?.id || null;
}

/**
 * localStorage에 세션 저장
 *
 * @param session - Supabase 세션 객체
 *
 * @example
 * setSession({
 *   access_token: 'eyJhbGc...',
 *   refresh_token: 'eyJhbGc...',
 *   expires_at: 1699999999,
 *   expires_in: 3600,
 *   token_type: 'bearer',
 *   user: { id: 'abc123', email: 'user@example.com' }
 * });
 */
export function setSession(session: Session): void {
  if (!isLocalStorageAvailable()) {
    logger.warn('localStorage not available, cannot save session');
    return;
  }

  try {
    const sessionData = JSON.stringify(session);
    localStorage.setItem(STORAGE_KEY, sessionData);

    logger.storage('SET', STORAGE_KEY, sessionData);
    logger.info('Session saved to localStorage', {
      userId: session.user.id,
      expiresAt: new Date(session.expires_at * 1000).toISOString(),
    });
  } catch (error) {
    logger.error('Failed to save session to localStorage', { error });
  }
}

/**
 * localStorage에서 세션 삭제
 *
 * @example
 * clearSession(); // 로그아웃 시 호출
 */
export function clearSession(): void {
  if (!isLocalStorageAvailable()) {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
  logger.storage('REMOVE', STORAGE_KEY);
  logger.info('Session cleared from localStorage');
}

/**
 * localStorage 전체 초기화 (개발용)
 *
 * @example
 * clearAllStorage(); // 개발 중 문제 발생 시 사용
 */
export function clearAllStorage(): void {
  if (!isLocalStorageAvailable()) {
    return;
  }

  localStorage.clear();
  logger.storage('CLEAR');
  logger.info('All localStorage data cleared');
}

/**
 * 세션 만료 여부 확인
 *
 * @returns true면 만료됨, false면 유효함
 *
 * @example
 * if (isSessionExpired()) {
 *   // 토큰 갱신 또는 로그아웃
 * }
 */
export function isSessionExpired(): boolean {
  const session = getSession();

  if (!session || !session.expires_at) {
    return true;
  }

  const now = Date.now() / 1000;
  return session.expires_at < now;
}

/**
 * 세션 만료까지 남은 시간 (초)
 *
 * @returns 남은 시간 (초) 또는 0
 *
 * @example
 * const remaining = getSessionTimeRemaining();
 * console.log(`Session expires in ${remaining} seconds`);
 */
export function getSessionTimeRemaining(): number {
  const session = getSession();

  if (!session || !session.expires_at) {
    return 0;
  }

  const now = Date.now() / 1000;
  const remaining = session.expires_at - now;

  return Math.max(0, Math.floor(remaining));
}

/**
 * 개발 환경에서 localStorage 모니터링 활성화
 *
 * localStorage.setItem, removeItem, clear를 오버라이드하여
 * 모든 변경사항을 콘솔에 로깅합니다.
 *
 * @example
 * // app/layout.tsx에서 호출
 * if (process.env.NODE_ENV === 'development') {
 *   enableStorageMonitoring();
 * }
 */
export function enableStorageMonitoring(): void {
  if (!isLocalStorageAvailable() || process.env.NODE_ENV !== 'development') {
    return;
  }

  const originalSetItem = localStorage.setItem.bind(localStorage);
  const originalRemoveItem = localStorage.removeItem.bind(localStorage);
  const originalClear = localStorage.clear.bind(localStorage);

  localStorage.setItem = function (key: string, value: string) {
    logger.storage('SET', key, value);
    originalSetItem(key, value);
  };

  localStorage.removeItem = function (key: string) {
    logger.storage('REMOVE', key);
    originalRemoveItem(key);
  };

  localStorage.clear = function () {
    logger.storage('CLEAR');
    originalClear();
  };

  logger.info('localStorage monitoring enabled');
}

/**
 * Fetch API 공통 유틸리티
 *
 * 목적:
 * 1. Fetch API 헤더 누락 방지 (apikey, Authorization, Content-Type)
 * 2. localStorage 세션 자동 관리
 * 3. 401 에러 자동 처리 (로그아웃)
 * 4. 에러 로깅 자동화
 * 5. 코드 중복 제거
 */

import { logger } from './logger';
import { getAccessToken, clearSession } from './storage';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface FetchOptions extends RequestInit {
  requireAuth?: boolean; // true면 Authorization 헤더 필수
  skipAuthRedirect?: boolean; // 401 시 자동 리다이렉트 건너뛰기
}

/**
 * Supabase Fetch API 공통 함수
 *
 * @param url - 전체 URL 또는 Supabase REST API 경로 (/rest/v1/...)
 * @param options - Fetch 옵션 + 추가 옵션
 * @returns Response 객체
 *
 * @example
 * // 인증 필요 없는 요청
 * const response = await fetchWithAuth('/rest/v1/products?select=*');
 *
 * @example
 * // 인증 필요한 요청
 * const response = await fetchWithAuth('/rest/v1/products', {
 *   method: 'POST',
 *   requireAuth: true,
 *   body: JSON.stringify({ title: 'New Product' })
 * });
 */
export async function fetchWithAuth(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const startTime = performance.now();
  const { requireAuth = false, skipAuthRedirect = false, ...fetchOptions } = options;

  // URL 정규화 (상대 경로면 Supabase URL 추가)
  const fullUrl = url.startsWith('http') ? url : `${SUPABASE_URL}${url}`;

  // 공통 헤더 구성 (fetchOptions.headers를 먼저 펼치고, 기본 헤더로 덮어씀)
  const headers: HeadersInit = {
    ...fetchOptions.headers,
    'apikey': SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  };

  // localStorage에서 accessToken 자동 획득
  const accessToken = getAccessToken();

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  } else if (requireAuth) {
    // 인증 필요한데 토큰 없으면 에러
    logger.error('fetchWithAuth: Access token required but not found');
    throw new Error('Authentication required');
  }

  try {
    // Fetch 실행
    const response = await fetch(fullUrl, {
      ...fetchOptions,
      headers,
    });

    const endTime = performance.now();
    const duration = (endTime - startTime).toFixed(2);

    // API 호출 로깅
    logger.api(
      fetchOptions.method || 'GET',
      fullUrl,
      response.status,
      { duration: `${duration}ms` }
    );

    // 401 Unauthorized 처리
    if (response.status === 401 && !skipAuthRedirect) {
      logger.error('fetchWithAuth: Unauthorized, clearing session and redirecting to login');
      clearSession();

      // 클라이언트 사이드에서만 리다이렉트
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }

      throw new Error('Unauthorized');
    }

    // 403 Forbidden 경고 (RLS 정책 문제 가능성)
    if (response.status === 403) {
      logger.error('fetchWithAuth: Forbidden - Check RLS policies', {
        url: fullUrl,
        method: fetchOptions.method || 'GET',
      });
    }

    // 500 서버 에러 경고 (트리거/함수 문제 가능성)
    if (response.status >= 500) {
      logger.error('fetchWithAuth: Server error', {
        url: fullUrl,
        method: fetchOptions.method || 'GET',
        status: response.status,
      });
    }

    return response;
  } catch (error) {
    const endTime = performance.now();
    const duration = (endTime - startTime).toFixed(2);

    logger.error('fetchWithAuth: Network error', {
      url: fullUrl,
      method: fetchOptions.method || 'GET',
      duration: `${duration}ms`,
      error,
    });

    throw error;
  }
}

/**
 * Supabase REST API GET 요청 (자동 JSON 파싱)
 *
 * @example
 * const products = await get<Product[]>('/rest/v1/products?select=*');
 */
export async function get<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const response = await fetchWithAuth(url, { ...options, method: 'GET' });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GET request failed: ${errorText}`);
  }

  return response.json();
}

/**
 * Supabase REST API POST 요청 (자동 JSON 파싱)
 *
 * @example
 * const newProduct = await post<Product>('/rest/v1/products', {
 *   requireAuth: true,
 *   body: JSON.stringify({ title: 'New Product' })
 * });
 */
export async function post<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const response = await fetchWithAuth(url, { ...options, method: 'POST' });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`POST request failed: ${errorText}`);
  }

  // 204 No Content는 빈 응답 반환
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

/**
 * Supabase REST API PATCH 요청
 *
 * @example
 * await patch('/rest/v1/products?id=eq.abc', {
 *   requireAuth: true,
 *   body: JSON.stringify({ title: 'Updated' })
 * });
 */
export async function patch(url: string, options: FetchOptions = {}): Promise<void> {
  const response = await fetchWithAuth(url, { ...options, method: 'PATCH' });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PATCH request failed: ${errorText}`);
  }
}

/**
 * Supabase REST API DELETE 요청
 *
 * @example
 * await del('/rest/v1/products?id=eq.abc', { requireAuth: true });
 */
export async function del(url: string, options: FetchOptions = {}): Promise<void> {
  const response = await fetchWithAuth(url, { ...options, method: 'DELETE' });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DELETE request failed: ${errorText}`);
  }
}

/**
 * COUNT 조회 (HEAD 요청)
 *
 * @example
 * const count = await getCount('/rest/v1/products?seller_id=eq.abc');
 */
export async function getCount(url: string, options: FetchOptions = {}): Promise<number> {
  const response = await fetchWithAuth(url, {
    ...options,
    method: 'HEAD',
    headers: {
      ...options.headers,
      'Prefer': 'count=exact',
    },
  });

  const contentRange = response.headers.get('Content-Range');
  if (!contentRange) {
    return 0;
  }

  // Content-Range 형식: "0-9/10" 또는 "*/10"
  const match = contentRange.match(/\/(\d+)$/);
  if (!match) {
    return 0;
  }

  return parseInt(match[1], 10);
}

// lib/services/auth.service.ts

import { supabase } from '@/lib/supabase/config';
import { User, UserType, VerificationStatus } from '@/types/user';
import { StorageService } from './storage.service';
import { logger } from '@/lib/utils/logger';
import { setSession, clearSession, getSession, getAccessToken, getUserId } from '@/lib/utils/storage';
import { get } from '@/lib/utils/fetch';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export class AuthService {
  /**
   * 회원가입
   */
  static async signUp(
    email: string,
    password: string,
    name: string,
    userType: UserType,
    phoneNumber: string | null = null,
    businessRegistrationFile: File | null = null
  ): Promise<User> {
    try {
      logger.group('AuthService.signUp');
      logger.info('Starting signup process', { email, userType });

      // 1. Supabase Auth에 사용자 생성
      logger.info('Creating auth user...');

      const signupResponse = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email,
          password,
          options: {
            email_redirect_to: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
            data: {
              name,
              user_type: userType,
              phone_number: phoneNumber,
            },
          },
        }),
      });

      logger.api('POST', '/auth/v1/signup', signupResponse.status);

      if (!signupResponse.ok) {
        const errorData = await signupResponse.json();
        logger.error('Signup failed', errorData);
        throw new Error(errorData.msg || errorData.error_description || '회원가입 실패');
      }

      const authData = await signupResponse.json();

      // 응답 구조 전체 로깅
      logger.info('Auth signup response', authData);

      // Supabase Auth API 응답 구조 처리
      // 응답에는 user 객체가 아니라 직접 id, email 등이 포함됨
      const userId = authData.user?.id || authData.id;
      const userEmail = authData.user?.email || authData.email;

      logger.info('Auth signup result', {
        userId,
        userEmail,
        hasSession: !!authData.session,
      });

      // user ID가 없으면 에러
      if (!userId) {
        logger.error('User ID not found in response', { authData });
        throw new Error('사용자 생성 실패: Supabase Auth 응답에 사용자 ID가 없습니다.');
      }

      const uid = userId;

      // 2. 사업자 등록증 파일 업로드 (도매상인 경우) - INSERT 전에 먼저 처리
      let businessRegistrationUrl: string | null = null;
      if (businessRegistrationFile && userType === UserType.WHOLESALER) {
        logger.info('Uploading business registration file...');
        businessRegistrationUrl = await StorageService.uploadBusinessRegistration(
          businessRegistrationFile,
          uid
        );
        logger.info('Business registration uploaded successfully', { url: businessRegistrationUrl });
      }

      // 3. users 테이블에 직접 INSERT
      logger.info('Inserting user into users table...');

      try {
        const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            uid: uid,
            email: userEmail,
            name: name,
            phone_number: phoneNumber,
            user_type: userType,
            verification_status: userType === UserType.WHOLESALER ? VerificationStatus.PENDING : VerificationStatus.NONE,
            business_registration_url: businessRegistrationUrl, // URL 추가
            created_at: new Date().toISOString(),
          }),
        });

        if (!insertResponse.ok) {
          const errorText = await insertResponse.text();
          logger.warn('Insert failed (may already exist)', { error: errorText });
        } else {
          logger.info('User inserted successfully');
        }
      } catch (error) {
        logger.error('Exception during insert', { error });
      }

      // 4. 이메일 확인이 필요한지 체크
      if (!authData.session) {
        logger.info('Email confirmation required');

        const error = new Error(
          '회원가입이 완료되었습니다!\n' +
          '이메일 확인이 필요합니다. 가입하신 이메일로 발송된 확인 링크를 클릭해주세요.\n\n' +
          '이메일 확인 후 로그인할 수 있습니다.'
        );
        (error as any).code = 'EMAIL_CONFIRMATION_REQUIRED';
        (error as any).email = email;

        logger.groupEnd();
        throw error;
      }

      // 5. 세션이 있는 경우 - localStorage에 저장
      if (authData.session) {
        logger.info('Session exists, saving to localStorage');
        setSession(authData.session);
      }

      logger.info('Signup successful', { uid });
      logger.groupEnd();

      return {
        uid: uid,
        email: userEmail,
        name: name,
        phoneNumber: phoneNumber,
        businessRegistrationUrl: businessRegistrationUrl,
        userType: userType,
        verificationStatus: userType === UserType.WHOLESALER ? VerificationStatus.PENDING : VerificationStatus.NONE,
        rejectionReason: null,
        createdAt: new Date(),
        updatedAt: null,
      };
    } catch (error: unknown) {
      logger.groupEnd();
      throw this.handleAuthError(error);
    }
  }

  /**
   * 로그인
   */
  static async signIn(email: string, password: string): Promise<User> {
    try {
      logger.group('AuthService.signIn');
      logger.info('Starting login process', { email });

      // 1. Supabase Auth API로 로그인
      const loginResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      logger.api('POST', '/auth/v1/token', loginResponse.status);

      if (!loginResponse.ok) {
        const errorData = await loginResponse.json();
        logger.error('Login failed', errorData);
        throw new Error(errorData.error_description || errorData.msg || '로그인 실패');
      }

      const authData = await loginResponse.json();
      logger.info('Auth login result', {
        hasUser: !!authData.user,
        hasAccessToken: !!authData.access_token,
      });

      if (!authData.user || !authData.access_token) {
        throw new Error('로그인 실패');
      }

      // 2. localStorage에 세션 저장
      setSession(authData);

      const userId = authData.user.id;
      logger.info('Fetching user data', { userId });

      // 3. users 테이블에서 사용자 정보 가져오기
      const users = await get<any[]>(`/rest/v1/users?uid=eq.${userId}`);

      if (!users || users.length === 0) {
        logger.error('User not found in users table');
        throw new Error('사용자 정보를 찾을 수 없습니다.');
      }

      const userData = users[0];
      logger.info('Login successful', { userId });
      logger.groupEnd();

      return {
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
      };
    } catch (error: unknown) {
      logger.groupEnd();
      logger.error('signIn error', { error });
      throw this.handleAuthError(error);
    }
  }

  /**
   * 로그아웃
   */
  static async signOut(): Promise<void> {
    logger.group('AuthService.signOut');
    logger.info('Starting logout process');

    // 클라이언트 측 세션 즉시 클리어
    clearSession();

    // 서버 측 로그아웃은 백그라운드에서 처리 (fire and forget)
    supabase.auth.signOut().then(() => {
      logger.info('Background server signOut successful');
    }).catch((error) => {
      logger.warn('Background server signOut failed (ignored)', { error });
    });

    logger.info('Client signOut successful - instant logout');
    logger.groupEnd();
  }

  /**
   * 비밀번호 재설정 이메일 전송
   */
  static async sendPasswordReset(email: string): Promise<void> {
    try {
      logger.group('AuthService.sendPasswordReset');
      logger.info('Sending password reset email', { email });

      const response = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email,
          options: {
            redirect_to: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
          },
        }),
      });

      logger.api('POST', '/auth/v1/recover', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('Password reset failed', errorData);
        throw new Error(errorData.msg || errorData.error_description || '비밀번호 재설정 이메일 전송 실패');
      }

      logger.info('Password reset email sent successfully');
      logger.groupEnd();
    } catch (error: unknown) {
      logger.groupEnd();
      throw this.handleAuthError(error);
    }
  }

  /**
   * 현재 로그인한 사용자 정보 가져오기
   */
  static async getCurrentUser(): Promise<User | null> {
    try {
      logger.info('getCurrentUser started');

      // SSR 체크
      if (typeof window === 'undefined') {
        logger.info('Not in browser environment');
        return null;
      }

      // localStorage에서 세션 확인
      const session = getSession();

      if (!session) {
        logger.info('No session data in localStorage');
        return null;
      }

      const userId = getUserId();

      if (!userId) {
        logger.warn('Invalid session data');
        return null;
      }

      logger.info('Fetching user data', { userId });

      // users 테이블에서 사용자 정보 가져오기
      const users = await get<any[]>(`/rest/v1/users?uid=eq.${userId}`);

      if (!users || users.length === 0) {
        logger.warn('No user data found');
        return null;
      }

      const userData = users[0];
      logger.info('getCurrentUser success');

      return {
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
      };
    } catch (error) {
      logger.error('getCurrentUser error', { error });
      return null;
    }
  }

  /**
   * Auth 에러 처리
   */
  private static handleAuthError(error: unknown): Error {
    // 이메일 확인 필요 에러는 그대로 전달
    if ((error as any).code === 'EMAIL_CONFIRMATION_REQUIRED') {
      return error as Error;
    }

    const message = (error as { message?: string }).message || '';

    const errorMessages: Record<string, string> = {
      'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
      'Email not confirmed': '이메일 인증이 필요합니다. 가입하신 이메일로 발송된 확인 링크를 클릭해주세요.',
      'User already registered': '이미 사용 중인 이메일입니다.',
      'Password should be at least 6 characters': '비밀번호는 최소 6자 이상이어야 합니다.',
    };

    // 메시지에서 키워드 검색
    for (const [key, value] of Object.entries(errorMessages)) {
      if (message.includes(key)) {
        return new Error(value);
      }
    }

    return new Error(`인증 오류: ${message}`);
  }
}

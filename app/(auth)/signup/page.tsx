// app/(auth)/signup/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthService } from '@/lib/services/auth.service';
import { StorageService } from '@/lib/services/storage.service';
import { UserService } from '@/lib/services/user.service';
import { UserType } from '@/types/user';
import { logger } from '@/lib/utils/logger';

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    userType: UserType.NORMAL,
  });
  const [businessRegistrationFile, setBusinessRegistrationFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const emailCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [nameCheckLoading, setNameCheckLoading] = useState(false);
  const [nameExists, setNameExists] = useState(false);
  const nameCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 닉네임 중복 체크 (debounce 적용)
  useEffect(() => {
    // 이전 타이머 취소
    if (nameCheckTimeoutRef.current) {
      clearTimeout(nameCheckTimeoutRef.current);
    }

    // 닉네임이 비어있거나 2자 미만이면 체크하지 않음
    if (!formData.name || formData.name.trim().length < 2) {
      setNameExists(false);
      setNameCheckLoading(false);
      return;
    }

    // 500ms 지연 후 중복 체크
    setNameCheckLoading(true);
    nameCheckTimeoutRef.current = setTimeout(async () => {
      try {
        const exists = await UserService.checkNameExists(formData.name.trim());
        setNameExists(exists);
      } catch (error) {
        console.error('Name check error:', error);
        setNameExists(false);
      } finally {
        setNameCheckLoading(false);
      }
    }, 500);

    // cleanup
    return () => {
      if (nameCheckTimeoutRef.current) {
        clearTimeout(nameCheckTimeoutRef.current);
      }
    };
  }, [formData.name]);

  // 이메일 중복 체크 (debounce 적용)
  useEffect(() => {
    // 이전 타이머 취소
    if (emailCheckTimeoutRef.current) {
      clearTimeout(emailCheckTimeoutRef.current);
    }

    // 이메일이 비어있으면 체크하지 않음
    if (!formData.email || formData.email.trim() === '') {
      setEmailExists(false);
      setEmailCheckLoading(false);
      return;
    }

    // 이메일 형식 간단 체크
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setEmailExists(false);
      setEmailCheckLoading(false);
      return;
    }

    // 500ms 지연 후 중복 체크
    setEmailCheckLoading(true);
    emailCheckTimeoutRef.current = setTimeout(async () => {
      try {
        const exists = await UserService.checkEmailExists(formData.email);
        setEmailExists(exists);
      } catch (error) {
        console.error('Email check error:', error);
        setEmailExists(false);
      } finally {
        setEmailCheckLoading(false);
      }
    }, 500);

    // cleanup
    return () => {
      if (emailCheckTimeoutRef.current) {
        clearTimeout(emailCheckTimeoutRef.current);
      }
    };
  }, [formData.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // 닉네임 중복 체크 (최종 확인)
    if (nameExists) {
      setError('이미 사용 중인 닉네임입니다.');
      return;
    }

    // 이메일 중복 체크 (최종 확인)
    if (emailExists) {
      setError('이미 사용 중인 이메일입니다.');
      return;
    }

    // 전화번호 필수 확인
    if (!formData.phoneNumber || formData.phoneNumber.trim() === '') {
      setError('전화번호를 입력해주세요.');
      return;
    }

    // 비밀번호 확인
    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (formData.password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    // 도매상인 경우 사업자 등록증 필수
    if (formData.userType === UserType.WHOLESALER && !businessRegistrationFile) {
      setError('도매상 회원가입 시 사업자 등록증을 반드시 첨부해야 합니다.');
      return;
    }

    // 파일 유효성 검사 (도매상인 경우)
    if (businessRegistrationFile) {
      const validation = StorageService.validateFile(businessRegistrationFile);
      if (!validation.valid) {
        setError(validation.error || '유효하지 않은 파일입니다.');
        return;
      }
    }

    setLoading(true);

    try {
      logger.group('SignupPage - Submit');
      logger.info('Starting signup', { email: formData.email, userType: formData.userType });

      await AuthService.signUp(
        formData.email,
        formData.password,
        formData.name,
        formData.userType,
        formData.phoneNumber || null,
        businessRegistrationFile || null
      );

      logger.info('Signup successful');
      logger.groupEnd();

      // 선택한 사용자 유형에 따라 선호 홈 저장
      if (formData.userType === UserType.WHOLESALER) {
        localStorage.setItem('preferred_home', '/business');
        setSuccessMessage('회원가입이 완료되었습니다!\n관리자 승인 후 도매상 기능을 사용할 수 있습니다.');
      } else {
        localStorage.setItem('preferred_home', '/consumer');
        setSuccessMessage('회원가입이 완료되었습니다. 로그인해주세요.');
      }
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: unknown) {
      const error = err as any;
      logger.groupEnd();

      logger.error('Signup failed', { error: error.message, code: error.code });

      // 이메일 확인이 필요한 경우
      if (error.code === 'EMAIL_CONFIRMATION_REQUIRED') {
        logger.info('Email confirmation required');
        // 선택한 사용자 유형에 따라 선호 홈 저장
        if (formData.userType === UserType.WHOLESALER) {
          localStorage.setItem('preferred_home', '/business');
        } else {
          localStorage.setItem('preferred_home', '/consumer');
        }
        setSuccessMessage(
          `회원가입이 완료되었습니다!\n${error.email}로 발송된 이메일 확인 링크를 클릭하여 가입을 완료해주세요.\n\n이메일 확인 후 로그인할 수 있습니다.`
        );
        // 5초 후 로그인 페이지로 이동
        setTimeout(() => router.push('/login'), 5000);
      } else {
        logger.error('Unexpected error during signup', error);
        setError(error.message || '회원가입에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBusinessRegistrationFile(file);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            회원가입
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            새 계정을 만드세요
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          {successMessage && (
            <div className="rounded-md bg-green-50 p-4">
              <p className="text-sm text-green-800 whitespace-pre-line">{successMessage}</p>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                {formData.userType === UserType.WHOLESALER ? '업체명' : '닉네임'}
              </label>
              <div className="relative">
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className={`mt-1 appearance-none relative block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-primary sm:text-sm ${
                    nameExists
                      ? 'border-red-500 focus:border-red-500'
                      : formData.name && formData.name.trim().length >= 2 && !nameCheckLoading && !nameExists
                      ? 'border-green-500 focus:border-green-500'
                      : 'border-gray-300 focus:border-primary'
                  } placeholder-gray-500 text-gray-900`}
                  placeholder={formData.userType === UserType.WHOLESALER ? '업체명을 입력하세요' : '사용할 닉네임을 입력하세요'}
                  value={formData.name}
                  onChange={handleChange}
                />
                {/* 로딩 스피너 */}
                {nameCheckLoading && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 mt-0.5">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  </div>
                )}
                {/* 체크 아이콘 */}
                {!nameCheckLoading && formData.name && formData.name.trim().length >= 2 && !nameExists && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 mt-0.5">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {/* X 아이콘 */}
                {!nameCheckLoading && nameExists && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 mt-0.5">
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
              </div>
              {/* 중복 메시지 */}
              {nameExists && (
                <p className="mt-1 text-sm text-red-600">
                  이미 사용 중인 {formData.userType === UserType.WHOLESALER ? '업체명' : '닉네임'}입니다.
                </p>
              )}
              {!nameCheckLoading && formData.name && formData.name.trim().length >= 2 && !nameExists && (
                <p className="mt-1 text-sm text-green-600">
                  사용 가능한 {formData.userType === UserType.WHOLESALER ? '업체명' : '닉네임'}입니다.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                이메일
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className={`mt-1 appearance-none relative block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-primary sm:text-sm ${
                    emailExists
                      ? 'border-red-500 focus:border-red-500'
                      : formData.email && !emailCheckLoading && !emailExists
                      ? 'border-green-500 focus:border-green-500'
                      : 'border-gray-300 focus:border-primary'
                  } placeholder-gray-500 text-gray-900`}
                  placeholder="example@email.com"
                  value={formData.email}
                  onChange={handleChange}
                />
                {/* 로딩 스피너 */}
                {emailCheckLoading && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 mt-0.5">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  </div>
                )}
                {/* 체크 아이콘 */}
                {!emailCheckLoading && formData.email && !emailExists && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 mt-0.5">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {/* X 아이콘 */}
                {!emailCheckLoading && emailExists && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 mt-0.5">
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
              </div>
              {/* 중복 메시지 */}
              {emailExists && (
                <p className="mt-1 text-sm text-red-600">
                  이미 사용 중인 이메일입니다.
                </p>
              )}
              {!emailCheckLoading && formData.email && !emailExists && (
                <p className="mt-1 text-sm text-green-600">
                  사용 가능한 이메일입니다.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                전화번호 <span className="text-red-500">*</span>
              </label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                autoComplete="tel"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="010-1234-5678"
                value={formData.phoneNumber}
                onChange={handleChange}
              />
              <p className="mt-1 text-xs text-gray-500">
                거래 시 연락을 위한 전화번호
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="최소 6자"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                비밀번호 확인
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="비밀번호 재입력"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="userType" className="block text-sm font-medium text-gray-700">
                사용자 유형
              </label>
              <select
                id="userType"
                name="userType"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                value={formData.userType}
                onChange={handleChange}
              >
                <option value={UserType.NORMAL}>일반 사용자</option>
                <option value={UserType.WHOLESALER}>도매상</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                도매상으로 가입 시 사업자 인증이 필요합니다.
              </p>
            </div>

            {/* 도매상 선택 시 안내 및 사업자 등록증 업로드 필드 표시 */}
            {formData.userType === UserType.WHOLESALER && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-blue-800">
                    도매상 회원은 <strong>닉네임 대신 업체명</strong>을 입력해주세요. 업체명은 거래 시 표시됩니다.
                  </p>
                </div>
              </div>
            )}

            {formData.userType === UserType.WHOLESALER && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                <label htmlFor="businessRegistration" className="block text-sm font-medium text-gray-700">
                  사업자 등록증 <span className="text-red-500">*</span>
                </label>
                <input
                  id="businessRegistration"
                  name="businessRegistration"
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  onChange={handleFileChange}
                  className="mt-2 block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary file:text-white
                    hover:file:bg-primary/90
                    file:cursor-pointer cursor-pointer"
                />
                <p className="mt-2 text-xs text-gray-500">
                  JPG, PNG 또는 PDF 파일 (최대 5MB)
                </p>
                {businessRegistrationFile && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{businessRegistrationFile.name}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || emailCheckLoading || emailExists || nameCheckLoading || nameExists}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '가입 중...' : nameCheckLoading ? '닉네임 확인 중...' : emailCheckLoading ? '이메일 확인 중...' : '회원가입'}
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/login"
              className="text-sm text-primary hover:text-primary/80"
            >
              이미 계정이 있으신가요? 로그인
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

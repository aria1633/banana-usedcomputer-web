// components/verification-status-alert.tsx
'use client';

import { User, VerificationStatus } from '@/types/user';
import Link from 'next/link';

interface VerificationStatusAlertProps {
  user: User;
}

/**
 * 사업자 인증 상태 알림 컴포넌트
 * - 승인 대기 중: 파란색 알림
 * - 승인 거절: 빨간색 알림 (거절 사유 표시)
 */
export function VerificationStatusAlert({ user }: VerificationStatusAlertProps) {
  // 일반 사용자이거나 승인된 도매상은 알림 표시 안 함
  if (
    !user ||
    user.verificationStatus === VerificationStatus.NONE ||
    user.verificationStatus === VerificationStatus.APPROVED
  ) {
    return null;
  }

  // 승인 대기 중
  if (user.verificationStatus === VerificationStatus.PENDING) {
    return (
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-500"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-blue-800">
              사업자 인증 심사 중
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                도매상 권한 승인을 위해 관리자가 사업자 등록증을 검토하고 있습니다.
                승인이 완료되면 상품 등록 및 매입 제안이 가능합니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 승인 거절
  if (user.verificationStatus === VerificationStatus.REJECTED) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-500"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-800">
              도매상 신청이 거부되었습니다
            </h3>
            {user.rejectionReason && (
              <div className="mt-2 text-sm text-red-700">
                <p className="font-semibold mb-1">거부 사유:</p>
                <p className="bg-white rounded px-3 py-2 border border-red-200">
                  {user.rejectionReason}
                </p>
              </div>
            )}
            <div className="mt-4">
              <Link
                href="/mypage"
                className="text-sm font-medium text-red-800 hover:text-red-600 underline"
              >
                마이페이지에서 사업자 등록증 재제출하기 →
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

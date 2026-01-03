// app/business/mypage/page.tsx
// 도매상 전용 마이페이지
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/use-auth';
import { UserService } from '@/lib/services/user.service';
import { ProductService } from '@/lib/services/product.service';
import { UserType, VerificationStatus } from '@/types/user';
import { useAuthStore } from '@/lib/store/auth.store';
import { isAdmin } from '@/lib/utils/auth';

export default function BusinessMyPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { setUser } = useAuthStore();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [resubmitting, setResubmitting] = useState(false);
  const [businessFile, setBusinessFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // 도매상 통계
  const [stats, setStats] = useState({
    totalProducts: 0,
    availableProducts: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // 관리자이거나 사업자 인증된 경우 허용
  const isApproved = isAdmin(user) || user?.verificationStatus === VerificationStatus.APPROVED;

  // 로그인 체크
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // 사용자 정보 초기화
  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhoneNumber(user.phoneNumber || '');
    }
  }, [user]);

  // 도매상 통계 로드
  useEffect(() => {
    const loadStats = async () => {
      if (!user || !isApproved) {
        setLoadingStats(false);
        return;
      }

      try {
        const products = await ProductService.getProductsBySeller(user.uid);
        setStats({
          totalProducts: products.length,
          availableProducts: products.filter(p => p.isAvailable).length,
        });
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    loadStats();
  }, [user, isApproved]);

  const handleSave = async () => {
    if (!user) return;

    if (!name.trim()) {
      alert('이름을 입력해주세요.');
      return;
    }

    try {
      setSaving(true);
      await UserService.updateUser(user.uid, {
        name: name.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
      });

      const updatedUser = await UserService.getUserByUid(user.uid);
      setUser(updatedUser);

      alert('정보가 수정되었습니다.');
      setEditing(false);
    } catch (error) {
      console.error('Failed to update user:', error);
      alert('정보 수정에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setName(user.name);
      setPhoneNumber(user.phoneNumber || '');
    }
    setEditing(false);
  };

  const handleResubmitDocument = async () => {
    if (!user || !businessFile) {
      alert('파일을 선택해주세요.');
      return;
    }

    if (!confirm('사업자 등록증을 재제출하시겠습니까? 관리자 검토 후 승인 여부가 결정됩니다.')) {
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('file', businessFile);
      formData.append('userId', user.uid);

      const uploadResponse = await fetch('/api/upload-business-registration', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('파일 업로드에 실패했습니다.');
      }

      const { url: businessRegistrationUrl } = await uploadResponse.json();

      await UserService.reapplyWholesaler(user.uid, businessRegistrationUrl);

      const updatedUser = await UserService.getUserByUid(user.uid);
      setUser(updatedUser);

      alert('사업자 등록증이 재제출되었습니다. 관리자 승인을 기다려주세요.');
      setResubmitting(false);
      setBusinessFile(null);
    } catch (error) {
      console.error('Failed to resubmit business document:', error);
      alert('사업자 등록증 재제출에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('파일 크기는 10MB 이하여야 합니다.');
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert('JPG, PNG, PDF 파일만 업로드 가능합니다.');
        return;
      }

      setBusinessFile(file);
    }
  };

  const getVerificationStatusText = (status: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.PENDING:
        return '승인 대기 중';
      case VerificationStatus.APPROVED:
        return '승인 완료';
      case VerificationStatus.REJECTED:
        return '승인 거부됨';
      default:
        return '-';
    }
  };

  const getVerificationStatusColor = (status: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case VerificationStatus.APPROVED:
        return 'bg-green-100 text-green-800';
      case VerificationStatus.REJECTED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">도매상 마이페이지</h1>
          <p className="mt-2 text-gray-600">내 정보와 판매 현황을 확인할 수 있습니다.</p>
        </div>

        {/* 도매상 통계 카드 (인증된 경우만) */}
        {isApproved && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <p className="text-sm text-gray-500">등록 상품</p>
              <p className="text-2xl font-bold text-gray-900">
                {loadingStats ? '-' : stats.totalProducts}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <p className="text-sm text-gray-500">판매중 상품</p>
              <p className="text-2xl font-bold text-green-600">
                {loadingStats ? '-' : stats.availableProducts}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <p className="text-sm text-gray-500">판매중지 상품</p>
              <p className="text-2xl font-bold text-gray-400">
                {loadingStats ? '-' : stats.totalProducts - stats.availableProducts}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <p className="text-sm text-gray-500">인증 상태</p>
              <p className="text-lg font-bold text-green-600">인증완료</p>
            </div>
          </div>
        )}

        {/* 빠른 메뉴 (인증된 경우만) */}
        {isApproved && (
          <div className="bg-white rounded-lg shadow-sm border mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">빠른 메뉴</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link
                  href="/business/products"
                  className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition"
                >
                  <svg className="w-8 h-8 text-blue-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">내 상품 관리</span>
                </Link>
                <Link
                  href="/business/products/new"
                  className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition"
                >
                  <svg className="w-8 h-8 text-blue-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">상품 등록</span>
                </Link>
                <Link
                  href="/business/bids"
                  className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition"
                >
                  <svg className="w-8 h-8 text-blue-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">입찰 관리</span>
                </Link>
                <Link
                  href="/business/market"
                  className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition"
                >
                  <svg className="w-8 h-8 text-blue-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">도매 마켓</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* 계정 정보 카드 */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">계정 정보</h2>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition"
              >
                수정
              </button>
            )}
          </div>

          <div className="p-6 space-y-4">
            {/* 이메일 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이메일
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500">이메일은 변경할 수 없습니다.</p>
            </div>

            {/* 이름 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!editing}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  !editing ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
                placeholder="이름을 입력하세요"
              />
            </div>

            {/* 전화번호 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                전화번호
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={!editing}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  !editing ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
                placeholder="010-0000-0000"
              />
            </div>

            {/* 회원 유형 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                회원 유형
              </label>
              <input
                type="text"
                value="도매상"
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>

            {/* 가입일 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                가입일
              </label>
              <input
                type="text"
                value={new Date(user.createdAt).toLocaleDateString('ko-KR')}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>

            {/* 수정 모드일 때 버튼 */}
            {editing && (
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
                >
                  취소
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 도매상 승인 상태 카드 */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">사업자 인증 상태</h2>
          </div>

          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-700">인증 상태:</span>
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${getVerificationStatusColor(
                      user.verificationStatus
                    )}`}
                  >
                    {getVerificationStatusText(user.verificationStatus)}
                  </span>
                </div>

                {user.verificationStatus === VerificationStatus.PENDING && (
                  <p className="text-sm text-gray-600 mt-2">
                    관리자가 승인을 검토 중입니다. 잠시만 기다려주세요.
                  </p>
                )}

                {user.verificationStatus === VerificationStatus.APPROVED && (
                  <p className="text-sm text-green-600 mt-2">
                    사업자 인증이 완료되었습니다. 모든 도매상 기능을 이용할 수 있습니다.
                  </p>
                )}

                {/* 거부 사유 표시 */}
                {user.verificationStatus === VerificationStatus.REJECTED &&
                  user.rejectionReason && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                      <h3 className="text-sm font-semibold text-red-800 mb-2">
                        거부 사유
                      </h3>
                      <p className="text-sm text-red-700 whitespace-pre-line">
                        {user.rejectionReason}
                      </p>
                      <div className="mt-4 pt-4 border-t border-red-200">
                        <p className="text-sm text-red-600 mb-3">
                          문제를 해결하신 후 사업자 등록증을 다시 제출해주세요.
                        </p>

                        {!resubmitting ? (
                          <button
                            onClick={() => setResubmitting(true)}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition text-sm font-medium"
                          >
                            사업자 등록증 재제출
                          </button>
                        ) : (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                사업자 등록증 <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/jpg,application/pdf"
                                onChange={handleFileChange}
                                className="block w-full text-sm text-gray-500
                                  file:mr-4 file:py-2 file:px-4
                                  file:rounded-md file:border-0
                                  file:text-sm file:font-medium
                                  file:bg-blue-600 file:text-white
                                  hover:file:bg-blue-700
                                  cursor-pointer"
                              />
                              {businessFile && (
                                <p className="mt-2 text-sm text-gray-600">
                                  선택된 파일: {businessFile.name}
                                </p>
                              )}
                              <p className="mt-1 text-xs text-gray-500">
                                JPG, PNG, PDF 파일 (최대 10MB)
                              </p>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={handleResubmitDocument}
                                disabled={!businessFile || uploading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
                              >
                                {uploading ? '제출 중...' : '제출하기'}
                              </button>
                              <button
                                onClick={() => {
                                  setResubmitting(false);
                                  setBusinessFile(null);
                                }}
                                disabled={uploading}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
                              >
                                취소
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* 사업자 등록증 */}
            {user.businessRegistrationUrl && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  제출한 사업자 등록증
                </h3>
                <div className="flex gap-2">
                  <a
                    href={user.businessRegistrationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm font-medium"
                  >
                    확인하기
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

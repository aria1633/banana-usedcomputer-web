// app/(main)/mypage/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { UserService } from '@/lib/services/user.service';
import { UserType, VerificationStatus } from '@/types/user';
import { useAuthStore } from '@/lib/store/auth.store';

export default function MyPage() {
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

      // 최신 사용자 정보 다시 가져오기
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

      // 1. 파일 업로드
      const formData = new FormData();
      formData.append('file', businessFile);
      formData.append('userId', user.uid); // userId 추가

      const uploadResponse = await fetch('/api/upload-business-registration', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('파일 업로드에 실패했습니다.');
      }

      const { url: businessRegistrationUrl } = await uploadResponse.json();

      // 2. 도매상 재신청 (verification_status를 pending으로 변경)
      await UserService.reapplyWholesaler(user.uid, businessRegistrationUrl);

      // 3. 최신 사용자 정보 다시 가져오기
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
      // 파일 크기 제한 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('파일 크기는 10MB 이하여야 합니다.');
        return;
      }

      // 파일 형식 제한
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

  const getUserTypeText = (userType: UserType) => {
    switch (userType) {
      case UserType.ADMIN:
        return '관리자';
      case UserType.WHOLESALER:
        return '도매상';
      case UserType.NORMAL:
        return '일반 회원';
      default:
        return '-';
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
          <h1 className="text-3xl font-bold text-gray-900">마이페이지</h1>
          <p className="mt-2 text-gray-600">내 정보를 확인하고 수정할 수 있습니다.</p>
        </div>

        {/* 계정 정보 카드 */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">계정 정보</h2>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 text-sm font-medium text-primary hover:text-primary/90 transition"
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
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary ${
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
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary ${
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
                value={getUserTypeText(user.userType)}
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
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
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

        {/* 도매상 승인 상태 카드 (도매상이거나 도매상 신청 이력이 있는 경우 표시) */}
        {(user.userType === UserType.WHOLESALER ||
          user.verificationStatus === VerificationStatus.PENDING ||
          user.verificationStatus === VerificationStatus.REJECTED) && (
          <div className="bg-white rounded-lg shadow-sm border mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">도매상 승인 상태</h2>
            </div>

            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-700">승인 상태:</span>
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
                      도매상 승인이 완료되었습니다. 상품을 등록할 수 있습니다.
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
                                    file:bg-primary file:text-white
                                    hover:file:bg-primary/90
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
                                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
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
        )}
      </div>
    </div>
  );
}

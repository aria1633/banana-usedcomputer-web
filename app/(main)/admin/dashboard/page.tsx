// app/(main)/admin/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { AdminService } from '@/lib/services/admin.service';
import { User, UserType } from '@/types/user';

export default function AdminDashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [pendingWholesalers, setPendingWholesalers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingUid, setProcessingUid] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingWholesaler, setRejectingWholesaler] = useState<User | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // 관리자 권한 체크
  useEffect(() => {
    if (!isLoading && (!user || user.userType !== UserType.ADMIN)) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  // 승인 대기 중인 도매상 목록 로드
  useEffect(() => {
    if (user && user.userType === UserType.ADMIN) {
      loadPendingWholesalers();
    }
  }, [user]);

  const loadPendingWholesalers = async () => {
    try {
      setLoading(true);
      const wholesalers = await AdminService.getPendingWholesalers();
      setPendingWholesalers(wholesalers);
    } catch (error) {
      console.error('Failed to load pending wholesalers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (uid: string) => {
    if (!confirm('이 도매상을 승인하시겠습니까?')) return;

    try {
      setProcessingUid(uid);
      await AdminService.approveWholesaler(uid);
      alert('도매상이 승인되었습니다.');
      loadPendingWholesalers();
    } catch (error) {
      alert('승인 처리 중 오류가 발생했습니다.');
      console.error(error);
    } finally {
      setProcessingUid(null);
    }
  };

  const handleReject = (wholesaler: User) => {
    setRejectingWholesaler(wholesaler);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectingWholesaler) return;

    if (!rejectionReason || rejectionReason.trim().length === 0) {
      alert('거부 사유를 입력해주세요.');
      return;
    }

    try {
      setProcessingUid(rejectingWholesaler.uid);
      await AdminService.rejectWholesaler(rejectingWholesaler.uid, rejectionReason);
      alert('도매상 신청이 거부되었습니다.');
      setRejectModalOpen(false);
      setRejectingWholesaler(null);
      setRejectionReason('');
      loadPendingWholesalers();
    } catch (error) {
      alert('거부 처리 중 오류가 발생했습니다.');
      console.error(error);
    } finally {
      setProcessingUid(null);
    }
  };

  const handleCancelReject = () => {
    setRejectModalOpen(false);
    setRejectingWholesaler(null);
    setRejectionReason('');
  };

  // 파일 타입 확인 (URL 기반)
  const getFileType = (url: string): 'pdf' | 'image' => {
    const lowercaseUrl = url.toLowerCase();
    if (lowercaseUrl.endsWith('.pdf')) return 'pdf';
    return 'image';
  };

  // 파일 이름 추출
  const getFileName = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      return pathParts[pathParts.length - 1] || 'business-registration';
    } catch {
      return 'business-registration';
    }
  };

  // 파일 다운로드
  const handleDownload = (url: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 미리보기 열기
  const handlePreview = (url: string, name: string) => {
    setSelectedImage(url);
    setSelectedFileName(name);
  };

  if (!user || user.userType !== UserType.ADMIN) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">관리자 대시보드</h1>
        <p className="mt-2 text-gray-600">도매상 승인 및 사용자 관리</p>
      </div>

      {/* 도매상 승인 대기 목록 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            승인 대기 중인 도매상 ({pendingWholesalers.length})
          </h2>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-gray-600">로딩 중...</p>
            </div>
          ) : pendingWholesalers.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">✅</div>
              <p className="text-gray-500">승인 대기 중인 도매상이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingWholesalers.map((wholesaler) => (
                <div
                  key={wholesaler.uid}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {wholesaler.name}
                        </h3>
                        <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                          승인 대기
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>이메일: {wholesaler.email}</p>
                        {wholesaler.phoneNumber && (
                          <p>연락처: {wholesaler.phoneNumber}</p>
                        )}
                        <p>
                          신청일:{' '}
                          {new Date(wholesaler.createdAt).toLocaleDateString('ko-KR')}
                        </p>
                      </div>

                      {/* 사업자 등록증 */}
                      {wholesaler.businessRegistrationUrl && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            사업자 등록증:
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handlePreview(
                                wholesaler.businessRegistrationUrl!,
                                wholesaler.name
                              )}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm font-medium"
                            >
                              미리보기
                            </button>
                            <button
                              onClick={() => handleDownload(
                                wholesaler.businessRegistrationUrl!,
                                getFileName(wholesaler.businessRegistrationUrl!)
                              )}
                              className="px-3 py-1.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition text-sm font-medium"
                            >
                              다운로드
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 승인/거부 버튼 */}
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleApprove(wholesaler.uid)}
                        disabled={processingUid === wholesaler.uid}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
                      >
                        {processingUid === wholesaler.uid ? '처리 중...' : '승인'}
                      </button>
                      <button
                        onClick={() => handleReject(wholesaler)}
                        disabled={processingUid === wholesaler.uid}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
                      >
                        거부
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 파일 미리보기 모달 */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-6xl w-full max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-medium">{selectedFileName} - 사업자 등록증</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownload(selectedImage, getFileName(selectedImage))}
                  className="px-3 py-1.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition text-sm font-medium"
                >
                  다운로드
                </button>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="text-white hover:text-gray-300"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="bg-white rounded-lg overflow-hidden">
              {getFileType(selectedImage) === 'pdf' ? (
                <iframe
                  src={selectedImage}
                  className="w-full h-[80vh]"
                  title="사업자 등록증 PDF"
                />
              ) : (
                <div className="p-4">
                  <img
                    src={selectedImage}
                    alt="사업자 등록증"
                    className="w-full h-auto max-h-[75vh] object-contain"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 거부 사유 입력 모달 */}
      {rejectModalOpen && rejectingWholesaler && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={handleCancelReject}
        >
          <div
            className="bg-white rounded-lg max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-900">도매상 신청 거부</h3>
              <p className="mt-2 text-sm text-gray-600">
                <span className="font-medium">{rejectingWholesaler.name}</span>님의 도매상 신청을 거부하시겠습니까?
              </p>
              <p className="mt-1 text-sm text-gray-500">
                거부 시 일반 사용자로 변경되며, 아래 사유가 사용자에게 전달됩니다.
              </p>
            </div>

            <div className="mb-6">
              <label htmlFor="rejectionReason" className="block text-sm font-medium text-gray-700 mb-2">
                거부 사유 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="거부 사유를 입력해주세요.&#10;예: 사업자 등록증의 상호명이 일치하지 않습니다."
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm resize-none"
              />
              <p className="mt-1 text-xs text-gray-500">
                {rejectionReason.length}/500자
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelReject}
                disabled={processingUid === rejectingWholesaler.uid}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                취소
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={processingUid === rejectingWholesaler.uid}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {processingUid === rejectingWholesaler.uid ? '처리 중...' : '거부하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

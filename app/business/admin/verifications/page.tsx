// app/business/admin/verifications/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { AdminService } from '@/lib/services/admin.service';
import { User, UserType, VerificationStatus } from '@/types/user';
import { isAdmin } from '@/lib/utils/auth';
import Image from 'next/image';

export default function AdminVerificationsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [allWholesalers, setAllWholesalers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [viewingDocument, setViewingDocument] = useState<{ url: string; name: string } | null>(null);
  const [imageError, setImageError] = useState(false);

  const isAdminUser = isAdmin(user);

  useEffect(() => {
    if (!isLoading && !isAdminUser) {
      router.push('/business');
    }
  }, [isLoading, isAdminUser, router]);

  useEffect(() => {
    const loadData = async () => {
      if (!isAdminUser) return;

      try {
        const [pending, wholesalers] = await Promise.all([
          AdminService.getPendingWholesalers(),
          AdminService.getUsersByType(UserType.WHOLESALER),
        ]);
        setPendingUsers(pending);
        setAllWholesalers(wholesalers);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isAdminUser]);

  const handleApprove = async (uid: string) => {
    if (!confirm('이 도매상을 승인하시겠습니까?')) return;

    setProcessingId(uid);
    try {
      await AdminService.approveWholesaler(uid);
      setPendingUsers(prev => prev.filter(u => u.uid !== uid));
      setAllWholesalers(prev => prev.map(u =>
        u.uid === uid ? { ...u, verificationStatus: VerificationStatus.APPROVED } : u
      ));
      alert('승인되었습니다.');
    } catch (error) {
      console.error('Approve error:', error);
      alert('승인 처리 중 오류가 발생했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (uid: string) => {
    if (!rejectReason.trim()) {
      alert('거부 사유를 입력해주세요.');
      return;
    }

    setProcessingId(uid);
    try {
      await AdminService.rejectWholesaler(uid, rejectReason);
      setPendingUsers(prev => prev.filter(u => u.uid !== uid));
      setAllWholesalers(prev => prev.filter(u => u.uid !== uid));
      setShowRejectModal(null);
      setRejectReason('');
      alert('거부되었습니다.');
    } catch (error) {
      console.error('Reject error:', error);
      alert('거부 처리 중 오류가 발생했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  if (!isAdminUser) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-lg text-red-800">관리자 권한이 필요합니다.</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.APPROVED:
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">승인됨</span>;
      case VerificationStatus.PENDING:
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">대기중</span>;
      case VerificationStatus.REJECTED:
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">거부됨</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">미인증</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">사업자 인증 관리</h1>
        <p className="mt-2 text-gray-600">도매상 사업자 인증 요청을 승인하거나 거부할 수 있습니다.</p>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeTab === 'pending'
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          승인 대기 ({pendingUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeTab === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          전체 도매상 ({allWholesalers.length})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600"></div>
        </div>
      ) : activeTab === 'pending' ? (
        pendingUsers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border">
            <div className="text-6xl mb-4">-</div>
            <p className="text-xl font-semibold text-gray-700">승인 대기 중인 요청이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingUsers.map((wholesaler) => (
              <div key={wholesaler.uid} className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{wholesaler.name}</h3>
                      {getStatusBadge(wholesaler.verificationStatus)}
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>이메일: {wholesaler.email}</p>
                      <p>전화번호: {wholesaler.phoneNumber || '-'}</p>
                      <p>가입일: {new Date(wholesaler.createdAt).toLocaleDateString()}</p>
                    </div>

                    {/* 사업자등록증 이미지 */}
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">사업자등록증:</p>
                      {wholesaler.businessRegistrationUrl ? (
                        <button
                          onClick={() => {
                            setViewingDocument({ url: wholesaler.businessRegistrationUrl!, name: wholesaler.name });
                            setImageError(false);
                          }}
                          className="inline-block group"
                        >
                          <div className="relative w-48 h-32 border-2 border-blue-200 rounded-lg overflow-hidden group-hover:border-blue-500 transition">
                            <Image
                              src={wholesaler.businessRegistrationUrl}
                              alt="사업자등록증"
                              fill
                              className="object-cover group-hover:scale-105 transition-transform"
                              unoptimized
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center">
                              <span className="text-white opacity-0 group-hover:opacity-100 font-medium text-sm bg-black/50 px-3 py-1 rounded">
                                확대 보기
                              </span>
                            </div>
                          </div>
                        </button>
                      ) : (
                        <div className="w-48 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                          <span className="text-sm text-gray-400">서류 미첨부</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 버튼 */}
                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={() => handleApprove(wholesaler.uid)}
                      disabled={processingId === wholesaler.uid}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
                    >
                      {processingId === wholesaler.uid ? '처리중...' : '승인'}
                    </button>
                    <button
                      onClick={() => setShowRejectModal(wholesaler.uid)}
                      disabled={processingId === wholesaler.uid}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50"
                    >
                      거부
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">업체명</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">이메일</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">전화번호</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">상태</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">서류</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">가입일</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {allWholesalers.map((wholesaler) => (
                <tr key={wholesaler.uid} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{wholesaler.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{wholesaler.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{wholesaler.phoneNumber || '-'}</td>
                  <td className="px-4 py-3">{getStatusBadge(wholesaler.verificationStatus)}</td>
                  <td className="px-4 py-3">
                    {wholesaler.businessRegistrationUrl ? (
                      <button
                        onClick={() => {
                          setViewingDocument({ url: wholesaler.businessRegistrationUrl!, name: wholesaler.name });
                          setImageError(false);
                        }}
                        className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        서류보기
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">미첨부</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(wholesaler.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {wholesaler.verificationStatus === VerificationStatus.PENDING && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(wholesaler.uid)}
                          disabled={processingId === wholesaler.uid}
                          className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          승인
                        </button>
                        <button
                          onClick={() => setShowRejectModal(wholesaler.uid)}
                          disabled={processingId === wholesaler.uid}
                          className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          거부
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 거부 사유 모달 */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">거부 사유 입력</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="거부 사유를 입력해주세요..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              rows={4}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectReason('');
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
              >
                취소
              </button>
              <button
                onClick={() => handleReject(showRejectModal)}
                disabled={processingId === showRejectModal}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {processingId === showRejectModal ? '처리중...' : '거부 확정'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 서류 확대 보기 모달 */}
      {viewingDocument && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setViewingDocument(null)}
        >
          <div
            className="relative max-w-4xl w-full mx-4 max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="bg-white rounded-t-xl px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">사업자등록증</h3>
                <p className="text-sm text-gray-600">{viewingDocument.name}</p>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={viewingDocument.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  새 탭에서 열기
                </a>
                <button
                  onClick={() => setViewingDocument(null)}
                  className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 이미지 */}
            <div className="bg-gray-100 rounded-b-xl p-4">
              {!imageError ? (
                <div className="relative w-full" style={{ minHeight: '400px' }}>
                  <Image
                    src={viewingDocument.url}
                    alt="사업자등록증"
                    fill
                    className="object-contain"
                    unoptimized
                    onError={() => setImageError(true)}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-gray-600 mb-4">이미지를 불러올 수 없습니다.</p>
                  <a
                    href={viewingDocument.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                  >
                    직접 링크로 열기
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

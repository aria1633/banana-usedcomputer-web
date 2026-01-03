// app/(main)/admin/users/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { AdminService } from '@/lib/services/admin.service';
import { User, UserType, VerificationStatus } from '@/types/user';

type FilterType = 'ALL' | UserType;

export default function AdminUsersPage() {
  const { user, isLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [processingUid, setProcessingUid] = useState<string | null>(null);

  // 편집 폼 상태
  const [editForm, setEditForm] = useState({
    name: '',
    phoneNumber: '',
    userType: UserType.NORMAL,
    verificationStatus: VerificationStatus.APPROVED,
  });

  // 관리자 권한 체크
  useEffect(() => {
    if (!isLoading && (!user || user.userType !== UserType.ADMIN)) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  // 사용자 목록 로드
  useEffect(() => {
    if (user && user.userType === UserType.ADMIN) {
      loadUsers();
    }
  }, [user]);

  // 필터 및 검색 적용
  useEffect(() => {
    let result = users;

    // 타입 필터
    if (filter !== 'ALL') {
      result = result.filter((u) => u.userType === filter);
    }

    // 검색어 필터
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term) ||
          u.phoneNumber?.toLowerCase().includes(term)
      );
    }

    setFilteredUsers(result);
  }, [users, filter, searchTerm]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const allUsers = await AdminService.getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
      alert('사용자 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      phoneNumber: user.phoneNumber || '',
      userType: user.userType,
      verificationStatus: user.verificationStatus,
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!selectedUser) return;

    try {
      setProcessingUid(selectedUser.uid);
      await AdminService.updateUser(selectedUser.uid, {
        name: editForm.name,
        phoneNumber: editForm.phoneNumber,
        userType: editForm.userType,
        verificationStatus: editForm.verificationStatus,
      });
      alert('사용자 정보가 수정되었습니다.');
      setEditModalOpen(false);
      setSelectedUser(null);
      loadUsers();

      // 현재 로그인한 사용자 자신의 정보를 수정한 경우 즉시 갱신
      if (user && selectedUser.uid === user.uid) {
        console.log('[AdminUsers] Refreshing current user data');
        await refreshUser();
      }
    } catch (error) {
      alert('사용자 정보 수정에 실패했습니다.');
      console.error(error);
    } finally {
      setProcessingUid(null);
    }
  };

  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;

    try {
      setProcessingUid(selectedUser.uid);
      await AdminService.deleteUser(selectedUser.uid);
      alert('사용자가 삭제되었습니다.');
      setDeleteModalOpen(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      alert('사용자 삭제에 실패했습니다.');
      console.error(error);
    } finally {
      setProcessingUid(null);
    }
  };

  const getUserTypeLabel = (userType: UserType) => {
    switch (userType) {
      case UserType.NORMAL:
        return '일반';
      case UserType.WHOLESALER:
        return '도매상';
      case UserType.ADMIN:
        return '관리자';
      default:
        return userType;
    }
  };

  const getUserTypeBadgeColor = (userType: UserType) => {
    switch (userType) {
      case UserType.ADMIN:
        return 'bg-purple-100 text-purple-800';
      case UserType.WHOLESALER:
        return 'bg-blue-100 text-blue-800';
      case UserType.NORMAL:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getVerificationStatusLabel = (status: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.APPROVED:
        return '승인';
      case VerificationStatus.PENDING:
        return '대기';
      case VerificationStatus.REJECTED:
        return '거부';
      default:
        return status;
    }
  };

  const getVerificationStatusColor = (status: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.APPROVED:
        return 'bg-green-100 text-green-800';
      case VerificationStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case VerificationStatus.REJECTED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user || user.userType !== UserType.ADMIN) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">회원 관리</h1>
        <p className="mt-2 text-gray-600">전체 회원 조회 및 관리</p>
      </div>

      {/* 필터 및 검색 */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 타입 필터 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              회원 유형
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="ALL">전체</option>
              <option value={UserType.NORMAL}>일반 사용자</option>
              <option value={UserType.WHOLESALER}>도매상</option>
              <option value={UserType.ADMIN}>관리자</option>
            </select>
          </div>

          {/* 검색 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              검색
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="이름, 이메일, 전화번호로 검색"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* 사용자 목록 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            회원 목록 ({filteredUsers.length}명)
          </h2>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-gray-600">로딩 중...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">조회된 회원이 없습니다.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      이름
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      이메일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      전화번호
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      회원 유형
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      인증 상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      가입일
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((u) => (
                    <tr key={u.uid} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {u.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {u.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {u.phoneNumber || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${getUserTypeBadgeColor(u.userType)}`}
                        >
                          {getUserTypeLabel(u.userType)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${getVerificationStatusColor(u.verificationStatus)}`}
                        >
                          {getVerificationStatusLabel(u.verificationStatus)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(u.createdAt).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(u)}
                          className="text-blue-600 hover:text-blue-800 mr-3"
                        >
                          수정
                        </button>
                        {u.userType !== UserType.ADMIN && (
                          <button
                            onClick={() => handleDelete(u)}
                            className="text-red-600 hover:text-red-800"
                          >
                            삭제
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 수정 모달 */}
      {editModalOpen && selectedUser && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setEditModalOpen(false)}
        >
          <div
            className="bg-white rounded-lg max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              회원 정보 수정
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이름
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  전화번호
                </label>
                <input
                  type="text"
                  value={editForm.phoneNumber}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phoneNumber: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  회원 유형
                </label>
                <select
                  value={editForm.userType}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      userType: e.target.value as UserType,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value={UserType.NORMAL}>일반 사용자</option>
                  <option value={UserType.WHOLESALER}>도매상</option>
                  <option value={UserType.ADMIN}>관리자</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  인증 상태
                </label>
                <select
                  value={editForm.verificationStatus}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      verificationStatus: e.target.value as VerificationStatus,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value={VerificationStatus.APPROVED}>승인</option>
                  <option value={VerificationStatus.PENDING}>대기</option>
                  <option value={VerificationStatus.REJECTED}>거부</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setEditModalOpen(false)}
                disabled={processingUid === selectedUser.uid}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleEditSubmit}
                disabled={processingUid === selectedUser.uid}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {processingUid === selectedUser.uid ? '처리 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteModalOpen && selectedUser && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setDeleteModalOpen(false)}
        >
          <div
            className="bg-white rounded-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              회원 삭제 확인
            </h3>
            <p className="text-gray-600 mb-6">
              <span className="font-semibold">{selectedUser.name}</span>님을
              정말 삭제하시겠습니까?
              <br />이 작업은 되돌릴 수 없습니다.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteModalOpen(false)}
                disabled={processingUid === selectedUser.uid}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={processingUid === selectedUser.uid}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {processingUid === selectedUser.uid ? '처리 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

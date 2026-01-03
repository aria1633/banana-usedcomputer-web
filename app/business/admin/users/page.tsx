// app/business/admin/users/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { AdminService } from '@/lib/services/admin.service';
import { User, UserType, VerificationStatus } from '@/types/user';
import { isAdmin } from '@/lib/utils/auth';
import Link from 'next/link';

type UserFilter = 'all' | UserType;

export default function AdminUsersPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<UserFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phoneNumber: '' });
  const [processingId, setProcessingId] = useState<string | null>(null);

  const isAdminUser = isAdmin(user);

  useEffect(() => {
    if (!isLoading && !isAdminUser) {
      router.push('/business');
    }
  }, [isLoading, isAdminUser, router]);

  useEffect(() => {
    const loadUsers = async () => {
      if (!isAdminUser) return;

      try {
        const data = await AdminService.getAllUsers();
        setUsers(data);
      } catch (error) {
        console.error('Failed to load users:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [isAdminUser]);

  const filteredUsers = users.filter((u) => {
    const matchesFilter = filter === 'all' || u.userType === filter;
    const matchesSearch = !searchTerm ||
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.phoneNumber && u.phoneNumber.includes(searchTerm));
    return matchesFilter && matchesSearch;
  });

  const handleEdit = (targetUser: User) => {
    setEditingUser(targetUser);
    setEditForm({
      name: targetUser.name,
      phoneNumber: targetUser.phoneNumber || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    setProcessingId(editingUser.uid);
    try {
      await AdminService.updateUser(editingUser.uid, {
        name: editForm.name,
        phoneNumber: editForm.phoneNumber,
      });
      setUsers(prev => prev.map(u =>
        u.uid === editingUser.uid
          ? { ...u, name: editForm.name, phoneNumber: editForm.phoneNumber }
          : u
      ));
      setEditingUser(null);
      alert('수정되었습니다.');
    } catch (error) {
      console.error('Update error:', error);
      alert('수정 중 오류가 발생했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (uid: string, userName: string) => {
    if (!confirm(`정말로 "${userName}" 회원을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;

    setProcessingId(uid);
    try {
      await AdminService.deleteUser(uid);
      setUsers(prev => prev.filter(u => u.uid !== uid));
      alert('삭제되었습니다.');
    } catch (error) {
      console.error('Delete error:', error);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  const getUserTypeBadge = (userType: UserType) => {
    switch (userType) {
      case UserType.ADMIN:
        return <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">관리자</span>;
      case UserType.WHOLESALER:
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">도매상</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full font-medium">일반</span>;
    }
  };

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.APPROVED:
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">인증완료</span>;
      case VerificationStatus.PENDING:
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">심사중</span>;
      case VerificationStatus.REJECTED:
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">거부됨</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">-</span>;
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">회원 관리</h1>
        <p className="mt-2 text-gray-600">전체 회원을 조회하고 관리할 수 있습니다.</p>
      </div>

      {/* 필터 및 검색 */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            전체 ({users.length})
          </button>
          <button
            onClick={() => setFilter(UserType.NORMAL)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === UserType.NORMAL
                ? 'bg-gray-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            일반 ({users.filter(u => u.userType === UserType.NORMAL).length})
          </button>
          <button
            onClick={() => setFilter(UserType.WHOLESALER)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === UserType.WHOLESALER
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            도매상 ({users.filter(u => u.userType === UserType.WHOLESALER).length})
          </button>
          <button
            onClick={() => setFilter(UserType.ADMIN)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === UserType.ADMIN
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            관리자 ({users.filter(u => u.userType === UserType.ADMIN).length})
          </button>
        </div>

        <div className="flex-1">
          <input
            type="text"
            placeholder="이름, 이메일, 전화번호로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 인증 관리 바로가기 */}
      <div className="mb-6">
        <Link
          href="/business/admin/verifications"
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          사업자 인증 관리로 이동
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600"></div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border">
          <div className="text-6xl mb-4">-</div>
          <p className="text-xl font-semibold text-gray-700">
            {searchTerm ? '검색 결과가 없습니다' : '등록된 회원이 없습니다'}
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-gray-600">
            총 {filteredUsers.length}명의 회원
          </div>

          <div className="bg-white rounded-xl shadow-sm border overflow-hidden overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">이름</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">이메일</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">전화번호</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">유형</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">인증상태</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">가입일</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((targetUser) => (
                  <tr key={targetUser.uid} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{targetUser.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{targetUser.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{targetUser.phoneNumber || '-'}</td>
                    <td className="px-4 py-3">{getUserTypeBadge(targetUser.userType)}</td>
                    <td className="px-4 py-3">
                      {targetUser.userType === UserType.WHOLESALER
                        ? getStatusBadge(targetUser.verificationStatus)
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(targetUser.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {/* 관리자는 삭제/수정 불가 */}
                      {targetUser.userType !== UserType.ADMIN && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(targetUser)}
                            className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDelete(targetUser.uid, targetUser.name)}
                            disabled={processingId === targetUser.uid}
                            className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200 disabled:opacity-50"
                          >
                            삭제
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 수정 모달 */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">회원 정보 수정</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                <input
                  type="email"
                  value={editingUser.email}
                  disabled
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
                <input
                  type="tel"
                  value={editForm.phoneNumber}
                  onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
              >
                취소
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={processingId === editingUser.uid}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {processingId === editingUser.uid ? '저장중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

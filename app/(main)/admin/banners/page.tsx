// app/(main)/admin/banners/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { UserType } from '@/types/user';
import { Banner, CreateBannerInput } from '@/types/banner';
import { BannerService } from '@/lib/services/banner.service';
import { StorageService } from '@/lib/services/storage.service';
import Link from 'next/link';
import Image from 'next/image';

export default function AdminBannersPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [formData, setFormData] = useState({
    title: '배너',
    description: '배너 이미지',
    linkUrl: '',
    isActive: true,
    displayOrder: 0,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 관리자 권한 체크
  useEffect(() => {
    if (!isLoading && (!user || user.userType !== UserType.ADMIN)) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  // 배너 목록 불러오기
  useEffect(() => {
    if (user && user.userType === UserType.ADMIN) {
      loadBanners();
    }
  }, [user]);

  const loadBanners = async () => {
    try {
      setLoading(true);
      const data = await BannerService.getAllBanners();
      setBanners(data);
    } catch (error) {
      console.error('Failed to load banners:', error);
      setError('배너 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 파일 유효성 검사
      const validation = StorageService.validateFile(file);
      if (!validation.valid) {
        setError(validation.error || '유효하지 않은 파일입니다.');
        return;
      }

      setImageFile(file);
      // 이미지 미리보기 생성
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!imageFile) {
      setError('배너 이미지를 선택해주세요.');
      return;
    }

    try {
      setSubmitting(true);

      // 이미지 업로드
      const imageUrl = await StorageService.uploadBannerImage(imageFile);

      // 배너 생성
      const input: CreateBannerInput = {
        title: '배너',
        description: '배너 이미지',
        imageUrl,
        linkUrl: formData.linkUrl || undefined,
        isActive: formData.isActive,
        displayOrder: formData.displayOrder,
      };

      await BannerService.createBanner(input);

      // 폼 초기화
      setFormData({
        title: '배너',
        description: '배너 이미지',
        linkUrl: '',
        isActive: true,
        displayOrder: 0,
      });
      setImageFile(null);
      setImagePreview('');
      setShowCreateModal(false);

      // 배너 목록 새로고침
      await loadBanners();
    } catch (error: any) {
      console.error('Failed to create banner:', error);
      setError(error.message || '배너 생성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 이 배너를 삭제하시겠습니까?')) {
      return;
    }

    try {
      await BannerService.deleteBanner(id);
      await loadBanners();
    } catch (error: any) {
      console.error('Failed to delete banner:', error);
      alert(error.message || '배너 삭제에 실패했습니다.');
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await BannerService.toggleBannerActive(id, !currentStatus);
      await loadBanners();
    } catch (error: any) {
      console.error('Failed to toggle banner:', error);
      alert(error.message || '배너 상태 변경에 실패했습니다.');
    }
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      description: banner.description,
      linkUrl: banner.linkUrl || '',
      isActive: banner.isActive,
      displayOrder: banner.displayOrder,
    });
    setImagePreview(banner.imageUrl);
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!editingBanner) return;

    try {
      setSubmitting(true);

      let imageUrl = editingBanner.imageUrl;

      // 새 이미지가 선택된 경우에만 업로드
      if (imageFile) {
        imageUrl = await StorageService.uploadBannerImage(imageFile);
      }

      // 배너 수정
      await BannerService.updateBanner(editingBanner.id, {
        title: '배너',
        description: '배너 이미지',
        imageUrl,
        linkUrl: formData.linkUrl || undefined,
        isActive: formData.isActive,
        displayOrder: formData.displayOrder,
      });

      // 폼 초기화
      setFormData({
        title: '배너',
        description: '배너 이미지',
        linkUrl: '',
        isActive: true,
        displayOrder: 0,
      });
      setImageFile(null);
      setImagePreview('');
      setEditingBanner(null);
      setShowEditModal(false);

      // 배너 목록 새로고침
      await loadBanners();
    } catch (error: any) {
      console.error('Failed to update banner:', error);
      setError(error.message || '배너 수정에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-primary"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user || user.userType !== UserType.ADMIN) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">배너 관리</h1>
              <p className="mt-2 text-gray-600">홈 화면에 표시될 배너를 관리합니다</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 gradient-primary text-white rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              + 새 배너 추가
            </button>
          </div>
        </div>

        {/* 배너 목록 */}
        <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    순서
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    미리보기
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    제목
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    설명
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {banners.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      등록된 배너가 없습니다.
                    </td>
                  </tr>
                ) : (
                  banners.map((banner) => (
                    <tr key={banner.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {banner.displayOrder}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="relative w-32 h-20 rounded-lg overflow-hidden">
                          <Image
                            src={banner.imageUrl}
                            alt={banner.title}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {banner.title}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {banner.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            banner.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {banner.isActive ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleEdit(banner)}
                          className="text-primary hover:text-primary/80"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleToggleActive(banner.id, banner.isActive)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          {banner.isActive ? '비활성화' : '활성화'}
                        </button>
                        <button
                          onClick={() => handleDelete(banner.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 배너 수정 모달 */}
      {showEditModal && editingBanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">배너 수정</h2>

            <form onSubmit={handleUpdate} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  배너 이미지 {imageFile ? '' : '(변경하지 않으려면 비워두세요)'}
                </label>
                <div className="mb-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-semibold text-blue-900 mb-2">📐 권장 이미지 사양</p>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• <strong>해상도:</strong> 1280px × 400px (비율 16:5)</li>
                    <li>• <strong>고해상도:</strong> 1920px × 600px 또는 2560px × 800px</li>
                    <li>• <strong>파일 형식:</strong> JPG, PNG, WebP (WebP 권장)</li>
                    <li>• <strong>파일 크기:</strong> 500KB 이하 권장</li>
                    <li>• <strong>주의사항:</strong> 텍스트는 이미지에 직접 포함, 중요 내용은 중앙 배치</li>
                  </ul>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full"
                />
                {imagePreview && (
                  <div className="mt-4 relative w-full h-48 rounded-lg overflow-hidden">
                    <Image
                      src={imagePreview}
                      alt="미리보기"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  클릭 시 이동할 링크 URL (선택사항)
                </label>
                <input
                  type="url"
                  value={formData.linkUrl}
                  onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  표시 순서
                </label>
                <input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="0"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActiveEdit"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <label htmlFor="isActiveEdit" className="ml-2 text-sm text-gray-700">
                  활성화
                </label>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingBanner(null);
                    setError('');
                    setImageFile(null);
                    setImagePreview('');
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                  disabled={submitting}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3 gradient-primary text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {submitting ? '수정 중...' : '수정'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 배너 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">새 배너 추가</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  배너 이미지 *
                </label>
                <div className="mb-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-semibold text-blue-900 mb-2">📐 권장 이미지 사양</p>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• <strong>해상도:</strong> 1280px × 400px (비율 16:5)</li>
                    <li>• <strong>고해상도:</strong> 1920px × 600px 또는 2560px × 800px</li>
                    <li>• <strong>파일 형식:</strong> JPG, PNG, WebP (WebP 권장)</li>
                    <li>• <strong>파일 크기:</strong> 500KB 이하 권장</li>
                    <li>• <strong>주의사항:</strong> 텍스트는 이미지에 직접 포함, 중요 내용은 중앙 배치</li>
                  </ul>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full"
                />
                {imagePreview && (
                  <div className="mt-4 relative w-full h-48 rounded-lg overflow-hidden">
                    <Image
                      src={imagePreview}
                      alt="미리보기"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  클릭 시 이동할 링크 URL (선택사항)
                </label>
                <input
                  type="url"
                  value={formData.linkUrl}
                  onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  표시 순서
                </label>
                <input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="0"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                  즉시 활성화
                </label>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setError('');
                    setImageFile(null);
                    setImagePreview('');
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                  disabled={submitting}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3 gradient-primary text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {submitting ? '생성 중...' : '생성'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

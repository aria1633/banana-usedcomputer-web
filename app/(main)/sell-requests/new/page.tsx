// app/(main)/sell-requests/new/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { SellRequestService } from '@/lib/services/sell-request.service';
import { StorageService } from '@/lib/services/storage.service';
import { SellRequestStatus, SellRequestCategory } from '@/types/sell-request';
import { UserType } from '@/types/user';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/config';
import { getAccessToken } from '@/lib/utils/auth';

export default function NewSellRequestPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 컴포넌트 마운트 시 loading 상태 초기화
  useEffect(() => {
    setLoading(false);
  }, []);

  // 폼 데이터
  const [category, setCategory] = useState<SellRequestCategory>(SellRequestCategory.COMPUTER);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [desiredPrice, setDesiredPrice] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // 이미지 업로드 핸들러
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
    },
    maxFiles: 7,
    maxSize: 10485760, // 10MB
    onDrop: (acceptedFiles, rejectedFiles) => {
      // 거부된 파일 처리
      if (rejectedFiles.length > 0) {
        const errors = rejectedFiles.map(rejected => {
          const error = rejected.errors[0];
          if (error.code === 'file-too-large') {
            return `${rejected.file.name}: 파일 크기는 10MB 이하여야 합니다.`;
          }
          return `${rejected.file.name}: ${error.message}`;
        });
        setError(errors.join('\n'));
        return;
      }

      // 최대 개수 체크
      const totalImages = images.length + acceptedFiles.length;
      if (totalImages > 7) {
        setError(`최대 7개의 이미지만 업로드할 수 있습니다. (현재: ${images.length}개)`);
        return;
      }

      setImages([...images, ...acceptedFiles]);
      setError('');

      // 미리보기 생성
      const newPreviews = acceptedFiles.map((file) =>
        URL.createObjectURL(file)
      );
      setImagePreviews([...imagePreviews, ...newPreviews]);
    },
  });

  // 이미지 제거
  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);

    // 메모리 정리
    URL.revokeObjectURL(imagePreviews[index]);

    setImages(newImages);
    setImagePreviews(newPreviews);
  };

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[매입 요청 등록] handleSubmit 시작');
    console.log('[매입 요청 등록] user:', user);
    console.log('[매입 요청 등록] loading:', loading);

    if (!user || user.userType !== UserType.NORMAL) {
      console.log('[매입 요청 등록] 사용자 타입 검증 실패:', { user: !!user, userType: user?.userType });
      setError('일반 사용자만 매입 요청을 등록할 수 있습니다.');
      return;
    }

    if (!title.trim() || !description.trim()) {
      console.log('[매입 요청 등록] 제목/설명 검증 실패');
      setError('제목과 설명을 입력해주세요.');
      return;
    }

    if (images.length === 0) {
      console.log('[매입 요청 등록] 이미지 검증 실패');
      setError('최소 1개 이상의 이미지를 업로드해주세요.');
      return;
    }

    console.log('[매입 요청 등록] 검증 통과, 업로드 시작');
    setLoading(true);
    setError('');

    try {
      // 세션 토큰 가져오기
      console.log('[매입 요청 등록] 세션 토큰 가져오기 시작');
      const accessToken = getAccessToken();

      if (!accessToken) {
        throw new Error('인증 토큰을 찾을 수 없습니다. 다시 로그인해주세요.');
      }

      console.log('[매입 요청 등록] 세션 토큰 확인 완료');
      console.log('[매입 요청 등록] 이미지 업로드 시작:', images.length, '개');

      // 이미지 업로드
      const imageUrls = await StorageService.uploadImages(
        images,
        'sell-request-images',
        `sell-requests/${user.uid}`,
        accessToken
      );
      console.log('[매입 요청 등록] 이미지 업로드 완료:', imageUrls.length, '개');

      // 매입 요청 생성
      console.log('[매입 요청 등록] 데이터베이스 저장 시작');
      await SellRequestService.createSellRequest(
        {
          sellerId: user.uid,
          sellerName: user.name,
          title: title.trim(),
          description: description.trim(),
          imageUrls,
          desiredPrice: desiredPrice.trim() || null,
          category,
          status: SellRequestStatus.OPEN,
          createdAt: new Date(),
        },
        accessToken
      );
      console.log('[매입 요청 등록] 데이터베이스 저장 완료');

      alert('매입 요청이 성공적으로 등록되었습니다!');
      router.push('/sell-requests');
    } catch (err: unknown) {
      console.error('[매입 요청 등록] 에러 발생:', err);
      setError((err as Error).message || '매입 요청 등록에 실패했습니다.');
    } finally {
      console.log('[매입 요청 등록] finally 블록 실행, loading을 false로 설정');
      setLoading(false);
    }
  };

  // 로그인 체크
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-lg text-yellow-800 mb-4">
            로그인이 필요한 서비스입니다.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  // 권한 체크
  if (user.userType !== UserType.NORMAL) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-lg text-red-800 mb-4">
            일반 사용자만 매입 요청을 등록할 수 있습니다.
          </p>
          <button
            onClick={() => router.push('/sell-requests')}
            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">매입 요청 등록</h1>
        <p className="mt-2 text-gray-600">
          판매하고자 하는 제품의 정보를 입력해주세요. 도매상들이 매입 가격을 제시합니다.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            {error}
          </div>
        )}

        {/* 카테고리 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            카테고리 <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label
              className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition ${
                category === SellRequestCategory.COMPUTER
                  ? 'border-primary bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="radio"
                name="category"
                value={SellRequestCategory.COMPUTER}
                checked={category === SellRequestCategory.COMPUTER}
                onChange={(e) => setCategory(e.target.value as SellRequestCategory)}
                className="sr-only"
                disabled={loading}
              />
              <div className="flex items-center">
                <div
                  className={`flex-shrink-0 w-5 h-5 rounded-full border-2 mr-3 ${
                    category === SellRequestCategory.COMPUTER
                      ? 'border-primary bg-primary'
                      : 'border-gray-400'
                  }`}
                >
                  {category === SellRequestCategory.COMPUTER && (
                    <div className="w-full h-full rounded-full bg-white scale-50"></div>
                  )}
                </div>
                <div>
                  <div className="font-medium text-gray-900">컴퓨터 관련 기기 및 부품</div>
                  <div className="text-sm text-gray-500">노트북, 데스크탑, 모니터, 키보드 등</div>
                </div>
              </div>
            </label>

            <label
              className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition ${
                category === SellRequestCategory.SMARTPHONE
                  ? 'border-primary bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="radio"
                name="category"
                value={SellRequestCategory.SMARTPHONE}
                checked={category === SellRequestCategory.SMARTPHONE}
                onChange={(e) => setCategory(e.target.value as SellRequestCategory)}
                className="sr-only"
                disabled={loading}
              />
              <div className="flex items-center">
                <div
                  className={`flex-shrink-0 w-5 h-5 rounded-full border-2 mr-3 ${
                    category === SellRequestCategory.SMARTPHONE
                      ? 'border-primary bg-primary'
                      : 'border-gray-400'
                  }`}
                >
                  {category === SellRequestCategory.SMARTPHONE && (
                    <div className="w-full h-full rounded-full bg-white scale-50"></div>
                  )}
                </div>
                <div>
                  <div className="font-medium text-gray-900">스마트폰</div>
                  <div className="text-sm text-gray-500">아이폰, 갤럭시, 태블릿 등</div>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* 제목 */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            제목 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              category === SellRequestCategory.COMPUTER
                ? "예: 삼성 노트북 갤럭시북 Pro"
                : "예: 아이폰 14 Pro 256GB"
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            required
            disabled={loading}
          />
        </div>

        {/* 설명 */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            상세 설명 <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="제품의 사양, 상태, 구입 시기 등을 자세히 입력해주세요."
            rows={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            required
            disabled={loading}
          />
          <p className="mt-1 text-sm text-gray-500">
            자세한 정보를 입력할수록 더 정확한 견적을 받을 수 있습니다.
          </p>
        </div>

        {/* 희망 가격 */}
        <div>
          <label htmlFor="desiredPrice" className="block text-sm font-medium text-gray-700 mb-2">
            희망 가격 (선택사항)
          </label>
          <input
            type="text"
            id="desiredPrice"
            value={desiredPrice}
            onChange={(e) => setDesiredPrice(e.target.value)}
            placeholder="예: 500,000원"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={loading}
          />
          <p className="mt-1 text-sm text-gray-500">
            희망 가격을 입력하지 않아도 됩니다. 도매상들이 제시하는 가격을 비교해보세요.
          </p>
        </div>

        {/* 이미지 업로드 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            제품 이미지 <span className="text-red-500">*</span>
          </label>

          {/* 드롭존 */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
              isDragActive
                ? 'border-primary bg-blue-50'
                : 'border-gray-300 hover:border-primary'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input {...getInputProps()} disabled={loading} />
            <div className="text-gray-600">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 mb-3"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {isDragActive ? (
                <p>이미지를 여기에 놓으세요...</p>
              ) : (
                <>
                  <p className="mb-1">
                    <span className="font-semibold text-primary">클릭</span>하여 이미지 업로드
                  </p>
                  <p className="text-sm">또는 드래그 앤 드롭</p>
                  <p className="text-xs mt-2">최대 5개, JPEG, PNG, GIF, WebP</p>
                </>
              )}
            </div>
          </div>

          {/* 이미지 미리보기 */}
          {imagePreviews.length > 0 && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative group aspect-square">
                  <Image
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    fill
                    className="object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                    disabled={loading}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 버튼 */}
        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
            disabled={loading}
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-primary text-white rounded-md hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '등록 중...' : '매입 요청 등록'}
          </button>
        </div>
      </form>

      {/* 안내 사항 */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">💡 안내 사항</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• 매입 요청을 등록하면 도매상들이 매입 가격을 제시합니다.</li>
          <li>• 여러 도매상의 견적을 비교하여 가장 좋은 조건을 선택하세요.</li>
          <li>• 제품 사진과 상세 정보를 정확히 입력할수록 더 정확한 견적을 받을 수 있습니다.</li>
          <li>• 매입 요청은 언제든지 취소할 수 있습니다.</li>
        </ul>
      </div>
    </div>
  );
}

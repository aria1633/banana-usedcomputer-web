// app/business/products/new/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { ProductService } from '@/lib/services/product.service';
import { StorageService } from '@/lib/services/storage.service';
import { UserType, VerificationStatus } from '@/types/user';
import { ProductChannel } from '@/types/product';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { getAccessToken, isAdmin } from '@/lib/utils/auth';

const CATEGORIES = ['데스크탑', '노트북', '모니터', '키보드/마우스', '부품', '기타'];

const SALE_TYPES: { value: ProductChannel; label: string; description: string }[] = [
  { value: 'retail', label: '소매 (일반 소비자용)', description: '일반 소비자가 구매할 수 있는 상품입니다.' },
  { value: 'wholesale', label: '도매 (도매상 전용)', description: '도매상만 볼 수 있는 B2B 상품입니다.' },
];

export default function BusinessNewProductPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [saleType, setSaleType] = useState<ProductChannel>('retail');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] },
    maxFiles: 7,
    maxSize: 10485760,
    onDrop: (acceptedFiles, rejectedFiles) => {
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

      const totalImages = images.length + acceptedFiles.length;
      if (totalImages > 7) {
        setError(`최대 7개의 이미지만 업로드할 수 있습니다. (현재: ${images.length}개)`);
        return;
      }

      setImages([...images, ...acceptedFiles]);
      setError('');
      const newPreviews = acceptedFiles.map((file) => URL.createObjectURL(file));
      setImagePreviews([...imagePreviews, ...newPreviews]);
    },
  });

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    URL.revokeObjectURL(imagePreviews[index]);
    setImages(newImages);
    setImagePreviews(newPreviews);
  };

  const moveImageUp = (index: number) => {
    if (index === 0) return;
    const newImages = [...images];
    const newPreviews = [...imagePreviews];
    [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
    [newPreviews[index - 1], newPreviews[index]] = [newPreviews[index], newPreviews[index - 1]];
    setImages(newImages);
    setImagePreviews(newPreviews);
  };

  const moveImageDown = (index: number) => {
    if (index === images.length - 1) return;
    const newImages = [...images];
    const newPreviews = [...imagePreviews];
    [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
    [newPreviews[index], newPreviews[index + 1]] = [newPreviews[index + 1], newPreviews[index]];
    setImages(newImages);
    setImagePreviews(newPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 관리자이거나 인증된 도매상만 상품 등록 가능
    if (!user || (!isAdmin(user) && (user.userType !== UserType.WHOLESALER || user.verificationStatus !== VerificationStatus.APPROVED))) {
      setError('인증된 도매상만 상품을 등록할 수 있습니다.');
      return;
    }

    if (!title.trim() || !description.trim()) {
      setError('제목과 설명을 입력해주세요.');
      return;
    }

    const priceNum = parseInt(price.replace(/,/g, ''));
    const quantityNum = parseInt(quantity);

    if (isNaN(priceNum) || priceNum <= 0) {
      setError('올바른 가격을 입력해주세요.');
      return;
    }

    if (isNaN(quantityNum) || quantityNum <= 0) {
      setError('올바른 재고 수량을 입력해주세요.');
      return;
    }

    if (images.length === 0) {
      setError('최소 1개 이상의 이미지를 업로드해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const accessToken = getAccessToken();
      if (!accessToken) {
        throw new Error('인증 토큰을 찾을 수 없습니다. 다시 로그인해주세요.');
      }

      const imageUrls = await StorageService.uploadImages(
        images,
        'product-images',
        `products/${user.uid}`,
        accessToken
      );

      await ProductService.createProduct(
        {
          sellerId: user.uid,
          sellerName: user.name,
          title: title.trim(),
          description: description.trim(),
          price: priceNum,
          quantity: quantityNum,
          category,
          imageUrls,
          isAvailable: true,
          createdAt: new Date(),
          channel: saleType,
        },
        accessToken
      );

      alert('상품이 성공적으로 등록되었습니다!');
      router.push('/business/products');
    } catch (err: unknown) {
      setError((err as Error).message || '상품 등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (value: string) => {
    const numbers = value.replace(/[^\d]/g, '');
    const formatted = numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    setPrice(formatted);
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-lg text-yellow-800 mb-4">로그인이 필요한 서비스입니다.</p>
          <button onClick={() => router.push('/login')} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  // 관리자가 아니고 도매상이 아닌 경우
  if (!isAdmin(user) && user.userType !== UserType.WHOLESALER) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-lg text-red-800 mb-4">도매상만 상품을 등록할 수 있습니다.</p>
          <button onClick={() => router.push('/business')} className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 관리자가 아닌 경우에만 사업자 인증 체크
  if (!isAdmin(user) && user.verificationStatus !== VerificationStatus.APPROVED) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-lg text-yellow-800 mb-4">사업자 인증이 완료된 도매상만 상품을 등록할 수 있습니다.</p>
          <button onClick={() => router.push('/business-verification')} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            사업자 인증하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">상품 등록</h1>
        <p className="mt-2 text-gray-600">판매하고자 하는 중고 컴퓨터의 정보를 입력해주세요.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">{error}</div>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            상품명 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 삼성 노트북 갤럭시북 Pro 15인치"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
            카테고리 <span className="text-red-500">*</span>
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            disabled={loading}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            판매 유형 <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SALE_TYPES.map((type) => (
              <label
                key={type.value}
                className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
                  saleType === type.value
                    ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-600'
                    : 'border-gray-300 bg-white hover:bg-gray-50'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="radio"
                  name="saleType"
                  value={type.value}
                  checked={saleType === type.value}
                  onChange={(e) => setSaleType(e.target.value as ProductChannel)}
                  className="sr-only"
                  disabled={loading}
                />
                <div className="flex flex-1">
                  <div className="flex flex-col">
                    <span className={`block text-sm font-medium ${
                      saleType === type.value ? 'text-blue-900' : 'text-gray-900'
                    }`}>
                      {type.label}
                    </span>
                    <span className={`mt-1 text-xs ${
                      saleType === type.value ? 'text-blue-700' : 'text-gray-500'
                    }`}>
                      {type.description}
                    </span>
                  </div>
                </div>
                {saleType === type.value && (
                  <svg className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
              가격 (원) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="price"
              value={price}
              onChange={(e) => handlePriceChange(e.target.value)}
              placeholder="예: 500,000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
              재고 수량 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="예: 10"
              min="1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            상세 설명 <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="제품의 사양, 상태, 포함 구성품 등을 자세히 입력해주세요."
            rows={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            제품 이미지 <span className="text-red-500">*</span>
          </label>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
              isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-500'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input {...getInputProps()} disabled={loading} />
            <div className="text-gray-600">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {isDragActive ? (
                <p>이미지를 여기에 놓으세요...</p>
              ) : (
                <>
                  <p className="mb-1"><span className="font-semibold text-blue-600">클릭</span>하여 이미지 업로드</p>
                  <p className="text-sm">또는 드래그 앤 드롭</p>
                  <p className="text-xs mt-2">최대 7개, JPEG, PNG, GIF, WebP</p>
                </>
              )}
            </div>
          </div>

          {imagePreviews.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-2">
                첫 번째 이미지가 대표 이미지(썸네일)로 사용됩니다. 화살표 버튼으로 순서를 변경하세요.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative group aspect-square">
                    <Image src={preview} alt={`Preview ${index + 1}`} fill className="object-cover rounded-lg" />

                    {/* 썸네일 표시 */}
                    {index === 0 && (
                      <div className="absolute top-1 left-1 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">
                        대표
                      </div>
                    )}

                    {/* 순서 변경 버튼 */}
                    <div className="absolute bottom-1 left-1 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        type="button"
                        onClick={() => moveImageUp(index)}
                        disabled={loading || index === 0}
                        className={`bg-gray-800 text-white rounded p-1 ${
                          index === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-700'
                        }`}
                        title="앞으로 이동"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveImageDown(index)}
                        disabled={loading || index === imagePreviews.length - 1}
                        className={`bg-gray-800 text-white rounded p-1 ${
                          index === imagePreviews.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-700'
                        }`}
                        title="뒤로 이동"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>

                    {/* 삭제 버튼 */}
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition hover:bg-red-600"
                      disabled={loading}
                      title="삭제"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>

                    {/* 순서 번호 */}
                    <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            disabled={loading}
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '등록 중...' : '상품 등록'}
          </button>
        </div>
      </form>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">안내 사항</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• 정확한 제품 정보와 가격을 입력해주세요.</li>
          <li>• 실제 제품 상태를 잘 보여주는 사진을 업로드하세요.</li>
          <li>• 제품 설명에 사양, 상태, 포함 구성품 등을 상세히 기재하세요.</li>
          <li>• 재고 수량을 정확히 입력해주세요.</li>
        </ul>
      </div>
    </div>
  );
}

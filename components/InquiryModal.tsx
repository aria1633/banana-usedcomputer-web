// components/InquiryModal.tsx
'use client';

import { useState } from 'react';
import { InquiryService } from '@/lib/services/inquiry.service';
import { InquiryStatus } from '@/types/inquiry';
import { getSession } from '@/lib/utils/storage';
import { logger } from '@/lib/utils/logger';

interface InquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productTitle: string;
  sellerId: string;
  sellerName: string;
}

export default function InquiryModal({
  isOpen,
  onClose,
  productId,
  productTitle,
  sellerId,
  sellerName,
}: InquiryModalProps) {
  const [question, setQuestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.trim()) {
      setError('문의 내용을 입력해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const session = getSession();
      if (!session) {
        setError('로그인이 필요합니다.');
        return;
      }

      await InquiryService.createInquiry({
        productId,
        productTitle,
        customerId: session.user.id,
        customerName: session.user.user_metadata?.name || session.user.email || '사용자',
        sellerId,
        sellerName,
        question: question.trim(),
        status: InquiryStatus.PENDING,
      });

      logger.success('문의가 성공적으로 등록되었습니다.');
      setQuestion('');
      onClose();

      // 성공 알림
      alert('문의가 성공적으로 등록되었습니다.');
    } catch (err) {
      logger.error('문의 등록 실패', { error: err instanceof Error ? err.message : String(err) });
      setError('문의 등록에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* 모달 컨텐츠 */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">구매 문의하기</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* 상품 정보 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">문의 상품</p>
            <p className="font-semibold text-gray-900">{productTitle}</p>
            <p className="text-sm text-gray-600 mt-1">판매자: {sellerName}</p>
          </div>

          {/* 문의 내용 입력 */}
          <div className="mb-6">
            <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-2">
              문의 내용 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              placeholder="상품에 대해 궁금한 점을 작성해주세요.&#10;&#10;예시:&#10;- 배터리 상태가 어떤가요?&#10;- 직접 방문해서 확인 가능한가요?&#10;- 배송은 어떻게 진행되나요?"
              disabled={isSubmitting}
            />
            <p className="text-sm text-gray-500 mt-2">
              판매자에게 상품에 대한 질문을 남겨주세요. 판매자가 답변을 남기면 알림을 받으실 수 있습니다.
            </p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition"
              disabled={isSubmitting}
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? '등록 중...' : '문의 등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

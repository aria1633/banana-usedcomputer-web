// lib/services/storage.service.ts

import { supabase } from '@/lib/supabase/config';

export class StorageService {
  /**
   * 사업자 등록증 업로드 (서버 API 사용)
   */
  static async uploadBusinessRegistration(
    file: File,
    userId: string
  ): Promise<string> {
    try {
      console.log('[StorageService] Uploading business registration via API...');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);

      const response = await fetch('/api/upload-business-registration', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '업로드 실패');
      }

      const data = await response.json();
      console.log('[StorageService] Business registration uploaded:', data.url);

      return data.url;
    } catch (error: any) {
      console.error('[StorageService] Upload error:', error);
      throw new Error(`사업자 등록증 업로드 실패: ${error.message}`);
    }
  }

  /**
   * 파일 유효성 검사
   */
  static validateFile(
    file: File,
    maxSizeMB: number = 5,
    allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
  ): { valid: boolean; error?: string } {
    // 파일 크기 검사
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `파일 크기는 ${maxSizeMB}MB 이하여야 합니다.`,
      };
    }

    // 파일 타입 검사
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `허용된 파일 형식: JPG, PNG, PDF`,
      };
    }

    return { valid: true };
  }

  /**
   * 파일 이름을 안전한 형식으로 변환
   * 특수문자, 한글, 공백 등을 제거하고 영문과 숫자, 일부 안전한 문자만 남김
   */
  private static sanitizeFileName(fileName: string): string {
    // 파일 확장자 추출
    const lastDotIndex = fileName.lastIndexOf('.');
    const extension = lastDotIndex > -1 ? fileName.slice(lastDotIndex) : '';
    const nameWithoutExt = lastDotIndex > -1 ? fileName.slice(0, lastDotIndex) : fileName;

    // 안전한 문자만 남기기: 영문, 숫자, 하이픈, 언더스코어
    const safeName = nameWithoutExt
      .replace(/[^a-zA-Z0-9_-]/g, '_') // 허용되지 않는 문자를 언더스코어로 변경
      .replace(/_+/g, '_') // 연속된 언더스코어를 하나로
      .replace(/^_|_$/g, ''); // 앞뒤 언더스코어 제거

    // 파일 이름이 비어있으면 랜덤 문자열 사용
    const finalName = safeName || `file_${Math.random().toString(36).substring(2, 10)}`;

    return finalName + extension.toLowerCase();
  }

  /**
   * 이미지 업로드 (단일) - Fetch API 사용
   */
  static async uploadImage(
    file: File,
    bucket: 'product-images' | 'sell-request-images',
    folder: string | undefined,
    accessToken: string
  ): Promise<string> {
    try {
      console.log('[StorageService] uploadImage 시작 (Fetch API):', { bucket, folder });

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      if (!accessToken) {
        throw new Error('인증 토큰이 없습니다. 로그인이 필요합니다.');
      }

      const sanitizedName = this.sanitizeFileName(file.name);
      const fileName = `${Date.now()}_${sanitizedName}`;
      const filePath = folder ? `${folder}/${fileName}` : fileName;
      const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${filePath}`;

      console.log('[StorageService] Upload URL:', uploadUrl);
      console.log('[StorageService] Original filename:', file.name, '-> Sanitized:', sanitizedName);

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': supabaseKey,
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      });

      console.log('[StorageService] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[StorageService] Upload failed:', errorText);
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;
      console.log('[StorageService] Upload success, public URL:', publicUrl);

      return publicUrl;
    } catch (error) {
      console.error('[StorageService] uploadImage error:', error);
      throw new Error(`이미지 업로드 실패: ${error}`);
    }
  }

  /**
   * 이미지 업로드 (다중) - Fetch API 사용
   * @param files 업로드할 파일 배열
   * @param bucket 버킷 이름
   * @param folder 폴더 경로 (선택)
   * @param accessToken 사용자 JWT 토큰 (필수)
   */
  static async uploadImages(
    files: File[],
    bucket: 'product-images' | 'sell-request-images',
    folder: string | undefined,
    accessToken: string
  ): Promise<string[]> {
    try {
      console.log('[StorageService] uploadImages 시작 (Fetch API 방식):', { bucket, folder, filesCount: files.length });

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      if (!accessToken) {
        throw new Error('인증 토큰이 없습니다. 로그인이 필요합니다.');
      }

      console.log('[StorageService] Access token 확인 완료');

      const uploadPromises = files.map(async (file, index) => {
        const sanitizedName = this.sanitizeFileName(file.name);
        const fileName = `${Date.now()}_${index}_${sanitizedName}`;
        const filePath = folder ? `${folder}/${fileName}` : fileName;

        console.log(`[StorageService] 파일 ${index + 1} 업로드 시작 (Fetch):`, filePath);
        console.log(`[StorageService] Original filename:`, file.name, '-> Sanitized:', sanitizedName);

        // Fetch API로 직접 업로드
        const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${filePath}`;

        console.log(`[StorageService] Upload URL:`, uploadUrl);

        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`, // 사용자 JWT 토큰 사용
            'apikey': supabaseKey,
            'Content-Type': file.type || 'application/octet-stream',
          },
          body: file,
        });

        console.log(`[StorageService] 파일 ${index + 1} 응답 상태:`, response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[StorageService] 파일 ${index + 1} 업로드 실패:`, errorText);
          throw new Error(`Upload failed: ${response.status} - ${errorText}`);
        }

        console.log(`[StorageService] 파일 ${index + 1} 업로드 성공`);

        // Public URL 생성
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;
        console.log(`[StorageService] 파일 ${index + 1} Public URL:`, publicUrl);

        return publicUrl;
      });

      const urls = await Promise.all(uploadPromises);
      console.log('[StorageService] 모든 파일 업로드 완료:', urls.length);
      return urls;
    } catch (error) {
      console.error('[StorageService] uploadImages 에러:', error);
      throw new Error(`이미지 업로드 실패: ${error}`);
    }
  }

  /**
   * 이미지 삭제 - Fetch API 사용
   * URL에서 파일 경로 추출하여 삭제
   */
  static async deleteImage(
    imageUrl: string,
    bucket: 'product-images' | 'sell-request-images',
    accessToken: string
  ): Promise<void> {
    try {
      console.log('[StorageService] deleteImage 시작 (Fetch API):', imageUrl);

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      if (!accessToken) {
        throw new Error('인증 토큰이 없습니다. 로그인이 필요합니다.');
      }

      // URL에서 파일 경로 추출
      const filePath = this.extractFilePathFromUrl(imageUrl, bucket);
      console.log('[StorageService] File path:', filePath);

      const deleteUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${filePath}`;

      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': supabaseKey,
        },
      });

      console.log('[StorageService] Delete response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[StorageService] Delete failed:', errorText);
        throw new Error(`Delete failed: ${response.status} - ${errorText}`);
      }

      console.log('[StorageService] Delete success');
    } catch (error) {
      console.error('[StorageService] deleteImage error:', error);
      throw new Error(`이미지 삭제 실패: ${error}`);
    }
  }

  /**
   * 다중 이미지 삭제 - Fetch API 사용
   */
  static async deleteImages(
    imageUrls: string[],
    bucket: 'product-images' | 'sell-request-images',
    accessToken: string
  ): Promise<void> {
    try {
      console.log('[StorageService] deleteImages 시작 (Fetch API), count:', imageUrls.length);

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      if (!accessToken) {
        throw new Error('인증 토큰이 없습니다. 로그인이 필요합니다.');
      }

      const filePaths = imageUrls.map((url) =>
        this.extractFilePathFromUrl(url, bucket)
      );

      console.log('[StorageService] File paths to delete:', filePaths);

      const deleteUrl = `${supabaseUrl}/storage/v1/object/${bucket}`;

      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prefixes: filePaths,
        }),
      });

      console.log('[StorageService] Delete response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[StorageService] Delete failed:', errorText);
        throw new Error(`Delete failed: ${response.status} - ${errorText}`);
      }

      console.log('[StorageService] Batch delete success');
    } catch (error) {
      console.error('[StorageService] deleteImages error:', error);
      throw new Error(`이미지 삭제 실패: ${error}`);
    }
  }

  /**
   * URL에서 파일 경로 추출
   * 예: https://xxx.supabase.co/storage/v1/object/public/product-images/123_image.jpg
   * -> 123_image.jpg
   */
  private static extractFilePathFromUrl(url: string, bucket: string): string {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');

      // /storage/v1/object/public/bucket-name/file-path 형식에서 file-path 추출
      const bucketIndex = pathParts.indexOf(bucket);
      if (bucketIndex === -1) {
        throw new Error('Invalid bucket URL');
      }

      // bucket 이름 이후의 모든 경로를 파일 경로로 사용
      return pathParts.slice(bucketIndex + 1).join('/');
    } catch (error) {
      throw new Error(`URL 파싱 실패: ${error}`);
    }
  }
}

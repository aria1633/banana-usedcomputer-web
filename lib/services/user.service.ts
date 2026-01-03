// lib/services/user.service.ts

import { User, UserType, VerificationStatus } from '@/types/user';
import { logger } from '@/lib/utils/logger';
import { get, patch } from '@/lib/utils/fetch';

export class UserService {
  private static COLLECTION = 'users';

  /**
   * 이메일 중복 확인
   */
  static async checkEmailExists(email: string): Promise<boolean> {
    try {
      logger.group('UserService.checkEmailExists');
      logger.info('Checking email existence', { email });

      // requireAuth: false로 설정하여 로그인 없이도 체크 가능
      const data = await get<any[]>(
        `/rest/v1/${this.COLLECTION}?email=eq.${encodeURIComponent(email)}&select=uid`,
        { requireAuth: false }
      );

      const exists = data && data.length > 0;
      logger.info('Email check result', { email, exists });
      logger.groupEnd();

      return exists;
    } catch (error) {
      logger.groupEnd();
      logger.error('Failed to check email', { error, email });
      // 에러 발생 시 false 반환 (회원가입 진행 허용)
      return false;
    }
  }

  /**
   * 닉네임 중복 확인
   */
  static async checkNameExists(name: string): Promise<boolean> {
    try {
      logger.group('UserService.checkNameExists');
      logger.info('Checking name existence', { name });

      // requireAuth: false로 설정하여 로그인 없이도 체크 가능
      const data = await get<any[]>(
        `/rest/v1/${this.COLLECTION}?name=eq.${encodeURIComponent(name)}&select=uid`,
        { requireAuth: false }
      );

      const exists = data && data.length > 0;
      logger.info('Name check result', { name, exists });
      logger.groupEnd();

      return exists;
    } catch (error) {
      logger.groupEnd();
      logger.error('Failed to check name', { error, name });
      // 에러 발생 시 false 반환 (회원가입 진행 허용)
      return false;
    }
  }

  /**
   * 사용자 정보 조회 (공개 API - 인증 불필요)
   *
   * 판매자 이름 등 공개 정보를 조회하기 위해 인증 없이 호출 가능
   * RLS 정책에서 민감하지 않은 정보만 공개하도록 설정되어야 함
   */
  static async getUserByUid(uid: string): Promise<User> {
    try {
      logger.group('UserService.getUserByUid');
      logger.info('Fetching user by uid', { uid });

      const data = await get<any[]>(
        `/rest/v1/${this.COLLECTION}?uid=eq.${uid}&select=*`,
        { requireAuth: false }
      );

      if (!data || data.length === 0) {
        throw new Error('사용자를 찾을 수 없습니다.');
      }

      const user = this.mapToUser(data[0]);
      logger.info('User fetched successfully', { uid });
      logger.groupEnd();

      return user;
    } catch (error) {
      logger.groupEnd();
      logger.error('Failed to get user', { error, uid });
      throw new Error(`사용자 조회 실패: ${error}`);
    }
  }

  /**
   * 사용자 정보 수정
   */
  static async updateUser(uid: string, updates: {
    name?: string;
    phoneNumber?: string;
  }): Promise<void> {
    try {
      logger.group('UserService.updateUser');
      logger.info('Updating user', { uid, updates });

      if (!updates.name && !updates.phoneNumber) {
        throw new Error('수정할 정보를 입력해주세요.');
      }

      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.name) {
        updateData.name = updates.name.trim();
      }

      if (updates.phoneNumber) {
        updateData.phone_number = updates.phoneNumber.trim();
      }

      await patch(
        `/rest/v1/${this.COLLECTION}?uid=eq.${uid}`,
        {
          requireAuth: true,
          headers: {
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(updateData)
        }
      );

      logger.info('User updated successfully', { uid });
      logger.groupEnd();
    } catch (error) {
      logger.groupEnd();
      logger.error('Failed to update user', { error, uid });
      throw error;
    }
  }

  /**
   * 도매상 재신청
   */
  static async reapplyWholesaler(uid: string, businessRegistrationUrl: string): Promise<void> {
    try {
      logger.group('UserService.reapplyWholesaler');
      logger.info('Reapplying for wholesaler', { uid });

      await patch(
        `/rest/v1/${this.COLLECTION}?uid=eq.${uid}`,
        {
          requireAuth: true,
          headers: {
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({
            user_type: UserType.WHOLESALER,
            verification_status: VerificationStatus.PENDING,
            business_registration_url: businessRegistrationUrl,
            rejection_reason: null, // 재신청 시 거부 사유 제거
            updated_at: new Date().toISOString(),
          })
        }
      );

      logger.info('Wholesaler reapplication successful', { uid });
      logger.groupEnd();
    } catch (error) {
      logger.groupEnd();
      logger.error('Failed to reapply for wholesaler', { error, uid });
      throw new Error(`도매상 재신청 실패: ${error}`);
    }
  }

  /**
   * DB 데이터를 User 타입으로 변환
   */
  private static mapToUser(data: Record<string, unknown>): User {
    return {
      uid: data.uid as string,
      email: data.email as string,
      name: data.name as string,
      phoneNumber: (data.phone_number as string | null) ?? null,
      businessRegistrationUrl: (data.business_registration_url as string | null) ?? null,
      userType: data.user_type as UserType,
      verificationStatus: data.verification_status as VerificationStatus,
      rejectionReason: (data.rejection_reason as string | null) ?? null,
      createdAt: new Date(data.created_at as string),
      updatedAt: data.updated_at ? new Date(data.updated_at as string) : null,
    };
  }
}

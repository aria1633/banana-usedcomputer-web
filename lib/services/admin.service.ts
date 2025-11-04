// lib/services/admin.service.ts

import { User, UserType, VerificationStatus } from '@/types/user';
import { logger } from '@/lib/utils/logger';
import { get, patch } from '@/lib/utils/fetch';

export class AdminService {
  private static COLLECTION = 'users';

  /**
   * 승인 대기 도매상 조회
   */
  static async getPendingWholesalers(): Promise<User[]> {
    try {
      logger.group('AdminService.getPendingWholesalers');
      logger.info('Fetching pending wholesalers...');

      const data = await get<any[]>(
        `/rest/v1/${this.COLLECTION}?user_type=eq.${UserType.WHOLESALER}&verification_status=eq.${VerificationStatus.PENDING}&order=created_at.desc`
      );

      logger.info('Fetched pending wholesalers', { count: data.length });

      const users = data.map((item: any) => this.mapToUser(item));
      logger.info('Mapped users', { count: users.length });
      logger.groupEnd();

      return users;
    } catch (error) {
      logger.groupEnd();
      logger.error('Failed to get pending wholesalers', { error });
      throw new Error(`승인 대기 도매상 조회 실패: ${error}`);
    }
  }

  /**
   * 모든 사용자 조회
   */
  static async getAllUsers(): Promise<User[]> {
    try {
      logger.group('AdminService.getAllUsers');
      logger.info('Fetching all users...');

      const data = await get<any[]>(
        `/rest/v1/${this.COLLECTION}?order=created_at.desc`
      );

      logger.info('Fetched all users', { count: data.length });
      logger.groupEnd();

      return data.map((item: any) => this.mapToUser(item));
    } catch (error) {
      logger.groupEnd();
      logger.error('Failed to get all users', { error });
      throw new Error(`사용자 조회 실패: ${error}`);
    }
  }

  /**
   * 도매상 승인
   */
  static async approveWholesaler(uid: string): Promise<void> {
    try {
      logger.group('AdminService.approveWholesaler');
      logger.info('Approving wholesaler', { uid });

      await patch(
        `/rest/v1/${this.COLLECTION}?uid=eq.${uid}`,
        {
          requireAuth: true,
          headers: {
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({
            verification_status: VerificationStatus.APPROVED,
            rejection_reason: null, // 승인 시 거부 사유 제거
            updated_at: new Date().toISOString(),
          })
        }
      );

      logger.info('Wholesaler approved successfully', { uid });
      logger.groupEnd();
    } catch (error) {
      logger.groupEnd();
      logger.error('Failed to approve wholesaler', { error, uid });
      throw new Error(`도매상 승인 실패: ${error}`);
    }
  }

  /**
   * 도매상 거부
   *
   * @param uid - 사용자 ID
   * @param rejectionReason - 거부 사유 (필수)
   */
  static async rejectWholesaler(uid: string, rejectionReason: string): Promise<void> {
    try {
      logger.group('AdminService.rejectWholesaler');
      logger.info('Rejecting wholesaler', { uid, rejectionReason });

      if (!rejectionReason || rejectionReason.trim().length === 0) {
        throw new Error('거부 사유를 입력해주세요.');
      }

      await patch(
        `/rest/v1/${this.COLLECTION}?uid=eq.${uid}`,
        {
          requireAuth: true,
          headers: {
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({
            verification_status: VerificationStatus.REJECTED,
            user_type: UserType.NORMAL, // 일반 사용자로 변경
            rejection_reason: rejectionReason.trim(),
            updated_at: new Date().toISOString(),
          })
        }
      );

      logger.info('Wholesaler rejected successfully', { uid });
      logger.groupEnd();
    } catch (error) {
      logger.groupEnd();
      logger.error('Failed to reject wholesaler', { error, uid });
      throw error;
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

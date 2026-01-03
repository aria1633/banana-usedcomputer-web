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
   * 사용자 타입별 조회
   */
  static async getUsersByType(userType: UserType): Promise<User[]> {
    try {
      logger.group('AdminService.getUsersByType');
      logger.info('Fetching users by type', { userType });

      const data = await get<any[]>(
        `/rest/v1/${this.COLLECTION}?user_type=eq.${userType}&order=created_at.desc`
      );

      logger.info('Fetched users by type', { count: data.length, userType });
      logger.groupEnd();

      return data.map((item: any) => this.mapToUser(item));
    } catch (error) {
      logger.groupEnd();
      logger.error('Failed to get users by type', { error, userType });
      throw new Error(`사용자 타입별 조회 실패: ${error}`);
    }
  }

  /**
   * 사용자 정보 수정 (관리자용)
   */
  static async updateUser(uid: string, updates: {
    name?: string;
    phoneNumber?: string;
    userType?: UserType;
    verificationStatus?: VerificationStatus;
  }): Promise<void> {
    try {
      logger.group('AdminService.updateUser');
      logger.info('Updating user (admin)', { uid, updates });

      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.name !== undefined) {
        updateData.name = updates.name.trim();
      }

      if (updates.phoneNumber !== undefined) {
        updateData.phone_number = updates.phoneNumber.trim();
      }

      if (updates.userType !== undefined) {
        updateData.user_type = updates.userType;
      }

      if (updates.verificationStatus !== undefined) {
        updateData.verification_status = updates.verificationStatus;
      }

      // 1. users 테이블 업데이트
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

      logger.info('User updated successfully (admin)', { uid });

      // 2. 이름이 변경된 경우, 해당 사용자의 모든 상품의 seller_name도 업데이트
      if (updates.name !== undefined) {
        logger.info('Updating seller_name in products table', { uid, newName: updates.name.trim() });

        try {
          await patch(
            `/rest/v1/products?seller_id=eq.${uid}`,
            {
              requireAuth: true,
              headers: {
                'Prefer': 'resolution=merge-duplicates'
              },
              body: JSON.stringify({
                seller_name: updates.name.trim(),
                updated_at: new Date().toISOString(),
              })
            }
          );
          logger.info('Products seller_name updated successfully', { uid });
        } catch (productUpdateError) {
          // 상품 업데이트 실패해도 사용자 정보는 업데이트됨
          logger.error('Failed to update products seller_name (non-critical)', {
            error: productUpdateError,
            uid
          });
        }
      }

      logger.groupEnd();
    } catch (error) {
      logger.groupEnd();
      logger.error('Failed to update user (admin)', { error, uid });
      throw new Error(`사용자 정보 수정 실패: ${error}`);
    }
  }

  /**
   * 사용자 삭제 (관리자용)
   *
   * 주의: 실제로는 삭제하지 않고 비활성화하는 것을 권장
   * 여기서는 실제 삭제를 구현하되, 필요시 soft delete로 변경 가능
   */
  static async deleteUser(uid: string): Promise<void> {
    try {
      logger.group('AdminService.deleteUser');
      logger.info('Deleting user (admin)', { uid });

      // Supabase에서 DELETE 요청
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${this.COLLECTION}?uid=eq.${uid}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      logger.info('User deleted successfully (admin)', { uid });
      logger.groupEnd();
    } catch (error) {
      logger.groupEnd();
      logger.error('Failed to delete user (admin)', { error, uid });
      throw new Error(`사용자 삭제 실패: ${error}`);
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

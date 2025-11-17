// lib/services/banner.service.ts
import { supabase } from '@/lib/supabase/config';
import { Banner, CreateBannerInput, UpdateBannerInput } from '@/types/banner';
import { logger } from '@/lib/utils/logger';

export class BannerService {
  /**
   * 활성화된 배너 목록 조회 (공개용)
   */
  static async getActiveBanners(): Promise<Banner[]> {
    try {
      logger.info('Fetching active banners');

      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        logger.error('Error fetching active banners', error);
        throw new Error('배너를 불러오는데 실패했습니다.');
      }

      const banners = data.map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        imageUrl: item.image_url,
        linkUrl: item.link_url,
        buttonText: item.button_text,
        isActive: item.is_active,
        displayOrder: item.display_order,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at),
      }));

      logger.info('Active banners fetched successfully', { count: banners.length });
      return banners;
    } catch (error) {
      logger.error('Failed to fetch active banners', error);
      throw error;
    }
  }

  /**
   * 모든 배너 조회 (관리자용)
   */
  static async getAllBanners(): Promise<Banner[]> {
    try {
      logger.info('Fetching all banners');

      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) {
        logger.error('Error fetching all banners', error);
        throw new Error('배너를 불러오는데 실패했습니다.');
      }

      const banners = data.map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        imageUrl: item.image_url,
        linkUrl: item.link_url,
        buttonText: item.button_text,
        isActive: item.is_active,
        displayOrder: item.display_order,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at),
      }));

      logger.info('All banners fetched successfully', { count: banners.length });
      return banners;
    } catch (error) {
      logger.error('Failed to fetch all banners', error);
      throw error;
    }
  }

  /**
   * 배너 생성
   */
  static async createBanner(input: CreateBannerInput): Promise<Banner> {
    try {
      logger.info('Creating banner', input);

      const { data, error } = await supabase
        .from('banners')
        .insert({
          title: input.title,
          description: input.description,
          image_url: input.imageUrl,
          link_url: input.linkUrl,
          button_text: input.buttonText,
          is_active: input.isActive,
          display_order: input.displayOrder,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating banner', error);
        throw new Error('배너 생성에 실패했습니다.');
      }

      const banner: Banner = {
        id: data.id,
        title: data.title,
        description: data.description,
        imageUrl: data.image_url,
        linkUrl: data.link_url,
        buttonText: data.button_text,
        isActive: data.is_active,
        displayOrder: data.display_order,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };

      logger.info('Banner created successfully', { id: banner.id });
      return banner;
    } catch (error) {
      logger.error('Failed to create banner', error);
      throw error;
    }
  }

  /**
   * 배너 수정
   */
  static async updateBanner(id: string, input: UpdateBannerInput): Promise<Banner> {
    try {
      logger.info('Updating banner', { id, input });

      const updateData: any = {};
      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.imageUrl !== undefined) updateData.image_url = input.imageUrl;
      if (input.linkUrl !== undefined) updateData.link_url = input.linkUrl;
      if (input.buttonText !== undefined) updateData.button_text = input.buttonText;
      if (input.isActive !== undefined) updateData.is_active = input.isActive;
      if (input.displayOrder !== undefined) updateData.display_order = input.displayOrder;

      const { data, error } = await supabase
        .from('banners')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating banner', error);
        throw new Error('배너 수정에 실패했습니다.');
      }

      const banner: Banner = {
        id: data.id,
        title: data.title,
        description: data.description,
        imageUrl: data.image_url,
        linkUrl: data.link_url,
        buttonText: data.button_text,
        isActive: data.is_active,
        displayOrder: data.display_order,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };

      logger.info('Banner updated successfully', { id: banner.id });
      return banner;
    } catch (error) {
      logger.error('Failed to update banner', error);
      throw error;
    }
  }

  /**
   * 배너 삭제
   */
  static async deleteBanner(id: string): Promise<void> {
    try {
      logger.info('Deleting banner', { id });

      const { error } = await supabase
        .from('banners')
        .delete()
        .eq('id', id);

      if (error) {
        logger.error('Error deleting banner', error);
        throw new Error('배너 삭제에 실패했습니다.');
      }

      logger.info('Banner deleted successfully', { id });
    } catch (error) {
      logger.error('Failed to delete banner', error);
      throw error;
    }
  }

  /**
   * 배너 활성화/비활성화 토글
   */
  static async toggleBannerActive(id: string, isActive: boolean): Promise<void> {
    try {
      logger.info('Toggling banner active status', { id, isActive });

      const { error } = await supabase
        .from('banners')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) {
        logger.error('Error toggling banner active status', error);
        throw new Error('배너 상태 변경에 실패했습니다.');
      }

      logger.info('Banner active status toggled successfully', { id, isActive });
    } catch (error) {
      logger.error('Failed to toggle banner active status', error);
      throw error;
    }
  }
}

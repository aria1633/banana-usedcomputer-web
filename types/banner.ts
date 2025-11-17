// types/banner.ts

export interface Banner {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  linkUrl?: string; // 배너 클릭 시 이동할 URL (선택사항)
  buttonText?: string; // 버튼 텍스트 (선택사항)
  isActive: boolean; // 활성화 여부
  displayOrder: number; // 표시 순서
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBannerInput {
  title: string;
  description: string;
  imageUrl: string;
  linkUrl?: string;
  buttonText?: string;
  isActive: boolean;
  displayOrder: number;
}

export interface UpdateBannerInput {
  title?: string;
  description?: string;
  imageUrl?: string;
  linkUrl?: string;
  buttonText?: string;
  isActive?: boolean;
  displayOrder?: number;
}

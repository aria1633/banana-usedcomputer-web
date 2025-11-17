// app/api/upload-banner/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service role client (admin 권한)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    console.log('[API] /api/upload-banner - 시작');

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: '파일이 없습니다.' },
        { status: 400 }
      );
    }

    console.log('[API] 파일 정보:', {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    // 파일 이름 안전하게 만들기
    const sanitizedName = file.name
      .replace(/[^a-zA-Z0-9_.-]/g, '_')
      .replace(/_+/g, '_');
    const fileName = `${Date.now()}_${sanitizedName}`;

    console.log('[API] Sanitized file name:', fileName);

    // ArrayBuffer로 변환
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log('[API] 파일을 Supabase Storage에 업로드 중...');

    // Supabase Storage에 업로드 (admin client 사용)
    const { data, error } = await supabaseAdmin.storage
      .from('banner-images')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('[API] Supabase 업로드 에러:', error);
      return NextResponse.json(
        { error: `업로드 실패: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('[API] 업로드 성공:', data);

    // Public URL 생성
    const { data: urlData } = supabaseAdmin.storage
      .from('banner-images')
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;
    console.log('[API] Public URL:', publicUrl);

    return NextResponse.json({ url: publicUrl });
  } catch (error: any) {
    console.error('[API] /api/upload-banner 에러:', error);
    return NextResponse.json(
      { error: error.message || '업로드 실패' },
      { status: 500 }
    );
  }
}

// app/api/upload-business-registration/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Service Role Key 또는 Anon Key로 Supabase 클라이언트 생성
// Service Role Key가 있으면 사용하고, 없으면 Anon Key 사용
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file) {
      return NextResponse.json(
        { error: '파일이 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: '사용자 ID가 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    // 파일 유효성 검사
    const maxSizeMB = 5;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        { error: `파일 크기는 ${maxSizeMB}MB 이하여야 합니다.` },
        { status: 400 }
      );
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: '허용된 파일 형식: JPG, PNG, PDF' },
        { status: 400 }
      );
    }

    // 파일명 생성
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}_${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    console.log('[API] Uploading business registration:', filePath);

    // ArrayBuffer로 변환
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Service Role로 업로드 (RLS 우회)
    const { error: uploadError } = await supabaseAdmin.storage
      .from('business-registrations')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('[API] Upload error:', uploadError);
      return NextResponse.json(
        { error: `파일 업로드 실패: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // 공개 URL 가져오기
    const { data } = supabaseAdmin.storage
      .from('business-registrations')
      .getPublicUrl(filePath);

    console.log('[API] Business registration uploaded:', data.publicUrl);

    return NextResponse.json({ url: data.publicUrl });
  } catch (error: any) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json(
      { error: `업로드 처리 중 오류: ${error.message}` },
      { status: 500 }
    );
  }
}

// app/auth/callback/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Service Role Key로 Admin 클라이언트 생성 (Storage 접근용)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    // Auth 클라이언트 (code exchange 전용)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    // 이메일 확인 후 사용자 정보 업데이트
    if (!error && data.session) {
      const userId = data.session.user.id;
      const sessionToken = data.session.access_token;
      const userMetadata = data.session.user.user_metadata;

      console.log('[Callback] User metadata:', userMetadata);

      try {
        // fetch API로 사용자 정보 조회
        const userUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?uid=eq.${userId}&select=user_type,verification_status`;
        const userResponse = await fetch(userUrl, {
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${sessionToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!userResponse.ok) {
          console.error('[Callback] Failed to fetch user data:', userResponse.status);
          return NextResponse.redirect(new URL('/', requestUrl.origin));
        }

        const users = await userResponse.json();
        let userData = users[0];

        // users 테이블에 데이터가 없으면 생성 (트리거 실패 시 대비)
        if (!userData) {
          console.log('[Callback] User data not found, creating new user record...');

          const insertData = {
            uid: userId,
            email: data.session.user.email,
            name: userMetadata?.name || data.session.user.email?.split('@')[0] || 'User',
            phone_number: userMetadata?.phone_number || null,
            user_type: userMetadata?.user_type || 'normal',
            verification_status: 'none',
            created_at: new Date().toISOString(),
          };

          const insertUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users`;
          const insertResponse = await fetch(insertUrl, {
            method: 'POST',
            headers: {
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              'Authorization': `Bearer ${sessionToken}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
            body: JSON.stringify(insertData),
          });

          if (insertResponse.ok) {
            const insertedUsers = await insertResponse.json();
            userData = insertedUsers[0];
            console.log('[Callback] User record created successfully');
          } else {
            const errorText = await insertResponse.text();
            console.error('[Callback] Failed to create user record:', insertResponse.status, errorText);
            return NextResponse.redirect(new URL('/', requestUrl.origin));
          }
        }

        // 업데이트할 데이터 준비
        const updateData: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };

        // phone_number가 user_metadata에 있으면 업데이트
        if (userMetadata?.phone_number) {
          updateData.phone_number = userMetadata.phone_number;
        }

        // Storage에서 사업자 등록증 파일 확인 (도매상인 경우)
        if (userData?.user_type === 'wholesaler') {
          try {
            // Service Role Key로 Storage 파일 목록 조회
            const { data: files } = await supabaseAdmin.storage
              .from('business-registrations')
              .list(userId, {
                limit: 1,
                sortBy: { column: 'created_at', order: 'desc' },
              });

            if (files && files.length > 0) {
              const filePath = `${userId}/${files[0].name}`;
              const { data: urlData } = supabaseAdmin.storage
                .from('business-registrations')
                .getPublicUrl(filePath);

              updateData.business_registration_url = urlData.publicUrl;
              console.log('[Callback] Found business registration file:', urlData.publicUrl);
            } else {
              console.log('[Callback] No business registration file found in storage');
            }
          } catch (error) {
            console.log('[Callback] Error checking storage:', error);
          }
        }

        // 도매상이고 verification_status가 none인 경우 pending으로 업데이트
        if (userData?.user_type === 'wholesaler' && userData?.verification_status === 'none') {
          updateData.verification_status = 'pending';
        }

        // fetch API로 업데이트 실행
        if (Object.keys(updateData).length > 1) { // updated_at만 있으면 스킵
          console.log('[Callback] Updating user data:', updateData);

          const updateUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?uid=eq.${userId}`;
          const updateResponse = await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              'Authorization': `Bearer ${sessionToken}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify(updateData),
          });

          if (updateResponse.ok) {
            console.log('[Callback] User data updated successfully');
          } else {
            const errorText = await updateResponse.text();
            console.error('[Callback] Update failed:', updateResponse.status, errorText);
          }
        }
      } catch (error) {
        console.error('[Callback] Error processing callback:', error);
      }
    }
  }

  // 홈 페이지로 리다이렉트
  return NextResponse.redirect(new URL('/', requestUrl.origin));
}

# Next.js + Supabase 프로젝트 구조 가이드

React + TypeScript + Next.js + Supabase 기반으로 바나나 중고컴퓨터 플랫폼을 구현한 완벽한 프로젝트 구조입니다.

---

## 📋 목차

1. [기술 스택](#1-기술-스택)
2. [프로젝트 폴더 구조](#2-프로젝트-폴더-구조)
3. [주요 디렉토리 설명](#3-주요-디렉토리-설명)
4. [설정 파일](#4-설정-파일)
5. [환경 변수](#5-환경-변수)
6. [라우팅 구조](#6-라우팅-구조)
7. [상태 관리](#7-상태-관리)
8. [스타일링](#8-스타일링)
9. [컴포넌트 구조](#9-컴포넌트-구조)
10. [데이터 페칭 전략](#10-데이터-페칭-전략)

---

## 1. 기술 스택

### 핵심 기술
- **Framework**: Next.js 14.2 (App Router)
- **Language**: TypeScript 5+
- **Styling**: Tailwind CSS 3+
- **Backend**: Supabase (PostgreSQL, Auth, Storage, RLS)

### 추가 라이브러리
```json
{
  "dependencies": {
    "next": "14.2.23",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "typescript": "^5",

    "@supabase/supabase-js": "^2.49.2",

    "tailwindcss": "^3.4.1",
    "lucide-react": "^0.469.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.5",

    "date-fns": "^2.30.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "eslint": "^8",
    "eslint-config-next": "14.2.23",
    "postcss": "^8",
    "autoprefixer": "^10.0.1"
  }
}
```

---

## 2. 프로젝트 폴더 구조

```
banana-usedcomputer-web/
├── app/                                # Next.js App Router
│   ├── (auth)/                         # 인증 관련 라우트 그룹
│   │   ├── login/
│   │   │   └── page.tsx               # 로그인 페이지
│   │   └── signup/
│   │       └── page.tsx               # 회원가입 페이지
│   ├── (main)/                         # 메인 앱 라우트 그룹
│   │   ├── layout.tsx                  # 공통 레이아웃 (네비게이션 포함)
│   │   ├── page.tsx                    # 홈 화면 (/)
│   │   ├── products/
│   │   │   ├── page.tsx                # 상품 목록
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx            # 상품 상세
│   │   │   │   └── edit/
│   │   │   │       └── page.tsx        # 상품 수정
│   │   │   └── new/
│   │   │       └── page.tsx            # 상품 등록
│   │   ├── admin/
│   │   │   └── dashboard/
│   │   │       └── page.tsx            # 관리자 대시보드
│   │   └── ...
│   ├── api/                            # API Routes (Server-side)
│   │   └── upload-business-registration/
│   │       └── route.ts                # 사업자 등록증 업로드 API
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts                # 이메일 확인 콜백
│   ├── globals.css                     # 전역 스타일
│   ├── layout.tsx                      # 루트 레이아웃
│   └── favicon.ico
│
├── components/                         # 재사용 가능한 컴포넌트
│   ├── auth/                           # 인증 관련 컴포넌트
│   │   ├── login-form.tsx
│   │   ├── signup-form.tsx
│   │   └── protected-route.tsx
│   ├── products/                       # 상품 관련 컴포넌트
│   │   ├── product-card.tsx
│   │   ├── product-grid.tsx
│   │   └── product-form.tsx
│   ├── common/                         # 공통 컴포넌트
│   │   ├── loading.tsx
│   │   └── error.tsx
│   └── ...
│
├── lib/                                # 유틸리티 및 핵심 로직
│   ├── supabase/                       # Supabase 설정 및 서비스
│   │   └── config.ts                   # Supabase 클라이언트 초기화
│   ├── services/                       # 비즈니스 로직 서비스
│   │   ├── auth.service.ts             # 인증 서비스
│   │   ├── admin.service.ts            # 관리자 서비스
│   │   └── storage.service.ts          # 스토리지 서비스
│   ├── hooks/                          # Custom React Hooks
│   │   └── use-auth.ts                 # 인증 Hook
│   └── utils/                          # 유틸리티 함수
│       └── cn.ts                       # className 유틸
│
├── types/                              # TypeScript 타입 정의
│   └── user.ts                         # 사용자 타입
│
├── constants/                          # 상수 및 설정
│   └── routes.ts                       # 라우트 경로
│
├── middleware.ts                       # Next.js 미들웨어 (인증 체크)
├── next.config.js                      # Next.js 설정
├── tailwind.config.ts                  # Tailwind CSS 설정
├── tsconfig.json                       # TypeScript 설정
├── .env.local                          # 환경 변수 (로컬)
└── package.json
```

---

## 3. 주요 디렉토리 설명

### `app/` - Next.js App Router
- **(auth)**: 인증 화면 그룹 (레이아웃 공유 없음)
- **(main)**: 메인 앱 화면 그룹 (네비게이션 공유)
- **api/**: Server-side API routes (파일 업로드 등)
- **auth/callback**: 이메일 확인 후 처리

### `components/` - React 컴포넌트
- **feature-specific/**: 각 기능별로 구분된 컴포넌트
- **common/**: 범용 컴포넌트

### `lib/` - 핵심 로직
- **supabase/**: Supabase 클라이언트 설정 및 초기화
- **services/**: 비즈니스 로직 (CRUD 작업, localStorage 기반 세션 관리)
- **hooks/**: Custom React Hooks
- **utils/**: 유틸리티 함수

### `types/` - TypeScript 타입
- 모든 데이터 모델의 인터페이스 정의

---

## 4. 설정 파일

### `next.config.js`
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'vqypnenjejbtvvvewxee.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

module.exports = nextConfig;
```

### `tailwind.config.ts`
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        secondary: '#8B5CF6',
        background: '#F5F5F5',
        surface: '#FAFAFA',
      },
    },
  },
  plugins: [],
};

export default config;
```

### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## 5. 환경 변수

### `.env.local`
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://vqypnenjejbtvvvewxee.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service Role Key (Server-side only)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# App Configuration
NEXT_PUBLIC_APP_NAME=바나나 중고컴퓨터
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**중요:**
- `NEXT_PUBLIC_*` 변수는 클라이언트에서 접근 가능
- `SUPABASE_SERVICE_ROLE_KEY`는 서버 사이드 전용 (절대 노출 금지)

---

## 6. 라우팅 구조

### 인증 라우트 (Public)
```
/login                  → LoginPage
/signup                 → SignupPage
/auth/callback          → Email Verification Callback
```

### 메인 라우트 (Protected)
```
/                       → HomePage (사용자 타입별 대시보드)
/products               → ProductListPage
/products/:id           → ProductDetailPage
/products/:id/edit      → ProductEditPage (도매상 본인만)
/products/new           → ProductCreatePage (승인된 도매상만)
```

### 관리자 라우트 (Role: admin)
```
/admin/dashboard        → AdminDashboardPage
```

---

## 7. 상태 관리

### 현재 구현: React Context + Custom Hook

```typescript
// lib/hooks/use-auth.ts
'use client';

import { useEffect, useState } from 'react';
import { AuthService } from '@/lib/services/auth.service';
import { User } from '@/types/user';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const currentUser = await AuthService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, []);

  return { user, isLoading };
}
```

---

## 8. 스타일링

### Tailwind CSS

```bash
# 기본 Tailwind 설정은 이미 완료됨
```

### 전역 스타일 (`app/globals.css`)
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --primary: 221 83% 53%;
    --secondary: 262 69% 66%;
    --background: 0 0% 96%;
    --foreground: 222 47% 11%;
  }
}
```

---

## 9. 컴포넌트 구조

### 예시: LoginForm 컴포넌트

```typescript
// components/auth/login-form.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/lib/services/auth.service';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await AuthService.signIn(email, password);
      router.push('/');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="이메일"
        className="w-full px-4 py-2 border rounded"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="비밀번호"
        className="w-full px-4 py-2 border rounded"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2 bg-primary text-white rounded"
      >
        {loading ? '로그인 중...' : '로그인'}
      </button>
    </form>
  );
}
```

---

## 10. 데이터 페칭 전략

### Custom Hook 예시 (fetch API 사용)

```typescript
// lib/hooks/use-users.ts (예시)
import { useState, useEffect } from 'react';
import { User } from '@/types/user';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      try {
        // localStorage에서 세션 토큰 가져오기
        const keys = Object.keys(localStorage);
        const authKey = keys.find(key =>
          key.startsWith('sb-') && key.includes('-auth-token')
        );

        if (!authKey) {
          setLoading(false);
          return;
        }

        const authData = localStorage.getItem(authKey);
        const parsed = JSON.parse(authData!);
        const sessionToken = parsed?.access_token;

        // fetch API로 데이터 가져오기
        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users`;
        const response = await fetch(url, {
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${sessionToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }

        const data = await response.json();
        setUsers(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, []);

  return { users, loading, error };
}
```

**중요:** Supabase 클라이언트 SDK 대신 fetch API를 사용하여 hanging 문제를 피합니다.

---

## 🚀 프로젝트 초기화 명령어

```bash
# Next.js 프로젝트 생성
npx create-next-app@latest banana-usedcomputer-web \
  --typescript --tailwind --app --eslint --no-src-dir --import-alias "@/*"

cd banana-usedcomputer-web

# Supabase 클라이언트 설치
npm install @supabase/supabase-js

# 추가 유틸리티 설치
npm install date-fns lucide-react clsx tailwind-merge

# 개발 서버 실행
npm run dev
```

---

## 🔧 Supabase 설정

### 1. Supabase 클라이언트 초기화

```typescript
// lib/supabase/config.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});
```

### 2. Database Trigger 설정

```sql
-- Auth 가입 시 users 테이블 자동 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (uid, email, name, user_type, verification_status, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'normal'),
    'none',
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 3. RLS 정책

```sql
-- 임시로 RLS 비활성화 (개발 중)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Storage 정책
CREATE POLICY "Allow public read from business-registrations"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'business-registrations');

CREATE POLICY "Allow public upload to business-registrations"
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id = 'business-registrations');
```

---

**작성일**: 2025-11-02
**버전**: 2.0.0 (Supabase 기반)

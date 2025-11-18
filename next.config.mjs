/** @type {import('next').NextConfig} */
const nextConfig = {
  // React Strict Mode
  reactStrictMode: true,

  // 이미지 최적화 설정
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
  },

  // 환경 변수 (클라이언트 노출용)
  env: {
    NEXT_PUBLIC_APP_NAME: 'MUST Access',
  },

  // 실험적 기능
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },

  // 웹팩 설정
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false }
    return config
  },
}

export default nextConfig

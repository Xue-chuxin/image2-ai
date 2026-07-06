/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      }
    ]
  },
  async rewrites() {
    return [
      // 控制台（vben SPA，hash 路由）静态产物由 public/console 提供
      {
        source: "/console",
        destination: "/console/index.html"
      }
    ];
  }
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'http',  hostname: '127.0.0.1' },
      { protocol: 'http',  hostname: 'localhost'  },
    ],
    // Allow unoptimized local API-served images
    unoptimized: true,
  },
};
export default nextConfig;
  
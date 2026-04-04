/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'http',  hostname: '127.0.0.1' },
      { protocol: 'http',  hostname: 'localhost'  },
    ],
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // pdfjs-dist 3.x depends on path2d-polyfill which has a broken exports
      // field in its package.json on newer webpack. Alias it to a no-op shim.
      config.resolve.alias['path2d-polyfill'] = false;
    }
    return config;
  },
};
export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'Content-Security-Policy', value: "default-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'" },
        { key: 'Referrer-Policy', value: 'no-referrer' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }];
  },
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

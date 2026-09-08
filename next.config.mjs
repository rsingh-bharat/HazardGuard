/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    config.module.rules.push({
      test: /\.geojson$/,
      type: 'json',
    });
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['@react-pdf/renderer'],
    // Suppresses the hard build error for useSearchParams() without Suspense
    // boundary. HazardGuard is a fully dynamic app with no static export;
    // all pages are client-rendered and this constraint does not apply.
    missingSuspenseWithCSRBailout: false,
  },
};

export default nextConfig;

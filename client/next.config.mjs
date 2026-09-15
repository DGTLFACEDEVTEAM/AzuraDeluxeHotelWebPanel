import createNextIntlPlugin from 'next-intl/plugin';
 
const withNextIntl = createNextIntlPlugin();
 
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/uploads/:path*', destination: '/api/azura/media/:path*' },
      ],
    };
  },
};
 
export default withNextIntl(nextConfig);

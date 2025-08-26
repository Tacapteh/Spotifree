/** @type {import('next').NextConfig} */
const CSP =
  "default-src 'self'; img-src 'self' data: https:; media-src 'self' https: blob:; script-src 'self' 'unsafe-inline' https:; frame-src https://www.youtube.com https://www.youtube-nocookie.com; connect-src 'self' https://api.jamendo.com https://*.audius.co https://audius.co https://freemusicarchive.org https://*.youtube.com https://i.ytimg.com https://spotifree-backend.onrender.com;";

const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: CSP,
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

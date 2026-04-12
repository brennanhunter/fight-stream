import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://boxstreamtv.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/vod', '/pricing', '/work-with-us', '/contact'],
        disallow: [
          '/watch',
          '/account',
          '/account/',
          '/admin',
          '/admin/',
          '/report',
          '/survey',
          '/login',
          '/signup',
          '/forgot-password',
          '/reset-password',
          '/payment-success',
          '/recover-access',
          '/api/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}

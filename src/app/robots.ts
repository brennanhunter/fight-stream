import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://boxstreamtv.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/vod', '/pricing', '/about', '/contact'],
        disallow: [
          '/watch',
          '/account',
          '/account/',
          '/login',
          '/signup',
          '/forgot-password',
          '/reset-password',
          '/payment-success',
          '/api/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}

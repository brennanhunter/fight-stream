import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us | BoxStreamTV',
  description: 'Contact BoxStreamTV for boxing event streaming inquiries, promoter partnerships, technical support, or PPV event booking. We respond quickly.',
  keywords: [
    'contact BoxStreamTV',
    'boxing event inquiry',
    'book boxing stream',
    'boxing promoter contact',
    'PPV event booking',
  ],
  alternates: {
    canonical: 'https://boxstreamtv.com/contact',
  },
  openGraph: {
    title: 'Contact BoxStreamTV | Boxing Streaming & Event Inquiries',
    description: 'Contact BoxStreamTV for boxing event streaming inquiries, promoter partnerships, and PPV event booking.',
    url: 'https://boxstreamtv.com/contact',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us | BoxStreamTV',
  description: 'Get in touch with BoxStreamTV for event inquiries, support, or partnership opportunities. We\'re here to help.',
  openGraph: {
    title: 'Contact Us | BoxStreamTV',
    description: 'Get in touch with BoxStreamTV for event inquiries, support, or partnership opportunities.',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from 'next';
import { verifySurveyToken } from '@/lib/survey-token';
import SurveyForm from './SurveyForm';

export const metadata: Metadata = {
  title: 'Share Your Experience — BoxStreamTV',
  robots: { index: false },
};

export default async function SurveyPage({
  searchParams,
}: {
  searchParams: Promise<{
    email?: string;
    type?: string;
    ref?: string;
    subject?: string;
    token?: string;
  }>;
}) {
  const { email, type, ref, subject, token } = await searchParams;

  const invalid =
    !email ||
    !type ||
    !ref ||
    !subject ||
    !token ||
    !['ppv', 'vod'].includes(type) ||
    !verifySurveyToken(email, type, ref, token);

  if (invalid) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-red-500 mb-3">Invalid Link</p>
          <p className="text-gray-400 text-sm">This survey link is invalid or has expired.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-16">
      <SurveyForm
        email={email}
        type={type as 'ppv' | 'vod'}
        surveyRef={ref}
        subject={subject}
        token={token}
      />
    </main>
  );
}

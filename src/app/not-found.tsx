import Link from 'next/link';
import Image from 'next/image';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <Image
          src="/logos/BoxStreamVerticalLogo.png"
          alt="BoxStreamTV"
          width={160}
          height={64}
          className="mx-auto mb-12"
        />

        <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-500 mb-3">
          404
        </p>
        <h1 className="text-4xl font-bold tracking-tight mb-4">Page Not Found</h1>
        <div className="w-12 h-[2px] bg-white mx-auto mb-6" />
        <p className="text-sm text-gray-400 leading-relaxed mb-10">
          This page doesn&apos;t exist or may have moved. If you&apos;re trying to access a replay
          or event, check your purchase email or recover your access below.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-8 py-3 bg-white text-black text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-gray-200 transition-colors"
          >
            Go Home
          </Link>
          <Link
            href="/recover-access"
            className="px-8 py-3 border border-white/20 text-white text-[10px] font-bold tracking-[0.2em] uppercase hover:border-white transition-colors"
          >
            Recover Access
          </Link>
        </div>

        <p className="mt-10 text-xs text-gray-600">
          Need help?{' '}
          <Link
            href="/contact"
            className="text-gray-500 hover:text-white transition-colors underline underline-offset-2"
          >
            Contact us
          </Link>
        </p>
      </div>
    </main>
  );
}

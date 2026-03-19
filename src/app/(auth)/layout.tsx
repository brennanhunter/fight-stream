import Link from 'next/link';
import Image from 'next/image';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 py-24">
      <Link href="/" className="mb-10">
        <Image
          src="/logos/BoxStreamVerticalLogo.png"
          alt="BoxStreamTV"
          width={280}
          height={112}
          className="h-[80px] w-auto"
          priority
        />
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

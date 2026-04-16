import Link from "next/link";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

export function Nav() {
  return (
    <nav
      className="fixed inset-x-0 top-0 z-50 bg-white/80 backdrop-blur-sm"
      aria-label="Navigation principale"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 sm:px-10">
        <Link href="/" className="text-xl font-black tracking-tight text-ink">
          ImmoSimple
        </Link>
        <Link
          href={`${APP_URL}/login`}
          className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-80"
        >
          Se connecter →
        </Link>
      </div>
    </nav>
  );
}

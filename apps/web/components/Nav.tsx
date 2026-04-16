import Link from "next/link";

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
        <span className="text-sm text-slate-400">Bientôt disponible</span>
      </div>
    </nav>
  );
}

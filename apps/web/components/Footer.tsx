import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-8">
      <div className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <p>&copy; 2026 ImmoSimple. Tous droits réservés.</p>
          <div className="flex gap-6">
            <Link href="/mentions-legales" className="hover:text-ink">
              Mentions légales
            </Link>
            <Link href="/politique-confidentialite" className="hover:text-ink">
              Confidentialité
            </Link>
          </div>
        </div>
      </div>

      <div className="overflow-hidden px-6 pb-8 pt-4 sm:px-10">
        <p className="text-center text-[clamp(4rem,15vw,12rem)] font-black leading-none tracking-tighter text-slate-200 select-none">
          IMMOSIMPLE
        </p>
      </div>
    </footer>
  );
}

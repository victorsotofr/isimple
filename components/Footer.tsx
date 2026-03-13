import Link from "next/link";
import { Linkedin } from "lucide-react";

export function Footer() {
  return (
    <footer className="mx-3 mb-3 rounded-2xl bg-ink px-6 py-10 sm:mx-6 sm:mb-4 sm:rounded-3xl sm:px-10 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div>
            <p className="text-xl font-bold text-white">ImmoSimple</p>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/50">
              Projet étudiant HEC Paris × École Polytechnique.
              <br />
              Gestion locative moderne pour propriétaires.
            </p>
            <a
              href="https://www.linkedin.com/in/victor-soto-203a961a2/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="mt-4 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <Linkedin className="size-4" />
            </a>
          </div>

          <div className="flex gap-12 sm:gap-16">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/30">
                Légal
              </p>
              <div className="mt-2 flex flex-col gap-1.5">
                <Link href="/mentions-legales" className="text-sm text-white/60 hover:text-white">
                  Mentions légales
                </Link>
                <Link href="/politique-confidentialite" className="text-sm text-white/60 hover:text-white">
                  Confidentialité
                </Link>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/30">
                Contact
              </p>
              <div className="mt-2">
                <a href="mailto:sotovictor@outlook.fr" className="text-sm text-white/60 hover:text-white">
                  sotovictor@outlook.fr
                </a>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-8 text-xs text-white/30">
          © 2026 ImmoSimple. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}

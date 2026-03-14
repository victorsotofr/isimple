import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mentions légales — ImmoSimple",
};

export default function MentionsLegales() {
  return (
    <>
      <nav className="bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-6 sm:px-10">
          <Link href="/" className="text-xl font-black tracking-tight text-ink">
            ImmoSimple
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-16 sm:px-10 sm:py-20">
        <h1 className="text-4xl font-black tracking-tight text-ink sm:text-5xl">
          Mentions légales
        </h1>

        <div className="mt-12 max-w-2xl space-y-10 text-base leading-relaxed text-slate-600">
          <section>
            <h2 className="text-lg font-bold text-ink">Éditeur du site</h2>
            <p className="mt-3">
              Nom : Victor Soto
              <br />
              Adresse : Paris, France
              <br />
              Email : sotovictor@outlook.fr
              <br />
              Statut : Projet étudiant — HEC Paris × École Polytechnique
            </p>
          </section>

          <div className="border-t border-slate-100" />

          <section>
            <h2 className="text-lg font-bold text-ink">Hébergeur</h2>
            <p className="mt-3">
              Vercel Inc.
              <br />
              440 N Barranca Ave #4133
              <br />
              Covina, CA 91723, États-Unis
              <br />
              Site web : vercel.com
            </p>
          </section>

          <div className="border-t border-slate-100" />

          <section>
            <h2 className="text-lg font-bold text-ink">
              Propriété intellectuelle
            </h2>
            <p className="mt-3">
              L&apos;ensemble du contenu de ce site (textes, images, éléments
              graphiques) est protégé par le droit d&apos;auteur. Toute
              reproduction, même partielle, est interdite sans autorisation
              préalable.
            </p>
          </section>

          <div className="border-t border-slate-100" />

          <section>
            <h2 className="text-lg font-bold text-ink">
              Données personnelles
            </h2>
            <p className="mt-3">
              Pour en savoir plus sur la gestion de vos données personnelles,
              consultez notre{" "}
              <Link
                href="/politique-confidentialite"
                className="font-medium text-ink underline underline-offset-4 hover:text-blue"
              >
                politique de confidentialité
              </Link>
              .
            </p>
          </section>
        </div>
      </main>
    </>
  );
}

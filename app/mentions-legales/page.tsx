import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mentions légales — ImmoSimple",
};

export default function MentionsLegales() {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b border-slate-200/60 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Link href="/" className="text-base font-semibold text-slate-900">
            ImmoSimple
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-slate-900">
          Mentions légales
        </h1>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-600">
          <section>
            <h2 className="text-base font-medium text-slate-900">Éditeur du site</h2>
            <p className="mt-2">
              Nom : Victor Soto
              <br />
              Adresse : Paris, France
              <br />
              Email : sotovictor@outlook.fr
              <br />
              Statut : Projet étudiant — HEC Paris × École Polytechnique
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-slate-900">Hébergeur</h2>
            <p className="mt-2">
              Vercel Inc.
              <br />
              440 N Barranca Ave #4133
              <br />
              Covina, CA 91723, États-Unis
              <br />
              Site web : vercel.com
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-slate-900">
              Propriété intellectuelle
            </h2>
            <p className="mt-2">
              L&apos;ensemble du contenu de ce site (textes, images, éléments
              graphiques) est protégé par le droit d&apos;auteur. Toute
              reproduction, même partielle, est interdite sans autorisation
              préalable.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-slate-900">
              Données personnelles
            </h2>
            <p className="mt-2">
              Pour en savoir plus sur la gestion de vos données personnelles,
              consultez notre{" "}
              <Link
                href="/politique-confidentialite"
                className="text-blue-600 underline hover:text-blue-700"
              >
                politique de confidentialité
              </Link>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

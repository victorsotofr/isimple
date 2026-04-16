import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politique de confidentialité — ImmoSimple",
};

export default function PolitiqueConfidentialite() {
  return (
    <>
      <nav className="bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-6 sm:px-10">
          <Link href="/" className="text-xl font-black tracking-tight text-ink">
            ImmoSimple
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-16 pb-24 sm:px-10 sm:py-20 sm:pb-28">
        <h1 className="text-4xl font-black tracking-tight text-ink sm:text-5xl">
          Politique de confidentialité
        </h1>
        <p className="mt-3 text-base text-slate-500">
          Dernière mise à jour : janvier 2026
        </p>

        <div className="mt-12 max-w-2xl space-y-10 text-base leading-relaxed text-slate-600">
          <section>
            <h2 className="text-lg font-bold text-ink">
              Responsable du traitement
            </h2>
            <p className="mt-3">
              Nom : Victor Soto
              <br />
              Email : sotovictor@outlook.fr
            </p>
          </section>

          <div className="border-t border-slate-100" />

          <section>
            <h2 className="text-lg font-bold text-ink">
              Données collectées
            </h2>
            <p className="mt-3">
              Dans le cadre de la liste d&apos;attente, nous collectons les
              données suivantes :
            </p>
            <ul className="mt-3 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="mt-1 text-slate-400">&mdash;</span>
                Adresse email
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-slate-400">&mdash;</span>
                Type de bien (optionnel)
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-slate-400">&mdash;</span>
                Nombre de lots (optionnel)
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-slate-400">&mdash;</span>
                Date d&apos;inscription
              </li>
            </ul>
          </section>

          <div className="border-t border-slate-100" />

          <section>
            <h2 className="text-lg font-bold text-ink">
              Finalité du traitement
            </h2>
            <p className="mt-3">
              Vos données sont utilisées uniquement pour :
            </p>
            <ul className="mt-3 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="mt-1 text-slate-400">&mdash;</span>
                Vous informer du lancement de la plateforme ImmoSimple
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-slate-400">&mdash;</span>
                Vous contacter dans le cadre de ce projet
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-slate-400">&mdash;</span>
                Analyser de manière anonyme la fréquentation du site (Vercel Analytics)
              </li>
            </ul>
          </section>

          <div className="border-t border-slate-100" />

          <section>
            <h2 className="text-lg font-bold text-ink">
              Durée de conservation
            </h2>
            <p className="mt-3">
              Vos données sont conservées jusqu&apos;au lancement du produit ou
              jusqu&apos;à votre demande de suppression, selon ce qui intervient
              en premier.
            </p>
          </section>

          <div className="border-t border-slate-100" />

          <section>
            <h2 className="text-lg font-bold text-ink">Vos droits</h2>
            <p className="mt-3">
              Conformément au RGPD, vous disposez des droits suivants :
            </p>
            <ul className="mt-3 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="mt-1 text-slate-400">&mdash;</span>
                Droit d&apos;accès à vos données
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-slate-400">&mdash;</span>
                Droit de rectification
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-slate-400">&mdash;</span>
                Droit de suppression
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-slate-400">&mdash;</span>
                Droit à la portabilité
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-slate-400">&mdash;</span>
                Droit d&apos;opposition au traitement
              </li>
            </ul>
            <p className="mt-3">
              Pour exercer ces droits, contactez-nous à :{" "}
              <span className="font-medium text-ink">sotovictor@outlook.fr</span>
            </p>
          </section>

          <div className="border-t border-slate-100" />

          <section>
            <h2 className="text-lg font-bold text-ink">Cookies</h2>
            <p className="mt-3">
              Ce site utilise uniquement Vercel Analytics, un service
              d&apos;analyse qui ne dépose pas de cookies de suivi personnel.
              Aucun cookie tiers n&apos;est utilisé. Vous pouvez refuser les
              cookies analytiques via la bannière affichée lors de votre première
              visite.
            </p>
          </section>

          <div className="border-t border-slate-100" />

          <section>
            <h2 className="text-lg font-bold text-ink">
              Hébergement des données
            </h2>
            <p className="mt-3">
              Les données sont hébergées par Vercel Inc. (États-Unis) et Upstash
              (base de données). Des garanties appropriées sont en place
              conformément au RGPD pour les transferts de données hors UE.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politique de confidentialité — ImmoSimple",
};

export default function PolitiqueConfidentialite() {
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
          Politique de confidentialité
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Dernière mise à jour : janvier 2026
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-600">
          <section>
            <h2 className="text-base font-medium text-slate-900">
              Responsable du traitement
            </h2>
            <p className="mt-2">
              Nom : Victor Soto
              <br />
              Email : sotovictor@outlook.fr
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-slate-900">
              Données collectées
            </h2>
            <p className="mt-2">
              Dans le cadre de la liste d&apos;attente, nous collectons les
              données suivantes :
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Adresse email</li>
              <li>Type de bien (optionnel)</li>
              <li>Nombre de lots (optionnel)</li>
              <li>Date d&apos;inscription</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-medium text-slate-900">
              Finalité du traitement
            </h2>
            <p className="mt-2">
              Vos données sont utilisées uniquement pour :
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Vous informer du lancement de la plateforme ImmoSimple</li>
              <li>Vous contacter dans le cadre de ce projet</li>
              <li>
                Analyser de manière anonyme la fréquentation du site (Vercel
                Analytics)
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-medium text-slate-900">
              Durée de conservation
            </h2>
            <p className="mt-2">
              Vos données sont conservées jusqu&apos;au lancement du produit ou
              jusqu&apos;à votre demande de suppression, selon ce qui intervient
              en premier.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-slate-900">Vos droits</h2>
            <p className="mt-2">
              Conformément au RGPD, vous disposez des droits suivants :
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Droit d&apos;accès à vos données</li>
              <li>Droit de rectification</li>
              <li>Droit de suppression</li>
              <li>Droit à la portabilité</li>
              <li>Droit d&apos;opposition au traitement</li>
            </ul>
            <p className="mt-2">
              Pour exercer ces droits, contactez-nous à :{" "}
              <span className="font-medium">sotovictor@outlook.fr</span>
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-slate-900">Cookies</h2>
            <p className="mt-2">
              Ce site utilise uniquement Vercel Analytics, un service
              d&apos;analyse qui ne dépose pas de cookies de suivi personnel.
              Aucun cookie tiers n&apos;est utilisé. Vous pouvez refuser les
              cookies analytiques via la bannière affichée lors de votre première
              visite.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-slate-900">
              Hébergement des données
            </h2>
            <p className="mt-2">
              Les données sont hébergées par Vercel Inc. (États-Unis) et Upstash
              (base de données). Des garanties appropriées sont en place
              conformément au RGPD pour les transferts de données hors UE.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

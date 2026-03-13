import { Button } from "@/components/ui/button";
import { Check, Sparkles, Zap, Shield } from "lucide-react";

const features = [
  "Quittances automatiques",
  "Baux numériques & signature",
  "Portail locataire",
  "Suivi des interventions",
  "Tableau de bord financier",
  "Alertes de conformité",
  "Support par email",
];

export function Pricing() {
  return (
    <div className="mx-auto max-w-5xl">
      <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
        Tarif préférentiel pour les premiers inscrits
      </h2>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/60">
        Nous finalisons notre grille tarifaire. Les premiers inscrits
        bénéficieront d&apos;un tarif garanti à vie.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {/* Left card: price anchor + features */}
        <div className="rounded-xl bg-white/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
            À partir de
          </p>
          <p className="mt-1 text-3xl font-bold text-white">
            3€<span className="text-lg font-normal text-white/60">/lot/mois</span>
          </p>
          <p className="mt-1 text-xs text-white/40">
            Prix définitif communiqué aux inscrits en priorité
          </p>

          <ul className="mt-5 space-y-2">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-white">
                <Check className="mt-0.5 size-4 shrink-0 text-white/60" />
                {f}
              </li>
            ))}
            <li className="flex items-start gap-2 text-sm italic text-white/50">
              <span className="mt-0.5 size-4 shrink-0 text-center">＋</span>
              Et d&apos;autres à venir, inspirées de vos retours
            </li>
          </ul>
        </div>

        {/* Right card: benefits + CTA */}
        <div className="flex flex-col justify-between rounded-xl bg-white/10 p-5">
          <div>
            <p className="text-lg font-bold text-white">
              Soyez parmi les premiers.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              Tarif préférentiel à vie pour les premiers inscrits. Lancement en 2026.
            </p>

            <div className="mt-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Sparkles className="size-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Accès prioritaire</p>
                  <p className="text-sm text-white/50">Soyez le premier à tester la plateforme.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Zap className="size-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Tarif fondateur</p>
                  <p className="text-sm text-white/50">Un prix réduit garanti à vie.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Shield className="size-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Influencez le produit</p>
                  <p className="text-sm text-white/50">Vos retours façonnent les fonctionnalités.</p>
                </div>
              </div>
            </div>
          </div>

          <Button
            asChild
            className="mt-6 h-12 w-full rounded-xl bg-white text-base font-semibold text-blue shadow-lg hover:bg-white/90"
          >
            <a href="#waitlist">Rejoindre la liste d&apos;attente &rarr;</a>
          </Button>
        </div>
      </div>
    </div>
  );
}

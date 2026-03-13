import {
  Landmark,
  FileSignature,
  MessageSquare,
  Wrench,
  BarChart3,
  Scale,
} from "lucide-react";

const features = [
  {
    icon: Landmark,
    title: "Quittances automatiques",
    description: "Envoi automatique chaque mois, sans intervention.",
  },
  {
    icon: FileSignature,
    title: "Baux numériques",
    description: "Signature électronique, archivage, rappels.",
  },
  {
    icon: MessageSquare,
    title: "Portail locataire",
    description: "Signalements en ligne, suivi en temps réel.",
  },
  {
    icon: Wrench,
    title: "Suivi des interventions",
    description: "De la demande à la résolution, tout est tracé.",
  },
  {
    icon: BarChart3,
    title: "Tableau de bord",
    description: "Revenus, charges, fiscalité : une vue claire.",
  },
  {
    icon: Scale,
    title: "Conformité légale",
    description: "Alertes DPE, assurances, révision de loyer.",
  },
];

export function Features() {
  return (
    <section className="px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Ce qu&apos;on construit
        </h2>
        <p className="mt-1 text-base text-muted-text">
          Tout ce dont un propriétaire a besoin, dans un seul outil.
        </p>

        <div className="mt-7 grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface">
                <feature.icon className="size-[18px] text-blue" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-ink">
                  {feature.title}
                </h3>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-text">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

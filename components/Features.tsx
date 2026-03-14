const features = [
  {
    title: "Quittances automatiques",
    description: "Envoi automatique chaque mois, sans intervention.",
  },
  {
    title: "Baux numériques",
    description: "Signature électronique, archivage, rappels.",
  },
  {
    title: "Portail locataire",
    description: "Signalements en ligne, suivi en temps réel.",
  },
  {
    title: "Suivi des interventions",
    description: "De la demande à la résolution, tout est tracé.",
  },
  {
    title: "Tableau de bord",
    description: "Revenus, charges, fiscalité : une vue claire.",
  },
  {
    title: "Conformité légale",
    description: "Alertes DPE, assurances, révision de loyer.",
  },
];

export function Features() {
  return (
    <section className="border-t border-slate-200">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10 sm:py-20">
        <h2 className="text-3xl font-black tracking-tight text-ink sm:text-4xl">
          Ce qu&apos;on construit
        </h2>
        <p className="mt-2 text-base text-slate-500">
          Tout ce dont un propriétaire a besoin, dans un seul outil.
        </p>

        <div className="mt-12">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className={`grid gap-1 py-5 sm:grid-cols-2 sm:gap-8 ${
                i < features.length - 1 ? "border-b border-slate-100" : ""
              }`}
            >
              <p className="text-base font-bold text-ink">{feature.title}</p>
              <p className="text-base leading-relaxed text-slate-500">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

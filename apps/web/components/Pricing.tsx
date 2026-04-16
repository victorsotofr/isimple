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
    <section className="border-t border-slate-200">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10 sm:py-20">
        <div className="mx-auto max-w-lg text-center">
          <p className="mt-3 text-5xl font-black text-ink sm:text-6xl">
            Tarif fondateur
          </p>
          <p className="mt-3 text-base leading-relaxed text-slate-500">
            Nous finalisons notre grille tarifaire. Les premiers inscrits
            bénéficieront d&apos;un tarif garanti à vie.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-sm border border-slate-200 px-8 py-8">
          <ul className="space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-3 text-base text-ink">
                <span className="mt-0.5 text-blue">&#10003;</span>
                {f}
              </li>
            ))}
          </ul>

          <a
            href="#waitlist"
            className="mt-8 block w-full bg-ink py-3.5 text-center text-base font-medium text-white transition-colors hover:bg-ink/90"
          >
            Rejoindre la liste d&apos;attente &rarr;
          </a>
        </div>
      </div>
    </section>
  );
}

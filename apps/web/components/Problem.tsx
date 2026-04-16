const painPoints = [
  {
    number: "01",
    title: "Des frais qui s'accumulent",
    description:
      "8-12% du loyer + état des lieux, renouvellement, gestion des impayés...",
  },
  {
    number: "02",
    title: "Un manque de transparence",
    description:
      "Votre locataire a signalé un problème il y a 3 semaines. Vous l'apprenez aujourd'hui.",
  },
  {
    number: "03",
    title: "Des outils qui datent",
    description:
      "PDF par email, virements manuels, relances par courrier. En 2026.",
  },
];

export function Problem() {
  return (
    <section className="border-t border-slate-200">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10 sm:py-20">
        <h2 className="text-3xl font-black tracking-tight text-ink sm:text-4xl">
          La gestion locative traditionnelle, c&apos;est compliqué.
        </h2>

        <div className="mt-12 space-y-0 sm:mt-16">
          {painPoints.map((point, i) => (
            <div
              key={point.number}
              className={`flex gap-6 py-8 sm:gap-10 ${
                i < painPoints.length - 1 ? "border-b border-slate-100" : ""
              }`}
            >
              <span className="shrink-0 text-5xl font-black leading-none text-slate-200 sm:text-6xl">
                {point.number}
              </span>
              <div className="pt-1">
                <h3 className="text-lg font-bold text-ink">
                  {point.title}
                </h3>
                <p className="mt-1 max-w-lg text-base leading-relaxed text-slate-500">
                  {point.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

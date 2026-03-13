import { Banknote, PhoneCall, FileText } from "lucide-react";

const painPoints = [
  {
    icon: Banknote,
    title: "Des frais qui s'accumulent",
    description:
      "8-12% du loyer + état des lieux, renouvellement, gestion des impayés...",
  },
  {
    icon: PhoneCall,
    title: "Un manque de transparence",
    description:
      "Votre locataire a signalé un problème il y a 3 semaines. Vous l'apprenez aujourd'hui.",
  },
  {
    icon: FileText,
    title: "Des outils qui datent",
    description:
      "PDF par email, virements manuels, relances par courrier. En 2026.",
  },
];

export function Problem() {
  return (
    <div className="mx-auto max-w-5xl">
      <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
        La gestion locative traditionnelle, c&apos;est compliqué.
      </h2>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {painPoints.map((point) => (
          <div key={point.title} className="rounded-xl bg-white/10 p-5">
            <point.icon className="size-5 text-white" />
            <h3 className="mt-3 text-base font-semibold text-white">
              {point.title}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-white/70">
              {point.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

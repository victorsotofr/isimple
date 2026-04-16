import { ArrowUpRight } from "lucide-react";

const founders = [
  {
    name: "Victor Soto",
    title: "HEC Paris & École Polytechnique · ex-Retab, Rothschild & TotalEnergies",
    linkedin: "https://www.linkedin.com/in/victor-soto-203a961a2/",
  },
  {
    name: "Valentin Henry-Léo",
    title: "HEC Paris & École Polytechnique · ex-Animaj, Alan & Société Générale",
    linkedin: "https://www.linkedin.com/in/valentin-henry-l%C3%A9o/",
  },
  {
    name: "Adrien Senghor",
    title: "HEC Paris & École Polytechnique · ex-Google, Pretto & Mirakl",
    linkedin: "https://www.linkedin.com/in/adrien-senghor/",
  },
];

export function Founder() {
  return (
    <section className="border-y border-slate-200">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:grid-cols-2 sm:gap-16 sm:px-10 sm:py-20">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Construit par
          </p>

          <div className="mt-6 space-y-6">
            {founders.map((f) => (
              <div key={f.name}>
                <p className="text-2xl font-black text-ink sm:text-3xl">
                  {f.name}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                  {f.title}
                </p>
                <a
                  href={f.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-ink underline underline-offset-4 transition-colors hover:text-blue"
                >
                  LinkedIn
                  <ArrowUpRight className="size-3.5" />
                </a>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center">
          <blockquote className="text-xl leading-relaxed text-ink italic sm:text-2xl">
            &ldquo;On a cherché un outil simple pour gérer nos locations.
            Il n&apos;existait pas. Alors on le construit.&rdquo;
          </blockquote>
        </div>
      </div>
    </section>
  );
}

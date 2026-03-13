import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Linkedin } from "lucide-react";

export function Hero({ waitlistCount }: { waitlistCount: number }) {
  return (
    <section className="px-5 pt-24 pb-10 sm:px-8 sm:pt-28 sm:pb-14">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-[clamp(2.25rem,5vw,3.75rem)] font-bold leading-[1.08] tracking-tight text-ink">
          Gérez vos locations,
          <br />
          sans les frictions.
        </h1>

        <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-muted-text sm:text-xl">
          Un outil moderne pour propriétaires qui veulent reprendre le
          contrôle de leur patrimoine.
        </p>

        <div className="mt-7 flex flex-col items-center gap-3">
          <Button
            asChild
            className="h-12 rounded-lg bg-blue px-8 text-base font-medium text-white hover:bg-blue-dark"
          >
            <a href="#waitlist">Rejoindre la liste d&apos;attente &rarr;</a>
          </Button>

          {waitlistCount > 0 && (
            <p className="text-sm text-muted-text">
              Déjà{" "}
              <span className="font-semibold text-ink">{waitlistCount}</span>{" "}
              propriétaires inscrits
            </p>
          )}
        </div>

        <div className="mt-6">
          <Badge
            variant="outline"
            className="gap-1.5 border-warm-border px-3 py-1 text-xs font-normal text-muted-text"
          >
            Projet étudiant · HEC Paris × Polytechnique
            <a
              href="https://www.linkedin.com/in/victor-soto-203a961a2/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Profil LinkedIn"
              className="inline-flex text-muted-text transition-colors hover:text-blue"
            >
              <Linkedin className="size-3" />
            </a>
          </Badge>
        </div>
      </div>
    </section>
  );
}

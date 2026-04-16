export function Hero({ waitlistCount }: { waitlistCount: number }) {
  return (
    <section className="px-6 pt-28 pb-16 sm:px-10 sm:pt-36 sm:pb-20">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-5xl font-black leading-none tracking-tight text-ink sm:text-7xl lg:text-8xl">
          Gérez vos locations,
          <br />
          <span className="italic">sans les frictions.</span>
        </h1>

        <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-500 sm:text-xl">
          Un outil moderne pour propriétaires qui veulent reprendre le
          contrôle de leur patrimoine.
        </p>

        <div className="mt-8 border-t border-slate-200" />

        <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <a
            href="#waitlist"
            className="inline-block border border-ink bg-ink px-8 py-3.5 text-center text-base font-medium text-white transition-colors hover:bg-transparent hover:text-ink"
          >
            Rejoindre la liste d&apos;attente &rarr;
          </a>

          {waitlistCount > 0 && (
            <p className="text-base text-slate-500">
              Déjà{" "}
              <span className="font-semibold text-ink">{waitlistCount}</span>{" "}
              propriétaires inscrits
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

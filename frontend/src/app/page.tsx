import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  FileText,
  Inbox,
  MessageCircle,
  Sparkles,
  Ticket,
  Users,
} from 'lucide-react';

const features = [
  {
    icon: Inbox,
    title: 'Boîte de réception intelligente',
    body: 'Centralisez les messages locataires, qualifiez les demandes et gardez les urgences visibles.',
  },
  {
    icon: FileText,
    title: "Documents analysés par l'IA",
    body: 'Importez baux, quittances et factures. isimple extrait les informations utiles et propose les rattachements.',
  },
  {
    icon: Ticket,
    title: 'Tickets et prestataires',
    body: 'Transformez une conversation en intervention suivie, avec contexte, priorité et historique.',
  },
] as const;

const steps = [
  ['01', 'Connectez vos lots', 'Créez vos biens, locataires et documents importants dans un espace partagé.'],
  ['02', "Laissez l'IA trier", 'Les messages et documents sont classés pour accélérer les décisions.'],
  ['03', 'Gardez la main', 'Vous validez, répondez ou déléguez à un prestataire depuis un même tableau de bord.'],
] as const;

const previewRows = [
  ['Marc Lefort', 'Fuite évier', 'Urgent', 'Ticket créé'],
  ['Orianna Martin', 'Quittance mars', 'Document', 'IA prête'],
  ['Sophie Bernard', 'Préavis reçu', 'À traiter', 'Brouillon'],
] as const;

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <nav className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/90 px-5 backdrop-blur-xl lg:px-12">
        <Link href="/" className="flex items-center gap-2 text-foreground">
          <span className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background">
            <LogoMark />
          </span>
          <span className="font-serif text-xl tracking-tight">isimple</span>
        </Link>
        <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#features" className="transition-colors hover:text-foreground">Fonctionnalités</a>
          <a href="#workflow" className="transition-colors hover:text-foreground">Méthode</a>
          <a href="#preview" className="transition-colors hover:text-foreground">Aperçu</a>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-lg border px-4 py-2 text-sm transition-colors hover:bg-muted sm:inline-flex"
          >
            Connexion
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-85"
          >
            Essayer
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </nav>

      <section className="relative mx-auto grid max-w-6xl gap-12 px-5 py-20 lg:grid-cols-[0.9fr_1.1fr] lg:px-12 lg:py-28">
        <div className="absolute left-1/2 top-10 -z-10 size-[520px] -translate-x-1/2 rounded-full bg-brand-muted blur-3xl" />
        <div className="flex flex-col justify-center">
          <div className="mb-7 inline-flex w-fit items-center gap-2 rounded-full bg-brand-muted px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand">
            <span className="size-1.5 rounded-full bg-brand" />
            Gestion locative assistée
          </div>
          <h1 className="font-serif text-5xl leading-[1.02] tracking-[-0.04em] text-foreground sm:text-6xl lg:text-7xl">
            Pilotez vos biens sans vous noyer dans l&apos;admin.
          </h1>
          <p className="mt-6 max-w-xl text-lg font-light leading-8 text-muted-foreground">
            isimple réunit messages, documents, locataires et tickets dans un tableau de bord pensé pour les propriétaires et gestionnaires en France.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-foreground px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-85"
            >
              Créer mon espace
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/inbox"
              className="inline-flex items-center gap-2 rounded-lg border bg-card px-6 py-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              Ouvrir l&apos;app
            </Link>
          </div>
          <div className="mt-8 grid max-w-lg grid-cols-3 gap-3 text-sm">
            <Metric value="12h" label="gagnées / mois" />
            <Metric value="IA" label="classification" />
            <Metric value="1" label="espace partagé" />
          </div>
        </div>

        <AppPreview />
      </section>

      <section id="features" className="mx-auto max-w-6xl border-t px-5 py-20 lg:px-12">
        <div className="mb-10 grid gap-6 lg:grid-cols-[0.8fr_1fr] lg:items-end">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-brand">+ Fonctionnalités</p>
            <h2 className="font-serif text-4xl leading-tight tracking-tight">Moins d&apos;onglets, plus de décisions.</h2>
          </div>
          <p className="max-w-2xl text-muted-foreground">
            Le design produit priorise les files à traiter, les informations extraites et les actions rapides. L&apos;objectif n&apos;est pas de tout automatiser, mais de réduire la friction.
          </p>
        </div>
        <div className="grid overflow-hidden rounded-xl border bg-border md:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <article key={title} className="bg-background p-7 md:border-r md:last:border-r-0">
              <div className="mb-6 flex size-10 items-center justify-center rounded-lg bg-brand-muted text-brand">
                <Icon className="size-5" />
              </div>
              <h3 className="mb-3 text-lg font-semibold">{title}</h3>
              <p className="text-sm leading-6 text-muted-foreground">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="workflow" className="mx-auto grid max-w-6xl gap-12 border-t px-5 py-20 lg:grid-cols-[0.9fr_1.1fr] lg:px-12">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-brand">+ Méthode</p>
          <h2 className="font-serif text-4xl leading-tight tracking-tight">Un workflow simple pour une gestion propre.</h2>
          <p className="mt-5 text-muted-foreground">
            Le produit reste volontairement compact: capturer, qualifier, agir, archiver.
          </p>
        </div>
        <div className="divide-y border-y">
          {steps.map(([num, title, body]) => (
            <div key={num} className="grid gap-4 py-7 sm:grid-cols-[48px_1fr]">
              <span className="text-sm font-semibold text-muted-foreground">{num}</span>
              <div>
                <h3 className="text-xl font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20 lg:px-12">
        <div className="overflow-hidden rounded-2xl bg-[#1c1c1a] p-8 text-[#f0efe9] lg:p-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-brand">Prêt à tester</p>
              <h2 className="font-serif text-4xl leading-tight tracking-tight">Créez votre espace et importez vos premiers documents.</h2>
            </div>
            <Link
              href="/signup"
              className="inline-flex w-fit items-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90"
            >
              Commencer
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t px-5 py-[60px] lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 md:grid-cols-[2fr_1fr_1fr_1fr]">
            <div>
              <Link href="/" className="mb-3 flex items-center gap-2 text-foreground">
                <span className="flex size-7 items-center justify-center rounded-md bg-foreground text-background">
                  <LogoMark />
                </span>
                <span className="font-serif text-lg">isimple</span>
              </Link>
              <p className="max-w-64 text-sm leading-6 text-muted-foreground">
                La gestion immobilière propulsée par l&apos;intelligence artificielle. Conçu pour les professionnels de l&apos;immobilier.
              </p>
            </div>
            <FooterColumn
              title="Produit"
              links={[
                ['Fonctionnalités', '#features'],
                ['Méthode', '#workflow'],
                ['Aperçu', '#preview'],
                ['Connexion', '/login'],
              ]}
            />
            <FooterColumn
              title="Entreprise"
              links={[
                ['À propos', '#'],
                ['Blog', '#'],
                ['Carrières', '#'],
                ['Contact', '#'],
              ]}
            />
            <FooterColumn
              title="Légal"
              links={[
                ['Confidentialité', '#'],
                ['CGU', '#'],
                ['RGPD', '#'],
              ]}
            />
          </div>

          <div className="mt-12 border-t pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-muted-foreground">isimple © 2026</span>
              <div className="flex gap-5 text-xs text-muted-foreground">
                <Link href="#" className="transition-colors hover:text-foreground">Terms</Link>
                <Link href="#" className="transition-colors hover:text-foreground">Privacy</Link>
                <Link href="#" className="transition-colors hover:text-foreground">Contact</Link>
              </div>
            </div>
            <div
              aria-hidden="true"
              className="mt-10 w-full select-none overflow-hidden font-serif text-[clamp(96px,22vw,260px)] leading-[0.72] tracking-[-0.075em] text-[#deddd8]"
            >
              isimple
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: readonly (readonly [string, string])[];
}) {
  return (
    <div>
      <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{title}</h4>
      <div className="grid gap-2.5">
        {links.map(([label, href]) => (
          <Link key={label} href={href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function AppPreview() {
  return (
    <div id="preview" className="relative">
      <div className="rounded-2xl border bg-card shadow-[0_24px_80px_rgba(28,28,26,0.12)]">
        <div className="flex items-center gap-2 border-b bg-muted/70 px-4 py-3">
          <span className="size-2.5 rounded-full bg-red-400" />
          <span className="size-2.5 rounded-full bg-amber-400" />
          <span className="size-2.5 rounded-full bg-emerald-400" />
          <span className="ml-2 rounded border bg-background px-3 py-1 text-[11px] text-muted-foreground">app.isimple.fr/inbox</span>
        </div>
        <div className="grid min-h-[440px] md:grid-cols-[190px_1fr]">
          <aside className="hidden border-r bg-[#1c1c1a] p-3 text-[#f0efe9] md:block">
            <div className="mb-4 flex items-center gap-2 px-1">
              <span className="flex size-7 items-center justify-center rounded-md bg-brand">
                <LogoMark />
              </span>
              <span className="font-serif text-lg">isimple</span>
            </div>
            {[
              [Inbox, 'Inbox', true],
              [Ticket, 'Tickets', false],
              [Building2, 'Propriétés', false],
              [Users, 'Locataires', false],
              [FileText, 'Documents', false],
            ].map(([Icon, label, active]) => {
              const ItemIcon = Icon as typeof Inbox;
              return (
                <div
                  key={label as string}
                  className={`mb-1 flex items-center gap-2 rounded-lg px-2 py-2 text-xs ${
                    active ? 'bg-brand-muted text-[#f0efe9]' : 'text-[#8a8a85]'
                  }`}
                >
                  <ItemIcon className="size-3.5" />
                  {label as string}
                </div>
              );
            })}
          </aside>
          <div className="p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Inbox</h3>
                <p className="text-xs text-muted-foreground">Tri IA et suivi locataire</p>
              </div>
              <div className="flex items-center gap-2 rounded-full border bg-brand-muted px-3 py-1 text-xs font-medium text-brand">
                <Bot className="size-3.5" />
                IA active
              </div>
            </div>
            <div className="grid gap-3">
              {previewRows.map(([name, subject, status, action], index) => (
                <div key={name} className="rounded-xl border bg-background p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-full border bg-card text-sm font-semibold">
                        {name[0]}
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{name}</p>
                        <p className="text-xs text-muted-foreground">{subject}</p>
                      </div>
                    </div>
                    <span className="rounded-full border bg-card px-2 py-1 text-[10px] text-muted-foreground">
                      {status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {index === 0 ? <MessageCircle className="size-3.5 text-orange-500" /> : <Sparkles className="size-3.5 text-brand" />}
                    <span>{action}</span>
                    <CheckCircle2 className="ml-auto size-3.5 text-emerald-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LogoMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="6" height="6" rx="1" fill="currentColor" />
      <rect x="10" y="2" width="6" height="6" rx="1" fill="currentColor" opacity="0.45" />
      <rect x="2" y="10" width="6" height="6" rx="1" fill="currentColor" opacity="0.45" />
      <rect x="10" y="10" width="6" height="6" rx="1" fill="currentColor" />
    </svg>
  );
}

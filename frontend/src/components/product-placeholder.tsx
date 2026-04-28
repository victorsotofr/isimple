import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ProductPlaceholderProps = {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
  cta?: {
    label: string;
    href: string;
  };
};

export function ProductPlaceholder({
  icon: Icon,
  eyebrow,
  title,
  body,
  points,
  cta,
}: ProductPlaceholderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm">
      <div className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-brand-muted blur-3xl" />
      <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_320px] lg:items-end">
        <div>
          <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-foreground text-background">
            <Icon className="size-5" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
            {eyebrow}
          </p>
          <h1 className="mt-3 max-w-2xl font-serif text-4xl leading-tight tracking-tight">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
            {body}
          </p>
          {cta && (
            <Button asChild className="mt-6">
              <Link href={cta.href}>
                {cta.label}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          )}
        </div>
        <div className="rounded-xl border bg-background/80 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            À construire
          </p>
          <div className="space-y-3">
            {points.map((point) => (
              <div key={point} className="flex gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand" />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

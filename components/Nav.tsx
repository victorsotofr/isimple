import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Nav() {
  return (
    <nav
      className="fixed inset-x-0 top-0 z-50 border-b border-warm-border/50 bg-background/80 backdrop-blur-md"
      aria-label="Navigation principale"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="text-lg font-bold text-ink">
          ImmoSimple
        </Link>
        <Button
          asChild
          className="h-9 rounded-lg bg-blue px-5 text-sm font-medium text-white hover:bg-blue-dark"
        >
          <a href="#waitlist">Rejoindre la liste d&apos;attente</a>
        </Button>
      </div>
    </nav>
  );
}

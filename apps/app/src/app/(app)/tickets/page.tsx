import { Ticket } from 'lucide-react';

export default function TicketsPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground gap-3">
      <Ticket className="size-10 opacity-30" />
      <p className="text-sm">Les tickets arrivent bientôt.</p>
    </div>
  );
}

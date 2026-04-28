import { CalendarDays } from 'lucide-react';
import { ProductPlaceholder } from '@/components/product-placeholder';

export default function AgendaPage() {
  return (
    <ProductPlaceholder
      icon={CalendarDays}
      eyebrow="Agenda"
      title="Gardez les échéances locatives au même endroit."
      body="L’agenda consolidera relances, visites, échéances de bail, interventions et tâches d’équipe dans une vue claire."
      points={[
        'Échéances automatiques depuis baux et documents',
        'Rappels pour relances et interventions',
        'Vue hebdomadaire pour prioriser le travail',
      ]}
      cta={{ label: 'Importer des documents', href: '/documents/upload' }}
    />
  );
}

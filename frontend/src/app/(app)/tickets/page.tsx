import { Ticket } from 'lucide-react';
import { ProductPlaceholder } from '@/components/product-placeholder';

export default function TicketsPage() {
  return (
    <ProductPlaceholder
      icon={Ticket}
      eyebrow="Maintenance"
      title="Transformez les demandes locataires en interventions suivies."
      body="Les tickets deviendront le hub opérationnel entre locataires, gestionnaire et prestataires. Le but: moins de fils dispersés, plus de décisions visibles."
      points={[
        'Création depuis une conversation inbox',
        'Priorité, statut, prestataire et historique',
        'Brouillons IA pour tenir le locataire informé',
      ]}
      cta={{ label: 'Ouvrir l’inbox', href: '/inbox' }}
    />
  );
}

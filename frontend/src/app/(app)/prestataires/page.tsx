import { Wrench } from 'lucide-react';
import { ProductPlaceholder } from '@/components/product-placeholder';

export default function PrestatairesPage() {
  return (
    <ProductPlaceholder
      icon={Wrench}
      eyebrow="Réseau"
      title="Centralisez vos artisans, devis et interventions."
      body="La page prestataires servira à retrouver le bon contact, suivre les interventions et garder le contexte attaché au bien."
      points={[
        'Carnet de prestataires par spécialité',
        'Historique des interventions par bien',
        'Passage fluide depuis les tickets',
      ]}
      cta={{ label: 'Voir les tickets', href: '/tickets' }}
    />
  );
}

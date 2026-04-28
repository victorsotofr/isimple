import { BarChart3 } from 'lucide-react';
import { ProductPlaceholder } from '@/components/product-placeholder';

export default function AnalyticsPage() {
  return (
    <ProductPlaceholder
      icon={BarChart3}
      eyebrow="Pilotage"
      title="Une vue claire sur votre portefeuille locatif."
      body="Les analytiques doivent rester lisibles: loyers, vacance, documents manquants, demandes ouvertes et signaux faibles."
      points={[
        'Indicateurs de santé par bien',
        'Demandes ouvertes et temps de traitement',
        'Synthèses IA sans tableaux illisibles',
      ]}
      cta={{ label: 'Voir les biens', href: '/lots' }}
    />
  );
}

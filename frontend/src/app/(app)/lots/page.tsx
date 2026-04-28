import { Suspense } from 'react';
import { LotsView } from '@/components/lots-view';

export default function LotsPage() {
  return (
    <Suspense>
      <LotsView />
    </Suspense>
  );
}

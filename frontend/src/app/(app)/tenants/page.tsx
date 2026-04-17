import { Suspense } from 'react';
import { TenantsView } from '@/components/tenants-view';

export default function TenantsPage() {
  return (
    <Suspense>
      <TenantsView />
    </Suspense>
  );
}

import { LotDetailView } from '@/components/lot-detail-view';

export default async function LotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LotDetailView id={id} />;
}

import { PageHeader, EmptyState } from './Display';
import { Hammer } from 'lucide-react';

export default function Placeholder({ title }: { title: string }) {
  return (
    <div>
      <PageHeader title={title} />
      <EmptyState title="Interface en cours" hint="Ce module sera bientôt disponible." icon={<Hammer className="h-7 w-7" />} />
    </div>
  );
}

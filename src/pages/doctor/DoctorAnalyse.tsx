import { LineChart } from 'lucide-react';
import { PageHeader } from '../../components/ui/Display';
import EvaluationSection from '../../components/analytics/EvaluationSection';

/** Read-only view of the player development charts for doctors. */
export default function DoctorAnalyse() {
  return (
    <div>
      <PageHeader title="Analyse" subtitle="Développement des joueurs (lecture seule)" icon={<LineChart className="h-5 w-5" />} />
      <EvaluationSection />
    </div>
  );
}

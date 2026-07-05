import { LayoutDashboard, Users, HeartPulse, CircleDollarSign, Wallet } from 'lucide-react';
import { PageHeader, StatCard, Badge, EmptyState } from '../../components/ui/Display';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { money, fmtDate } from '../../lib/utils';
import { latestMedical } from '../Players';

/** Small doctor-only dashboard: own pay summary + medical overview. */
export default function DoctorHome() {
  const { user } = useAuth();
  const { data } = useData();
  const me = data.doctors.find((d) => d.id === user?.doctorId);

  const acomptesTotal = me?.acomptes.reduce((s, a) => s + a.amount, 0) ?? 0;
  const paidTotal = me?.payments.reduce((s, p) => s + p.amount, 0) ?? 0;
  const unfit = data.players.filter((p) => latestMedical(p)?.status === false);
  const lastPayments = [...(me?.payments ?? [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  return (
    <div>
      <PageHeader title={`Bonjour, ${user?.name || 'Docteur'}`} subtitle="Votre espace médecin" icon={<LayoutDashboard className="h-5 w-5" />} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Joueurs" value={data.players.length} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Joueurs inaptes" value={unfit.length} icon={<HeartPulse className="h-5 w-5" />} tone="danger" delay={0.05} />
        <StatCard label="Mes acomptes" value={money(acomptesTotal)} icon={<CircleDollarSign className="h-5 w-5" />} tone="warning" delay={0.1} />
        <StatCard label="Total perçu" value={money(paidTotal)} icon={<Wallet className="h-5 w-5" />} tone="success" delay={0.15} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <div className="card p-5">
          <h3 className="font-display font-bold text-fg mb-3">Mes derniers paiements</h3>
          {lastPayments.length === 0 ? <p className="text-sm text-muted">Aucun paiement enregistré</p> : (
            <div className="space-y-2">
              {lastPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl bg-surface-2 p-3">
                  <div><p className="text-sm font-semibold text-fg">{p.description || 'Paiement'}</p><p className="text-xs text-muted">{fmtDate(p.date)}</p></div>
                  <span className="font-bold text-success">+{money(p.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-display font-bold text-fg mb-3">Joueurs inaptes (suivi médical)</h3>
          {unfit.length === 0 ? (
            <EmptyState title="Aucun joueur inapte 🎉" icon={<HeartPulse className="h-7 w-7" />} />
          ) : (
            <div className="space-y-2">
              {unfit.slice(0, 6).map((p) => {
                const med = latestMedical(p)!;
                return (
                  <div key={p.id} className="flex items-center justify-between rounded-xl bg-surface-2 p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-fg truncate">{p.firstName} {p.lastName}</p>
                      <p className="text-xs text-muted truncate">{med.description || 'Sans description'} · {fmtDate(med.date)}</p>
                    </div>
                    <Badge tone="danger">Inapte</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

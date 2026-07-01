type SocietySummaryProps = {
  rolesAssigned: number;
  wiresResolved: number;
  conflictResolutions: number;
  executedAgents: number;
  durationMs: number;
  baselineMs: number;
  efficiencyGainPercent: number;
};

function MetricCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 shadow-sm ${tone}`}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tracking-tight">{value}</div>
    </div>
  );
}

export default function SocietySummary({
  rolesAssigned,
  wiresResolved,
  conflictResolutions,
  executedAgents,
  durationMs,
  baselineMs,
  efficiencyGainPercent,
}: SocietySummaryProps) {
  return (
    <section className="shrink-0 border-t border-slate-200 bg-white px-5 py-4 shadow-[0_-10px_30px_rgba(15,23,42,0.04)]">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-slate-950">
            Agent Society Summary
          </h3>
          <p className="text-xs text-slate-500">
            Task decomposition, conflict resolution, and efficiency vs. baseline.
          </p>
        </div>
        <div className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
          Live run
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <MetricCard label="Roles" value={String(rolesAssigned)} tone="border-slate-200 bg-slate-50 text-slate-900" />
        <MetricCard label="Wires" value={String(wiresResolved)} tone="border-slate-200 bg-slate-50 text-slate-900" />
        <MetricCard label="Conflicts" value={String(conflictResolutions)} tone="border-amber-200 bg-amber-50 text-amber-950" />
        <MetricCard label="Agents" value={String(executedAgents)} tone="border-slate-200 bg-slate-50 text-slate-900" />
        <MetricCard label="Duration" value={`${durationMs}ms`} tone="border-slate-200 bg-slate-50 text-slate-900" />
        <MetricCard label="Baseline" value={`${baselineMs}ms`} tone="border-slate-200 bg-slate-50 text-slate-900" />
        <MetricCard label="Gain" value={`${efficiencyGainPercent}%`} tone="border-emerald-200 bg-emerald-50 text-emerald-800" />
      </div>
    </section>
  );
}
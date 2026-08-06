export function SummaryStats({ stats }) {
  return (
    <section className="row g-3">
      <div className="col-12 col-md-6 col-xl-3">
        <StatCard label="Posts Analyzed" value={stats.postsAnalyzed.toLocaleString()} />
      </div>
      <div className="col-12 col-md-6 col-xl-3">
        <StatCard label="Regions Covered" value={String(stats.regionsCovered)} />
      </div>
      <div className="col-12 col-md-6 col-xl-3">
        <StatCard label="Active Layer" value={stats.activeLayer} />
      </div>
      <div className="col-12 col-md-6 col-xl-3">
        <StatCard label="Last Updated" value={stats.lastUpdated} />
      </div>
    </section>
  );
}

function StatCard({ label, value }) {
  return (
    <article className="polaris-panel h-100">
      <div className="polaris-panel-title">{label}</div>
      <div className="fw-semibold text-dark polaris-stat-value">{value}</div>
    </article>
  );
}
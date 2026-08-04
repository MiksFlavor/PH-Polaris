import { activityLegend, mapFillByLevel } from '../data/mockData';

export function ActivityLegend() {
  return (
    <section className="polaris-panel h-100">
      <div className="polaris-panel-title">Activity Legend</div>
      <div className="d-flex flex-wrap gap-3 small text-secondary">
        {activityLegend.map((entry) => (
          <div key={entry.label} className="d-flex align-items-center gap-2">
            <span className="polaris-legend-swatch" style={{ backgroundColor: mapFillByLevel[entry.colorIndex] }} />
            <span>{entry.label}</span>
          </div>
        ))}
      </div>
      <p className="mb-0 mt-3 small text-secondary">
        Map intensity reflects mock activity values only and does not indicate support or preference.
      </p>
    </section>
  );
}
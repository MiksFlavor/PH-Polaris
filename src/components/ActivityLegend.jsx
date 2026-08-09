import { mapPalette } from '../data/polaris-data';

export function ActivityLegend({ layer }) {
  const visualEntries = layer?.visual || [];

  return (
    <section className="polaris-panel h-100 polaris-legend-panel">
      <div className="polaris-panel-title">Legend</div>
      <div className="small text-secondary mb-2">{layer?.layer?.label || 'Current Layer'}</div>
      <div className="d-flex flex-column gap-2 small text-secondary">
        {visualEntries.map((entry) => (
          <div key={entry.label} className="d-flex align-items-center gap-2">
            {entry.colorKey ? (
              <span className="polaris-legend-swatch" style={{ backgroundColor: mapPalette[entry.colorKey]?.[entry.shadeIndex] || mapPalette.slate[2] }} />
            ) : (
              <span className="polaris-legend-swatch polaris-legend-swatch-empty" />
            )}
            <span>{entry.label}</span>
          </div>
        ))}
      </div>
      <p className="mb-0 mt-3 small text-secondary">{layer?.explanation || 'Darker shades indicate stronger dominance or volume.'}</p>
    </section>
  );
}

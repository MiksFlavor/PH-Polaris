import { mapPalette } from '../data/polaris-data';

export function ActivityLegend({ layer }) {
  const visualEntries = layer?.visual || [];

  return (
    <section className="polaris-panel polaris-legend-strip">
      <div className="polaris-legend-strip-row">
        <div className="polaris-legend-strip-heading">
          <div className="polaris-panel-title mb-0">Legend</div>
          <div className="small text-secondary">{layer?.layer?.label || 'Current Layer'}</div>
        </div>

        <div className="polaris-legend-strip-items">
          {visualEntries.map((entry) => (
            <div key={entry.label} className="d-flex align-items-center gap-2 small text-secondary">
              {entry.colorKey ? (
                <span className="polaris-legend-swatch" style={{ backgroundColor: mapPalette[entry.colorKey]?.[entry.shadeIndex] || mapPalette.slate[2] }} />
              ) : (
                <span className="polaris-legend-swatch polaris-legend-swatch-empty" />
              )}
              <span>{entry.label}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="mb-0 mt-2 small text-secondary">{layer?.explanation || 'Darker shades indicate stronger dominance or volume.'}</p>
    </section>
  );
}

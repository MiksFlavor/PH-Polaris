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
            <span className="polaris-legend-swatch" style={{ backgroundColor: mapPalette[entry.colorKey]?.[entry.shadeIndex] || mapPalette.slate[2] }} />
            <span>{entry.label}</span>
          </div>
        ))}
      </div>
      <p className="mb-0 mt-3 small text-secondary">{layer?.explanation || 'Darker shades indicate stronger dominance or volume.'}</p>
      <div className="mt-3 pt-3 border-top">
        <div className="small text-secondary mb-2">Political color assignments</div>
        <div className="d-flex flex-wrap gap-2 small text-secondary">
          <span className="d-flex align-items-center gap-2"><span className="polaris-legend-swatch" style={{ backgroundColor: mapPalette.slate[4] }} /> Marcos Jr.</span>
          <span className="d-flex align-items-center gap-2"><span className="polaris-legend-swatch" style={{ backgroundColor: mapPalette.rose[4] }} /> Leni Robredo</span>
          <span className="d-flex align-items-center gap-2"><span className="polaris-legend-swatch" style={{ backgroundColor: mapPalette.olive[4] }} /> Sara Duterte</span>
        </div>
      </div>
    </section>
  );
}
import { mapFillByLevel } from '../data/mockData';

// TODO: Consider replacing this schematic SVG map with a more specialized geospatial mapping solution after learning it.

export function PhilippinesMap({ regions, selectedRegionId, hoveredRegionId, tooltip, onRegionClick, onRegionHover, onRegionHoverEnd }) {
  return (
    <section className="polaris-panel position-relative">
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">
        <div>
          <div className="polaris-panel-title mb-1">Philippine Map</div>
          <div className="small text-secondary">Schematic regional layout with mock activity values.</div>
        </div>
      </div>

      <div className="polaris-map-shell">
        <svg viewBox="0 0 820 1260" className="polaris-map-svg" aria-label="Philippine regional activity map">
          <rect width="820" height="1260" fill="#f8fafc" />
          {regions.map((region) => {
            const isSelected = region.id === selectedRegionId;
            const isHovered = region.id === hoveredRegionId;

            return (
              <g key={region.id}>
                <polygon
                  points={region.points}
                  fill={mapFillByLevel[region.colorIndex]}
                  stroke={isSelected ? '#0f172a' : isHovered ? '#475569' : '#cbd5e1'}
                  strokeWidth={isSelected ? 3 : isHovered ? 2.25 : 1.25}
                  onClick={() => onRegionClick(region.id)}
                  onMouseMove={(event) => onRegionHover(region.id, event)}
                  onMouseEnter={(event) => onRegionHover(region.id, event)}
                  onMouseLeave={onRegionHoverEnd}
                  className="polaris-region-shape"
                  opacity={isHovered || isSelected ? 1 : 0.96}
                />
                <text x={textX(region.points)} y={textY(region.points)} textAnchor="middle" className="polaris-map-text" pointerEvents="none">
                  {region.region}
                </text>
                <text x={textX(region.points)} y={textY(region.points) + 18} textAnchor="middle" className="polaris-map-subtext" pointerEvents="none">
                  {region.activity} activity
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {tooltip ? <MapTooltip regions={regions} tooltip={tooltip} /> : null}
    </section>
  );
}

function MapTooltip({ regions, tooltip }) {
  const region = regions.find((item) => item.id === tooltip.id);

  if (!region) {
    return null;
  }

  return (
    <div className="polaris-tooltip" style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}>
      <div className="fw-semibold text-dark">{region.name}</div>
      <div className="small text-secondary mt-1">
        <div>Activity: {region.activity}</div>
        <div>Posts: {region.posts.toLocaleString()}</div>
      </div>
    </div>
  );
}

function textX(points) {
  const xs = points.split(' ').map((point) => Number(point.split(',')[0]));
  return Math.round(xs.reduce((sum, value) => sum + value, 0) / xs.length);
}

function textY(points) {
  const ys = points.split(' ').map((point) => Number(point.split(',')[1]));
  return Math.round(ys.reduce((sum, value) => sum + value, 0) / ys.length) - 8;
}
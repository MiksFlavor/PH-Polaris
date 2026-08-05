import { useEffect, useMemo, useRef } from 'react';
import philippinesSvg from '../data/philippines.svg?raw';
import { mapFillByLevel } from '../data/mockData';
import { PROVINCE_TO_REGION_ID } from '../data/philippines-regions';

export function PhilippinesMap({ regions, selectedRegionId, hoveredRegionId, tooltip, onRegionClick, onRegionHover, onRegionHoverEnd }) {
  const mapContainerRef = useRef(null);

  const regionById = useMemo(() => {
    return new Map(regions.map((region) => [region.id, region]));
  }, [regions]);

  const svgMarkup = useMemo(() => philippinesSvg.replace(/^<\?xml[\s\S]*?\?>\s*/u, ''), []);

  useEffect(() => {
    const container = mapContainerRef.current;
    const svg = container?.querySelector('svg');

    if (!container || !svg) {
      return undefined;
    }

    svg.setAttribute('viewBox', '0 0 702.39001 1209.4381');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.removeAttribute('width');
    svg.removeAttribute('height');

    const paths = Array.from(svg.querySelectorAll('path'));

    const applyPathStyles = () => {
      paths.forEach((path) => {
        const provinceName = path.getAttribute('title');
        const regionId = provinceName ? PROVINCE_TO_REGION_ID[provinceName] : null;
        const region = regionId ? regionById.get(regionId) : null;
        const isSelected = regionId === selectedRegionId;
        const isHovered = regionId === hoveredRegionId;

        path.dataset.regionId = regionId || '';
        path.style.fill = region ? mapFillByLevel[region.colorIndex] : '#e2e8f0';
        path.style.stroke = isSelected ? '#0f172a' : isHovered ? '#334155' : '#cbd5e1';
        path.style.strokeWidth = isSelected ? '2.5' : isHovered ? '1.75' : '1';
        path.style.opacity = isSelected || isHovered ? '1' : region ? '0.92' : '0.65';
        path.style.cursor = regionId ? 'pointer' : 'default';
        path.style.vectorEffect = 'non-scaling-stroke';
      });
    };

    const handlePointerMove = (event) => {
      const target = event.target instanceof Element ? event.target.closest('path') : null;
      const provinceName = target?.getAttribute('title');
      const regionId = provinceName ? PROVINCE_TO_REGION_ID[provinceName] : null;

      if (!regionId) {
        return;
      }

      onRegionHover(regionId, event);
    };

    const handlePointerLeave = () => {
      onRegionHoverEnd();
    };

    const handleClick = (event) => {
      const target = event.target instanceof Element ? event.target.closest('path') : null;
      const provinceName = target?.getAttribute('title');
      const regionId = provinceName ? PROVINCE_TO_REGION_ID[provinceName] : null;

      if (!regionId) {
        return;
      }

      event.preventDefault();
      onRegionClick(regionId);
    };

    applyPathStyles();
    svg.addEventListener('pointermove', handlePointerMove);
    svg.addEventListener('pointerleave', handlePointerLeave);
    svg.addEventListener('click', handleClick);

    return () => {
      svg.removeEventListener('pointermove', handlePointerMove);
      svg.removeEventListener('pointerleave', handlePointerLeave);
      svg.removeEventListener('click', handleClick);
    };
  }, [hoveredRegionId, onRegionClick, onRegionHover, onRegionHoverEnd, regionById, selectedRegionId]);

  return (
    <section className="polaris-panel position-relative">
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">
        <div>
          <div className="polaris-panel-title mb-1">Philippine Map</div>
          <div className="small text-secondary">Interactive provincial map grouped by standard Philippine regions.</div>
        </div>
      </div>

      <div className="polaris-map-shell">
        <div ref={mapContainerRef} className="polaris-map-svg" aria-label="Philippine regional activity map" role="img" dangerouslySetInnerHTML={{ __html: svgMarkup }} />
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
      <div className="fw-semibold text-dark">{region.region}</div>
      <div className="small text-secondary">{region.name}</div>
      <div className="small text-secondary mt-1">
        <div>Activity: {region.activity}</div>
        <div>Posts: {region.posts.toLocaleString()}</div>
      </div>
    </div>
  );
}
import { useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import { mapPalette } from '../data/polaris-data';
import { createMonochromeBasemapStyle } from '../map/maplibreStyle';

// Only region/province have real boundary geometry behind them; see
// src/data/geojson/ATTRIBUTION.md and adminLevelOptions in polaris-data.js.
const RENDERABLE_LEVELS = ['region', 'province'];

export function PhilippinesMap({ regions, provinceAreas, selectedRegionId, hoveredRegionId, tooltip, focusTarget, adminLevelId, onRegionClick, onRegionHover, onRegionHoverEnd }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const [viewTick, setViewTick] = useState(0);
  const [mapReady, setMapReady] = useState(false);

  const activeAdminLevel = RENDERABLE_LEVELS.includes(adminLevelId) ? adminLevelId : 'region';

  // Areas to fill for the current level. Province features carry their
  // parent region's id so hover/select/tooltip stay anchored to the base
  // region for the details panel (there's no separate province detail view).
  const activeAreas = useMemo(() => {
    if (activeAdminLevel === 'province') {
      return (provinceAreas || []).map((area) => ({ ...area, regionId: area.parentRegionId }));
    }

    return regions.map((region) => ({ ...region, regionId: region.id }));
  }, [activeAdminLevel, regions, provinceAreas]);

  const projectedAreas = useMemo(() => {
    const map = mapRef.current;

    if (!map) {
      return [];
    }

    return activeAreas.map((area) => ({
      ...area,
      path: ringsToPath(getRings(area.geometry), map),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAreas, mapReady, viewTick]);

  // Region outlines are always drawn (strong stroke) as a reference layer
  // when viewing provinces, so "which region is this province in" stays
  // legible without a second data fetch.
  const projectedRegionOutlines = useMemo(() => {
    const map = mapRef.current;

    if (!map || activeAdminLevel !== 'province') {
      return [];
    }

    return regions.map((region) => ({ id: region.id, path: ringsToPath(getRings(region.geometry), map) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regions, activeAdminLevel, mapReady, viewTick]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return undefined;
    }

    const philippinesBounds = boundsFromRings(regions.flatMap((region) => getRings(region.geometry)));

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: createMonochromeBasemapStyle(),
      bounds: philippinesBounds,
      fitBoundsOptions: { padding: 24 },
      minZoom: 4.5,
      maxZoom: 11,
      pitch: 0,
      bearing: 0,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    const scheduleViewUpdate = () => setViewTick((tick) => tick + 1);

    const syncMapSize = () => {
      map.resize();
      scheduleViewUpdate();
    };

    resizeObserverRef.current = new ResizeObserver(syncMapSize);
    resizeObserverRef.current.observe(mapContainerRef.current);

    // The camera transform (needed for map.project()) is valid as soon as
    // the map is constructed; the overlay doesn't need to wait for the
    // basemap's own tiles or the 'load' event to draw correctly.
    map.on('move', scheduleViewUpdate);

    mapRef.current = map;
    setMapReady(true);

    return () => {
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Search focus: looks up the exact target area (region or province) by id
  // directly in the full prop lists, independent of what's currently
  // rendered, so it works even mid-transition to a newly-selected level.
  useEffect(() => {
    const map = mapRef.current;

    if (!map || !focusTarget) {
      return;
    }

    const sourceList = focusTarget.level === 'province' ? provinceAreas : regions;
    const target = (sourceList || []).find((area) => area.id === focusTarget.areaId);

    if (!target) {
      return;
    }

    map.fitBounds(boundsFromRings(getRings(target.geometry)), { padding: 32, duration: 320, maxZoom: 9.5 });
  }, [regions, provinceAreas, focusTarget?.areaId, focusTarget?.level, focusTarget?.token]);

  // Hover/click hit-testing runs off the map's own mouse events (rather than
  // per-shape DOM listeners) so the overlay never blocks native pan/zoom.
  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return undefined;
    }

    const hitAreas = activeAreas.map((area) => ({ area, rings: getRings(area.geometry) }));

    const findAreaAt = (lngLat) => {
      const point = [lngLat.lng, lngLat.lat];
      return hitAreas.find((entry) => isPointInRings(point, entry.rings))?.area;
    };

    const handleMouseMove = (event) => {
      const area = findAreaAt(event.lngLat);
      map.getCanvas().style.cursor = area ? 'pointer' : '';

      if (area) {
        onRegionHover({ tooltipId: area.id, regionId: area.regionId }, event.originalEvent);
      } else {
        onRegionHoverEnd();
      }
    };

    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = '';
      onRegionHoverEnd();
    };

    const handleClick = (event) => {
      const area = findAreaAt(event.lngLat);

      if (area) {
        onRegionClick(area.regionId);
      }
    };

    map.on('mousemove', handleMouseMove);
    map.on('mouseout', handleMouseLeave);
    map.on('click', handleClick);

    return () => {
      map.off('mousemove', handleMouseMove);
      map.off('mouseout', handleMouseLeave);
      map.off('click', handleClick);
    };
  }, [activeAreas, onRegionClick, onRegionHover, onRegionHoverEnd]);

  return (
    <section className="polaris-panel polaris-map-panel position-relative">
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">
        <div>
          <div className="polaris-panel-title mb-1">Interactive Map</div>
          <div className="small text-secondary">MapLibre GL view of regional political discussion, using real Philippine administrative boundaries.</div>
        </div>
      </div>

      <div className="polaris-map-shell">
        <div ref={mapContainerRef} className="polaris-map-canvas" aria-label="Philippine regional activity map" />
        <svg className="polaris-map-overlay" aria-hidden="true">
          {projectedRegionOutlines.map((region) => (
            <path key={`region-outline-${region.id}`} d={region.path} fill="none" stroke="#334155" strokeWidth={1.6} fillRule="evenodd" />
          ))}
          {projectedAreas.map((area) => (
            <AreaShape
              key={area.id}
              area={area}
              isSelected={area.regionId === selectedRegionId}
              isHovered={area.regionId === hoveredRegionId}
              isRegionLevel={activeAdminLevel === 'region'}
            />
          ))}
        </svg>
      </div>

      {tooltip ? <MapTooltip activeAreas={activeAreas} tooltip={tooltip} /> : null}
    </section>
  );
}

function AreaShape({ area, isSelected, isHovered, isRegionLevel }) {
  const visual = area.layerVisual || {};
  const palette = visual.colorKey ? mapPalette[visual.colorKey] : null;
  const shadeIndex = Number.isInteger(visual.shadeIndex) ? visual.shadeIndex : 2;
  const clampedIndex = palette ? Math.max(0, Math.min(palette.length - 1, shadeIndex)) : 0;
  const fillColor = palette ? palette[clampedIndex] : 'transparent';
  const strokeColor = palette ? palette[Math.min(palette.length - 1, clampedIndex + 1)] : '#cbd5e1';
  // Region borders read stronger than province borders (req: province vs
  // region boundary distinction), and the region layer's own borders double
  // as "the strong boundary" when that's the active level.
  const baseStrokeWidth = isRegionLevel ? 1.6 : 0.85;

  return (
    <path
      d={area.path}
      fill={visual.hasData ? fillColor : 'transparent'}
      stroke={strokeColor}
      strokeWidth={isSelected ? baseStrokeWidth + 1.25 : isHovered ? baseStrokeWidth + 0.75 : baseStrokeWidth}
      strokeDasharray={visual.hasData ? undefined : '3 3'}
      fillRule="evenodd"
    />
  );
}

// --- Geometry helpers -------------------------------------------------
// Geometry is standard GeoJSON (Polygon or MultiPolygon, [lon, lat] pairs)
// straight from the real boundary dataset — no custom coordinate
// convention or fabricated scaling.

function getRings(geometry) {
  if (!geometry) {
    return [];
  }

  if (geometry.type === 'Polygon') {
    return geometry.coordinates;
  }

  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.flat();
  }

  return [];
}

function ringsToPath(rings, map) {
  return rings
    .map((ring) => {
      const points = ring.map(([longitude, latitude]) => map.project([longitude, latitude]));

      if (points.length === 0) {
        return '';
      }

      const [first, ...rest] = points;
      return `M ${first.x} ${first.y} ${rest.map((point) => `L ${point.x} ${point.y}`).join(' ')} Z`;
    })
    .join(' ');
}

// Even-odd point-in-polygon across every ring (exterior + holes, and every
// part of a MultiPolygon): toggling per ring crossed is exactly evenodd
// fill semantics, so holes are handled correctly for free.
function isPointInRings(point, rings) {
  let inside = false;

  rings.forEach((ring) => {
    if (isPointInRing(point, ring)) {
      inside = !inside;
    }
  });

  return inside;
}

function isPointInRing(point, ring) {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function boundsFromRings(rings) {
  const points = rings.flat();
  const longitudes = points.map(([longitude]) => longitude);
  const latitudes = points.map(([, latitude]) => latitude);

  return [
    [Math.min(...longitudes), Math.min(...latitudes)],
    [Math.max(...longitudes), Math.max(...latitudes)],
  ];
}

function MapTooltip({ activeAreas, tooltip }) {
  const area = activeAreas.find((item) => item.id === tooltip.id);

  if (!area) {
    return null;
  }

  return (
    <div className="polaris-tooltip" style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}>
      <div className="fw-semibold text-dark">{area.name}</div>
      {area.regionFullName ? (
        <div className="small text-secondary">
          {area.region} — {area.regionFullName}
        </div>
      ) : null}
      {area.hasData ? (
        <>
          <div className="small text-secondary">{area.dominantParty.name}</div>
          <div className="small text-secondary mt-1">
            <div>Discussion share: {area.discussionShare}%</div>
            <div>Discussion volume: {area.discussionVolume.toLocaleString()}</div>
          </div>
        </>
      ) : (
        <div className="small text-secondary">No data for current filters</div>
      )}
    </div>
  );
}

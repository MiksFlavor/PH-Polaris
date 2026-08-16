import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { mapPalette } from '../data/polaris-data';

// Region/province/municipality boundaries are always available; barangay is
// real too but only for the currently-focused municipality (see
// VALIDATION.md and the loader in polaris-data.js — 42,010 barangays can't
// be bundled or rendered/hit-tested nationwide at once).
const RENDERABLE_LEVELS = ['region', 'province', 'municipality', 'barangay'];
const LEVEL_STROKE_WIDTH = { region: 1.6, province: 1, municipality: 0.6, barangay: 0.45 };
// Fraction of the current viewport width an area's bounding box must occupy
// before its label is shown, so zooming out doesn't produce a wall of text.
const LABEL_AREA_THRESHOLD = { region: 0, province: 0.032, municipality: 0.028, barangay: 0.02 };

const MIN_ZOOM_WIDTH = 0.15; // world units — roughly a barangay-scale view
const MAX_ZOOM_WIDTH_FACTOR = 1.6; // multiple of the whole-Philippines width

// --- Projection ---------------------------------------------------------
// A stable equirectangular projection with a single reference-latitude
// cosine correction (standard for a regional map spanning a modest
// latitude range like the Philippines, ~4.6°N-21°N) — real coordinates,
// legitimate projection formula, not a geometric approximation. Unlike a
// tile-based map's projection, this doesn't depend on the current camera,
// so every polygon's path is computed once and reused across pans/zooms.
const REFERENCE_LATITUDE = 12.8;
const LATITUDE_SCALE = Math.cos((REFERENCE_LATITUDE * Math.PI) / 180);

function projectPoint([longitude, latitude]) {
  return [longitude * LATITUDE_SCALE, -latitude];
}

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

function projectGeometry(geometry) {
  return getRings(geometry).map((ring) => ring.map(projectPoint));
}

function worldRingsToPath(worldRings) {
  return worldRings
    .map((ring) => {
      if (ring.length === 0) {
        return '';
      }
      const [first, ...rest] = ring;
      return `M ${first[0]} ${first[1]} ${rest.map((point) => `L ${point[0]} ${point[1]}`).join(' ')} Z`;
    })
    .join(' ');
}

function worldBoundsFromRings(worldRings) {
  const points = worldRings.flat();
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}

function boundsCenter(bounds) {
  return [(bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2];
}

// Fits a world bounding box into a viewBox matching the container's aspect
// ratio (equivalent to a map's fitBounds), so shapes never look squashed.
function fitBoundsToViewBox(bounds, containerAspect, paddingFraction) {
  const rawWidth = Math.max(bounds.maxX - bounds.minX, 1e-6) * (1 + paddingFraction * 2);
  const rawHeight = Math.max(bounds.maxY - bounds.minY, 1e-6) * (1 + paddingFraction * 2);
  const boundsAspect = rawWidth / rawHeight;

  let width = rawWidth;
  let height = rawHeight;
  if (boundsAspect > containerAspect) {
    height = rawWidth / containerAspect;
  } else {
    width = rawHeight * containerAspect;
  }

  const [cx, cy] = boundsCenter(bounds);
  return { x: cx - width / 2, y: cy - height / 2, width, height };
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

function isPointInRings(point, rings) {
  let inside = false;
  rings.forEach((ring) => {
    if (isPointInRing(point, ring)) {
      inside = !inside;
    }
  });
  return inside;
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function estimateLabelWidth(text, level) {
  const charWidth = level === 'region' ? 6.4 : level === 'barangay' ? 5.1 : 5.6;
  return text.length * charWidth + 8;
}

// Greedy label placement: larger-on-screen areas get priority, and a label
// is only kept if its estimated box doesn't overlap one already placed —
// this is what actually prevents the wall-of-text problem, not just the
// area-size threshold (which only decides which labels are *candidates*).
function layoutLabels(candidates, level) {
  const sorted = [...candidates].sort((a, b) => b.screenWidth - a.screenWidth);
  const kept = [];

  sorted.forEach((label) => {
    const width = estimateLabelWidth(label.name, level);
    const height = level === 'region' ? 14 : 12;
    const box = { left: label.x - width / 2, right: label.x + width / 2, top: label.y - height / 2, bottom: label.y + height / 2 };
    const overlaps = kept.some(
      (existing) => box.left < existing.box.right && box.right > existing.box.left && box.top < existing.box.bottom && box.bottom > existing.box.top,
    );
    if (!overlaps) {
      kept.push({ ...label, box });
    }
  });

  return kept;
}

export function PhilippinesMap({
  regions,
  provinceAreas,
  municityAreas,
  barangayAreas,
  barangayLoading,
  focusedMunicityId,
  selectedRegionId,
  hoveredRegionId,
  tooltip,
  focusTarget,
  adminLevelId,
  onRegionClick,
  onRegionHover,
  onRegionHoverEnd,
}) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const animationFrameRef = useRef(null);
  const dragStateRef = useRef(null);

  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [viewBox, setViewBox] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const activeAdminLevel = RENDERABLE_LEVELS.includes(adminLevelId) ? adminLevelId : 'region';
  const barangayNeedsMunicity = activeAdminLevel === 'barangay' && !focusedMunicityId;

  const activeAreas = useMemo(() => {
    if (activeAdminLevel === 'province') {
      return (provinceAreas || []).map((area) => ({ ...area, regionId: area.parentRegionId }));
    }
    if (activeAdminLevel === 'municipality') {
      return (municityAreas || []).map((area) => ({ ...area, regionId: area.parentRegionId }));
    }
    if (activeAdminLevel === 'barangay') {
      return (barangayAreas || []).map((area) => ({ ...area, regionId: area.parentRegionId }));
    }
    return regions.map((region) => ({ ...region, regionId: region.id }));
  }, [activeAdminLevel, regions, provinceAreas, municityAreas, barangayAreas]);

  // Geometry is projected once per feature set — not on every pan/zoom,
  // since the projection doesn't depend on the camera (see fitBoundsToViewBox
  // for the part that does).
  const projectedAreas = useMemo(() => {
    return activeAreas.map((area) => {
      const worldRings = projectGeometry(area.geometry);
      return { ...area, worldRings, path: worldRingsToPath(worldRings), bounds: worldBoundsFromRings(worldRings) };
    });
  }, [activeAreas]);

  const projectedRegionOutlines = useMemo(() => {
    if (activeAdminLevel === 'region') {
      return [];
    }
    return regions.map((region) => {
      const worldRings = projectGeometry(region.geometry);
      return { id: region.id, path: worldRingsToPath(worldRings) };
    });
  }, [regions, activeAdminLevel]);

  const philippinesBounds = useMemo(() => {
    const allRings = regions.flatMap((region) => projectGeometry(region.geometry));
    return worldBoundsFromRings(allRings);
  }, [regions]);

  const zoomLimits = useMemo(() => {
    const maxWidth = (philippinesBounds.maxX - philippinesBounds.minX) * MAX_ZOOM_WIDTH_FACTOR;
    return { minWidth: MIN_ZOOM_WIDTH, maxWidth };
  }, [philippinesBounds]);

  const containerAspect = containerSize.width / containerSize.height || 1.3;

  // Track container pixel size for aspect-correct fitting and for
  // screen<->world conversion (hit-testing, labels).
  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }
    const updateSize = () => {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    };
    updateSize();
    resizeObserverRef.current = new ResizeObserver(updateSize);
    resizeObserverRef.current.observe(containerRef.current);
    return () => {
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
    };
  }, []);

  // Initial camera: the whole Philippines, comfortably framed.
  useEffect(() => {
    if (viewBox) {
      return;
    }
    setViewBox(fitBoundsToViewBox(philippinesBounds, containerAspect, 0.06));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [philippinesBounds, containerSize.width, containerSize.height]);

  const animateTo = useCallback((targetViewBox) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setViewBox((current) => {
      const from = current || targetViewBox;
      const duration = 320;
      const start = performance.now();

      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = easeOutCubic(t);
        setViewBox({
          x: from.x + (targetViewBox.x - from.x) * eased,
          y: from.y + (targetViewBox.y - from.y) * eased,
          width: from.width + (targetViewBox.width - from.width) * eased,
          height: from.height + (targetViewBox.height - from.height) * eased,
        });
        if (t < 1) {
          animationFrameRef.current = requestAnimationFrame(tick);
        }
      };

      animationFrameRef.current = requestAnimationFrame(tick);
      return from;
    });
  }, []);

  // Search focus: looks up the exact target area (region/province/
  // municipality/barangay) by id directly in the full prop lists,
  // independent of what's currently rendered.
  useEffect(() => {
    if (!focusTarget || !viewBox) {
      return;
    }

    const sourceList = focusTarget.level === 'barangay'
      ? barangayAreas
      : focusTarget.level === 'municipality'
        ? municityAreas
        : focusTarget.level === 'province'
          ? provinceAreas
          : regions;
    const target = (sourceList || []).find((area) => area.id === focusTarget.areaId);

    if (!target) {
      return;
    }

    const worldRings = projectGeometry(target.geometry);
    const bounds = worldBoundsFromRings(worldRings);
    animateTo(fitBoundsToViewBox(bounds, containerAspect, 0.15));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regions, provinceAreas, municityAreas, barangayAreas, focusTarget?.areaId, focusTarget?.level, focusTarget?.token]);

  const clampViewBox = useCallback((candidate) => {
    const width = Math.min(zoomLimits.maxWidth, Math.max(zoomLimits.minWidth, candidate.width));
    const scale = width / candidate.width;
    const height = candidate.height * scale;
    return { x: candidate.x, y: candidate.y, width, height };
  }, [zoomLimits]);

  const screenToWorld = useCallback((clientX, clientY) => {
    const rect = containerRef.current.getBoundingClientRect();
    const relX = (clientX - rect.left) / rect.width;
    const relY = (clientY - rect.top) / rect.height;
    return [viewBox.x + relX * viewBox.width, viewBox.y + relY * viewBox.height];
  }, [viewBox]);

  const handleWheel = useCallback((event) => {
    if (!viewBox) {
      return;
    }
    event.preventDefault();
    const zoomFactor = event.deltaY > 0 ? 1.15 : 1 / 1.15;
    const [worldX, worldY] = screenToWorld(event.clientX, event.clientY);
    const newWidth = viewBox.width * zoomFactor;
    const newHeight = viewBox.height * zoomFactor;
    const ratioX = (worldX - viewBox.x) / viewBox.width;
    const ratioY = (worldY - viewBox.y) / viewBox.height;
    const next = clampViewBox({
      x: worldX - ratioX * newWidth,
      y: worldY - ratioY * newHeight,
      width: newWidth,
      height: newHeight,
    });
    setViewBox(next);
  }, [viewBox, screenToWorld, clampViewBox]);

  const zoomByFactor = useCallback((factor) => {
    setViewBox((current) => {
      if (!current) {
        return current;
      }
      const [cx, cy] = boundsCenter({ minX: current.x, minY: current.y, maxX: current.x + current.width, maxY: current.y + current.height });
      const newWidth = current.width * factor;
      const newHeight = current.height * factor;
      return clampViewBox({ x: cx - newWidth / 2, y: cy - newHeight / 2, width: newWidth, height: newHeight });
    });
  }, [clampViewBox]);

  // Hit-testing (hover/click) against the currently active areas' projected
  // rings, using the same screen<->world conversion as panning/zooming.
  const findAreaAt = useCallback((clientX, clientY) => {
    if (!viewBox) {
      return null;
    }
    const point = screenToWorld(clientX, clientY);
    return projectedAreas.find((area) => isPointInRings(point, area.worldRings)) || null;
  }, [viewBox, screenToWorld, projectedAreas]);

  const handleMouseDown = useCallback((event) => {
    dragStateRef.current = { startX: event.clientX, startY: event.clientY, startViewBox: viewBox, moved: false };
    setIsDragging(true);
  }, [viewBox]);

  useEffect(() => {
    if (!isDragging) {
      return undefined;
    }

    const handleMove = (event) => {
      const drag = dragStateRef.current;
      if (!drag || !drag.startViewBox) {
        return;
      }
      const rect = containerRef.current.getBoundingClientRect();
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        drag.moved = true;
      }
      const worldDx = -(dx / rect.width) * drag.startViewBox.width;
      const worldDy = -(dy / rect.height) * drag.startViewBox.height;
      setViewBox({ ...drag.startViewBox, x: drag.startViewBox.x + worldDx, y: drag.startViewBox.y + worldDy });
    };

    const handleUp = (event) => {
      const drag = dragStateRef.current;
      setIsDragging(false);
      if (drag && !drag.moved) {
        const area = findAreaAt(event.clientX, event.clientY);
        if (area) {
          onRegionClick(area.regionId, { level: activeAdminLevel, id: area.id });
        }
      }
      dragStateRef.current = null;
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging, findAreaAt, onRegionClick, activeAdminLevel]);

  const handleMouseMove = useCallback((event) => {
    if (isDragging) {
      return;
    }
    const area = findAreaAt(event.clientX, event.clientY);
    if (area) {
      onRegionHover({ tooltipId: area.id, regionId: area.regionId }, event);
    } else {
      onRegionHoverEnd();
    }
  }, [isDragging, findAreaAt, onRegionHover, onRegionHoverEnd]);

  const handleMouseLeave = useCallback(() => {
    onRegionHoverEnd();
  }, [onRegionHoverEnd]);

  // Zoom-adaptive labels: computed in screen space so text stays a
  // constant pixel size regardless of current zoom, and gated by how much
  // screen real estate an area actually occupies so zooming out doesn't
  // produce a wall of text (region labels are always shown — there are
  // only 17 of them).
  const labels = useMemo(() => {
    if (!viewBox) {
      return [];
    }
    const threshold = LABEL_AREA_THRESHOLD[activeAdminLevel] ?? 0.03;

    const candidates = projectedAreas
      .filter((area) => {
        if (activeAdminLevel === 'region') {
          return true;
        }
        const widthFraction = (area.bounds.maxX - area.bounds.minX) / viewBox.width;
        return widthFraction >= threshold;
      })
      .map((area) => {
        const [cx, cy] = boundsCenter(area.bounds);
        const x = ((cx - viewBox.x) / viewBox.width) * containerSize.width;
        const y = ((cy - viewBox.y) / viewBox.height) * containerSize.height;
        const screenWidth = ((area.bounds.maxX - area.bounds.minX) / viewBox.width) * containerSize.width;
        return { id: area.id, name: area.name, x, y, screenWidth };
      })
      .filter((label) => label.x >= 0 && label.x <= containerSize.width && label.y >= 0 && label.y <= containerSize.height);

    return layoutLabels(candidates, activeAdminLevel);
  }, [projectedAreas, viewBox, activeAdminLevel, containerSize]);

  const viewBoxAttr = viewBox ? `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}` : '0 0 1 1';

  return (
    <section className="polaris-panel polaris-map-panel position-relative">
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">
        <div>
          <div className="polaris-panel-title mb-1">Interactive Map</div>
          <div className="small text-secondary">Custom SVG map built directly from real PSGC/PSA-NAMRIA geographic data — no external map tiles.</div>
        </div>
      </div>

      <div ref={containerRef} className="polaris-map-shell polaris-map-canvas">
        <svg
          ref={svgRef}
          className={`polaris-map-svg${isDragging ? ' polaris-map-svg-dragging' : ''}`}
          viewBox={viewBoxAttr}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {projectedRegionOutlines.map((region) => (
            <path key={`region-outline-${region.id}`} d={region.path} fill="none" stroke="#334155" strokeWidth={1.6} vectorEffect="non-scaling-stroke" fillRule="evenodd" />
          ))}
          {projectedAreas.map((area) => (
            <AreaShape
              key={area.id}
              area={area}
              isSelected={area.regionId === selectedRegionId}
              isHovered={area.regionId === hoveredRegionId}
              adminLevel={activeAdminLevel}
            />
          ))}
        </svg>

        <div className="polaris-map-labels" aria-hidden="true">
          {labels.map((label) => (
            <span key={label.id} className={`polaris-map-label polaris-map-label-${activeAdminLevel}`} style={{ left: label.x, top: label.y }}>
              {label.name}
            </span>
          ))}
        </div>

        <div className="polaris-map-zoom-controls">
          <button type="button" onClick={() => zoomByFactor(1 / 1.4)} aria-label="Zoom in">
            +
          </button>
          <button type="button" onClick={() => zoomByFactor(1.4)} aria-label="Zoom out">
            −
          </button>
        </div>

        {barangayNeedsMunicity ? (
          <div className="polaris-map-prompt">Search or click a municipality/city first to load its real barangay boundaries.</div>
        ) : null}
        {activeAdminLevel === 'barangay' && barangayLoading ? <div className="polaris-map-prompt">Loading barangay boundaries…</div> : null}
      </div>

      {tooltip ? <MapTooltip activeAreas={activeAreas} tooltip={tooltip} /> : null}
    </section>
  );
}

function AreaShape({ area, isSelected, isHovered, adminLevel }) {
  const visual = area.layerVisual || {};
  const palette = visual.colorKey ? mapPalette[visual.colorKey] : null;
  const shadeIndex = Number.isInteger(visual.shadeIndex) ? visual.shadeIndex : 2;
  const clampedIndex = palette ? Math.max(0, Math.min(palette.length - 1, shadeIndex)) : 0;
  const fillColor = palette ? palette[clampedIndex] : 'transparent';
  const strokeColor = palette ? palette[Math.min(palette.length - 1, clampedIndex + 1)] : '#cbd5e1';
  const baseStrokeWidth = LEVEL_STROKE_WIDTH[adminLevel] ?? 1;

  return (
    <path
      d={area.path}
      fill={visual.hasData ? fillColor : 'transparent'}
      stroke={strokeColor}
      strokeWidth={isSelected ? baseStrokeWidth + 1.25 : isHovered ? baseStrokeWidth + 0.75 : baseStrokeWidth}
      strokeDasharray={visual.hasData ? undefined : '3 3'}
      vectorEffect="non-scaling-stroke"
      fillRule="evenodd"
    />
  );
}

function MapTooltip({ activeAreas, tooltip }) {
  const area = activeAreas.find((item) => item.id === tooltip.id);

  if (!area) {
    return null;
  }

  const subtitle = area.regionFullName
    ? `${area.region} — ${area.regionFullName}`
    : area.municityName
      ? `${area.municityName}, ${area.provinceName}`
      : area.provinceName
        ? `${area.provinceName}${area.region ? `, ${area.region}` : ''}`
        : null;

  return (
    <div className="polaris-tooltip" style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}>
      <div className="fw-semibold text-dark">{area.name}</div>
      {subtitle ? <div className="small text-secondary">{subtitle}</div> : null}
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

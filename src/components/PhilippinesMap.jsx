import { useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import { mapPalette } from '../data/polaris-data';
import { getAdminLevelOrder, loadAdministrativeDatasets } from '../map/geo/loadAdministrativeDatasets';
import { createMonochromeBasemapStyle } from '../map/maplibreStyle';

const baseCenter = [123.2, 12.1];

export function PhilippinesMap({ regions, provinceAreas, selectedRegionId, hoveredRegionId, tooltip, focusTarget, adminLevelId, onRegionClick, onRegionHover, onRegionHoverEnd }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const datasetsRef = useRef(null);
  const hoverStateRef = useRef(null);
  const selectedStateRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const [datasets, setDatasets] = useState(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  const activeAdminLevel = useMemo(() => {
    return getAdminLevelOrder().includes(adminLevelId) ? adminLevelId : 'region';
  }, [adminLevelId]);

  const sourceIdByLevel = useMemo(() => {
    return getAdminLevelOrder().reduce((accumulator, level) => {
      accumulator[level] = `polaris-boundary-${level}`;
      return accumulator;
    }, {});
  }, []);

  const fillLayerIdByLevel = useMemo(() => {
    return getAdminLevelOrder().reduce((accumulator, level) => {
      accumulator[level] = `polaris-boundary-fill-${level}`;
      return accumulator;
    }, {});
  }, []);

  const lineLayerIdByLevel = useMemo(() => {
    return getAdminLevelOrder().reduce((accumulator, level) => {
      accumulator[level] = `polaris-boundary-line-${level}`;
      return accumulator;
    }, {});
  }, []);

  useEffect(() => {
    let isActive = true;

    loadAdministrativeDatasets({ regionAreas: regions, provinceAreas }).then((featureCollections) => {
      if (!isActive) {
        return;
      }

      datasetsRef.current = featureCollections;
      setDatasets(featureCollections);
    });

    return () => {
      isActive = false;
    };
  }, [regions, provinceAreas]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return undefined;
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: createMonochromeBasemapStyle(),
      center: baseCenter,
      zoom: 5.2,
      minZoom: 4.5,
      maxZoom: 9.5,
      pitch: 0,
      bearing: 0,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    const syncMapSize = () => map.resize();

    resizeObserverRef.current = new ResizeObserver(syncMapSize);
    resizeObserverRef.current.observe(mapContainerRef.current);

    // Persistent flag rather than a one-shot `.once('load', ...)` callback:
    // if datasets resolve after 'load' has already fired, a fresh `.once`
    // listener registered post-hoc would never run and boundary layers
    // would silently never be added.
    map.on('load', () => {
      map.resize();
      setIsMapLoaded(true);
    });

    mapRef.current = map;

    return () => {
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !datasets || !isMapLoaded) {
      return;
    }

    syncBoundarySources(map, datasets, sourceIdByLevel, fillLayerIdByLevel, lineLayerIdByLevel, activeAdminLevel);
    syncBoundaryInteractions(map, regions, sourceIdByLevel, fillLayerIdByLevel, onRegionClick, onRegionHover, onRegionHoverEnd);
    syncFeatureStates(map, sourceIdByLevel, selectedRegionId, hoveredRegionId, hoverStateRef, selectedStateRef);
  }, [activeAdminLevel, datasets, isMapLoaded, fillLayerIdByLevel, hoveredRegionId, lineLayerIdByLevel, onRegionClick, onRegionHover, onRegionHoverEnd, regions, selectedRegionId, sourceIdByLevel]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !datasets) {
      return;
    }

    const matchingFeatures = (datasets[activeAdminLevel]?.features || []).filter(
      (feature) => feature.properties.regionId === focusTarget?.regionId,
    );

    if (matchingFeatures.length === 0) {
      return;
    }

    map.fitBounds(getFeaturesBounds(matchingFeatures), {
      padding: 28,
      duration: 260,
      maxZoom: 8.5,
    });
  }, [activeAdminLevel, datasets, focusTarget?.regionId, focusTarget?.token]);

  return (
    <section className="polaris-panel polaris-map-panel position-relative">
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">
        <div>
          <div className="polaris-panel-title mb-1">Interactive Map</div>
          <div className="small text-secondary">MapLibre GL view of regional political discussion and historical context.</div>
        </div>
      </div>

      <div className="polaris-map-shell">
        <div ref={mapContainerRef} className="polaris-map-canvas" aria-label="Philippine regional activity map" />
      </div>

      {tooltip ? <MapTooltip regions={regions} tooltip={tooltip} /> : null}
    </section>
  );
}

function syncBoundarySources(map, datasets, sourceIdByLevel, fillLayerIdByLevel, lineLayerIdByLevel, activeAdminLevel) {
  if (!datasets) {
    return;
  }

  getAdminLevelOrder().forEach((level) => {
    const sourceId = sourceIdByLevel[level];
    const fillLayerId = fillLayerIdByLevel[level];
    const lineLayerId = lineLayerIdByLevel[level];
    const isVisible = level === activeAdminLevel;

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: datasets[level],
        generateId: false,
      });
    } else {
      map.getSource(sourceId).setData(datasets[level]);
    }

    if (!map.getLayer(fillLayerId)) {
      map.addLayer({
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        layout: { visibility: isVisible ? 'visible' : 'none' },
        paint: {
          'fill-color': ['get', 'fillColor'],
          'fill-opacity': ['case', ['boolean', ['get', 'hasData'], false], 1, 0],
          'fill-outline-color': ['get', 'strokeColor'],
        },
      });
    } else {
      map.setLayoutProperty(fillLayerId, 'visibility', isVisible ? 'visible' : 'none');
    }

    if (!map.getLayer(lineLayerId)) {
      map.addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        layout: { visibility: isVisible ? 'visible' : 'none' },
        paint: {
          'line-color': ['coalesce', ['get', 'strokeColor'], '#94a3b8'],
          'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 2.5, ['boolean', ['feature-state', 'hover'], false], 2, 1],
        },
      });
    } else {
      map.setLayoutProperty(lineLayerId, 'visibility', isVisible ? 'visible' : 'none');
    }
  });
}

function syncBoundaryInteractions(map, regions, sourceIdByLevel, fillLayerIdByLevel, onRegionClick, onRegionHover, onRegionHoverEnd) {
  const regionById = new Map(regions.map((region) => [region.id, region]));

  getAdminLevelOrder().forEach((level) => {
    const fillLayerId = fillLayerIdByLevel[level];

    if (map.__polarisBoundaryHandlers?.[fillLayerId]) {
      return;
    }

    const handleMove = (event) => {
      const feature = event.features?.[0];
      const regionId = feature?.properties?.regionId;

      if (!feature || !regionId) {
        return;
      }

      const region = regionById.get(regionId);
      if (!region) {
        return;
      }

      onRegionHover(regionId, event.originalEvent || event);
    };

    const handleLeave = () => {
      onRegionHoverEnd();
    };

    const handleClick = (event) => {
      const feature = event.features?.[0];
      const regionId = feature?.properties?.regionId;

      if (!feature || !regionId) {
        return;
      }

      onRegionClick(regionId);
    };

    map.on('mousemove', fillLayerId, handleMove);
    map.on('mouseleave', fillLayerId, handleLeave);
    map.on('click', fillLayerId, handleClick);

    map.__polarisBoundaryHandlers = {
      ...(map.__polarisBoundaryHandlers || {}),
      [fillLayerId]: true,
    };
  });

  if (map.__polarisBoundaryCleanupAttached) {
    return;
  }

  map.on('remove', () => {
    map.__polarisBoundaryHandlers = {};
    map.__polarisBoundaryCleanupAttached = false;
  });

  map.__polarisBoundaryCleanupAttached = true;
}

function syncFeatureStates(map, sourceIdByLevel, selectedRegionId, hoveredRegionId, hoverStateRef, selectedStateRef) {
  const previousHover = hoverStateRef.current;
  const previousSelected = selectedStateRef.current;

  if (previousHover && previousHover.regionId !== hoveredRegionId) {
    setStateAcrossSources(map, sourceIdByLevel, previousHover.regionId, { hover: false });
  }

  if (previousSelected && previousSelected.regionId !== selectedRegionId) {
    setStateAcrossSources(map, sourceIdByLevel, previousSelected.regionId, { selected: false });
  }

  if (hoveredRegionId && previousHover?.regionId !== hoveredRegionId) {
    setStateAcrossSources(map, sourceIdByLevel, hoveredRegionId, { hover: true });
    hoverStateRef.current = { regionId: hoveredRegionId };
  } else if (!hoveredRegionId) {
    hoverStateRef.current = null;
  }

  if (selectedRegionId && previousSelected?.regionId !== selectedRegionId) {
    setStateAcrossSources(map, sourceIdByLevel, selectedRegionId, { selected: true });
    selectedStateRef.current = { regionId: selectedRegionId };
  }
}

function setStateAcrossSources(map, sourceIdByLevel, regionId, state) {
  getAdminLevelOrder().forEach((level) => {
    const sourceId = sourceIdByLevel[level];

    try {
      map.setFeatureState({ source: sourceId, id: regionId }, state);
    } catch {
      // Ignore feature-state updates before a source has finished loading.
    }
  });
}

function getFeatureBounds(feature) {
  const coordinates = feature.geometry.coordinates.flat();
  const longitudes = coordinates.map(([longitude]) => longitude);
  const latitudes = coordinates.map(([, latitude]) => latitude);
  const minLongitude = Math.min(...longitudes);
  const minLatitude = Math.min(...latitudes);
  const maxLongitude = Math.max(...longitudes);
  const maxLatitude = Math.max(...latitudes);

  return [
    [minLongitude, minLatitude],
    [maxLongitude, maxLatitude],
  ];
}

function getFeaturesBounds(features) {
  const boundsList = features.map(getFeatureBounds);
  const minLongitude = Math.min(...boundsList.map((bounds) => bounds[0][0]));
  const minLatitude = Math.min(...boundsList.map((bounds) => bounds[0][1]));
  const maxLongitude = Math.max(...boundsList.map((bounds) => bounds[1][0]));
  const maxLatitude = Math.max(...boundsList.map((bounds) => bounds[1][1]));

  return [
    [minLongitude, minLatitude],
    [maxLongitude, maxLatitude],
  ];
}

function MapTooltip({ regions, tooltip }) {
  const region = regions.find((item) => item.id === tooltip.id);

  if (!region) {
    return null;
  }

  return (
    <div className="polaris-tooltip" style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}>
      <div className="fw-semibold text-dark">{region.region}</div>
      {region.hasData ? (
        <>
          <div className="small text-secondary">{region.dominantParty.name}</div>
          <div className="small text-secondary mt-1">
            <div>Discussion share: {region.discussionShare}%</div>
            <div>Discussion volume: {region.discussionVolume.toLocaleString()}</div>
          </div>
        </>
      ) : (
        <div className="small text-secondary">No data for current filters</div>
      )}
    </div>
  );
}
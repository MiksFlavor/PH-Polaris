import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { mapPalette } from '../data/polaris-data';

const mapBounds = [
  [4.640292, 116.927573],
  [20.834769, 126.606549],
];

export function PhilippinesMap({ regions, selectedRegionId, hoveredRegionId, tooltip, focusTarget, onRegionClick, onRegionHover, onRegionHoverEnd }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const layerByRegionIdRef = useRef(new Map());
  const geoJsonLayerRef = useRef(null);

  const featureCollection = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: regions.map((region) => ({
        type: 'Feature',
        properties: {
          id: region.id,
          label: region.region,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [region.geometry.map(([latitude, longitude]) => [longitude, latitude])],
        },
      })),
    };
  }, [regions]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return undefined;
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: true,
      preferCanvas: true,
      maxZoom: 8,
      minZoom: 5,
      zoomSnap: 0.5,
    });

    map.fitBounds(mapBounds, { padding: [20, 20] });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const geoJsonLayer = L.geoJSON(featureCollection, {
      style: (feature) => buildRegionStyle(feature?.properties?.id, regions, selectedRegionId, hoveredRegionId),
      onEachFeature: (feature, layer) => {
        const regionId = feature.properties.id;
        layerByRegionIdRef.current.set(regionId, layer);

        layer.on({
          mouseover: (event) => {
            onRegionHover(regionId, event.originalEvent || event);
            layer.setStyle({ weight: 3, color: '#0f172a' });
            layer.bringToFront();
          },
          mouseout: () => {
            onRegionHoverEnd();
          },
          click: () => {
            onRegionClick(regionId);
          },
        });
      },
    }).addTo(map);

    geoJsonLayerRef.current = geoJsonLayer;
    mapRef.current = map;

    return () => {
      geoJsonLayerRef.current = null;
      layerByRegionIdRef.current = new Map();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const geoJsonLayer = geoJsonLayerRef.current;

    if (!map || !geoJsonLayer) {
      return;
    }

    geoJsonLayer.setStyle((feature) => buildRegionStyle(feature?.properties?.id, regions, selectedRegionId, hoveredRegionId));

    layerByRegionIdRef.current.forEach((layer, regionId) => {
      if (regionId === selectedRegionId || regionId === hoveredRegionId) {
        layer.bringToFront();
      }
    });
  }, [hoveredRegionId, regions, selectedRegionId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusTarget?.regionId) {
      return;
    }

    const layer = layerByRegionIdRef.current.get(focusTarget.regionId);
    if (!layer) {
      return;
    }

    map.fitBounds(layer.getBounds(), { padding: [26, 26], animate: true, duration: 0.25, maxZoom: 8 });
  }, [focusTarget?.regionId, focusTarget?.token]);

  return (
    <section className="polaris-panel polaris-map-panel position-relative">
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">
        <div>
          <div className="polaris-panel-title mb-1">Interactive Map</div>
          <div className="small text-secondary">Leaflet view of regional political discussion and historical context.</div>
        </div>
      </div>

      <div className="polaris-map-shell">
        <div ref={mapContainerRef} className="polaris-map-canvas" aria-label="Philippine regional activity map" />
      </div>

      {tooltip ? <MapTooltip regions={regions} tooltip={tooltip} /> : null}
    </section>
  );
}

function buildRegionStyle(regionId, regions, selectedRegionId, hoveredRegionId) {
  const region = regions.find((entry) => entry.id === regionId);

  if (!region) {
    return {
      fillColor: '#e2e8f0',
      color: '#cbd5e1',
      weight: 1,
      opacity: 1,
      fillOpacity: 1,
      className: 'polaris-region-shape',
    };
  }

  const palette = mapPalette[region.layerVisual.colorKey] || mapPalette.slate;
  const fillColor = palette[region.layerVisual.shadeIndex] || palette[2];

  return {
    fillColor,
    color: region.id === selectedRegionId ? '#0f172a' : region.id === hoveredRegionId ? '#334155' : '#cbd5e1',
    weight: region.id === selectedRegionId ? 2.5 : region.id === hoveredRegionId ? 2 : 1,
    opacity: 1,
    fillOpacity: 1,
    className: 'polaris-region-shape',
  };
}

function MapTooltip({ regions, tooltip }) {
  const region = regions.find((item) => item.id === tooltip.id);

  if (!region) {
    return null;
  }

  return (
    <div className="polaris-tooltip" style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}>
      <div className="fw-semibold text-dark">{region.region}</div>
      <div className="small text-secondary">{region.dominantPolitician.name}</div>
      <div className="small text-secondary mt-1">
        <div>Discussion share: {region.discussionShare}%</div>
        <div>Discussion volume: {region.discussionVolume.toLocaleString()}</div>
      </div>
    </div>
  );
}
import { mapPalette } from '../../data/polaris-data';

const ADMIN_LEVELS = ['region', 'province', 'municipality', 'barangay'];
const LEVEL_SCALE = {
  region: 1,
  province: 0.94,
  municipality: 0.9,
  barangay: 0.86,
};

const closeRing = (ring) => {
  if (ring.length === 0) {
    return ring;
  }

  const [firstLongitude, firstLatitude] = ring[0];
  const [lastLongitude, lastLatitude] = ring[ring.length - 1];

  if (firstLongitude === lastLongitude && firstLatitude === lastLatitude) {
    return ring;
  }

  return [...ring, ring[0]];
};

const scaleGeometry = (coordinates, scale) => {
  const latitudes = coordinates.map(([latitude]) => latitude);
  const longitudes = coordinates.map(([, longitude]) => longitude);
  const latitudeCenter = (Math.min(...latitudes) + Math.max(...latitudes)) / 2;
  const longitudeCenter = (Math.min(...longitudes) + Math.max(...longitudes)) / 2;

  return closeRing(
    coordinates.map(([latitude, longitude]) => [
      longitudeCenter + (longitude - longitudeCenter) * scale,
      latitudeCenter + (latitude - latitudeCenter) * scale,
    ]),
  );
};

// fillColor/strokeColor are only meaningful when the area has data; when it
// doesn't, fill-opacity is driven to 0 by the `hasData` property so the
// plain neutral basemap shows through instead of a fabricated color.
const resolveFeatureColors = (area) => {
  const visual = area.layerVisual || {};
  const palette = visual.colorKey ? mapPalette[visual.colorKey] : null;

  if (!palette) {
    return { fillColor: '#94a3b8', strokeColor: '#cbd5e1' };
  }

  const shadeIndex = Number.isInteger(visual.shadeIndex) ? visual.shadeIndex : 2;
  const clampedIndex = Math.max(0, Math.min(palette.length - 1, shadeIndex));

  return {
    fillColor: palette[clampedIndex],
    strokeColor: palette[Math.min(palette.length - 1, clampedIndex + 1)],
  };
};

const createFeature = (area, level, regionIdOverride) => {
  const scale = LEVEL_SCALE[level] ?? 1;
  const { fillColor, strokeColor } = resolveFeatureColors(area);
  const hasData = Boolean(area.layerVisual?.hasData);

  return {
    type: 'Feature',
    id: area.id,
    properties: {
      id: area.id,
      regionId: regionIdOverride || area.id,
      adminLevel: level,
      regionLabel: area.region,
      label: `${area.name} ${level === 'region' ? '' : `${level.charAt(0).toUpperCase()}${level.slice(1)}`}`.trim(),
      hasData,
      fillColor,
      strokeColor,
    },
    geometry: {
      type: 'Polygon',
      coordinates: [scaleGeometry(area.geometry, scale)],
    },
  };
};

export async function loadAdministrativeDatasets({ regionAreas, provinceAreas }) {
  const featureCollections = {
    region: {
      type: 'FeatureCollection',
      features: regionAreas.map((area) => createFeature(area, 'region')),
    },
    province: {
      type: 'FeatureCollection',
      features: (provinceAreas || []).map((area) => createFeature(area, 'province', area.parentRegionId)),
    },
    // Real municipality/barangay boundaries aren't part of this mock
    // dataset; they display the same region-level aggregate rather than
    // fabricating sub-region detail that doesn't exist.
    municipality: {
      type: 'FeatureCollection',
      features: regionAreas.map((area) => createFeature(area, 'municipality')),
    },
    barangay: {
      type: 'FeatureCollection',
      features: regionAreas.map((area) => createFeature(area, 'barangay')),
    },
  };

  return Promise.resolve(featureCollections);
}

export function getAdminLevelOrder() {
  return ADMIN_LEVELS;
}

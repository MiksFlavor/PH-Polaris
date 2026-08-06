import { mapPalette } from '../../data/polaris-data';

const ADMIN_LEVELS = ['region', 'province', 'municipality', 'barangay'];
const LEVEL_SCALE = {
  region: 1,
  province: 0.96,
  municipality: 0.92,
  barangay: 0.88,
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

const resolveFeatureColors = (region) => {
  const palette = mapPalette[region.layerVisual?.colorKey] || mapPalette.slate;
  const shadeIndex = Number.isInteger(region.layerVisual?.shadeIndex) ? region.layerVisual.shadeIndex : 2;
  const fillColor = palette[Math.max(0, Math.min(palette.length - 1, shadeIndex))] || palette[2];
  const strokeColor = palette[Math.max(0, Math.min(palette.length - 1, shadeIndex + 1))] || palette[3];

  return { fillColor, strokeColor };
};

const createFeature = (region, level) => {
  const scale = LEVEL_SCALE[level] ?? 1;
  const { fillColor, strokeColor } = resolveFeatureColors(region);

  return {
    type: 'Feature',
    id: region.id,
    properties: {
      id: region.id,
      regionId: region.id,
      adminLevel: level,
      regionLabel: region.region,
      label: `${region.name} ${level === 'region' ? '' : `${level.charAt(0).toUpperCase()}${level.slice(1)}`}`.trim(),
      fillColor,
      strokeColor,
    },
    geometry: {
      type: 'Polygon',
      coordinates: [scaleGeometry(region.geometry, scale)],
    },
  };
};

export async function loadAdministrativeDatasets(regions) {
  const featureCollections = ADMIN_LEVELS.reduce((accumulator, level) => {
    accumulator[level] = {
      type: 'FeatureCollection',
      features: regions.map((region) => createFeature(region, level)),
    };

    return accumulator;
  }, {});

  return Promise.resolve(featureCollections);
}

export function getAdminLevelOrder() {
  return ADMIN_LEVELS;
}

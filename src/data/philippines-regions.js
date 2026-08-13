import regionsGeoJSON from './geojson/regions.json';
import provincesGeoJSON from './geojson/provinces.json';
import municitiesGeoJSON from './geojson/municities.json';
import psgcIndexRaw from './psgc-index.json';

export const REGION_FEATURES = regionsGeoJSON.features;
export const PROVINCE_FEATURES = provincesGeoJSON.features;
export const MUNICITY_FEATURES = municitiesGeoJSON.features;

// Full PSGC master directory (region/province/city-municipality/barangay,
// 43,766 real records) — the naming/hierarchy authority. Independent of
// which levels have real boundary geometry; see VALIDATION.md for exactly
// what's covered by geometry vs name-only.
export const PSGC_REGIONS = psgcIndexRaw.regions.map(([code, name]) => ({ code, name }));
export const PSGC_PROVINCES = psgcIndexRaw.provinces.map(([code, name, regionCode]) => ({ code, name, regionCode }));
export const PSGC_MUNICITIES = psgcIndexRaw.municities.map(([code, name, provinceCode, regionCode, level]) => ({
  code,
  name,
  provinceCode,
  regionCode,
  level,
}));
export const PSGC_BARANGAYS = psgcIndexRaw.barangays.map(([code, name, municityCode]) => ({ code, name, municityCode }));

const MUNICITY_GEOMETRY_CODES = new Set(MUNICITY_FEATURES.map((feature) => feature.properties.municityCode));
const PROVINCE_GEOMETRY_CODES = new Set(PROVINCE_FEATURES.map((feature) => feature.properties.provinceCode));

export function hasMunicityGeometry(municityCode) {
  return MUNICITY_GEOMETRY_CODES.has(municityCode);
}

export function hasProvinceGeometry(provinceCode) {
  return PROVINCE_GEOMETRY_CODES.has(provinceCode);
}

// The source PSGC region names combine a short administrative label and a
// descriptive name in one string ("Region I (Ilocos Region)", but also
// "National Capital Region (NCR)" the other way around), so a plain regex
// split can't tell which side is the short label. These are the real
// official short labels/names for all 17 PSGC regions, just split out.
const REGION_SHORT_LABELS = {
  '0100000000': 'Region I',
  '0200000000': 'Region II',
  '0300000000': 'Region III',
  '0400000000': 'Region IV-A',
  '0500000000': 'Region V',
  '0600000000': 'Region VI',
  '0700000000': 'Region VII',
  '0800000000': 'Region VIII',
  '0900000000': 'Region IX',
  1000000000: 'Region X',
  1100000000: 'Region XI',
  1200000000: 'Region XII',
  1300000000: 'NCR',
  1400000000: 'CAR',
  1600000000: 'Region XIII',
  1700000000: 'MIMAROPA',
  1900000000: 'BARMM',
};

const REGION_DISPLAY_NAMES = {
  '0100000000': 'Ilocos Region',
  '0200000000': 'Cagayan Valley',
  '0300000000': 'Central Luzon',
  '0400000000': 'CALABARZON',
  '0500000000': 'Bicol Region',
  '0600000000': 'Western Visayas',
  '0700000000': 'Central Visayas',
  '0800000000': 'Eastern Visayas',
  '0900000000': 'Zamboanga Peninsula',
  1000000000: 'Northern Mindanao',
  1100000000: 'Davao Region',
  1200000000: 'SOCCSKSARGEN',
  1300000000: 'National Capital Region',
  1400000000: 'Cordillera Administrative Region',
  1600000000: 'Caraga',
  1700000000: 'MIMAROPA Region',
  1900000000: 'Bangsamoro Autonomous Region in Muslim Mindanao',
};

// Fallback for any region not in the table above (shouldn't happen with the
// current 17-region PSGC dataset, but keeps this from ever throwing).
const FALLBACK_PATTERN = /^(.*?)\s*\(([^)]+)\)\s*$/;

export function splitRegionLabel(regionCode, regionName) {
  if (REGION_SHORT_LABELS[regionCode]) {
    return { shortLabel: REGION_SHORT_LABELS[regionCode], displayName: REGION_DISPLAY_NAMES[regionCode] || regionName };
  }

  const match = regionName.match(FALLBACK_PATTERN);

  if (match) {
    return { shortLabel: match[1].trim(), displayName: match[2].trim() };
  }

  return { shortLabel: regionName, displayName: regionName };
}

export const REGION_SHORT_LABEL_BY_CODE = Object.fromEntries(
  REGION_FEATURES.map((feature) => {
    const { regionCode, regionName } = feature.properties;
    return [regionCode, splitRegionLabel(regionCode, regionName).shortLabel];
  }),
);

// Metadata-only view (id/short label/name/province names), kept for the
// search index. Geometry always comes from REGION_FEATURES/PROVINCE_FEATURES
// directly, never from this list.
export const PHILIPPINE_REGIONS = REGION_FEATURES.map((feature) => {
  const { regionCode, regionName } = feature.properties;
  const { shortLabel, displayName } = splitRegionLabel(regionCode, regionName);
  const provinces = PROVINCE_FEATURES.filter((province) => province.properties.regionCode === regionCode).map(
    (province) => province.properties.provinceName,
  );

  return { id: regionCode, region: shortLabel, name: displayName, provinces };
});

export const PHILIPPINE_REGION_LOOKUP = Object.fromEntries(PHILIPPINE_REGIONS.map((region) => [region.id, region]));

import { mockPoliticalEntities, mockRegions, mockTimeRanges } from './mockData';
import { PHILIPPINE_REGIONS } from './philippines-regions';

export { mockPoliticalEntities, mockRegions, mockTimeRanges };

export const layerOptions = [
  { id: 'party-activity', label: 'Political Party Activity', mode: 'party' },
  { id: 'discussion-volume', label: 'Discussion Volume', mode: 'volume' },
];

export const politicalPartyOptions = [
  { id: 'lakas-cmd', name: 'Lakas-CMD', colorKey: 'amber' },
  { id: 'np', name: 'Nacionalista Party', colorKey: 'stone' },
  { id: 'lp', name: 'Liberal Party', colorKey: 'rose' },
  { id: 'npc', name: 'Nationalist People\'s Coalition', colorKey: 'olive' },
  { id: 'independent', name: 'Independent Bloc', colorKey: 'slate' },
];

export const sourceOptions = [
  { id: 'all', name: 'All Sources' },
  { id: 'social', name: 'Social Platforms' },
  { id: 'news', name: 'News Sites' },
  { id: 'forum', name: 'Public Forums' },
  { id: 'press', name: 'Press Releases' },
];

export const adminLevelOptions = [
  { id: 'all', name: 'All Levels' },
  { id: 'region', name: 'Region' },
  { id: 'province', name: 'Province' },
  { id: 'municipality', name: 'Municipality' },
  { id: 'barangay', name: 'Barangay' },
];

const MIN_SOURCE_YEAR = 2016;
const currentYear = new Date().getFullYear();

// Source data only goes back to 2016; keep the filter bounded to that range.
export const yearOptions = Array.from({ length: currentYear - MIN_SOURCE_YEAR + 1 }, (_, index) => {
  const year = currentYear - index;
  return { id: String(year), name: String(year) };
});

export const mapPalette = {
  slate: ['#f1f5f9', '#cbd5e1', '#94a3b8', '#64748b', '#334155'],
  stone: ['#f5f5f4', '#d6d3d1', '#a8a29e', '#78716c', '#44403c'],
  amber: ['#fef3c7', '#fcd34d', '#f59e0b', '#b45309', '#78350f'],
  olive: ['#ecfccb', '#d9f99d', '#a3e635', '#65a30d', '#365314'],
  rose: ['#ffe4e6', '#fda4af', '#fb7185', '#e11d48', '#881337'],
  green: ['#dcfce7', '#86efac', '#4ade80', '#15803d', '#14532d'],
  red: ['#fee2e2', '#fca5a5', '#f87171', '#dc2626', '#7f1d1d'],
};

const svgBounds = {
  width: 702.39001,
  height: 1209.4381,
  lonMin: 116.927573,
  lonMax: 126.606549,
  latTop: 20.834769,
  latBottom: 4.640292,
};

const topicBank = [
  'transport funding',
  'coastal infrastructure',
  'flood control',
  'education rollout',
  'agriculture pricing',
  'local procurement',
  'energy supply',
  'health budget',
];

// Each mock politician has a home party. Posts "about" a politician are
// treated as predominantly, but not exclusively, associated with that party.
const politicianHomeParty = {
  'marcos-jr': 'lakas-cmd',
  robredo: 'lp',
  duterte: 'npc',
  'example-party': 'independent',
};

const politicalRotation = mockPoliticalEntities.filter((entity) => entity.id !== 'all');

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round = (value) => Math.round(value);

// --- Deterministic seeded "mock post dataset" -----------------------------
// A small string-seeded PRNG so every area (region/province) has a fixed,
// reproducible profile of party/source/year activity. This stands in for a
// real post-level dataset without needing to store thousands of records.

const createSeededRandom = (seed) => {
  let state = 1779033703 ^ seed.length;

  for (let index = 0; index < seed.length; index += 1) {
    state = Math.imul(state ^ seed.charCodeAt(index), 3432918353);
    state = (state << 13) | (state >>> 19);
  }

  return () => {
    state = Math.imul(state ^ (state >>> 16), 2246822507);
    state = Math.imul(state ^ (state >>> 13), 3266489909);
    state ^= state >>> 16;
    return (state >>> 0) / 4294967296;
  };
};

const buildAreaProfile = (seedKey) => {
  const random = createSeededRandom(seedKey);

  const partyWeights = politicalPartyOptions.map(() => 8 + round(random() * 92));

  const sourceWeights = {};
  sourceOptions.forEach((source) => {
    if (source.id === 'all') {
      return;
    }
    // ~12% chance a given source has no coverage at all in this area.
    sourceWeights[source.id] = random() > 0.12 ? 10 + round(random() * 40) : 0;
  });

  const yearActive = {};
  yearOptions.forEach((year) => {
    // ~8% chance a given year has no scraped coverage in this area.
    yearActive[year.id] = random() > 0.08;
  });

  const baseVolume = 260 + round(random() * 2200);

  return { partyWeights, sourceWeights, yearActive, baseVolume };
};

const computePartyCounts = (profile, { sourceId, yearId, politicalEntityId, timeMultiplier }) => {
  const sourceFactor = sourceId === 'all' ? 1 : (profile.sourceWeights[sourceId] ? profile.sourceWeights[sourceId] / 30 : 0);
  const yearFactor = yearId === 'all' ? 1 : (profile.yearActive[yearId] ? 1 : 0);
  const overallFactor = sourceFactor * yearFactor * timeMultiplier;

  if (overallFactor <= 0) {
    return politicalPartyOptions.map(() => 0);
  }

  const homeParty = politicalEntityId && politicalEntityId !== 'all' ? politicianHomeParty[politicalEntityId] : null;

  return politicalPartyOptions.map((party, index) => {
    const baseWeight = profile.partyWeights[index];
    const weight = homeParty ? (party.id === homeParty ? baseWeight * 1.8 : baseWeight * 0.55) : baseWeight;

    return Math.max(0, round(((weight / 100) * profile.baseVolume * overallFactor) / 10));
  });
};

// Resolves the actual counts into a single "what should this area look
// like" answer: the dominant party, the total post volume behind it, and
// whether there is any data at all (or the area was excluded by the active
// party filter, in which case it is also treated as no-data/neutral).
const resolveAreaVisual = ({ counts, partyFilterId, minVolume, layerMode }) => {
  const total = counts.reduce((sum, value) => sum + value, 0);
  const hasAnyData = total > 0 && total >= minVolume;

  if (!hasAnyData) {
    return { hasData: false, dominantPartyId: null, total, shadeIndex: null, colorKey: null };
  }

  let dominantIndex = 0;
  counts.forEach((value, index) => {
    if (value > counts[dominantIndex]) {
      dominantIndex = index;
    }
  });

  const dominantParty = politicalPartyOptions[dominantIndex];

  // A party filter narrows the map to areas where that party is already
  // the dominant one; it does not re-color areas by that party's isolated
  // count, since the dominant party is what "the color" represents.
  if (partyFilterId && partyFilterId !== 'all' && dominantParty.id !== partyFilterId) {
    return { hasData: false, dominantPartyId: null, total, shadeIndex: null, colorKey: null };
  }

  const shadeIndex = clamp(round(total / 450), 0, 4);

  return {
    hasData: true,
    dominantPartyId: dominantParty.id,
    total,
    shadeIndex,
    colorKey: layerMode === 'volume' ? 'stone' : dominantParty.colorKey,
  };
};

const getTimeFrame = (timeRangeId) => {
  const timeRange = mockTimeRanges.find((range) => range.id === timeRangeId) || mockTimeRanges[0];

  if (timeRange.id === '24h') {
    return { days: 1, label: timeRange.label, updated: '10:42 AM' };
  }

  if (timeRange.id === '7d') {
    return { days: 7, label: timeRange.label, updated: 'Yesterday 6:30 PM' };
  }

  return { days: 30, label: timeRange.label, updated: 'Today 8:15 AM' };
};

const getPoliticalEntity = (politicalEntityId) => {
  return mockPoliticalEntities.find((entity) => entity.id === politicalEntityId) || mockPoliticalEntities[0];
};

const getPolylineCoordinates = (points) => {
  return points
    .split(' ')
    .map((point) => point.trim())
    .filter(Boolean)
    .map((point) => {
      const [x, y] = point.split(',').map(Number);
      const longitude = svgBounds.lonMin + (x / svgBounds.width) * (svgBounds.lonMax - svgBounds.lonMin);
      const latitude = svgBounds.latTop - (y / svgBounds.height) * (svgBounds.latTop - svgBounds.latBottom);

      return [latitude, longitude];
    });
};

// Splits a region's bounding box into N equal vertical strips, one per
// province. Real province boundaries aren't available in this mock dataset,
// so this gives every province a distinct, deterministic footprint inside
// its parent region rather than reusing the region's own outline.
const buildProvinceStrips = (regionGeometry, provinceCount) => {
  const latitudes = regionGeometry.map(([latitude]) => latitude);
  const longitudes = regionGeometry.map(([, longitude]) => longitude);
  const latMin = Math.min(...latitudes);
  const latMax = Math.max(...latitudes);
  const lonMin = Math.min(...longitudes);
  const lonMax = Math.max(...longitudes);
  const span = (lonMax - lonMin) / provinceCount;

  return Array.from({ length: provinceCount }, (_, index) => {
    const left = lonMin + span * index;
    const right = lonMin + span * (index + 1);

    return [
      [latMin, left],
      [latMin, right],
      [latMax, right],
      [latMax, left],
      [latMin, left],
    ];
  });
};

const buildTimeline = (volume, activityScore, days) => {
  const points = days === 1 ? 6 : days === 7 ? 7 : 8;

  return Array.from({ length: points }, (_, index) => {
    const offset = index - (points - 1) / 2;
    const value = clamp(volume * 0.82 + offset * activityScore * 1.2, 0, Math.max(volume * 1.25, 1));

    return { label: String(index + 1), value: round(value) };
  });
};

const buildRecentPosts = (regionName, dominantPolitician, dominantParty, topic) => {
  return [
    `${regionName}: discussion spikes around ${topic} after a coordinated ${dominantParty.name.toLowerCase()} response.`,
    `${dominantPolitician.name} remains the most referenced figure in the latest region-level scrape.`,
    `Source mix shows repeated mentions of ${regionName} across social and news captures.`,
  ];
};

const buildSearchEntries = () => {
  return PHILIPPINE_REGIONS.flatMap((region, index) => {
    const regionEntry = {
      id: `region-${region.id}`,
      label: region.name,
      category: 'Region',
      targetRegionId: region.id,
      regionName: region.name,
      sortWeight: 0,
    };

    const provinceEntries = region.provinces.map((province, provinceIndex) => ({
      id: `province-${region.id}-${provinceIndex}`,
      label: province,
      category: 'Province',
      targetRegionId: region.id,
      regionName: region.name,
      sortWeight: 1,
    }));

    const municipalityEntries = [
      {
        id: `municipality-${region.id}-core`,
        label: `${region.name} Central`,
        category: 'Municipality',
        targetRegionId: region.id,
        regionName: region.name,
        sortWeight: 2,
      },
    ];

    const barangayEntries = [
      {
        id: `barangay-${region.id}-poblacion`,
        label: `${region.name} Poblacion`,
        category: 'Barangay',
        targetRegionId: region.id,
        regionName: region.name,
        sortWeight: 3,
      },
    ];

    const politicianEntries = mockPoliticalEntities.map((entity) => ({
      id: `politician-${entity.id}-${index}`,
      label: entity.name,
      category: 'Politician',
      targetRegionId: region.id,
      regionName: region.name,
      sortWeight: 4,
    }));

    const partyEntries = politicalPartyOptions.map((party) => ({
      id: `party-${party.id}-${index}`,
      label: party.name,
      category: 'Political Party',
      targetRegionId: region.id,
      regionName: region.name,
      sortWeight: 5,
    }));

    return [regionEntry, ...provinceEntries, ...municipalityEntries, ...barangayEntries, ...politicianEntries, ...partyEntries];
  });
};

export const getLayerLegend = (layerId) => {
  const layer = layerOptions.find((entry) => entry.id === layerId) || layerOptions[0];

  const dataVisual = layer.mode === 'party'
    ? politicalPartyOptions.map((party) => ({ label: party.name, colorKey: party.colorKey, shadeIndex: 3 }))
    : [
      { label: 'Low volume', colorKey: 'stone', shadeIndex: 1 },
      { label: 'Moderate volume', colorKey: 'stone', shadeIndex: 2 },
      { label: 'High volume', colorKey: 'stone', shadeIndex: 3 },
    ];

  return {
    layer,
    visual: [...dataVisual, { label: 'No data for current filters', colorKey: null, shadeIndex: null }],
    explanation: layer.mode === 'party'
      ? 'Color identifies the party with the most posts; shade depth reflects post volume. Areas with no matching posts are left unshaded.'
      : 'Darker shades indicate a higher volume of scraped posts. Areas with no matching posts are left unshaded.',
  };
};

const buildAreaFields = ({ seedKey, name, index, layer, politicalEntityId, filters, timeMultiplier, timeFrame }) => {
  const profile = buildAreaProfile(seedKey);
  const counts = computePartyCounts(profile, {
    sourceId: filters.sourceId,
    yearId: filters.yearId,
    politicalEntityId,
    timeMultiplier,
  });
  const visual = resolveAreaVisual({ counts, partyFilterId: filters.partyId, minVolume: filters.minVolume, layerMode: layer.mode });

  const dominantParty = visual.hasData ? politicalPartyOptions.find((party) => party.id === visual.dominantPartyId) : null;
  const dominantPolitician = visual.hasData
    ? politicalRotation.find((entity) => politicianHomeParty[entity.id] === dominantParty.id) || politicalRotation[index % politicalRotation.length]
    : null;

  const discussionVolume = visual.total;
  const totalRawCount = counts.reduce((sum, value) => sum + value, 0);
  const discussionShare = visual.hasData && totalRawCount > 0 ? clamp(round((Math.max(...counts) / totalRawCount) * 100), 0, 100) : 0;
  const engagementCount = round(discussionVolume * 0.46);
  const topic = topicBank[index % topicBank.length];
  const partyDistribution = politicalPartyOptions.map((party, partyIndex) => ({ label: party.name, value: counts[partyIndex] }));
  const timeline = buildTimeline(discussionVolume, discussionShare, timeFrame.days);
  const recentPosts = visual.hasData
    ? buildRecentPosts(name, dominantPolitician, dominantParty, topic)
    : [`No scraped posts match the current filters for ${name}.`];

  return {
    hasData: visual.hasData,
    discussionShare,
    discussionVolume,
    engagementCount,
    dominantPolitician,
    dominantParty,
    partyDistribution,
    timeline,
    recentPosts,
    layerVisual: { colorKey: visual.colorKey, shadeIndex: visual.shadeIndex, hasData: visual.hasData },
  };
};

const buildProvinceAreas = ({ layer, politicalEntityId, filters, timeMultiplier, timeFrame }) => {
  return PHILIPPINE_REGIONS.flatMap((regionMeta) => {
    const baseRegion = mockRegions.find((region) => region.id === regionMeta.id);

    if (!baseRegion) {
      return [];
    }

    const regionGeometry = getPolylineCoordinates(baseRegion.points);
    const strips = buildProvinceStrips(regionGeometry, regionMeta.provinces.length);

    return regionMeta.provinces.map((provinceName, index) => {
      const fields = buildAreaFields({
        seedKey: `province:${provinceName}`,
        name: provinceName,
        index,
        layer,
        politicalEntityId,
        filters,
        timeMultiplier,
        timeFrame,
      });

      return {
        id: `province-${regionMeta.id}-${index}`,
        parentRegionId: regionMeta.id,
        name: provinceName,
        region: regionMeta.region,
        geometry: strips[index],
        ...fields,
      };
    });
  });
};

export const buildDashboardModel = ({ layerId, politicalEntityId, timeRangeId, filters }) => {
  const entity = getPoliticalEntity(politicalEntityId);
  const timeFrame = getTimeFrame(timeRangeId);
  const layer = layerOptions.find((entry) => entry.id === layerId) || layerOptions[0];
  const selectedSource = sourceOptions.find((source) => source.id === filters.sourceId) || sourceOptions[0];
  const timeMultiplier = timeFrame.days / 7 + 0.35;

  const regions = mockRegions.map((region, index) => {
    const geometry = getPolylineCoordinates(region.points);
    const fields = buildAreaFields({
      seedKey: `region:${region.id}`,
      name: region.name,
      index,
      layer,
      politicalEntityId,
      filters,
      timeMultiplier,
      timeFrame,
    });

    return {
      ...region,
      geometry,
      ...fields,
      visible: fields.hasData,
    };
  });

  const provinceAreas = buildProvinceAreas({ layer, politicalEntityId, filters, timeMultiplier, timeFrame });

  const filteredRegions = regions.filter((region) => region.visible);
  const selectedRegion = regions.find((region) => region.id === filters.selectedRegionId) || filteredRegions[0] || regions[0] || null;
  const summary = {
    postsAnalyzed: filteredRegions.reduce((total, region) => total + region.discussionVolume, 0),
    regionsCovered: filteredRegions.length,
    politicalEntity: entity.name,
    lastUpdated: timeFrame.updated,
    activeLayer: layer.label,
    activeSource: selectedSource.name,
  };

  return {
    regions,
    provinceAreas,
    filteredRegions,
    selectedRegion,
    summary,
    layer: getLayerLegend(layerId),
    searchEntries: buildSearchEntries(),
    timeFrame,
  };
};

export const mapFillByLevel = mapPalette.slate;

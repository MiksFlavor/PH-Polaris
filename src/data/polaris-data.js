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

const sourceBank = ['social', 'news', 'forum', 'press'];
const politicalRotation = mockPoliticalEntities.filter((entity) => entity.id !== 'all');

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round = (value) => Math.round(value);

const getPoliticalParty = (index, entityId) => {
  const offset = entityId === 'all' ? index : index + politicalRotation.findIndex((item) => item.id === entityId);
  return politicalPartyOptions[(offset < 0 ? index : offset) % politicalPartyOptions.length];
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

const buildTimeline = (volume, activityScore, days) => {
  const points = days === 1 ? 6 : days === 7 ? 7 : 8;

  return Array.from({ length: points }, (_, index) => {
    const offset = index - (points - 1) / 2;
    const value = clamp(volume * 0.82 + offset * activityScore * 1.2, 0, volume * 1.25);

    return { label: String(index + 1), value: round(value) };
  });
};

const buildPartyDistribution = (baseShare, dominantParty) => {
  return politicalPartyOptions.map((party, index) => {
    const trend = dominantParty.id === party.id ? 1.35 : 0.65 + index * 0.08;
    return { label: party.name, value: round(baseShare * trend) };
  });
};

const buildRecentPosts = (regionName, dominantPolitician, dominantParty, topic) => {
  return [
    `${regionName}: discussion spikes around ${topic} after a coordinated ${dominantParty.name.toLowerCase()} response.`,
    `${dominantPolitician.name} remains the most referenced figure in the latest region-level scrape.`,
    `Source mix shows repeated mentions of ${regionName} across social and news captures.`,
  ];
};

const getLayerVisual = (layerId, baseMetrics) => {
  const layer = layerOptions.find((entry) => entry.id === layerId) || layerOptions[0];
  const discussionIndex = clamp(round(baseMetrics.discussionShare / 20), 0, 4);
  const volumeIndex = clamp(round(baseMetrics.discussionVolume / 600), 0, 4);

  if (layer.mode === 'volume') {
    return { colorKey: 'stone', shadeIndex: volumeIndex };
  }

  return { colorKey: baseMetrics.dominantParty.colorKey, shadeIndex: discussionIndex };
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

  if (layer.mode === 'party') {
    return {
      layer,
      visual: politicalPartyOptions.map((party) => ({
        label: party.name,
        colorKey: party.colorKey,
        shadeIndex: 3,
      })),
      explanation: 'Color identifies the dominant party; shade depth reflects post volume.',
    };
  }

  return {
    layer,
    visual: [
      { label: 'Low volume', colorKey: 'stone', shadeIndex: 1 },
      { label: 'Moderate volume', colorKey: 'stone', shadeIndex: 2 },
      { label: 'High volume', colorKey: 'stone', shadeIndex: 3 },
    ],
    explanation: 'Darker shades indicate a higher volume of scraped posts.',
  };
};

export const buildDashboardModel = ({ layerId, politicalEntityId, timeRangeId, filters }) => {
  const entity = getPoliticalEntity(politicalEntityId);
  const timeFrame = getTimeFrame(timeRangeId);
  const selectedPoliticalParty = politicalPartyOptions.find((party) => party.id === filters.partyId) || null;
  const selectedSource = sourceOptions.find((source) => source.id === filters.sourceId) || sourceOptions[0];
  const selectedLevel = adminLevelOptions.find((level) => level.id === filters.adminLevelId) || adminLevelOptions[0];
  const selectedYear = yearOptions.find((year) => year.id === filters.yearId) || null;

  const regions = mockRegions.map((region, index) => {
    const dominantPolitician = politicalRotation[(index + mockPoliticalEntities.findIndex((item) => item.id === politicalEntityId) + politicalRotation.length) % politicalRotation.length] || politicalRotation[index % politicalRotation.length];
    const dominantParty = getPoliticalParty(index, politicalEntityId);
    const discussionShare = clamp(round(region.baseActivity * (timeFrame.days / 2) + entity.id.length + (index % 7)), 8, 100);
    const discussionVolume = round(region.basePosts * (timeFrame.days / 7 + 0.35) * (entity.id === 'all' ? 1 : 1.04));
    const engagementCount = round(discussionVolume * (0.42 + discussionShare / 180));
    const topic = topicBank[index % topicBank.length];
    const adminLevel = ['region', 'province', 'municipality', 'barangay'][index % 4];
    const sourceId = sourceBank[index % sourceBank.length];
    const postYear = yearOptions[index % yearOptions.length].id;
    const partyDistribution = buildPartyDistribution(discussionShare, dominantParty);
    const timeline = buildTimeline(discussionVolume, discussionShare, timeFrame.days);
    const recentPosts = buildRecentPosts(region.name, dominantPolitician, dominantParty, topic);
    const geometry = getPolylineCoordinates(region.points);
    const visual = getLayerVisual(layerId, {
      discussionShare,
      discussionVolume,
      dominantParty,
    });

    return {
      ...region,
      geometry,
      adminLevel,
      sourceId,
      postYear,
      discussionShare,
      discussionVolume,
      engagementCount,
      dominantPolitician,
      dominantParty,
      partyDistribution,
      timeline,
      recentPosts,
      layerVisual: visual,
      visible:
        (selectedLevel.id === 'all' || selectedLevel.id === adminLevel) &&
        (selectedPoliticalParty ? dominantParty.id === selectedPoliticalParty.id : true) &&
        (selectedSource.id === 'all' || sourceId === selectedSource.id) &&
        (!selectedYear || postYear === selectedYear.id) &&
        (filters.minVolume <= discussionVolume && discussionVolume <= filters.maxVolume),
    };
  });

  const filteredRegions = regions.filter((region) => region.visible);
  const selectedRegion = regions.find((region) => region.id === filters.selectedRegionId) || filteredRegions[0] || regions[0] || null;
  const summary = {
    postsAnalyzed: filteredRegions.reduce((total, region) => total + region.discussionVolume, 0),
    regionsCovered: filteredRegions.length,
    politicalEntity: entity.name,
    lastUpdated: timeFrame.updated,
    activeLayer: layerOptions.find((layer) => layer.id === layerId)?.label || layerOptions[0].label,
    activeSource: selectedSource.name,
  };

  return {
    regions,
    filteredRegions,
    selectedRegion,
    summary,
    layer: getLayerLegend(layerId),
    searchEntries: buildSearchEntries(),
    timeFrame,
  };
};

export const mapFillByLevel = mapPalette.slate;

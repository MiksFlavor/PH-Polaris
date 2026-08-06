import { mockPoliticalEntities, mockRegions, mockTimeRanges } from './mockData';
import { PHILIPPINE_REGIONS } from './philippines-regions';

export { mockPoliticalEntities, mockRegions, mockTimeRanges };

export const layerOptions = [
  { id: 'current-discussion', label: 'Current Political Discussion', mode: 'politician' },
  { id: 'most-mentioned-politician', label: 'Most Mentioned Politician', mode: 'politician' },
  { id: 'most-mentioned-party', label: 'Most Mentioned Political Party', mode: 'party' },
  { id: 'discussion-volume', label: 'Discussion Volume', mode: 'volume' },
  { id: 'sentiment', label: 'Sentiment', mode: 'sentiment' },
  { id: 'trending-topics', label: 'Trending Topics', mode: 'topic' },
  { id: 'historical-election-results', label: 'Historical Election Results', mode: 'historical' },
  { id: 'comparison-mode', label: 'Comparison Mode', mode: 'comparison' },
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

export const electionYearOptions = [
  { id: '2022', name: '2022' },
  { id: '2019', name: '2019' },
  { id: '2016', name: '2016' },
];

export const sentimentOptions = [
  { id: 'all', name: 'All Sentiment' },
  { id: 'positive', name: 'Positive' },
  { id: 'neutral', name: 'Neutral' },
  { id: 'negative', name: 'Negative' },
];

export const activityLegend = [
  { label: 'Low', colorKey: 'slate', shadeIndex: 0 },
  { label: 'Light', colorKey: 'slate', shadeIndex: 1 },
  { label: 'Moderate', colorKey: 'slate', shadeIndex: 2 },
  { label: 'High', colorKey: 'slate', shadeIndex: 3 },
  { label: 'Very High', colorKey: 'slate', shadeIndex: 4 },
];

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

const getSentiment = (activityScore, bias) => {
  if (activityScore >= 66 || bias >= 6) {
    return { id: 'positive', label: 'Positive', colorKey: 'green', score: clamp(activityScore + bias, 0, 100) };
  }

  if (activityScore <= 38 || bias <= -4) {
    return { id: 'negative', label: 'Negative', colorKey: 'red', score: clamp(100 - activityScore + Math.abs(bias), 0, 100) };
  }

  return { id: 'neutral', label: 'Neutral', colorKey: 'stone', score: clamp(activityScore, 0, 100) };
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

const buildComparisonSeries = (activityScore, historicalVoteShare) => {
  return [
    { label: 'Current', value: round(activityScore) },
    { label: '2022', value: round(historicalVoteShare) },
  ];
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
  const historicalIndex = clamp(round((baseMetrics.historicalVoteShare - 30) / 10), 0, 4);
  const discussionIndex = clamp(round(baseMetrics.discussionShare / 20), 0, 4);
  const volumeIndex = clamp(round(baseMetrics.discussionVolume / 600), 0, 4);
  const sentimentIndex = clamp(round(baseMetrics.sentiment.score / 20), 0, 4);
  const comparisonIndex = clamp(round(Math.abs(baseMetrics.comparisonDelta) / 8), 0, 4);

  if (layer.mode === 'party') {
    return { colorKey: baseMetrics.dominantParty.colorKey, shadeIndex: discussionIndex };
  }

  if (layer.mode === 'volume') {
    return { colorKey: 'stone', shadeIndex: volumeIndex };
  }

  if (layer.mode === 'sentiment') {
    return { colorKey: baseMetrics.sentiment.colorKey, shadeIndex: sentimentIndex };
  }

  if (layer.mode === 'topic') {
    return { colorKey: 'amber', shadeIndex: discussionIndex };
  }

  if (layer.mode === 'historical') {
    return { colorKey: 'stone', shadeIndex: historicalIndex };
  }

  if (layer.mode === 'comparison') {
    return { colorKey: baseMetrics.comparisonDelta >= 0 ? 'green' : 'red', shadeIndex: comparisonIndex };
  }

  return { colorKey: baseMetrics.dominantPolitician.colorKey, shadeIndex: discussionIndex };
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
  const visual = layer.mode === 'comparison'
    ? [
        { label: 'Higher than election reference', colorKey: 'green', shadeIndex: 3 },
        { label: 'Lower than election reference', colorKey: 'red', shadeIndex: 3 },
      ]
    : layer.mode === 'sentiment'
      ? [
          { label: 'Positive', colorKey: 'green', shadeIndex: 3 },
          { label: 'Neutral', colorKey: 'stone', shadeIndex: 2 },
          { label: 'Negative', colorKey: 'red', shadeIndex: 3 },
        ]
      : [
          { label: 'Low intensity', colorKey: 'slate', shadeIndex: 1 },
          { label: 'Moderate intensity', colorKey: 'slate', shadeIndex: 2 },
          { label: 'High intensity', colorKey: 'slate', shadeIndex: 3 },
        ];

  return {
    layer,
    visual,
    explanation:
      layer.mode === 'comparison'
        ? 'Current discussion compared against the latest election reference layer.'
        : layer.mode === 'sentiment'
          ? 'Shading reflects sentiment direction and intensity.'
          : 'Darker shades indicate stronger dominance or volume.',
  };
};

export const buildDashboardModel = ({ layerId, politicalEntityId, timeRangeId, filters }) => {
  const entity = getPoliticalEntity(politicalEntityId);
  const timeFrame = getTimeFrame(timeRangeId);
  const selectedPoliticalParty = politicalPartyOptions.find((party) => party.id === filters.partyId) || null;
  const selectedSource = sourceOptions.find((source) => source.id === filters.sourceId) || sourceOptions[0];
  const selectedLevel = adminLevelOptions.find((level) => level.id === filters.adminLevelId) || adminLevelOptions[0];
  const selectedSentiment = sentimentOptions.find((sentiment) => sentiment.id === filters.sentimentId) || sentimentOptions[0];
  const selectedElectionYear = electionYearOptions.find((year) => year.id === filters.electionYearId) || electionYearOptions[0];

  const regions = mockRegions.map((region, index) => {
    const dominantPolitician = politicalRotation[(index + mockPoliticalEntities.findIndex((item) => item.id === politicalEntityId) + politicalRotation.length) % politicalRotation.length] || politicalRotation[index % politicalRotation.length];
    const dominantParty = getPoliticalParty(index, politicalEntityId);
    const discussionShare = clamp(round(region.baseActivity * (timeFrame.days / 2) + entity.id.length + (index % 7)), 8, 100);
    const discussionVolume = round(region.basePosts * (timeFrame.days / 7 + 0.35) * (entity.id === 'all' ? 1 : 1.04));
    const engagementCount = round(discussionVolume * (0.42 + discussionShare / 180));
    const sentiment = getSentiment(discussionShare, dominantPolitician.id === politicalEntityId ? 7 : -2);
    const historicalVoteShare = clamp(round(34 + region.baseActivity * 0.34 + index % 5), 28, 74);
    const comparisonDelta = round(discussionShare - historicalVoteShare);
    const topic = topicBank[index % topicBank.length];
    const adminLevel = ['region', 'province', 'municipality', 'barangay'][index % 4];
    const sourceId = sourceBank[index % sourceBank.length];
    const electionYear = electionYearOptions[index % electionYearOptions.length].id;
    const sourceBreakdown = sourceBank.map((source, sourceIndex) => ({
      label: source,
      value: round(discussionVolume * (0.4 - sourceIndex * 0.07 + (sourceIndex === 0 ? 0.08 : 0))),
    }));
    const partyDistribution = buildPartyDistribution(discussionShare, dominantParty);
    const timeline = buildTimeline(discussionVolume, discussionShare, timeFrame.days);
    const comparisonSeries = buildComparisonSeries(discussionShare, historicalVoteShare);
    const recentPosts = buildRecentPosts(region.name, dominantPolitician, dominantParty, topic);
    const geometry = getPolylineCoordinates(region.points);
    const visual = getLayerVisual(layerId, {
      discussionShare,
      discussionVolume,
      sentiment,
      historicalVoteShare,
      comparisonDelta,
      dominantPolitician,
      dominantParty,
    });

    return {
      ...region,
      geometry,
      adminLevel,
      sourceId,
      electionYear,
      discussionShare,
      discussionVolume,
      engagementCount,
      dominantPolitician,
      dominantParty,
      sentiment,
      historicalVoteShare,
      comparisonDelta,
      trendingTopic: topic,
      partyDistribution,
      sourceBreakdown,
      timeline,
      comparisonSeries,
      recentPosts,
      layerVisual: visual,
      visible:
        (selectedLevel.id === 'all' || selectedLevel.id === adminLevel) &&
        (selectedSentiment.id === 'all' || sentiment.id === selectedSentiment.id) &&
        (selectedPoliticalParty ? dominantParty.id === selectedPoliticalParty.id : true) &&
        (selectedSource.id === 'all' || sourceId === selectedSource.id) &&
        (selectedElectionYear.id === 'all' || electionYear === selectedElectionYear.id) &&
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
    electionYear: selectedElectionYear.name,
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

import { mockPoliticalEntities, mockTimeRanges } from './mockData';
import {
  REGION_FEATURES,
  PROVINCE_FEATURES,
  MUNICITY_FEATURES,
  PSGC_MUNICITIES,
  PSGC_BARANGAYS,
  hasMunicityGeometry,
  hasProvinceGeometry,
  hasBarangayGeometry,
  splitRegionLabel,
} from './philippines-regions';
import election2022 from './election-2022.json';
import election2022MunicityPres from './election-2022-municity-pres.json';

export { mockPoliticalEntities, mockTimeRanges };

export const layerOptions = [
  { id: 'party-activity', label: 'Political Party Activity', mode: 'party' },
  { id: 'discussion-volume', label: 'Discussion Volume', mode: 'volume' },
  { id: 'election-2022-pres', label: '2022 Presidential Election (Real Results)', mode: 'election' },
];

// These reuse real Philippine political party names for the mock
// "Political Party Activity" layer, colored to match real branding rather
// than an arbitrary assignment:
// - Liberal Party: yellow ("Kulay Dilaw" — dates to the Aquino/EDSA era,
//   still LP's color today)
// - Lakas-CMD: green (Sara Duterte's 2022 VP campaign branding — Mindanao
//   roots / environmental development messaging)
// - Nacionalista Party: red (its traditional/heraldic color)
// Independent Bloc isn't a real party, so it stays neutral. NPC doesn't
// have as strong a single associated color, so it gets a distinct neutral
// tone rather than a guessed one.
export const politicalPartyOptions = [
  { id: 'lakas-cmd', name: 'Lakas-CMD', colorKey: 'green' },
  { id: 'np', name: 'Nacionalista Party', colorKey: 'red' },
  { id: 'lp', name: 'Liberal Party', colorKey: 'yellow' },
  { id: 'npc', name: 'Nationalist People\'s Coalition', colorKey: 'amber' },
  { id: 'independent', name: 'Independent Bloc', colorKey: 'slate' },
];

export const sourceOptions = [
  { id: 'all', name: 'All Sources' },
  { id: 'social', name: 'Social Platforms' },
  { id: 'news', name: 'News Sites' },
  { id: 'forum', name: 'Public Forums' },
  { id: 'press', name: 'Press Releases' },
];

// Region/province/municipality boundaries are bundled directly. Barangay
// geometry is real too (40,401 of 42,010 barangays — see VALIDATION.md) but
// far too large/numerous to bundle or render nationwide at once, so it's
// fetched on demand per-municipality once the user drills into one (see
// getBarangayGeometryUrl / buildBarangayAreas below).
export const adminLevelOptions = [
  { id: 'all', name: 'All Levels' },
  { id: 'region', name: 'Region' },
  { id: 'province', name: 'Province' },
  { id: 'municipality', name: 'Municipality / City' },
  { id: 'barangay', name: 'Barangay (select a municipality first)' },
];

const MIN_SOURCE_YEAR = 2016;
const currentYear = new Date().getFullYear();

// Source data only goes back to 2016; keep the filter bounded to that range.
export const yearOptions = Array.from({ length: currentYear - MIN_SOURCE_YEAR + 1 }, (_, index) => {
  const year = currentYear - index;
  return { id: String(year), name: String(year) };
});

// Index 0 = lowest intensity, index 4 = highest — but ordered dark/muted to
// bright/saturated rather than light-to-dark, since these render on a dark
// map background: a pale tint (correct on a white basemap) would be the
// most visually dominant, backwards color on a dark one. High-intensity
// areas should pop; low-intensity areas should sit closer to the background.
export const mapPalette = {
  slate: ['#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1'],
  stone: ['#44403c', '#57534e', '#78716c', '#a8a29e', '#d6d3d1'],
  amber: ['#78350f', '#b45309', '#f59e0b', '#fbbf24', '#fde68a'],
  olive: ['#365314', '#4d7c0f', '#65a30d', '#a3e635', '#d9f99d'],
  rose: ['#831843', '#be185d', '#ec4899', '#f472b6', '#f9a8d4'],
  green: ['#14532d', '#166534', '#22c55e', '#4ade80', '#86efac'],
  red: ['#7f1d1d', '#b91c1c', '#ef4444', '#f87171', '#fca5a5'],
  blue: ['#1e3a8a', '#1d4ed8', '#3b82f6', '#60a5fa', '#93c5fd'],
  yellow: ['#713f12', '#a16207', '#eab308', '#facc15', '#fde047'],
};

// Real 2022 presidential candidates that actually won at least one province
// (see VALIDATION.md), colored to match each candidate's actual 2022
// campaign branding:
// - Marcos: red (reclaimed to signify national unity / family legacy)
// - Robredo: pink/rose ("Kakampink" — sparked the volunteer-driven "pink
//   wave", the single most recognizable color of the 2022 race)
// - Pacquiao: blue (echoed his boxing career and national-pride branding)
// - Mangondato: no widely-documented personal campaign color, so a neutral
//   tone rather than guessing one
// Anyone else falls back to ELECTION_DEFAULT_COLOR.
const ELECTION_CANDIDATE_COLORS = {
  'pres_7_marcos': 'red',
  'pres_10_robredo': 'rose',
  'pres_9_pacquiao': 'blue',
  'pres_6_mangondato': 'amber',
};
const ELECTION_DEFAULT_COLOR = 'slate';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round = (value) => Math.round(value);

// Real 2022 election results aggregated up to region level from the
// province-level join (see VALIDATION.md for match rates). Computed once at
// module load since it's real historical data, not affected by filters.
const electionRegionAgg = (() => {
  const byRegion = {};

  Object.entries(election2022.pres.byProvince).forEach(([provinceCode, stats]) => {
    const province = PROVINCE_FEATURES.find((feature) => feature.properties.provinceCode === provinceCode);
    if (!province) {
      return;
    }

    const { regionCode } = province.properties;
    byRegion[regionCode] = byRegion[regionCode] || {};

    stats.top.forEach(({ id, name, votes }) => {
      byRegion[regionCode][id] = byRegion[regionCode][id] || { name, votes: 0 };
      byRegion[regionCode][id].votes += votes;
    });
  });

  const result = {};
  Object.entries(byRegion).forEach(([regionCode, candidates]) => {
    const top = Object.entries(candidates)
      .map(([id, entry]) => ({ id, name: entry.name, votes: entry.votes }))
      .sort((a, b) => b.votes - a.votes);
    const totalVotes = top.reduce((sum, entry) => sum + entry.votes, 0);
    result[regionCode] = { totalVotes, top };
  });

  return result;
})();

const resolveElectionVisual = ({ code, level, minVolume }) => {
  // Barangay-level election results weren't aggregated in this pass (see
  // VALIDATION.md §4) — explicitly no-data rather than silently falling
  // through to a province-keyed lookup that would never match anyway.
  const stats = level === 'barangay'
    ? null
    : level === 'municity'
      ? election2022MunicityPres[code]
      : level === 'region'
        ? electionRegionAgg[code]
        : election2022.pres.byProvince[code];

  if (!stats || !stats.top || stats.top.length === 0 || stats.totalVotes < minVolume) {
    return { hasData: false };
  }

  const winner = stats.top[0];
  const shareOfTotal = stats.totalVotes > 0 ? winner.votes / stats.totalVotes : 0;
  const shadeIndex = clamp(round((shareOfTotal - 0.3) / 0.15), 0, 4);

  return {
    hasData: true,
    winner,
    top: stats.top,
    totalVotes: stats.totalVotes,
    shareOfTotal,
    shadeIndex,
    colorKey: ELECTION_CANDIDATE_COLORS[winner.id] || ELECTION_DEFAULT_COLOR,
  };
};

// Real-data counterpart to buildAreaFields below: same output shape, but
// every number comes from the 2022 COMELEC precinct results joined to real
// PSGC geography (see VALIDATION.md), not the seeded mock engine.
const buildElectionFields = ({ code, electionLevel, name, minVolume }) => {
  const visual = resolveElectionVisual({ code, level: electionLevel, minVolume });

  if (!visual.hasData) {
    return {
      hasData: false,
      discussionShare: 0,
      discussionVolume: 0,
      engagementCount: 0,
      dominantPolitician: null,
      dominantParty: null,
      partyDistribution: [],
      timeline: [],
      recentPosts: [`No joined 2022 election results for ${name} at this level yet — see VALIDATION.md.`],
      layerVisual: { colorKey: null, shadeIndex: null, hasData: false },
    };
  }

  const colorKey = ELECTION_CANDIDATE_COLORS[visual.winner.id] || ELECTION_DEFAULT_COLOR;
  const sharePercent = clamp(round(visual.shareOfTotal * 100), 0, 100);
  const dominantParty = { id: visual.winner.id, name: visual.winner.name, colorKey };

  return {
    hasData: true,
    discussionShare: sharePercent,
    discussionVolume: visual.totalVotes,
    engagementCount: visual.winner.votes,
    dominantPolitician: { id: visual.winner.id, name: visual.winner.name },
    dominantParty,
    partyDistribution: visual.top.map((candidate) => ({ label: candidate.name, value: candidate.votes })),
    timeline: [],
    recentPosts: [
      `${name}: ${visual.winner.name} led the 2022 presidential race with ${visual.winner.votes.toLocaleString()} votes (${sharePercent}% of ${visual.totalVotes.toLocaleString()} counted here).`,
      'Source: COMELEC 2022 precinct-level results, joined to real PSGC geography (see VALIDATION.md).',
    ],
    layerVisual: { colorKey, shadeIndex: visual.shadeIndex, hasData: true },
  };
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

// --- Deterministic seeded "mock post dataset" -----------------------------
// A small string-seeded PRNG so every real geographic area (region/province,
// keyed by its stable PSGC code) has a fixed, reproducible profile of
// party/source/year activity. This stands in for a real post-level dataset
// without needing to store thousands of records.

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

const buildTimeline = (volume, activityScore, days) => {
  const points = days === 1 ? 6 : days === 7 ? 7 : 8;

  return Array.from({ length: points }, (_, index) => {
    const offset = index - (points - 1) / 2;
    const value = clamp(volume * 0.82 + offset * activityScore * 1.2, 0, Math.max(volume * 1.25, 1));

    return { label: String(index + 1), value: round(value) };
  });
};

const buildRecentPosts = (areaName, dominantPolitician, dominantParty, topic) => {
  return [
    `${areaName}: discussion spikes around ${topic} after a coordinated ${dominantParty.name.toLowerCase()} response.`,
    `${dominantPolitician.name} remains the most referenced figure in the latest scrape for ${areaName}.`,
    `Source mix shows repeated mentions of ${areaName} across social and news captures.`,
  ];
};

// Joins a real geographic area (identified by its stable PSGC code) with
// either the seeded mock post engine, or (when the active layer is real
// election data) the actual 2022 results. Geometry never comes from here —
// only volume/party/share/shade for a given area.
const buildAreaFields = ({ seedKey, code, electionLevel, name, index, layer, politicalEntityId, filters, timeMultiplier, timeFrame }) => {
  if (layer.mode === 'election') {
    return buildElectionFields({ code, electionLevel, name, minVolume: filters.minVolume });
  }

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

const buildSearchEntries = () => {
  const regionEntries = REGION_FEATURES.map((feature) => {
    const { regionCode, regionName } = feature.properties;
    const { displayName } = splitRegionLabel(regionCode, regionName);

    return { id: `region-${regionCode}`, label: displayName, category: 'Region', level: 'region', areaId: regionCode, regionId: regionCode, sortWeight: 0, hasGeometry: true };
  });

  const provinceEntries = PROVINCE_FEATURES.map((feature) => {
    const { provinceCode, provinceName, regionCode } = feature.properties;

    return { id: `province-${provinceCode}`, label: provinceName, category: 'Province', level: 'province', areaId: provinceCode, regionId: regionCode, sortWeight: 1, hasGeometry: true };
  });

  // Every real city/municipality from PSGC, not just the 1,613 with boundary
  // geometry — the ones without geometry (see VALIDATION.md) are still
  // searchable and selectable; they fall back to their parent province.
  const municityEntries = PSGC_MUNICITIES.filter((municity) => municity.level !== 'SubMun').map((municity) => {
    const geometryAvailable = hasMunicityGeometry(municity.code);
    const fallbackAreaId = geometryAvailable ? municity.code : municity.provinceCode;
    const fallbackLevel = geometryAvailable ? 'municipality' : (hasProvinceGeometry(municity.provinceCode) ? 'province' : 'region');

    return {
      id: `municity-${municity.code}`,
      label: municity.name,
      category: municity.level === 'City' ? 'City' : 'Municipality',
      level: fallbackLevel,
      areaId: fallbackLevel === 'region' ? municity.regionCode : fallbackAreaId,
      regionId: municity.regionCode,
      sortWeight: 2,
      hasGeometry: geometryAvailable,
    };
  });

  // All 42,010 barangays: searchable via the PSGC name index. 40,401 have
  // real geometry available on demand (see VALIDATION.md); selecting one
  // drills into its municipality's barangay view when that geometry
  // exists, or falls back to the nearest level that does, rather than
  // showing a fabricated shape.
  const municityByCode = new Map(PSGC_MUNICITIES.map((municity) => [municity.code, municity]));
  const barangayEntries = PSGC_BARANGAYS.map((barangay) => {
    const parentMunicity = municityByCode.get(barangay.municityCode);
    const barangayGeometryAvailable = parentMunicity ? hasBarangayGeometry(parentMunicity.code) : false;

    let level;
    let areaId;
    if (barangayGeometryAvailable) {
      level = 'barangay';
      areaId = barangay.code;
    } else if (parentMunicity && hasMunicityGeometry(parentMunicity.code)) {
      level = 'municipality';
      areaId = parentMunicity.code;
    } else if (parentMunicity && hasProvinceGeometry(parentMunicity.provinceCode)) {
      level = 'province';
      areaId = parentMunicity.provinceCode;
    } else {
      level = 'region';
      areaId = parentMunicity?.regionCode;
    }

    return {
      id: `barangay-${barangay.code}`,
      label: barangay.name,
      category: 'Barangay',
      level,
      areaId,
      regionId: parentMunicity?.regionCode,
      municityId: parentMunicity?.code,
      sortWeight: 3,
      hasGeometry: barangayGeometryAvailable,
    };
  });

  // Politician/party results don't correspond to one location; anchor them
  // on the first region purely so selecting one still has somewhere to jump.
  const anchorRegionCode = REGION_FEATURES[0]?.properties.regionCode;

  const politicianEntries = politicalRotation.map((entity) => ({
    id: `politician-${entity.id}`,
    label: entity.name,
    category: 'Politician',
    level: 'region',
    areaId: anchorRegionCode,
    regionId: anchorRegionCode,
    sortWeight: 4,
    hasGeometry: true,
  }));

  const partyEntries = politicalPartyOptions.map((party) => ({
    id: `party-${party.id}`,
    label: party.name,
    category: 'Political Party',
    level: 'region',
    areaId: anchorRegionCode,
    regionId: anchorRegionCode,
    sortWeight: 5,
    hasGeometry: true,
  }));

  return [...regionEntries, ...provinceEntries, ...municityEntries, ...barangayEntries, ...politicianEntries, ...partyEntries];
};

export const getLayerLegend = (layerId) => {
  const layer = layerOptions.find((entry) => entry.id === layerId) || layerOptions[0];

  if (layer.mode === 'election') {
    const dataVisual = Object.entries(ELECTION_CANDIDATE_COLORS).map(([id, colorKey]) => ({
      label: election2022.pres.candidateNames[id] || id,
      colorKey,
      shadeIndex: 3,
    }));

    return {
      layer,
      visual: [...dataVisual, { label: 'Other candidate / no data here', colorKey: null, shadeIndex: null }],
      explanation: 'Real 2022 presidential election results (COMELEC precinct data joined to PSGC geography). Color identifies the winning candidate; shade depth reflects their vote share. See VALIDATION.md for join coverage.',
    };
  }

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

export function getBarangayGeometryUrl(municityCode) {
  return `/data/barangays/${municityCode}.json`;
}

// Fetches and caches one municipality's real barangay geometry (see
// VALIDATION.md — 40,401 of 42,010 barangays have geometry; the rest are a
// known upstream gap, not something faked here). Deliberately per-
// municipality rather than one national file: 42,010 features nationwide is
// both too large to bundle and too many shapes to hit-test/render at once.
const barangayGeometryCache = new Map();

export async function loadBarangayGeometry(municityCode) {
  if (barangayGeometryCache.has(municityCode)) {
    return barangayGeometryCache.get(municityCode);
  }

  const promise = fetch(getBarangayGeometryUrl(municityCode))
    .then((response) => (response.ok ? response.json() : { type: 'FeatureCollection', features: [] }))
    .then((data) => data.features || [])
    .catch(() => []);

  barangayGeometryCache.set(municityCode, promise);
  return promise;
}

// Builds POLARIS areas for one municipality's barangays once their geometry
// has been fetched. Real election data wasn't aggregated to barangay level
// in this pass (see VALIDATION.md §4), so the election layer shows these as
// neutral/no-data rather than fabricating a result; the mock layers work
// the same way here as at every other level.
export const buildBarangayAreas = ({ features, layer, politicalEntityId, filters, timeMultiplier, timeFrame }) => {
  return features.map((feature, index) => {
    const { barangayCode, barangayName, municityCode, provinceCode, regionCode } = feature.properties;
    const municity = MUNICITY_FEATURES.find((item) => item.properties.municityCode === municityCode);
    const province = PROVINCE_FEATURES.find((item) => item.properties.provinceCode === provinceCode);
    const parentShortLabel = province ? splitRegionLabel(regionCode, province.properties.regionName).shortLabel : '';
    const fields = buildAreaFields({
      seedKey: `barangay:${barangayCode}`,
      code: barangayCode,
      electionLevel: 'barangay',
      name: barangayName,
      index,
      layer,
      politicalEntityId,
      filters,
      timeMultiplier,
      timeFrame,
    });

    return {
      id: barangayCode,
      parentRegionId: regionCode,
      parentProvinceId: provinceCode,
      parentMunicityId: municityCode,
      name: barangayName,
      region: parentShortLabel,
      provinceName: province?.properties.provinceName || '',
      municityName: municity?.properties.municityName || '',
      geometry: feature.geometry,
      ...fields,
    };
  });
};

// Convenience wrapper so callers (App.jsx) don't need to duplicate the
// layer/timeframe setup that buildDashboardModel does internally.
export const buildBarangayAreasForFeatures = ({ layerId, politicalEntityId, timeRangeId, filters, features }) => {
  const timeFrame = getTimeFrame(timeRangeId);
  const layer = layerOptions.find((entry) => entry.id === layerId) || layerOptions[0];
  const timeMultiplier = timeFrame.days / 7 + 0.35;

  return buildBarangayAreas({ features, layer, politicalEntityId, filters, timeMultiplier, timeFrame });
};

export const buildDashboardModel = ({ layerId, politicalEntityId, timeRangeId, filters }) => {
  const entity = getPoliticalEntity(politicalEntityId);
  const timeFrame = getTimeFrame(timeRangeId);
  const layer = layerOptions.find((entry) => entry.id === layerId) || layerOptions[0];
  const selectedSource = sourceOptions.find((source) => source.id === filters.sourceId) || sourceOptions[0];
  const timeMultiplier = timeFrame.days / 7 + 0.35;

  const regions = REGION_FEATURES.map((feature, index) => {
    const { regionCode, regionName } = feature.properties;
    const { shortLabel, displayName } = splitRegionLabel(regionCode, regionName);
    const fields = buildAreaFields({
      seedKey: `region:${regionCode}`,
      code: regionCode,
      electionLevel: 'region',
      name: displayName,
      index,
      layer,
      politicalEntityId,
      filters,
      timeMultiplier,
      timeFrame,
    });

    return {
      id: regionCode,
      region: shortLabel,
      name: displayName,
      geometry: feature.geometry,
      ...fields,
      visible: fields.hasData,
    };
  });

  const provinceAreas = PROVINCE_FEATURES.map((feature, index) => {
    const { provinceCode, provinceName, regionCode, regionName } = feature.properties;
    const { shortLabel: parentShortLabel, displayName: parentDisplayName } = splitRegionLabel(regionCode, regionName);
    const fields = buildAreaFields({
      seedKey: `province:${provinceCode}`,
      code: provinceCode,
      electionLevel: 'province',
      name: provinceName,
      index,
      layer,
      politicalEntityId,
      filters,
      timeMultiplier,
      timeFrame,
    });

    return {
      id: provinceCode,
      parentRegionId: regionCode,
      name: provinceName,
      region: parentShortLabel,
      regionFullName: parentDisplayName,
      geometry: feature.geometry,
      ...fields,
    };
  });

  const municityAreas = MUNICITY_FEATURES.map((feature, index) => {
    const { municityCode, municityName, provinceCode, regionCode } = feature.properties;
    const province = PROVINCE_FEATURES.find((item) => item.properties.provinceCode === provinceCode);
    const parentShortLabel = province ? splitRegionLabel(regionCode, province.properties.regionName).shortLabel : '';
    const fields = buildAreaFields({
      seedKey: `municity:${municityCode}`,
      code: municityCode,
      electionLevel: 'municity',
      name: municityName,
      index,
      layer,
      politicalEntityId,
      filters,
      timeMultiplier,
      timeFrame,
    });

    return {
      id: municityCode,
      parentRegionId: regionCode,
      parentProvinceId: provinceCode,
      name: municityName,
      region: parentShortLabel,
      provinceName: province?.properties.provinceName || '',
      geometry: feature.geometry,
      ...fields,
    };
  });

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
    municityAreas,
    filteredRegions,
    selectedRegion,
    summary,
    layer: getLayerLegend(layerId),
    searchEntries: buildSearchEntries(),
    timeFrame,
  };
};

export const mapFillByLevel = mapPalette.slate;

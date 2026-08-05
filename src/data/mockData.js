export const mockPoliticalEntities = [
  { id: 'marcos-jr', name: 'Ferdinand Marcos Jr.' },
  { id: 'robredo', name: 'Leni Robredo' },
  { id: 'duterte', name: 'Sara Duterte' },
  { id: 'example-party', name: 'Example Political Party' },
  { id: 'all', name: 'All Political Activity' },
];

export const mockTimeRanges = [
  { id: '24h', label: 'Last 24 Hours' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
];

export const mockRegions = [
  { id: 'region-1', region: 'Region I', name: 'Ilocos Region', baseActivity: 56, basePosts: 860, points: '90,110 210,90 260,170 240,260 120,250 70,180' },
  { id: 'car', region: 'CAR', name: 'Cordillera Administrative Region', baseActivity: 41, basePosts: 540, points: '220,130 330,110 380,180 320,245 220,210 195,165' },
  { id: 'region-2', region: 'Region II', name: 'Cagayan Valley', baseActivity: 78, basePosts: 1240, points: '360,100 520,90 560,190 470,275 340,240 320,165' },
  { id: 'ncr', region: 'NCR', name: 'National Capital Region', baseActivity: 92, basePosts: 2040, points: '330,295 390,280 430,320 400,370 330,355 305,320' },
  { id: 'region-3', region: 'Region III', name: 'Central Luzon', baseActivity: 83, basePosts: 1860, points: '220,300 330,275 430,315 410,430 245,430 190,355' },
  { id: 'region-4a', region: 'Region IV-A', name: 'CALABARZON', baseActivity: 71, basePosts: 1530, points: '390,360 520,340 590,415 560,525 430,525 405,440' },
  { id: 'region-4b', region: 'Region IV-B', name: 'MIMAROPA', baseActivity: 48, basePosts: 710, points: '155,455 295,440 360,525 315,635 185,625 135,540' },
  { id: 'region-5', region: 'Region V', name: 'Bicol Region', baseActivity: 67, basePosts: 1205, points: '380,475 540,455 620,540 565,650 420,630 360,565' },
  { id: 'region-6', region: 'Region VI', name: 'Western Visayas', baseActivity: 62, basePosts: 990, points: '150,685 280,660 360,720 325,835 190,820 125,750' },
  { id: 'region-7', region: 'Region VII', name: 'Central Visayas', baseActivity: 58, basePosts: 940, points: '315,690 450,680 515,760 470,870 345,855 300,775' },
  { id: 'region-8', region: 'Region VIII', name: 'Eastern Visayas', baseActivity: 51, basePosts: 820, points: '480,710 620,700 690,785 650,890 520,875 470,800' },
  { id: 'region-9', region: 'Region IX', name: 'Zamboanga Peninsula', baseActivity: 44, basePosts: 620, points: '110,885 240,870 290,965 235,1040 120,1010 85,940' },
  { id: 'region-10', region: 'Region X', name: 'Northern Mindanao', baseActivity: 72, basePosts: 1100, points: '255,900 395,885 450,980 390,1090 260,1070 220,980' },
  { id: 'region-11', region: 'Region XI', name: 'Davao Region', baseActivity: 81, basePosts: 1380, points: '425,915 565,900 630,990 580,1110 450,1090 400,1010' },
  { id: 'region-12', region: 'Region XII', name: 'SOCCSKSARGEN', baseActivity: 69, basePosts: 1040, points: '290,1020 425,1005 480,1090 425,1180 300,1160 255,1095' },
  { id: 'region-13', region: 'Region XIII', name: 'Caraga', baseActivity: 54, basePosts: 760, points: '560,1040 705,1015 760,1110 705,1200 575,1185 530,1105' },
  { id: 'nir', region: 'NIR', name: 'Negros Island Region', baseActivity: 60, basePosts: 930, points: '395,725 495,710 560,785 525,900 410,885 365,810' },
  { id: 'barmm', region: 'BARMM', name: 'Bangsamoro Autonomous Region in Muslim Mindanao', baseActivity: 47, basePosts: 880, points: '145,1085 295,1070 360,1155 300,1240 170,1220 125,1150' },
];

const entityModifiers = {
  'marcos-jr': { activity: 1.08, posts: 1.04, bias: 6 },
  robredo: { activity: 0.96, posts: 0.98, bias: -3 },
  duterte: { activity: 1.02, posts: 1.01, bias: 2 },
  'example-party': { activity: 0.9, posts: 0.93, bias: -5 },
  all: { activity: 1, posts: 1, bias: 0 },
};

const timeModifiers = {
  '24h': { activity: 0.82, posts: 0.36, updated: '10:42 AM' },
  '7d': { activity: 0.97, posts: 0.74, updated: 'Yesterday 6:30 PM' },
  '30d': { activity: 1.12, posts: 1, updated: 'Today 8:15 AM' },
};

const clamp = (value) => Math.max(0, Math.min(100, Math.round(value)));
const formatPosts = (value) => Math.max(0, Math.round(value));

export const getDisplayRegions = (politicalEntityId, timeRangeId) => {
  const entity = entityModifiers[politicalEntityId];
  const time = timeModifiers[timeRangeId];

  return mockRegions.map((region) => {
    const activity = clamp(region.baseActivity * entity.activity * time.activity + entity.bias);
    const posts = formatPosts(region.basePosts * entity.posts * time.posts);
    const colorIndex = activity >= 80 ? 4 : activity >= 60 ? 3 : activity >= 40 ? 2 : activity >= 20 ? 1 : 0;

    return { ...region, activity, posts, colorIndex };
  });
};

export const getSummaryStats = (politicalEntityId, timeRangeId) => {
  const entityName = mockPoliticalEntities.find((item) => item.id === politicalEntityId)?.name || 'All Political Activity';
  const time = timeModifiers[timeRangeId];

  return {
    postsAnalyzed: formatPosts(mockRegions.reduce((total, region) => total + region.basePosts, 0) * time.posts),
    regionsCovered: mockRegions.length,
    politicalEntity: entityName,
    lastUpdated: time.updated,
  };
};

export const getRegionDetails = (regions, regionId) => regions.find((region) => region.id === regionId);

export const activityLegend = [
  { label: 'Low', colorIndex: 0 },
  { label: 'Light', colorIndex: 1 },
  { label: 'Moderate', colorIndex: 2 },
  { label: 'High', colorIndex: 3 },
  { label: 'Very High', colorIndex: 4 },
];

export const mapFillByLevel = ['#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#334155'];
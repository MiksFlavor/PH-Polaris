export const PHILIPPINE_REGIONS = [
  {
    id: 'region-1',
    region: 'Region I',
    name: 'Ilocos Region',
    provinces: ['Ilocos Norte', 'Ilocos Sur', 'La Union', 'Pangasinan'],
  },
  {
    id: 'car',
    region: 'CAR',
    name: 'Cordillera Administrative Region',
    provinces: ['Abra', 'Apayao', 'Benguet', 'Ifugao', 'Kalinga', 'Mountain Province'],
  },
  {
    id: 'region-2',
    region: 'Region II',
    name: 'Cagayan Valley',
    provinces: ['Batanes', 'Cagayan', 'Isabela', 'Nueva Vizcaya', 'Quirino'],
  },
  {
    id: 'ncr',
    region: 'NCR',
    name: 'National Capital Region',
    provinces: ['Metropolitan Manila'],
  },
  {
    id: 'region-3',
    region: 'Region III',
    name: 'Central Luzon',
    provinces: ['Aurora', 'Bataan', 'Bulacan', 'Nueva Ecija', 'Pampanga', 'Tarlac', 'Zambales'],
  },
  {
    id: 'region-4a',
    region: 'Region IV-A',
    name: 'CALABARZON',
    provinces: ['Batangas', 'Cavite', 'Laguna', 'Quezon', 'Rizal'],
  },
  {
    id: 'region-4b',
    region: 'Region IV-B',
    name: 'MIMAROPA',
    provinces: ['Marinduque', 'Mindoro Occidental', 'Mindoro Oriental', 'Palawan', 'Romblon'],
  },
  {
    id: 'region-5',
    region: 'Region V',
    name: 'Bicol Region',
    provinces: ['Albay', 'Camarines Norte', 'Camarines Sur', 'Catanduanes', 'Masbate', 'Sorsogon'],
  },
  {
    id: 'region-6',
    region: 'Region VI',
    name: 'Western Visayas',
    provinces: ['Aklan', 'Antique', 'Capiz', 'Guimaras', 'Iloilo'],
  },
  {
    id: 'region-7',
    region: 'Region VII',
    name: 'Central Visayas',
    provinces: ['Bohol', 'Cebu'],
  },
  {
    id: 'region-8',
    region: 'Region VIII',
    name: 'Eastern Visayas',
    provinces: ['Biliran', 'Eastern Samar', 'Leyte', 'Northern Samar', 'Samar', 'Southern Leyte'],
  },
  {
    id: 'region-9',
    region: 'Region IX',
    name: 'Zamboanga Peninsula',
    provinces: ['Zamboanga del Norte', 'Zamboanga del Sur', 'Zamboanga Sibugay'],
  },
  {
    id: 'region-10',
    region: 'Region X',
    name: 'Northern Mindanao',
    provinces: ['Bukidnon', 'Camiguin', 'Lanao del Norte', 'Misamis Occidental', 'Misamis Oriental'],
  },
  {
    id: 'region-11',
    region: 'Region XI',
    name: 'Davao Region',
    provinces: ['Compostela Valley', 'Davao del Norte', 'Davao del Sur', 'Davao Oriental', 'Davao Occidental'],
  },
  {
    id: 'region-12',
    region: 'Region XII',
    name: 'SOCCSKSARGEN',
    provinces: ['Cotabato', 'Sarangani', 'South Cotabato', 'Sultan Kudarat'],
  },
  {
    id: 'region-13',
    region: 'Region XIII',
    name: 'Caraga',
    provinces: ['Agusan del Norte', 'Agusan del Sur', 'Dinagat Islands', 'Surigao del Norte', 'Surigao del Sur'],
  },
  {
    id: 'nir',
    region: 'NIR',
    name: 'Negros Island Region',
    provinces: ['Negros Occidental', 'Negros Oriental', 'Siquijor'],
  },
  {
    id: 'barmm',
    region: 'BARMM',
    name: 'Bangsamoro Autonomous Region in Muslim Mindanao',
    provinces: ['Basilan', 'Lanao del Sur', 'Maguindanao', 'Sulu', 'Tawi-Tawi'],
  },
];

export const PHILIPPINE_REGION_LOOKUP = Object.fromEntries(PHILIPPINE_REGIONS.map((region) => [region.id, region]));

export const PROVINCE_TO_REGION_ID = PHILIPPINE_REGIONS.reduce((lookup, region) => {
  region.provinces.forEach((province) => {
    lookup[province] = region.id;
  });

  return lookup;
}, {});
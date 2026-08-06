export function createMonochromeBasemapStyle() {
  return {
    version: 8,
    name: 'Polaris Neutral Basemap',
    sources: {
      carto: {
        type: 'raster',
        tiles: ['https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      },
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': '#eef2f7',
        },
      },
      {
        id: 'carto-raster',
        type: 'raster',
        source: 'carto',
        paint: {
          'raster-opacity': 1,
        },
      },
    ],
  };
}

# Geographic data attribution

`regions.json` and `provinces.json` are derived from real Philippine
administrative boundaries published by James Faeldon:

- Source: https://github.com/faeldon/philippines-json-maps (MIT License)
- Underlying shapefiles: https://github.com/altcoder/philippines-psgc-shapefiles
- Reference data: Philippine Standard Geographic Code (PSGC), as of 31 Dec 2023
- Resolution used: "lowres" (0.1% simplification), suitable for web rendering

These files were produced by merging the per-region "lowres" GeoJSON files
from the source repository's `2023/geojson/regions/lowres/` directory into
two flat FeatureCollections, rounding coordinates to 5 decimal places, and
reducing feature properties to the join keys POLARIS needs:

- `regions.json`: `regionCode` (PSGC), `regionName`
- `provinces.json`: `provinceCode` (PSGC), `provinceName`, `regionCode`, `regionName`

No geometry was altered, invented, or approximated — only re-packaged.

MIT License copyright (c) James Faeldon, per the source repository's LICENSE
file at the time of retrieval.

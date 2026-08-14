# Geographic data attribution

`regions.json`, `provinces.json`, `municities.json`, and the barangay files
under `public/data/barangays/` are derived from real Philippine
administrative boundaries published by James Faeldon:

- Source: https://github.com/faeldon/philippines-json-maps (MIT License)
- Underlying shapefiles: https://github.com/altcoder/philippines-psgc-shapefiles
- Reference data: Philippine Standard Geographic Code (PSGC), as of 31 Dec 2023
- Resolution used: "lowres" (0.1% simplification), suitable for web rendering

`regions.json`/`provinces.json`/`municities.json` were produced by merging
the per-region "lowres" GeoJSON files from the source repository's
`2023/geojson/regions/lowres/` and `2023/geojson/provdists/lowres/`
directories into flat FeatureCollections. The barangay files were produced
from `2023/geojson/municities/lowres/bgysubmuns-municity-*.json`, one output
file per municipality (matching the source layout) rather than merged, since
42,010 features nationwide is both too large to bundle and too many shapes
to render/hit-test at once — see VALIDATION.md.

In all cases coordinates were rounded to 5 decimal places and feature
properties were reduced to the join keys POLARIS needs (region/province/
municipality/barangay PSGC codes and names). No geometry was altered,
invented, or approximated — only re-packaged.

MIT License copyright (c) James Faeldon, per the source repository's LICENSE
file at the time of retrieval.

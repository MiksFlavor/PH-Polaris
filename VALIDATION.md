# POLARIS data validation report

Generated while integrating `PSGC-2Q-2026-Publication-Datafile.xlsx`, real GIS
boundaries, and the 2022 national election CSVs. This documents exactly what
matched, what didn't, and why — nothing here is silently hidden.

## 1. PSGC master directory (authoritative names + hierarchy)

Source: `PSGC-2Q-2026-Publication-Datafile.xlsx`, `PSGC` sheet, 43,768 rows.

| Level | Count |
|---|---|
| Regions | 18 |
| Provinces | 82 |
| Cities | 149 |
| Municipalities | 1,493 |
| Sub-municipalities (Manila's old districts) | 14 |
| Barangays | 42,010 |

All of the above are present in `src/data/psgc-index.json` with full
region → province → city/municipality → barangay hierarchy, resolved purely
from PSGC code prefixes (verified: every barangay's derived parent code
resolves to a real municipality/city/sub-municipality record — 0 orphans).
This index is independent of geometry and drives search/naming for every
level, including the 42,010 barangays that have no boundary geometry (see §2).

**Important known mismatch**: PSGC 2Q-2026 lists 18 regions (Negros Island
Region reinstated). The GIS boundary source used (see §2) is PSA/NAMRIA's
2023 release, which has **17** regions — NIR's two provinces (Negros
Occidental, Negros Oriental) still render as part of Region VI / Region VII
geographically. Names/search still work correctly; only the region-level
grouping reflects the 2023 boundary snapshot, not the 2026 NIR reinstatement.

## 2. Real GIS geometry

The uploaded `philippines-psgc-shapefiles-main.zip` (checked in the prior
pass) had every `.shp` file, at every admin level, as a 134-byte Git LFS
pointer — it contributed nothing.

**Update**: `phmastermapfiles.zip`, uploaded afterward, is a full local copy
of the `faeldon/philippines-json-maps` repository (23,851 files, 2011/2019/
2023 vintages, multiple resolutions) — real geometry, not LFS pointers. This
is the same dataset the region/province/municipality boundaries below were
already fetched from individually; the local copy made **barangay-level
(ADM4) geometry** newly practical, which the previous pass had explicitly
deferred as infeasible to fetch one-by-one over the network.

| Level | Features with real geometry | Source |
|---|---|---|
| Region (ADM1) | 17 | `src/data/geojson/regions.json` (bundled) |
| Province (ADM2) | 88 | `src/data/geojson/provinces.json` (bundled) |
| Municipality/City (ADM3) | 1,613 of 1,656 | `src/data/geojson/municities.json` (bundled) |
| Barangay (ADM4) | **40,401 of 42,010** | `public/data/barangays/<municityCode>.json` — 1,639 files, fetched on demand |

**Why barangay geometry is per-municipality files fetched on demand, not one
bundled file**: merged and cleaned, all barangays together are 14MB even
after coordinate rounding — too large to import into the JS bundle (already
flagged as a concern at 5.2MB), and 40,401 simultaneously-rendered/hit-
tested SVG shapes would freeze the browser regardless of file size. Instead,
`public/data/barangays/<municityCode>.json` (1,639 files, typically a few KB
to a few hundred KB each) load only when a user searches or clicks into a
specific municipality and switches to the Barangay level — consistent with
the earlier guidance in this project not to render all 42,010 barangays
simultaneously, extended from labels to polygons for the same reason.
`src/data/geojson/barangay-coverage.json` is a small (24KB) manifest of
which municipalities have a barangay file, so search/UI can know without
attempting a fetch.

Municipality gaps (43 of 1,656) and barangay gaps (1,609 of 42,010) are
upstream data gaps in this GIS tier (either `null` geometry in the source,
or enclave HUC/ICC cities merged into their surrounding polygon) — see the
original list in the prior version of this report; unchanged by this update.

## 3. Election CSV → PSGC join

Source: `pres.csv`, `vp.csv`, `sen.csv`, `prty.csv` — 105,971 precinct rows
each, 2022 national elections.

Join strategy: precinct rows were matched to a real municipality/city by
normalized name (uppercased, diacritics stripped, "City of" / "City" suffix
handling), disambiguated by region and then province where a name is
ambiguous (e.g. "San Jose" exists in 10 different provinces). The
**province/region a vote is credited to comes from the matched GIS feature,
not from the CSV's own `province`/`region` column** — this is what correctly
splits the CSV's single legacy "Maguindanao" into today's real Maguindanao
del Norte / del Sur, and resolves "COTABATO" (city) vs "Cotabato" (province)
ambiguity, without hand-editing precinct rows.

| Race | Provinces with matched data | Total votes | Unmatched votes | Unmatched % |
|---|---|---|---|---|
| President | 86 / 88 | 52,934,892 | 832,287 | 1.57% |
| Vice President | 86 / 88 | 51,483,096 | 822,269 | 1.60% |
| Senate | 86 / 88 | 427,374,421 (12 votes/ballot) | 7,993,029 | 1.87% |
| Party-list | 86 / 88 | 36,131,435 | 646,206 | 1.79% |

Unmatched votes break down as:
- **~1.3M ballots** (`region == 'OAV'`): overseas voters (AMERICAS, ASIA
  PACIFIC, EUROPE, MIDDLE EAST AND AFRICA) — correctly excluded as
  non-Philippine geography, per the instructions. Not mapped to any polygon.
- **10 small precinct clusters** matching the municipality gaps in §2 above
  (Tagoloan/Lanao del Sur, Santo Tomas/Pampanga, City of Tacloban, etc.) —
  votes exist in the CSV but the municipality they belong to isn't
  separately resolvable in this pass, so they're excluded from province
  totals rather than guessed into the wrong place.

Province-level results were also aggregated to region level, and the
Presidential race was additionally aggregated at municipality level
(1,603 of 1,613 geometry-bearing municipalities have matched results).
Senate/VP/party-list were not aggregated to municipality level in this pass.

**Real result sanity check** (province-level winners, President): Marcos 69,
Robredo 15, Pacquiao 1, Mangondato 1 — matches the well-known outcome of the
2022 election, which is a strong signal the join is behaving correctly
rather than silently misattributing votes.

## 4. What this does NOT include (explicitly deferred, not fabricated)

- Senate/VP/party-list as separate map layers (data is computed and stored
  in `src/data/election-2022.json`, just not wired to the layer dropdown yet).
- Municipality-level aggregation for VP/Senate/party-list (President only).
- Barangay-level election results (not aggregated to that granularity in
  this pass); the election layer shows barangays as neutral/no-data rather
  than fabricating a result.
- A live, in-app "unmatched locations" report UI — the match/mismatch data
  above was generated by the ETL scripts and is reported here rather than
  surfaced as a running dashboard panel.
- 1,609 barangays and 43 municipalities without geometry in this GIS tier
  (see §2) — present in search/name index, absent from the map itself.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityLegend } from './components/ActivityLegend';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { FiltersPanel } from './components/FiltersPanel';
import { Header } from './components/Header';
import { PhilippinesMap } from './components/PhilippinesMap';
import { LayerSelector } from './components/LayerSelector';
import { PoliticalSelector } from './components/PoliticalSelector';
import { SearchBar } from './components/SearchBar';
import { RegionDetails } from './components/RegionDetails';
import { SummaryStats } from './components/SummaryStats';
import { TimeSelector } from './components/TimeSelector';
import { buildBarangayAreasForFeatures, buildDashboardModel, layerOptions, loadBarangayGeometry, mockPoliticalEntities, mockTimeRanges } from './data/polaris-data';

const initialPoliticalEntityId = 'marcos-jr';
const initialTimeRangeId = '24h';
const initialRegionId = '0200000000'; // Cagayan Valley (PSGC region code)
const initialLayerId = layerOptions[0].id;

const initialFilters = {
  sourceId: 'all',
  partyId: 'all',
  yearId: 'all',
  adminLevelId: 'all',
  minVolume: 0,
};

export default function App() {
  const [layerId, setLayerId] = useState(initialLayerId);
  const [politicalEntityId, setPoliticalEntityId] = useState(initialPoliticalEntityId);
  const [timeRangeId, setTimeRangeId] = useState(initialTimeRangeId);
  const [selectedRegionId, setSelectedRegionId] = useState(initialRegionId);
  const [hoveredRegionId, setHoveredRegionId] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  // No initial focusTarget: the map's own mount-time bounds already show the
  // whole Philippines, which is the desired first view (not zoomed into one
  // region). Search results set this to jump to a specific area afterward.
  const [focusTarget, setFocusTarget] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  // Which municipality's barangays to show — barangay geometry is fetched
  // per-municipality on demand, never all 42,010 at once (see
  // VALIDATION.md and the comments in polaris-data.js).
  const [focusedMunicityId, setFocusedMunicityId] = useState(null);
  const [barangayFeatures, setBarangayFeatures] = useState([]);
  const [barangayLoading, setBarangayLoading] = useState(false);

  const dashboard = useMemo(() => {
    return buildDashboardModel({
      layerId,
      politicalEntityId,
      timeRangeId,
      filters: {
        ...filters,
        selectedRegionId,
      },
    });
  }, [filters, layerId, politicalEntityId, selectedRegionId, timeRangeId]);

  // Fetch the focused municipality's real barangay geometry only when the
  // user is actually viewing the Barangay level — not eagerly, and not for
  // every municipality up front.
  useEffect(() => {
    if (filters.adminLevelId !== 'barangay' || !focusedMunicityId) {
      setBarangayFeatures([]);
      return;
    }

    let isActive = true;
    setBarangayLoading(true);

    loadBarangayGeometry(focusedMunicityId).then((features) => {
      if (isActive) {
        setBarangayFeatures(features);
        setBarangayLoading(false);
      }
    });

    return () => {
      isActive = false;
    };
  }, [filters.adminLevelId, focusedMunicityId]);

  const barangayAreas = useMemo(() => {
    if (barangayFeatures.length === 0) {
      return [];
    }

    return buildBarangayAreasForFeatures({ layerId, politicalEntityId, timeRangeId, filters, features: barangayFeatures });
  }, [barangayFeatures, layerId, politicalEntityId, timeRangeId, filters]);

  const handleFilterChange = (updates) => {
    setFilters((current) => ({
      ...current,
      ...updates,
    }));
  };

  const handleSearchSelect = (entry) => {
    setSelectedRegionId(entry.regionId);

    if (entry.category === 'Municipality' || entry.category === 'City') {
      setFocusedMunicityId(entry.hasGeometry ? entry.areaId : null);
    } else if (entry.category === 'Barangay') {
      setFocusedMunicityId(entry.municityId || null);
    }

    // Jumping to a province/municipality/barangay result only makes visual
    // sense if the map is actually showing that level's boundaries;
    // auto-switch so the searched area is the thing that lights up, not
    // its whole parent.
    if (['province', 'municipality', 'barangay'].includes(entry.level) && filters.adminLevelId !== entry.level) {
      handleFilterChange({ adminLevelId: entry.level });
    }

    setFocusTarget({ areaId: entry.areaId, level: entry.level, token: Date.now() });
  };

  const handleRegionClick = useCallback((regionId, areaInfo) => {
    setSelectedRegionId(regionId);

    if (areaInfo?.level === 'municipality') {
      setFocusedMunicityId(areaInfo.id);
    }
  }, []);

  const handleRegionHover = useCallback((hoverPayload, event) => {
    setHoveredRegionId(hoverPayload.regionId);
    setTooltip({ id: hoverPayload.tooltipId, x: event.clientX, y: event.clientY });
  }, []);

  const handleRegionHoverEnd = useCallback(() => {
    setHoveredRegionId(null);
    setTooltip(null);
  }, []);

  return (
    <div className="min-vh-100 text-body polaris-app-shell">
      <Header />

      <main id="dashboard" className="container-fluid px-3 px-lg-4 py-4 py-lg-5 polaris-shell">
        <section className="polaris-toolbar polaris-panel mb-3 mb-lg-4">
          <div className="row g-3 align-items-end">
            <div className="col-12 col-xl-8">
              <SearchBar entries={dashboard.searchEntries} onSelect={handleSearchSelect} />
            </div>
            <div className="col-12 col-xl-4">
              <LayerSelector value={layerId} onChange={setLayerId} />
            </div>
          </div>
        </section>

        <section className="mb-3 mb-lg-4">
          <SummaryStats stats={dashboard.summary} />
        </section>

        <section className="row g-3 align-items-start polaris-main-grid">
          <div className="col-12 col-xl-2 polaris-sticky-column">
            <div className="d-flex flex-column gap-3">
              <PoliticalSelector entities={mockPoliticalEntities} value={politicalEntityId} label="Politician Filter" onChange={setPoliticalEntityId} />
              <TimeSelector ranges={mockTimeRanges} value={timeRangeId} label="Date Range" onChange={setTimeRangeId} />
              <FiltersPanel filters={filters} onChange={handleFilterChange} />
            </div>
          </div>

          <div className="col-12 col-xl-7">
            <div className="polaris-map-stack">
              <PhilippinesMap
                regions={dashboard.regions}
                provinceAreas={dashboard.provinceAreas}
                municityAreas={dashboard.municityAreas}
                barangayAreas={barangayAreas}
                barangayLoading={barangayLoading}
                focusedMunicityId={focusedMunicityId}
                selectedRegionId={selectedRegionId}
                hoveredRegionId={hoveredRegionId}
                tooltip={tooltip}
                focusTarget={focusTarget}
                adminLevelId={filters.adminLevelId}
                onRegionClick={handleRegionClick}
                onRegionHover={handleRegionHover}
                onRegionHoverEnd={handleRegionHoverEnd}
              />
              <ActivityLegend layer={dashboard.layer} />
            </div>
          </div>

          <div className="col-12 col-xl-3 polaris-sticky-column">
            <div className="d-flex flex-column gap-3">
              <RegionDetails region={dashboard.selectedRegion} />
              <AnalyticsCharts region={dashboard.selectedRegion} />
            </div>
          </div>
        </section>

        <section id="about" className="polaris-panel mt-3 mt-lg-4">
          <div className="polaris-panel-title">About</div>
          <p className="mb-0 small text-secondary">
            Region, province, municipality/city, and barangay boundaries are real PSGC/PSA-NAMRIA geography (40,401 of 42,010 barangays; see VALIDATION.md for exact coverage).
            Barangay boundaries load per-municipality — search or click into one first. The "Political Party Activity" and "Discussion Volume" layers are mock scraper data for
            interface development; "2022 Presidential Election" is real COMELEC precinct data joined to that geography.
          </p>
        </section>
      </main>
    </div>
  );
}
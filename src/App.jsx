import { useCallback, useMemo, useState } from 'react';
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
import { buildDashboardModel, layerOptions, mockPoliticalEntities, mockTimeRanges } from './data/polaris-data';

const initialPoliticalEntityId = 'marcos-jr';
const initialTimeRangeId = '24h';
const initialRegionId = 'region-2';
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
  const [focusTarget, setFocusTarget] = useState({ regionId: initialRegionId, token: 0 });
  const [filters, setFilters] = useState(initialFilters);

  const dashboard = useMemo(() => {
    return buildDashboardModel({
      layerId,
      politicalEntityId,
      timeRangeId,
      filters: {
        ...filters,
        selectedRegionId,
        maxVolume: 5000,
      },
    });
  }, [filters, layerId, politicalEntityId, selectedRegionId, timeRangeId]);

  const handleFilterChange = (updates) => {
    setFilters((current) => ({
      ...current,
      ...updates,
    }));
  };

  const handleSearchSelect = (entry) => {
    setSelectedRegionId(entry.targetRegionId);
    setFocusTarget({ regionId: entry.targetRegionId, token: Date.now() });
  };

  const handleRegionHover = useCallback((regionId, event) => {
    setHoveredRegionId(regionId);
    setTooltip({ id: regionId, x: event.clientX, y: event.clientY });
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
                selectedRegionId={selectedRegionId}
                hoveredRegionId={hoveredRegionId}
                tooltip={tooltip}
                focusTarget={focusTarget}
                adminLevelId={filters.adminLevelId}
                onRegionClick={setSelectedRegionId}
                onRegionHover={handleRegionHover}
                onRegionHoverEnd={handleRegionHoverEnd}
              />
              <div className="polaris-map-legend-shell">
                <ActivityLegend layer={dashboard.layer} />
              </div>
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
            POLARIS scrapes political discussion by geography and shades each region by post volume and dominant party. Dataset shown is mock data for interface development.
          </p>
        </section>
      </main>
    </div>
  );
}
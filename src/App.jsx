import { useState } from 'react';
import { ActivityLegend } from './components/ActivityLegend';
import { Header } from './components/Header';
import { PhilippinesMap } from './components/PhilippinesMap';
import { PoliticalSelector } from './components/PoliticalSelector';
import { RegionDetails } from './components/RegionDetails';
import { SummaryStats } from './components/SummaryStats';
import { TimeSelector } from './components/TimeSelector';
import { getDisplayRegions, getRegionDetails, getSummaryStats, mockPoliticalEntities, mockTimeRanges } from './data/mockData';

const initialPoliticalEntityId = 'marcos-jr';
const initialTimeRangeId = '24h';
const initialRegionId = 'region-2';

export default function App() {
  const [politicalEntityId, setPoliticalEntityId] = useState(initialPoliticalEntityId);
  const [timeRangeId, setTimeRangeId] = useState(initialTimeRangeId);
  const [selectedRegionId, setSelectedRegionId] = useState(initialRegionId);
  const [hoveredRegionId, setHoveredRegionId] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  const displayRegions = getDisplayRegions(politicalEntityId, timeRangeId);
  const summaryStats = getSummaryStats(politicalEntityId, timeRangeId);
  const selectedRegion = getRegionDetails(displayRegions, selectedRegionId);

  return (
    <div className="min-vh-100 bg-body-tertiary text-body">
      <Header />

      <main id="dashboard" className="container-fluid px-3 px-lg-4 py-4 py-lg-5 polaris-shell">
        <section className="row g-3 align-items-stretch">
          <div className="col-12 col-xl-3">
            <PoliticalSelector entities={mockPoliticalEntities} value={politicalEntityId} onChange={setPoliticalEntityId} />
          </div>
          <div className="col-12 col-xl-3">
            <TimeSelector ranges={mockTimeRanges} value={timeRangeId} onChange={setTimeRangeId} />
          </div>
          <div className="col-12 col-xl-6">
            <ActivityLegend />
          </div>
        </section>

        <section className="row g-3 mt-1 mt-lg-2 align-items-stretch">
          <div className="col-12 col-xl-9">
            <PhilippinesMap
              regions={displayRegions}
              selectedRegionId={selectedRegionId}
              hoveredRegionId={hoveredRegionId}
              tooltip={tooltip}
              onRegionClick={setSelectedRegionId}
              onRegionHover={(regionId, event) => {
                setHoveredRegionId(regionId);
                setTooltip({ id: regionId, x: event.clientX, y: event.clientY });
              }}
              onRegionHoverEnd={() => {
                setHoveredRegionId(null);
                setTooltip(null);
              }}
            />
          </div>

          <div className="col-12 col-xl-3">
            <RegionDetails region={selectedRegion} />
          </div>
        </section>

        <section className="mt-3 mt-lg-4">
          <SummaryStats stats={summaryStats} />
        </section>

        <section id="about" className="polaris-panel mt-3 mt-lg-4">
          <div className="polaris-panel-title">About</div>
          <p className="mb-0 small text-secondary">
            POLARIS is my personal project to visualize political activity in the Philippines. The map and statistics are based on scraped data and I intended for informational purposes and upskilling my stack only. POLARIS does not support, endorse, or represent any political entity.
          </p>
        </section>
      </main>
    </div>
  );
}
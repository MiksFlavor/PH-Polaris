import { adminLevelOptions, electionYearOptions, politicalPartyOptions, sentimentOptions, sourceOptions } from '../data/polaris-data';

export function FiltersPanel({ filters, onChange }) {
  return (
    <section className="polaris-panel polaris-sidebar-panel">
      <div className="polaris-panel-title">Filters</div>

      <div className="d-flex flex-column gap-3">
        <FilterField label="Source">
          <select className="form-select polaris-control" value={filters.sourceId} onChange={(event) => onChange({ sourceId: event.target.value })}>
            {sourceOptions.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Political Party">
          <select className="form-select polaris-control" value={filters.partyId} onChange={(event) => onChange({ partyId: event.target.value })}>
            <option value="all">All Parties</option>
            {politicalPartyOptions.map((party) => (
              <option key={party.id} value={party.id}>
                {party.name}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Election Year">
          <select className="form-select polaris-control" value={filters.electionYearId} onChange={(event) => onChange({ electionYearId: event.target.value })}>
            <option value="all">All Years</option>
            {electionYearOptions.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Administrative Level">
          <select className="form-select polaris-control" value={filters.adminLevelId} onChange={(event) => onChange({ adminLevelId: event.target.value })}>
            {adminLevelOptions.map((level) => (
              <option key={level.id} value={level.id}>
                {level.name}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Sentiment">
          <select className="form-select polaris-control" value={filters.sentimentId} onChange={(event) => onChange({ sentimentId: event.target.value })}>
            {sentimentOptions.map((sentiment) => (
              <option key={sentiment.id} value={sentiment.id}>
                {sentiment.name}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label={`Minimum Volume ${filters.minVolume}`}>
          <input
            className="form-range polaris-range"
            type="range"
            min="0"
            max="5000"
            step="100"
            value={filters.minVolume}
            onChange={(event) => onChange({ minVolume: Number(event.target.value) })}
          />
        </FilterField>
      </div>
    </section>
  );
}

function FilterField({ label, children }) {
  return (
    <label className="d-flex flex-column gap-2">
      <span className="polaris-filter-label">{label}</span>
      {children}
    </label>
  );
}

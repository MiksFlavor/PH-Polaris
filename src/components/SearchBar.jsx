import { useMemo, useRef, useState } from 'react';

export function SearchBar({ entries, onSelect }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const blurTimeoutRef = useRef(null);

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return entries.slice(0, 8);
    }

    return entries
      .filter((entry) => `${entry.label} ${entry.category} ${entry.regionName}`.toLowerCase().includes(normalizedQuery))
      .sort((left, right) => left.sortWeight - right.sortWeight)
      .slice(0, 8);
  }, [entries, query]);

  const handleBlur = () => {
    // Delay closing so a result click registers before the dropdown unmounts.
    blurTimeoutRef.current = window.setTimeout(() => setIsOpen(false), 150);
  };

  const handleFocus = () => {
    window.clearTimeout(blurTimeoutRef.current);
    setIsOpen(true);
  };

  return (
    <div className="polaris-search">
      <label className="w-100">
        <span className="form-label polaris-label mb-2">Search</span>
        <input
          className="form-control polaris-control"
          type="search"
          value={query}
          placeholder="Region, province, municipality, barangay, politician, party"
          onChange={(event) => setQuery(event.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </label>

      {isOpen && results.length > 0 ? (
        <div className="polaris-search-results">
          {results.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className="polaris-search-result"
              onClick={() => {
                onSelect(entry);
                setQuery(entry.label);
                setIsOpen(false);
              }}
            >
              <span className="polaris-search-result-label">{entry.label}</span>
              <span className="polaris-search-result-meta">{entry.category}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

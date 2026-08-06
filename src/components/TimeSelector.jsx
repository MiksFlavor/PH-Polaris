export function TimeSelector({ ranges, value, onChange, label = 'Time Range' }) {
  return (
    <label className="w-100">
      <span className="form-label polaris-label">{label}</span>
      <select className="form-select polaris-control" value={value} onChange={(event) => onChange(event.target.value)}>
        {ranges.map((range) => (
          <option key={range.id} value={range.id}>
            {range.label}
          </option>
        ))}
      </select>
    </label>
  );
}
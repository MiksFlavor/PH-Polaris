export function PoliticalSelector({ entities, value, onChange }) {
  return (
    <label className="w-100">
      <span className="form-label polaris-label">Political Entity</span>
      <select className="form-select polaris-control" value={value} onChange={(event) => onChange(event.target.value)}>
        {entities.map((entity) => (
          <option key={entity.id} value={entity.id}>
            {entity.name}
          </option>
        ))}
      </select>
    </label>
  );
}
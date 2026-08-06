import { layerOptions } from '../data/polaris-data';

export function LayerSelector({ value, onChange }) {
  return (
    <label className="w-100">
      <span className="form-label polaris-label mb-2">Active Layer</span>
      <select className="form-select polaris-control" value={value} onChange={(event) => onChange(event.target.value)}>
        {layerOptions.map((layer) => (
          <option key={layer.id} value={layer.id}>
            {layer.label}
          </option>
        ))}
      </select>
    </label>
  );
}

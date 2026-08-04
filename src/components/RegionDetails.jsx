export function RegionDetails({ region }) {
  return (
    <section className="polaris-panel h-100">
      <div className="polaris-panel-title">Region Details</div>

      {region ? (
        <div className="d-flex flex-column gap-3">
          <div>
            <div className="polaris-region-label">{region.region}</div>
            <div className="h5 mb-0 mt-1 fw-semibold">{region.name}</div>
          </div>

          <dl className="mb-0 polaris-details-list">
            <div className="polaris-detail-row">
              <dt>Activity</dt>
              <dd>{region.activity}</dd>
            </div>
            <div className="polaris-detail-row">
              <dt>Posts Analyzed</dt>
              <dd>{region.posts.toLocaleString()}</dd>
            </div>
            <div className="polaris-detail-row">
              <dt>Data Status</dt>
              <dd>Mock Data</dd>
            </div>
          </dl>
        </div>
      ) : (
        <div className="small text-secondary">Select a region on the map to inspect its mock activity.</div>
      )}
    </section>
  );
}
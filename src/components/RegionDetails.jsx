export function RegionDetails({ region, summary }) {
  return (
    <section className="polaris-panel h-100">
      <div className="polaris-panel-title">Selected Region</div>

      {region ? (
        <div className="d-flex flex-column gap-3">
          <div>
            <div className="polaris-region-label">{region.region}</div>
            <div className="h5 mb-0 mt-1 fw-semibold">{region.name}</div>
          </div>

          <dl className="mb-0 polaris-details-list">
            <div className="polaris-detail-row">
              <dt>Discussion Share</dt>
              <dd>{region.discussionShare}%</dd>
            </div>
            <div className="polaris-detail-row">
              <dt>Post Count</dt>
              <dd>{region.discussionVolume.toLocaleString()}</dd>
            </div>
            <div className="polaris-detail-row">
              <dt>Engagement</dt>
              <dd>{region.engagementCount.toLocaleString()}</dd>
            </div>
            <div className="polaris-detail-row">
              <dt>Dominant Politician</dt>
              <dd>{region.dominantPolitician.name}</dd>
            </div>
            <div className="polaris-detail-row">
              <dt>Dominant Party</dt>
              <dd>{region.dominantParty.name}</dd>
            </div>
            <div className="polaris-detail-row">
              <dt>Sentiment</dt>
              <dd>{region.sentiment.label}</dd>
            </div>
          </dl>

          <div className="polaris-subpanel">
            <div className="polaris-subpanel-title">Current Discussion Summary</div>
            <p className="mb-0 small text-secondary">{region.trendingTopic}. Current selection is aligned with {summary?.activeLayer || 'the active layer'}.</p>
          </div>

          <div className="polaris-subpanel">
            <div className="polaris-subpanel-title">Historical Reference</div>
            <div className="small text-secondary">2022 vote share: {region.historicalVoteShare}%</div>
            <div className="small text-secondary">Comparison delta: {region.comparisonDelta >= 0 ? '+' : ''}{region.comparisonDelta}%</div>
          </div>

          <div className="polaris-subpanel">
            <div className="polaris-subpanel-title">Recent Scraped Posts</div>
            <div className="d-flex flex-column gap-2 small text-secondary">
              {region.recentPosts.map((post) => (
                <p key={post} className="mb-0">
                  {post}
                </p>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="small text-secondary">Select a region on the map to inspect its discussion profile.</div>
      )}
    </section>
  );
}
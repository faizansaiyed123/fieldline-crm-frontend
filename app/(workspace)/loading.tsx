export default function WorkspaceLoading() {
  return (
    <div className="page" aria-busy="true" aria-label="Loading workspace">
      <div className="skeleton-title">
        <span />
        <div className="skeleton-heading" />
        <div className="skeleton-copy" />
      </div>
      <div className="stats-grid">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="skeleton-card" />)}
      </div>
      <div className="content-grid two-up">
        <div className="panel skeleton-panel" />
        <div className="panel skeleton-panel" />
      </div>
    </div>
  );
}

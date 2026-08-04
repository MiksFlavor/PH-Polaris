export function Header() {
  return (
    <header className="border-bottom bg-white polaris-header">
      <div className="container-fluid px-3 px-lg-4 py-3 d-flex align-items-center justify-content-between gap-3">
        <div className="d-flex align-items-center gap-3">
          <div className="polaris-mark">P</div>
          <div>
            <div className="polaris-brand">POLARIS</div>
            <div className="text-secondary small">Philippine political activity visualization</div>
          </div>
        </div>

        <nav className="d-flex align-items-center gap-3 gap-lg-4 small">
          <a className="polaris-nav-link" href="#dashboard">
            Dashboard
          </a>
          <a className="polaris-nav-link" href="#about">
            About
          </a>
        </nav>
      </div>
    </header>
  );
}
/** Drifting brand glows, a faint beam of light and a vignette, behind every app page's scroll area (see .app-backdrop) */
export default function AppBackdrop() {
  return (
    <div aria-hidden className="app-backdrop">
      <div className="app-backdrop__glow" />
      <div className="app-backdrop__glow" />
      <div className="app-backdrop__beam" />
      <div className="app-backdrop__finish" />
    </div>
  );
}

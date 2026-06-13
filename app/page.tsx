import { SafetyZoneDemo } from "./safety-zone-demo";

export default function Home() {
  return (
    <main className="page">
      <header className="topbar">
        <div className="brand">
          <div className="mark">AI</div>
          <div>
            <h1>Physical AI Safety Zone</h1>
            <p>Supervision edge agent + Vercel control room</p>
          </div>
        </div>
        <div className="status-pill">
          <span className="status-dot" />
          Production demo surface
        </div>
      </header>

      <SafetyZoneDemo />

      <section className="architecture" aria-label="System architecture">
        <article className="step">
          <span>01</span>
          <h2>Camera</h2>
          <p>Webcam or IP camera frames are processed on the local edge machine.</p>
        </article>
        <article className="step">
          <span>02</span>
          <h2>Supervision</h2>
          <p>YOLO detections become `sv.Detections`, then ByteTrack and PolygonZone handle IDs and zone occupancy.</p>
        </article>
        <article className="step">
          <span>03</span>
          <h2>Physical output</h2>
          <p>The edge agent emits `ALERT_ON` or `ALERT_OFF` to a serial LED, buzzer, relay, or controller.</p>
        </article>
        <article className="step">
          <span>04</span>
          <h2>Cloud dashboard</h2>
          <p>Events can be posted to this Vercel app for a deployable demo and stakeholder review.</p>
        </article>
      </section>
    </main>
  );
}

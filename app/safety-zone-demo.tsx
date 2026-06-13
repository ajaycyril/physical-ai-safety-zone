"use client";

import { useEffect, useMemo, useState } from "react";
import { computeSafetyFrame, type SafetyFrame } from "../lib/safety-sim";

type RemoteEvent = {
  id: string;
  timestamp: string;
  alert: boolean;
  zoneCount: number;
  maxDwellSeconds: number;
  source: string;
};

const POLYGON_POINTS = "166,126 512,110 562,396 118,420";

export function SafetyZoneDemo() {
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [tick, setTick] = useState(0);
  const [remoteEvents, setRemoteEvents] = useState<RemoteEvent[]>([]);

  useEffect(() => {
    if (!running) {
      return;
    }

    const interval = window.setInterval(() => {
      setTick((value) => value + speed);
    }, 120);

    return () => window.clearInterval(interval);
  }, [running, speed]);

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      try {
        const response = await fetch("/api/events", { cache: "no-store" });
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as { events: RemoteEvent[] };
        if (!cancelled) {
          setRemoteEvents(payload.events.slice(0, 4));
        }
      } catch {
        // The simulator should remain useful even when the telemetry endpoint is idle.
      }
    }

    loadEvents();
    const interval = window.setInterval(loadEvents, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const frame = useMemo<SafetyFrame>(() => computeSafetyFrame(tick), [tick]);
  const maxDwell = Math.max(0, ...frame.tracks.map((track) => track.dwellSeconds));
  const latestEvents =
    remoteEvents.length > 0
      ? remoteEvents
      : frame.events.map((event) => ({
          id: event.id,
          timestamp: event.timestamp,
          alert: event.alert,
          zoneCount: event.zoneCount,
          maxDwellSeconds: event.maxDwellSeconds,
          source: "simulator",
        }));

  return (
    <section className="dashboard" aria-label="Safety zone dashboard">
      <section className="panel feed-panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Live No-Go Zone Monitor</h2>
            <p className="panel-subtitle">Simulated feed mirrors the local supervision edge-agent output.</p>
          </div>
          <div className="status-pill" style={{ color: frame.alert ? "#bf2d25" : "#147d52", background: "#fff" }}>
            <span className="status-dot" style={{ background: frame.alert ? "#bf2d25" : "#147d52" }} />
            {frame.alert ? "Alert active" : "Zone clear"}
          </div>
        </div>

        <div className="feed-wrap">
          <svg className="feed-svg" viewBox="0 0 680 430" role="img" aria-label="Simulated camera feed with tracked people and restricted polygon zone">
            <rect x="0" y="0" width="680" height="430" fill="transparent" />
            <path d="M40 330 L640 288" stroke="#a9a294" strokeWidth="18" opacity="0.42" />
            <path d="M88 182 L596 165" stroke="#b6afa3" strokeWidth="12" opacity="0.5" />
            <polygon
              points={POLYGON_POINTS}
              fill={frame.alert ? "rgba(191,45,37,0.20)" : "rgba(20,125,82,0.16)"}
              stroke={frame.alert ? "#bf2d25" : "#147d52"}
              strokeDasharray="10 7"
              strokeWidth="4"
            />
            <text x="134" y="112" fill={frame.alert ? "#8c1f19" : "#0e5f3e"} fontSize="16" fontWeight="800">
              RESTRICTED ZONE
            </text>

            {frame.tracks.map((track) => (
              <g key={track.id}>
                <polyline points={track.trace.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke="#5b625e" strokeWidth="3" opacity="0.45" />
                <rect
                  x={track.x - 26}
                  y={track.y - 72}
                  width="52"
                  height="92"
                  rx="7"
                  fill="rgba(255,255,255,0.24)"
                  stroke={track.inZone ? "#bf2d25" : "#1f2522"}
                  strokeWidth="4"
                />
                <circle cx={track.x} cy={track.y - 50} r="14" fill="#1f2522" />
                <line x1={track.x} x2={track.x} y1={track.y - 36} y2={track.y - 10} stroke="#1f2522" strokeWidth="8" strokeLinecap="round" />
                <line x1={track.x - 22} x2={track.x + 22} y1={track.y - 26} y2={track.y - 28} stroke="#1f2522" strokeWidth="7" strokeLinecap="round" />
                <line x1={track.x - 11} x2={track.x - 19} y1={track.y - 10} y2={track.y + 18} stroke="#1f2522" strokeWidth="7" strokeLinecap="round" />
                <line x1={track.x + 11} x2={track.x + 19} y1={track.y - 10} y2={track.y + 18} stroke="#1f2522" strokeWidth="7" strokeLinecap="round" />
                <rect x={track.x - 36} y={track.y - 104} width="72" height="24" rx="5" fill={track.inZone ? "#bf2d25" : "#1f2522"} />
                <text x={track.x} y={track.y - 87} fill="#fffdfa" fontSize="13" fontWeight="800" textAnchor="middle">
                  ID {track.id}
                </text>
                {track.inZone ? (
                  <text x={track.x} y={track.y + 42} fill="#8c1f19" fontSize="13" fontWeight="800" textAnchor="middle">
                    {track.dwellSeconds.toFixed(1)}s
                  </text>
                ) : null}
              </g>
            ))}
          </svg>
        </div>

        <div className="controls">
          <button className="button" type="button" onClick={() => setRunning((value) => !value)}>
            {running ? "Pause" : "Resume"}
          </button>
          <button className="button secondary" type="button" onClick={() => setTick(0)}>
            Reset
          </button>
          <label className="range-control">
            Speed
            <input
              aria-label="Simulation speed"
              max="3"
              min="0.5"
              onChange={(event) => setSpeed(Number(event.target.value))}
              step="0.5"
              type="range"
              value={speed}
            />
            {speed.toFixed(1)}x
          </label>
        </div>
      </section>

      <aside className="side-stack">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Operational State</h2>
              <p className="panel-subtitle">From simulator or posted edge-agent events.</p>
            </div>
          </div>
          <div className="metrics">
            <div className={`metric ${frame.alert ? "alert" : "clear"}`}>
              <span>Zone status</span>
              <strong>{frame.alert ? "ALERT" : "CLEAR"}</strong>
            </div>
            <div className="metric">
              <span>People in zone</span>
              <strong>{frame.zoneCount}</strong>
            </div>
            <div className="metric">
              <span>Tracked people</span>
              <strong>{frame.tracks.length}</strong>
            </div>
            <div className="metric">
              <span>Max dwell</span>
              <strong>{maxDwell.toFixed(1)}s</strong>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Recent Events</h2>
              <p className="panel-subtitle">POST local edge events to `/api/events`.</p>
            </div>
          </div>
          <div className="event-list">
            {latestEvents.map((event) => (
              <div className="event" key={event.id}>
                <strong>{event.alert ? "Restricted-zone alert" : "Zone clear"} from {event.source}</strong>
                <span>
                  count {event.zoneCount} · max dwell {event.maxDwellSeconds.toFixed(1)}s · {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel code-panel">
          <p>Run the actual physical loop locally. The Vercel app is the dashboard; the camera and hardware stay near the workcell.</p>
          <pre className="code">{`python edge_agent/safety_zone_agent.py \\
  --source 0 \\
  --zone "160,130 500,110 560,400 120,420" \\
  --webhook-url "$VERCEL_URL/api/events" \\
  --serial-port COM5`}</pre>
        </section>
      </aside>
    </section>
  );
}

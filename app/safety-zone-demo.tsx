"use client";

import { type PointerEvent, useCallback, useEffect, useRef, useState } from "react";

type Point = {
  x: number;
  y: number;
};

type RemoteEvent = {
  id: string;
  timestamp: string;
  alert: boolean;
  zoneCount: number;
  maxDwellSeconds: number;
  source: string;
};

type LocalEvent = RemoteEvent & {
  motionRatio: number;
};

const SAMPLE_ZONE: Point[] = [
  { x: 0.26, y: 0.22 },
  { x: 0.75, y: 0.2 },
  { x: 0.78, y: 0.72 },
  { x: 0.24, y: 0.76 },
];

const ANALYSIS_WIDTH = 192;
const ANALYSIS_HEIGHT = 108;

export function SafetyZoneDemo() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const analysisRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previousFrameRef = useRef<Uint8ClampedArray | null>(null);
  const animationRef = useRef<number | null>(null);
  const alertStartedAtRef = useRef<number | null>(null);
  const lastEventAtRef = useRef(0);

  const [cameraState, setCameraState] = useState<"idle" | "starting" | "live" | "error">("idle");
  const [cameraError, setCameraError] = useState("");
  const [zone, setZone] = useState<Point[]>(SAMPLE_ZONE);
  const [locked, setLocked] = useState(true);
  const [alert, setAlert] = useState(false);
  const [motionRatio, setMotionRatio] = useState(0);
  const [dwellSeconds, setDwellSeconds] = useState(0);
  const [fps, setFps] = useState(0);
  const [localEvents, setLocalEvents] = useState<LocalEvent[]>([]);
  const [remoteEvents, setRemoteEvents] = useState<RemoteEvent[]>([]);

  const stopCamera = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    previousFrameRef.current = null;
    alertStartedAtRef.current = null;
    setCameraState("idle");
    setAlert(false);
    setMotionRatio(0);
    setDwellSeconds(0);
    drawOverlay(overlayRef.current, zone, locked, false, 0);
  }, [locked, zone]);

  const startCamera = useCallback(async () => {
    setCameraError("");
    setCameraState("starting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState("live");
    } catch (error) {
      setCameraState("error");
      setCameraError(error instanceof Error ? error.message : "Camera permission failed.");
    }
  }, []);

  const addZonePoint = useCallback(
    (event: PointerEvent<HTMLCanvasElement>) => {
      if (locked) {
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const point = {
        x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
        y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
      };
      setZone((current) => [...current, point]);
    },
    [locked],
  );

  useEffect(() => {
    drawOverlay(overlayRef.current, zone, locked, alert, motionRatio);
  }, [alert, locked, motionRatio, zone]);

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
        // The live camera mode still works when the telemetry endpoint is idle.
      }
    }

    loadEvents();
    const interval = window.setInterval(loadEvents, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (cameraState !== "live") {
      return;
    }

    let lastFrameAt = performance.now();

    const analyze = () => {
      const video = videoRef.current;
      const analysis = analysisRef.current;
      if (!video || !analysis || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        animationRef.current = requestAnimationFrame(analyze);
        return;
      }

      const context = analysis.getContext("2d", { willReadFrequently: true });
      if (!context) {
        animationRef.current = requestAnimationFrame(analyze);
        return;
      }

      context.drawImage(video, 0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT);
      const image = context.getImageData(0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT);
      const currentGray = toGrayscale(image.data);
      const previousGray = previousFrameRef.current;
      previousFrameRef.current = currentGray;

      let nextMotionRatio = 0;
      if (previousGray && locked && zone.length >= 3) {
        nextMotionRatio = measureMotionInZone(previousGray, currentGray, zone);
      }

      const nextAlert = nextMotionRatio > 0.035;
      const now = performance.now();
      setFps(1000 / Math.max(now - lastFrameAt, 1));
      lastFrameAt = now;
      setMotionRatio(nextMotionRatio);
      setAlert(nextAlert);

      if (nextAlert) {
        if (alertStartedAtRef.current === null) {
          alertStartedAtRef.current = now;
        }
        const nextDwell = (now - alertStartedAtRef.current) / 1000;
        setDwellSeconds(nextDwell);

        if (now - lastEventAtRef.current > 2200) {
          lastEventAtRef.current = now;
          const event = {
            id: `webcam-${Date.now()}`,
            timestamp: new Date().toISOString(),
            alert: true,
            zoneCount: 1,
            maxDwellSeconds: nextDwell,
            source: "browser-webcam",
            motionRatio: nextMotionRatio,
          };
          setLocalEvents((events) => [event, ...events].slice(0, 4));
          postEvent(event);
        }
      } else {
        alertStartedAtRef.current = null;
        setDwellSeconds(0);
      }

      drawOverlay(overlayRef.current, zone, locked, nextAlert, nextMotionRatio);
      animationRef.current = requestAnimationFrame(analyze);
    };

    animationRef.current = requestAnimationFrame(analyze);
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [cameraState, locked, zone]);

  useEffect(
    () => () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  const latestEvents =
    localEvents.length > 0
      ? localEvents
      : remoteEvents.map((event) => ({
          ...event,
          motionRatio: event.alert ? 0.04 : 0,
        }));

  return (
    <section className="dashboard" aria-label="Safety zone dashboard">
      <section className="panel feed-panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Real-Time Webcam Safety Zone</h2>
            <p className="panel-subtitle">Start the webcam, draw or reuse a zone, then move your hand/object inside it.</p>
          </div>
          <div className="status-pill" style={{ color: alert ? "#bf2d25" : "#147d52", background: "#fff" }}>
            <span className="status-dot" style={{ background: alert ? "#bf2d25" : "#147d52" }} />
            {alert ? "Alert active" : "Zone clear"}
          </div>
        </div>

        <div className={`feed-wrap camera-wrap ${alert ? "camera-alert" : ""}`}>
          <video ref={videoRef} className="camera-video" playsInline muted />
          {cameraState !== "live" ? (
            <div className="camera-placeholder">
              <strong>{cameraState === "starting" ? "Starting camera..." : "Webcam not running"}</strong>
              <span>
                {cameraState === "error"
                  ? cameraError
                  : "Use Start webcam, allow camera access, then click Clear zone to draw your own polygon."}
              </span>
            </div>
          ) : null}
          <canvas
            ref={overlayRef}
            aria-label="Camera overlay for drawing restricted zone"
            className="camera-overlay"
            onPointerDown={addZonePoint}
          />
          <canvas ref={analysisRef} className="analysis-canvas" height={ANALYSIS_HEIGHT} width={ANALYSIS_WIDTH} />
        </div>

        <div className="controls">
          <button className="button" type="button" onClick={cameraState === "live" ? stopCamera : startCamera}>
            {cameraState === "live" ? "Stop webcam" : "Start webcam"}
          </button>
          <button
            className="button secondary"
            type="button"
            onClick={() => {
              setLocked(false);
              setZone([]);
              previousFrameRef.current = null;
            }}
          >
            Clear zone
          </button>
          <button className="button secondary" disabled={zone.length < 3} type="button" onClick={() => setLocked(true)}>
            Lock zone
          </button>
          <button
            className="button secondary"
            type="button"
            onClick={() => {
              setZone(SAMPLE_ZONE);
              setLocked(true);
            }}
          >
            Use sample zone
          </button>
          <span className="hint">{locked ? "Zone locked" : "Click 3+ points on the video, then Lock zone"}</span>
        </div>
      </section>

      <aside className="side-stack">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Operational State</h2>
              <p className="panel-subtitle">Live browser camera mode. Python edge agent still handles YOLO + supervision.</p>
            </div>
          </div>
          <div className="metrics">
            <div className={`metric ${alert ? "alert" : "clear"}`}>
              <span>Zone status</span>
              <strong>{alert ? "ALERT" : "CLEAR"}</strong>
            </div>
            <div className="metric">
              <span>Motion in zone</span>
              <strong>{Math.round(motionRatio * 100)}%</strong>
            </div>
            <div className="metric">
              <span>Dwell</span>
              <strong>{dwellSeconds.toFixed(1)}s</strong>
            </div>
            <div className="metric">
              <span>Camera FPS</span>
              <strong>{cameraState === "live" ? fps.toFixed(0) : "--"}</strong>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Expected Real Test</h2>
              <p className="panel-subtitle">This is the physical behavior to verify.</p>
            </div>
          </div>
          <div className="code-panel">
            <p>1. Click Start webcam and allow camera access.</p>
            <p>2. Use the sample zone or Clear zone and click 3+ points on the live image.</p>
            <p>3. Lock the zone.</p>
            <p>4. Move your hand or another object inside the zone. The status should change to ALERT.</p>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Recent Events</h2>
              <p className="panel-subtitle">Browser alerts and posted edge-agent events.</p>
            </div>
          </div>
          <div className="event-list">
            {latestEvents.length > 0 ? (
              latestEvents.map((event) => (
                <div className="event" key={event.id}>
                  <strong>{event.alert ? "Restricted-zone alert" : "Zone clear"} from {event.source}</strong>
                  <span>
                    motion {Math.round(event.motionRatio * 100)}% | dwell {event.maxDwellSeconds.toFixed(1)}s |{" "}
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            ) : (
              <div className="event">
                <strong>No alerts yet</strong>
                <span>Start the webcam and move inside the locked zone.</span>
              </div>
            )}
          </div>
        </section>

        <section className="panel code-panel">
          <p>For the Roboflow Supervision version with person detection, run the edge agent locally:</p>
          <pre className="code">{`python edge_agent/safety_zone_agent.py \\
  --source 0 \\
  --zone "160,130 500,110 560,400 120,420" \\
  --webhook-url "https://next-project-to-show-physical-ai.vercel.app/api/events"`}</pre>
        </section>
      </aside>
    </section>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function toGrayscale(data: Uint8ClampedArray) {
  const gray = new Uint8ClampedArray(data.length / 4);
  for (let index = 0, cursor = 0; index < data.length; index += 4, cursor += 1) {
    gray[cursor] = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
  }
  return gray;
}

function pointInPolygon(point: Point, polygon: Point[]) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const xi = polygon[index].x;
    const yi = polygon[index].y;
    const xj = polygon[previous].x;
    const yj = polygon[previous].y;
    const intersects = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

function measureMotionInZone(previous: Uint8ClampedArray, current: Uint8ClampedArray, zone: Point[]) {
  let zonePixels = 0;
  let changedPixels = 0;

  for (let y = 0; y < ANALYSIS_HEIGHT; y += 1) {
    for (let x = 0; x < ANALYSIS_WIDTH; x += 1) {
      if (!pointInPolygon({ x: x / ANALYSIS_WIDTH, y: y / ANALYSIS_HEIGHT }, zone)) {
        continue;
      }

      zonePixels += 1;
      const index = y * ANALYSIS_WIDTH + x;
      if (Math.abs(current[index] - previous[index]) > 28) {
        changedPixels += 1;
      }
    }
  }

  return zonePixels === 0 ? 0 : changedPixels / zonePixels;
}

function drawOverlay(canvas: HTMLCanvasElement | null, zone: Point[], locked: boolean, alert: boolean, motionRatio: number) {
  if (!canvas) {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const width = Math.max(Math.floor(rect.width), 1);
  const height = Math.max(Math.floor(rect.height), 1);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  context.clearRect(0, 0, width, height);
  context.lineWidth = 3;
  context.strokeStyle = alert ? "#bf2d25" : "#147d52";
  context.fillStyle = alert ? "rgba(191,45,37,0.22)" : "rgba(20,125,82,0.18)";

  if (zone.length > 0) {
    context.beginPath();
    zone.forEach((point, index) => {
      const x = point.x * width;
      const y = point.y * height;
      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    });
    if (zone.length >= 3 && locked) {
      context.closePath();
      context.fill();
    }
    context.stroke();

    context.fillStyle = "#fffdfa";
    zone.forEach((point, index) => {
      context.beginPath();
      context.arc(point.x * width, point.y * height, 6, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.fillStyle = "#1f2522";
      context.font = "bold 11px Arial";
      context.fillText(String(index + 1), point.x * width - 3, point.y * height + 4);
      context.fillStyle = "#fffdfa";
    });
  }

  context.fillStyle = alert ? "#bf2d25" : "#147d52";
  context.font = "bold 18px Arial";
  context.fillText(alert ? "ALERT: MOTION IN ZONE" : locked ? "ZONE CLEAR" : "DRAW ZONE", 18, 30);

  context.font = "13px Arial";
  context.fillText(`motion ${Math.round(motionRatio * 100)}%`, 18, 52);
}

async function postEvent(event: LocalEvent) {
  try {
    await fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
    });
  } catch {
    // Event posting is best-effort; local alerting should not depend on network.
  }
}

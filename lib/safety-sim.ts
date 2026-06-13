export type SafetyTrack = {
  id: number;
  x: number;
  y: number;
  inZone: boolean;
  dwellSeconds: number;
  trace: Array<{ x: number; y: number }>;
};

export type SafetyFrame = {
  alert: boolean;
  zoneCount: number;
  tracks: SafetyTrack[];
  events: Array<{
    id: string;
    timestamp: string;
    alert: boolean;
    zoneCount: number;
    maxDwellSeconds: number;
  }>;
};

const polygon = [
  { x: 166, y: 126 },
  { x: 512, y: 110 },
  { x: 562, y: 396 },
  { x: 118, y: 420 },
];

function pointInPolygon(x: number, y: number) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

function trackPosition(trackId: number, tick: number) {
  if (trackId === 7) {
    return {
      x: 64 + ((tick * 5.3) % 650),
      y: 286 + Math.sin(tick / 8) * 28,
    };
  }

  if (trackId === 12) {
    return {
      x: 610 - ((tick * 3.7) % 580),
      y: 172 + Math.cos(tick / 12) * 24,
    };
  }

  return {
    x: 330 + Math.sin(tick / 10) * 190,
    y: 354 + Math.cos(tick / 14) * 22,
  };
}

function dwellForTrack(trackId: number, tick: number, inZone: boolean) {
  if (!inZone) {
    return 0;
  }

  const lookback = 50;
  let dwellTicks = 0;
  for (let cursor = tick; cursor > tick - lookback && cursor >= 0; cursor -= 1) {
    const point = trackPosition(trackId, cursor);
    if (!pointInPolygon(point.x, point.y)) {
      break;
    }
    dwellTicks += 1;
  }

  return dwellTicks * 0.12;
}

export function computeSafetyFrame(tick: number): SafetyFrame {
  const ids = [7, 12, 21];
  const tracks = ids.map((id) => {
    const position = trackPosition(id, tick);
    const inZone = pointInPolygon(position.x, position.y);
    const trace = Array.from({ length: 12 }, (_, index) => {
      const point = trackPosition(id, Math.max(0, tick - (11 - index) * 2));
      return { x: point.x, y: point.y };
    });

    return {
      id,
      x: position.x,
      y: position.y,
      inZone,
      dwellSeconds: dwellForTrack(id, tick, inZone),
      trace,
    };
  });

  const zoneCount = tracks.filter((track) => track.inZone).length;
  const maxDwellSeconds = Math.max(0, ...tracks.map((track) => track.dwellSeconds));
  const alert = zoneCount > 0;
  const timestamp = new Date(Date.now() - (tick % 8) * 1000).toISOString();

  return {
    alert,
    zoneCount,
    tracks,
    events: [
      {
        id: `sim-${Math.floor(tick / 8)}-${zoneCount}`,
        timestamp,
        alert,
        zoneCount,
        maxDwellSeconds,
      },
    ],
  };
}

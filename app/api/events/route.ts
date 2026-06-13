import { NextRequest, NextResponse } from "next/server";
import { addEvent, getEvents, type SafetyEvent } from "./store";

export const dynamic = "force-dynamic";

function numberOrFallback(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function GET() {
  return NextResponse.json({
    events: getEvents(),
    note: "Ephemeral demo buffer. Use durable storage for production telemetry.",
  });
}

export async function POST(request: NextRequest) {
  let payload: Record<string, unknown>;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Expected JSON body" }, { status: 400 });
  }

  const event: SafetyEvent = {
    id: typeof payload.id === "string" ? payload.id : crypto.randomUUID(),
    timestamp: typeof payload.timestamp === "string" ? payload.timestamp : new Date().toISOString(),
    alert: Boolean(payload.alert),
    zoneCount: numberOrFallback(payload.zoneCount, 0),
    maxDwellSeconds: numberOrFallback(payload.maxDwellSeconds, 0),
    source: typeof payload.source === "string" ? payload.source : "edge-agent",
    fps: typeof payload.fps === "number" ? payload.fps : undefined,
    trackedIds: Array.isArray(payload.trackedIds)
      ? payload.trackedIds.filter((id): id is number => typeof id === "number")
      : undefined,
  };

  addEvent(event);

  return NextResponse.json({ ok: true, event }, { status: 201 });
}

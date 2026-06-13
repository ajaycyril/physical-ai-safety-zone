import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "physical-ai-safety-zone",
    runtime: "vercel-nextjs",
    edgeAgent: "roboflow/supervision + ultralytics + opencv",
    timestamp: new Date().toISOString(),
  });
}

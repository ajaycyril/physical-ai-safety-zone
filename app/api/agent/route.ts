import { NextRequest, NextResponse } from "next/server";

type WorldSnapshot = {
  pumpTemp?: number;
  valveState?: string;
  crateState?: string;
  personPresent?: boolean;
};

function buildPlan(intent: string, world: WorldSnapshot) {
  const lower = intent.toLowerCase();
  const steps: Array<{ id: string; action: string; target: string; policy: string; reason: string }> = [];

  steps.push({
    id: "ground",
    action: "query_world",
    target: "world-state",
    policy: "World State Engine",
    reason: "Ground the request in current entities, telemetry, spatial state and safety conditions.",
  });

  if (/pump|inspect|thermal|temperature/.test(lower)) {
    steps.push({
      id: "nav-pump",
      action: "navigate",
      target: "P-204",
      policy: "Classical local planner",
      reason: "Known map and deterministic navigation are sufficient for transit.",
    });
    steps.push({
      id: "inspect-pump",
      action: "inspect",
      target: "P-204",
      policy: "Vision-language inspection",
      reason: "Fuse thermal/visual evidence with asset history and telemetry.",
    });
  }

  if (/valve|v-12/.test(lower)) {
    steps.push({
      id: "nav-valve",
      action: "navigate",
      target: "V-12",
      policy: "Classical local planner",
      reason: "Move through the mapped controlled zone under the local safety envelope.",
    });
    steps.push({
      id: "verify-valve",
      action: "verify",
      target: "V-12",
      policy: "Vision-language inspection",
      reason: "Verify accessibility and state without actuating the valve.",
    });
  }

  if (/crate|pallet|recover|staging|move/.test(lower)) {
    steps.push({
      id: "nav-crate",
      action: "navigate",
      target: "PL-9",
      policy: "Classical local planner",
      reason: "Approach the load from its free side using the shared map.",
    });
    steps.push({
      id: "push-crate",
      action: "manipulate",
      target: "S-3",
      policy: "Embodied manipulation policy",
      reason: "Use the articulated end effector and physics contacts to relocate the load.",
    });
  }

  steps.push({
    id: "return",
    action: "return",
    target: "DOCK",
    policy: "Classical local planner",
    reason: "Close the mission in a deterministic safe state.",
  });

  return {
    objective: intent || "Inspect P-204, verify V-12, recover PL-9 to staging, and return to dock.",
    worldAssessment: {
      pump: `${(world.pumpTemp ?? 94.2).toFixed(1)}°C / anomaly likely`,
      valve: world.valveState ?? "accessible",
      crate: world.crateState ?? "misplaced",
      camera: world.personPresent ? "person present" : "clear",
    },
    tools: ["world.query", "policy.check", "mission.compile", "robot.dispatch", "evidence.commit"],
    steps,
    safety: {
      cameraHumanYield: true,
      controlledZoneApproval: true,
      localStopAuthority: true,
    },
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const intent = typeof body.intent === "string" ? body.intent : "";
  const world = (body.world ?? {}) as WorldSnapshot;
  return NextResponse.json({
    layer: "Intent Agent",
    mode: "grounded mission compiler",
    plan: buildPlan(intent, world),
    generatedAt: new Date().toISOString(),
  });
}


export async function GET() {
  return NextResponse.json({
    status: "ready",
    service: "Intent Agent / Mission Compiler",
    tools: ["world.query", "policy.check", "mission.compile", "robot.dispatch", "evidence.commit"],
    safety: ["camera-human-yield", "controlled-zone-approval", "local-stop-authority"],
    physics: "MuJoCo WASM primary / explicit Three.js fallback",
  });
}

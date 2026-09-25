import { NextRequest, NextResponse } from "next/server";

type Scenario = "inspection" | "safety" | "manipulation";

function classify(intent: string): Scenario {
  const t = intent.toLowerCase();
  if (/pallet|aisle|staging|move|grasp|recover/.test(t)) return "manipulation";
  if (/patrol|person|human|restricted corridor|exclusion/.test(t)) return "safety";
  return "inspection";
}

const traces: Record<Scenario, Array<[string,string]>> = {
  inspection: [
    ["GROUND","Resolved P-204 to Pump / Cooling Loop A. Current temperature 94.2°C; vibration 7.8 mm/s; anomaly confidence 0.96."],
    ["CONTEXT","V-12 is the upstream isolation valve. Access route crosses Controlled Zone C; robot entry requires maintenance approval."],
    ["PLAN","Inspect P-204 → verify V-12 accessibility → create incident with evidence → return to D-01."],
    ["POLICY","No valve actuation requested. Physical control remains prohibited; inspection-only mission compiled."]
  ],
  safety: [
    ["GROUND","Zone C is a controlled corridor. Current occupancy: clear. AX-07 has patrol permission but must yield to people."],
    ["PLAN","Navigate C1 → scan corridor → hold on human intrusion → reroute C2 → complete patrol → dock."],
    ["SAFETY","Human detection overrides mission progress locally at the edge. No cloud approval is required to stop."],
    ["EVIDENCE","Store intrusion frame, stop latency, reroute decision and completion state as one replayable episode."]
  ],
  manipulation: [
    ["GROUND","PL-9 located in Aisle 3. Payload estimate 11.8 kg. Path to S-3 is clear; no humans within 4 m."],
    ["CAPABILITY","AX-07 manipulation attachment supports 15 kg. Grasp confidence from current view: 0.88."],
    ["ROUTE","Navigation can use classical local planning; manipulation requires an embodied policy and human approval for material movement."],
    ["PLAN","Navigate → inspect grasp → approve → manipulate PL-9 → verify placement at S-3 → dock."]
  ]
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const intent = typeof body.intent === "string" ? body.intent : "";
  const scenario = classify(intent);
  return NextResponse.json({
    layer: "ANA",
    mode: "deterministic-demo-reasoner",
    scenario,
    trace: traces[scenario],
    grounded: true,
    policyChecked: true,
    generatedAt: new Date().toISOString()
  });
}

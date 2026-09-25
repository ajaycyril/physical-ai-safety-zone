/** A deliberately simplified, deterministic training plant. Not a process design or safety model. */
export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
export const FACTORY_SCENARIOS = {
  restriction: { title: 'Cooling flow restriction', summary: 'Low flow, rising pressure and thermal load. Inspect, isolate, service, then prove recovery.' },
  drift: { title: 'Transmitter disagreement', summary: 'One transmitter reads high. Compare independent evidence before touching the process.' },
  stiction: { title: 'Valve fails to reach target', summary: 'The isolation valve stalls. Detect the failed read-back and stop the recovery.' }
};
export class IndustrialPlant {
  constructor(scenario = 'restriction') { this.reset(scenario); }
  reset(scenario = 'restriction') {
    this.scenario = Object.hasOwn(FACTORY_SCENARIOS, scenario) ? scenario : 'restriction';
    this.t = 0; this.blockage = this.scenario === 'drift' ? .08 : .82;
    this.bias = this.scenario === 'drift' ? 4.25 : .12;
    this.valveStuck = this.scenario === 'stiction';
    this.pumpCommand = 1; this.pumpSpeed = 1; this.lineCommand = true;
    this.flow = this.scenario === 'drift' ? 33.3 : 9.0;
    this.pressure = this.scenario === 'drift' ? 5.64 : 9.74;
    this.downstream = this.scenario === 'drift' ? 4.74 : 2.57;
    this.temperature = this.scenario === 'drift' ? 58 : 83;
    this.vibration = this.scenario === 'drift' ? 1.85 : 6.4;
    this.goodParts = 0; this.quarantined = 0; this.partAccumulator = 0;
    this.maintenance = 'Not requested'; this.workOrder = null; this.repaired = false;
    this.stableSeconds = 0; this.sensorExcluded = false; this.lastValve = 0;
  }
  tick(dt, valve) {
    this.t += dt; this.lastValve = valve;
    const openness = 1 - clamp(valve / 1.57, 0, 1);
    this.pumpSpeed += (this.pumpCommand - this.pumpSpeed) * Math.min(1, dt / 1.8);
    const pTarget = .18 + this.pumpSpeed * (5.05 + this.blockage * 5.55) * (1 - (1 - openness) * .55);
    this.pressure += (pTarget - this.pressure) * Math.min(1, dt / (this.pumpCommand ? 4.2 : 2.2));
    const fTarget = 36 * this.pumpSpeed * openness * (1 - this.blockage * .91);
    this.flow += (fTarget - this.flow) * Math.min(1, dt / 1.6);
    const dpTarget = this.pumpSpeed * (.55 + this.blockage * 8.1) * (.6 + .4 * openness);
    this.downstream += (Math.max(.1, this.pressure - dpTarget) - this.downstream) * Math.min(1, dt / 1.6);
    const tempTarget = this.pumpCommand ? 56 + 31 * this.blockage : 45;
    this.temperature += (tempTarget - this.temperature) * Math.min(1, dt / 8);
    this.vibration += (this.pumpSpeed * (1.4 + this.blockage * 6.2) - this.vibration) * Math.min(1, dt / 2);
    const healthy = this.flow > 27 && this.pressure < 7.4 && this.temperature < 73 && this.vibration < 2.6 && valve < .12;
    this.stableSeconds = healthy ? this.stableSeconds + dt : 0;
    if (this.lineCommand && this.pumpSpeed > .6) {
      this.partAccumulator += dt;
      while (this.partAccumulator >= 2.1) { this.partAccumulator -= 2.1; healthy ? this.goodParts++ : this.quarantined++; }
    }
  }
  pauseProduction() { this.lineCommand = false; this.pumpCommand = 0; }
  service(valve) {
    if (valve < 1.45 || this.pumpSpeed > .025 || this.pressure > .6) throw Error('Maintenance interlock: isolation, stopped pump and low modeled residual pressure are required.');
    this.blockage = .06; this.repaired = true; this.maintenance = 'Service verified';
    if (this.workOrder) this.workOrder.state = 'SERVICE COMPLETE';
  }
  restart(valve) {
    if (!this.repaired || this.maintenance !== 'Service verified' || valve > .12) throw Error('Restart interlock: service evidence and open-valve feedback are required.');
    this.pumpCommand = 1; this.stableSeconds = 0;
  }
  snapshot() {
    const dp = Math.max(0, this.pressure - this.downstream);
    return { time: this.t, scenario: this.scenario, pressure: this.pressure, transmitter: this.pressure + this.bias, downstream: this.downstream, differential: dp, flow: this.flow, temperature: this.temperature, vibration: this.vibration, rpm: this.pumpSpeed * 1480, pumpCommand: this.pumpCommand, lineRunning: this.lineCommand, lineState: this.lineCommand ? (this.flow > 27 && this.temperature < 73 ? 'Producing' : 'Quality hold') : 'Controlled stop', goodParts: this.goodParts, quarantined: this.quarantined, service: this.maintenance, workOrder: this.workOrder ? { ...this.workOrder } : null, repaired: this.repaired, stableSeconds: this.stableSeconds, sensorExcluded: this.sensorExcluded, model: 'Illustrative first-order plant / simulated measurements' };
  }
  predict(action = 'continue', seconds = 20) {
    const clone = new IndustrialPlant(); Object.assign(clone, JSON.parse(JSON.stringify(this)));
    if (action === 'isolate') clone.pauseProduction();
    const samples = []; let valve = this.lastValve;
    for (let n = 0; n < seconds * 10; n++) { if (action === 'isolate') valve += (1.57 - valve) * .12; clone.tick(.1, valve); if (n % 5 === 0) samples.push(clone.snapshot()); }
    return { action, horizon: seconds, samples, assumptions: 'Same first-order equations as the live simulation. Not a learned model or calibrated plant forecast.' };
  }
}
/** Transparent diagnostic rules. Scores are evidence matches, not probabilities. */
export function diagnosePlant(telemetry, optical) {
  const mismatch = Number.isFinite(optical?.value) ? Math.abs(telemetry.transmitter - optical.value) : null;
  const symptoms = { highPressure: telemetry.transmitter > 8, lowFlow: telemetry.flow < 22, highDifferential: telemetry.differential > 3, vibration: telemetry.vibration > 3.4, opticalDisagreement: mismatch !== null && mismatch > 1.2 };
  const restrictionScore = [symptoms.lowFlow, symptoms.highDifferential, symptoms.vibration, mismatch !== null && mismatch < 1.2].filter(Boolean).length;
  const driftScore = [symptoms.highPressure, !symptoms.lowFlow, !symptoms.highDifferential, symptoms.opticalDisagreement].filter(Boolean).length;
  const winner = driftScore > restrictionScore && symptoms.opticalDisagreement ? 'transmitter-disagreement' : restrictionScore >= 3 ? 'flow-restriction' : 'insufficient-evidence';
  return { winner, hypotheses: [{ id: 'flow-restriction', matches: restrictionScore, total: 4 }, { id: 'transmitter-disagreement', matches: driftScore, total: 4 }], symptoms, mismatch, opticalFrame: optical?.frameId ?? null, basis: 'Explicit diagnostic rules; not an LLM or probability estimate.' };
}
export function compileFactoryMission(body, id = 'F-' + Date.now().toString(36).toUpperCase()) {
  const intent = typeof body?.intent === 'string' ? body.intent.trim() : '';
  if (intent.length < 3 || intent.length > 500) return { status: 400, error: 'Use a mission between 3 and 500 characters.' };
  if (/bypass|ignore (safety|policy)|disable (safety|stop)|without approval/i.test(intent)) return { status: 403, error: 'Safety and authority checks cannot be bypassed.' };
  if (!/cooling|skid|inspect|pump|pressure|flow|diagnos|recover|valve|P-204/i.test(intent)) return { status: 422, error: 'This cell supports cooling-skid diagnosis, controlled recovery and inspection-only missions.' };
  const r = body?.world?.robot;
  if (!r || ![r.x, r.y, r.battery].every(Number.isFinite)) return { status: 400, error: 'Valid robot telemetry is required.' };
  if (r.battery < 20) return { status: 409, error: 'Robot battery below the dispatch threshold.' };
  const inspectionOnly = /inspection[- ]only|inspect only|do not (act|isolate|restart)|no actuation/i.test(intent);
  const camera = body.world.observation || {};
  return { status: 200, id, scope: 'simulation-only', version: 4, intent, inspectionOnly, mode: 'bounded diagnostic workflow', evidence: { frame: camera.frameId ?? null, source: camera.source || 'unknown' }, route: { avoidCentralAisle: !(camera.kind === 'occupancy' && camera.fresh && camera.occupied === false), reason: camera.occupied ? 'Person detection constrains the shared aisle.' : camera.fresh ? 'Retain local obstacle checks throughout transit.' : 'Unknown occupancy: conservative bypass.' }, requirements: ['Independent optical inspection', 'Evidence-based diagnosis', 'Separate isolation and restart approvals', 'Actuator read-back', 'Maintenance interlocks', 'Stable recovery window'], capabilities: ['navigate', 'inspect_gauge', 'diagnose', 'isolate', 'dispatch_service', 'restart', 'verify', 'dock'] };
}

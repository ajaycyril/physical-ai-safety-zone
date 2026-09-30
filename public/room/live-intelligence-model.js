// A read model of the real demo controllers. No timers manufacture task success.
const finite = n => typeof n === 'number' && Number.isFinite(n);
const number = (n, digits = 1) => finite(n) ? n.toFixed(digits) : '—';
const last = (events, layers) => events.findLast(e => layers.includes(e.layer));
const stopped = s => ['STOPPED', 'BLOCKED', 'ERROR', 'FAILED'].includes(s.status);
const compactEvent = e => ({at:e.at, layer:e.layer, text:e.text, phase:e.detail?.phase, scope:e.detail?.scope, actor:e.detail?.actor});

export function intelligenceFrame(kind, s, context = {}, revision = 1, now = Date.now()) {
  const city = kind === 'city', p = city ? s.scene || {} : s.physics || {}, process = p.process || {};
  const plan = s.plan || s.mission, events = s.events || [], approval = last(events, ['APPROVAL']);
  const held = !!(s.paused || p.held || stopped(s)), done = s.status === 'COMPLETE';
  const facts = [];
  function fact(id, label, value, unit, basis, extra = {}) {
    facts.push({id, label, value:finite(value) ? value : typeof value === 'string' ? value : null, unit, basis,
      at:new Date(now).toISOString(), fresh:value != null && !(typeof value === 'number' && !finite(value)), ...extra});
  }
  function camera(id, label, o, value, ttl) {
    const age = finite(o?.ageMs) ? o.ageMs : null;
    fact(id, label, o?.fresh ? value : null, '', o?.kind === 'pressure' ? 'SYNTHETIC GAUGE' : 'RECORDED VIDEO / LIVE INFERENCE', {
      fresh:!!o?.fresh, ageMs:age, ttlMs:ttl, frame:o?.frameId ?? null,
      at:o?.recordedAt || (age != null ? new Date(now-age).toISOString() : null),
      source:o?.sourceId || o?.source || id, confidence:finite(o?.score) ? o.score : null,
    });
  }
  let links, resources, tasks, prediction, decision, reason;
  if (city) {
    camera('CAM-T01','Vehicles detected',s.observations?.traffic,s.observations?.traffic?.vehicles,4000);
    camera('CAM-P01','People detected',s.observations?.crossing,s.observations?.crossing?.people,4000);
    fact('J-01','Junction queue',p.queue,'vehicles','SIMULATION READBACK');
    fact('SG-01','Signal readback',p.signal,'','SIMULATION READBACK');
    fact('D-01','Survey vehicle',p.drone?.state,'','SIMULATION READBACK',{pose:p.drone?.position});
    fact('F-01','Field response',p.field?.state,'','SIMULATION READBACK',{pose:p.field?.position});
    links = [['CAM-T01','J-01','observes'],['CAM-P01','SG-01','constrains'],['J-01','SG-01','controlled by'],['D-01','J-01','surveys'],['F-01','J-01','responds to']];
    const projection = s.phase >= 3 ? s.projection : null;
    prediction = projection ? {title:'Same arrivals. Two signal plans.', basis:'SIMULATED ROLLOUT',
      rows:[['Fixed timing',projection.fixedWait,'veh·s'],['Candidate timing',projection.adaptiveWait,'veh·s']],
      note:'Lower vehicle waiting time is preferable. Pedestrian clearance remains mandatory.'} : null;
    const policy = last(events,['POLICY']), survey = last(events,['EDGE']);
    decision = stopped(s) ? 'Execution held' : done ? 'Response verified' : s.status === 'AWAITING APPROVAL' ? 'Request scoped signal authority' : plan ? plan.inspectionOnly ? 'Survey without changing signals' : 'Survey, protect the crossing, then coordinate' : 'Wait for fresh camera evidence';
    reason = stopped(s) ? last(events,['SAFETY'])?.text : policy?.text || 'Both source cameras must produce current observations before the mission is compiled.';
    resources = [
      {id:'D-01',role:'Survey / return',state:p.drone?.state || 'Unknown',held,pose:p.drone?.position,source:'Local survey adapter'},
      {id:'F-01',role:'Field response',state:p.field?.state || 'Unknown',held,pose:p.field?.position,source:'Local dispatch adapter'},
      {id:'SG-01',role:'Interlocked signal',state:p.signal || 'Unknown',held,detail:p.policy || 'Uninitialized',source:'Signal controller readback'},
    ];
    tasks = [
      {id:'survey',title:survey?.detail?.mode==='ground'?'Ground survey':'Survey the junction',owner:survey?.detail?.mode==='ground'?'F-01':'D-01',state:survey?'done':s.phase===4?'active':'queued',dependency:'Fresh evidence + routing policy'},
      {id:'authority',title:plan?.inspectionOnly?'Inspection scope only':'Approve signal intervention',owner:'Operator',state:plan?.inspectionOnly?'skipped':approval?'done':s.phase===5?'waiting':'queued',dependency:'Survey evidence'},
      {id:'signal',title:'Apply signal plan',owner:'SG-01',state:plan?.inspectionOnly?'skipped':p.policy==='adaptive'||approval&&events.some(e=>e.layer==='SIGNAL'&&e.detail?.state==='EW'&&e.at>=approval.at)?'done':s.phase===6?'active':'queued',dependency:'Scoped approval + crossing clear'},
      {id:'field',title:'Arrive at the junction',owner:'F-01',state:p.field?.state==='At junction'?'done':s.phase>=6?'active':'queued',dependency:'Dispatch from mission controller'},
      {id:'return',title:'Return survey vehicle',owner:'D-01',state:done&&p.drone?.state==='Docked'?'done':s.phase>=6?'active':'queued',dependency:'Survey complete'},
    ];
  } else {
    camera('CAM-01','Aisle occupancy',s.observation,s.observation?.kind==='occupancy'?(s.observation.occupied?'Person detected':'No person detected'):'Gauge test',2500);
    fact('P-204','Cooling pressure',p.pressure,'bar','SIMULATION READBACK');
    fact('FT-02','Cooling flow',process.flow,'L/min','SIMULATION READBACK');
    fact('PT-204','Pressure transmitter',process.transmitter,'bar','SIMULATION READBACK');
    fact('V-12','Isolation valve',finite(p.valve)?p.valve>1.45?'Closed':p.valve>.1?'Closing':'Open':null,'','SIMULATION READBACK');
    fact('SB-02','Standby speed',finite(process.standbyRPM)?process.standbyRPM*100:null,'%','SIMULATION READBACK');
    fact('R-07','Robot energy',p.battery,'%','SIMULATION READBACK',{pose:[p.x,p.y],fresh:finite(p.x)&&finite(p.y)});
    links = [['CAM-01','R-07','constrains'],['R-07','P-204','inspects'],['P-204','PT-204','corroborates'],['P-204','V-12','isolated by'],['SB-02','FT-02','supplies'],['V-12','SB-02','interlocks']];
    const rollout = context.comparison;
    prediction = rollout?.standby?.length ? {title:'Isolation alone loses cooling supply.',basis:'SIMULATED ROLLOUT',
      rows:[['Isolate only',rollout.isolate.at(-1).flow,'L/min'],['Isolate + standby',rollout.standby.at(-1).flow,'L/min']],
      note:'20-second process forecast from the current state; target cooling flow exceeds 45 L/min.'} : null;
    decision = stopped(s)?'Execution held':done?'Recovery verified':s.status==='AWAITING APPROVAL'?'Request isolation + standby authority':process.diagnosis?.cause || (plan?'Inspect before authorizing recovery':'Ground the goal in current state');
    reason = stopped(s)?last(events,['SAFETY'])?.text:process.diagnosis?Object.entries(process.diagnosis.checks).filter(([,v])=>v).map(([k])=>k.replace(/([A-Z])/g,' $1').toLowerCase()).join(' · '):plan?.route?.reason || 'Compare pressure, cooling flow and visual inspection before selecting an intervention.';
    const atDock = finite(p.x)&&finite(p.y)&&Math.hypot(p.x+4.4,p.y+2.8)<.3;
    resources = [
      {id:'R-07',role:'Inspect / isolate / return',state:held?'Held':atDock?'At dock':p.speed>.03?'Navigating':s.phase===4?'Inspecting':s.phase===6?'Valve skill':'Stationary',pose:[p.x,p.y],held,detail:number(p.battery,0)+'% energy',source:'MuJoCo position / joint feedback'},
      {id:'V-12',role:'Duty isolation',state:finite(p.valve)?p.valve>1.45?'Closed':p.valve>.1?'Closing':'Open':'Unknown',held,detail:number(p.valve,2)+' rad',source:'Valve actuator readback'},
      {id:'SB-02',role:'Standby supply',state:process.standbyRPM>.9?'Running':process.standbyTarget?'Starting':'Standby',held,detail:number(process.flow,0)+' L/min',source:'Process controller readback'},
    ];
    tasks = [
      {id:'inspect',title:'Read the cooling skid',owner:'R-07',state:process.diagnosis?'done':s.phase===4?'active':'queued',dependency:'Route policy + robot capability'},
      {id:'authority',title:plan?.inspectionOnly?'Inspection scope only':'Release scoped recovery',owner:'Operator',state:plan?.inspectionOnly?'skipped':approval?'done':s.phase===5?'waiting':'queued',dependency:'Corroborated diagnostic evidence'},
      {id:'isolate',title:'Close duty valve',owner:'V-12',state:plan?.inspectionOnly?'skipped':p.valve>1.45?'done':s.phase===6?'active':'queued',dependency:'V-12:close authority'},
      {id:'standby',title:'Start standby circuit',owner:'SB-02',state:plan?.inspectionOnly?'skipped':process.standbyRPM>.9?'done':process.standbyTarget?'active':'queued',dependency:'Closure readback + SB-02:start authority'},
      {id:'return',title:'Return with evidence',owner:'R-07',state:done&&atDock?'done':s.phase===7?'active':'queued',dependency:'Verified pressure + flow'},
    ];
  }
  const weather=context.environment?.weather;
  if(weather)fact('WX-AD','Regional wind',weather.windMs,'m/s',weather.basis || 'UNKNOWN',{at:weather.observedAt,source:weather.source,fresh:weather.status==='available'&&weather.basis==='OBSERVED'&&now-Date.parse(weather.observedAt)<5400000});
  if(held)tasks=tasks.map(t=>['active','waiting'].includes(t.state)?{...t,state:stopped(s)?'stopped':'held'}:t);
  const currentCameras = facts.filter(f=>f.basis.includes('VIDEO')||f.id==='CAM-01');
  const routeEvent = last(events,['PLANNER','ROUTER']);
  const planInput=plan?(city?`CAM-T01 #${plan.observations?.trafficFrame??'unknown'} + CAM-P01 #${plan.observations?.crossingFrame??'unknown'}`:`CAM-01 #${plan.evidence?.cameraFrame??'unknown'} · robot snapshot`):null;
  return {version:1,kind,revision,at:new Date(now).toISOString(),scope:'simulation-only',status:s.status,phase:s.phase,paused:!!s.paused,held,complete:done,
    missionId:plan?.id || null,goal:plan?.intent || null,facts,links,prediction,resources,tasks,
    world:{current:currentCameras.filter(f=>f.fresh).length,total:currentCameras.length,sourceFrames:currentCameras.map(f=>({id:f.id,frame:f.frame,fresh:f.fresh})),sampleCount:s.sampleCount ?? s.samples ?? 0},
    agent:{decision,reason:reason||'Awaiting evidence',mode:plan?.mode || 'Bounded policy engine',checks:plan?.checks || [],
      constraints:plan?.constraints || {simulationOnly:true,approvalRequired:!plan?.inspectionOnly},route:routeEvent?.text||plan?.route?.reason||'Not dispatched',
      approval:approval?{scope:approval.detail?.scope,actor:approval.detail?.actor,at:approval.at}:null,
      input:planInput||currentCameras.map(f=>f.id+(f.frame!=null?' #'+f.frame:' / unknown')).join(' + '),inputAt:plan?.createdAt||null,output:plan?plan.id+' / '+(plan.inspectionOnly?'inspection only':'scoped intervention'):'No mission compiled'},
    coordination:{workOrder:process.workOrder||null,routing:context.environment?.decision?.label || 'Ground fallback',evidenceCount:events.length,
      lastFeedback:last(events,['VERIFY','VERIFICATION','RECOVERY','EVIDENCE','PHYSICS'])?.text||'No completion evidence yet'},
    events:events.map(compactEvent)};
}

export function answerFromFrame(question, frame, prior) {
  const q=question.toLowerCase(), cite=frame.facts.filter(f=>f.fresh).map(f=>f.id);
  if(/chang|differ|since|before/.test(q)) {
    const changes=prior?frame.facts.flatMap(f=>{const old=prior.facts.find(p=>p.id===f.id);return old&&old.value!==f.value?[`${f.id}: ${formatValue(old)} → ${formatValue(f)}`]:[]}):[];
    return {text:changes.length?changes.slice(0,4).join(' · '):'No state changes in the selected comparison interval.',cite:changes.length?cite:[]};
  }
  if(/block|hold|safe|approv|permit|author/.test(q))return {text:frame.held?'The controller is held. '+(frame.events.findLast(e=>['SAFETY','OPERATOR'].includes(e.layer))?.text||'Inspect local hold reasons.'):frame.agent.approval?'Recorded authority: '+frame.agent.approval.scope+'. Local interlocks still govern execution.':'Physical intervention requires a scoped approval. Current camera evidence and controller interlocks are checked independently.',cite:['APPROVAL',...frame.world.sourceFrames.map(f=>f.id)]};
  if(/next|task|who|fleet|robot|dispatch/.test(q)){const t=frame.tasks.find(t=>['active','waiting','held'].includes(t.state))||frame.tasks.find(t=>t.state==='queued');return {text:t?`${t.owner}: ${t.title}. Dependency: ${t.dependency}. Current state: ${t.state}.`:'All scheduled tasks have terminal feedback.',cite:t?[t.owner]:[]};}
  if(/predict|future|compare|forecast|outcome/.test(q))return {text:frame.prediction?frame.prediction.title+' '+frame.prediction.rows.map(([k,v,u])=>`${k}: ${number(v,1)} ${u}`).join(' · '):'No mission rollout is available yet. Run the mission to compare candidate outcomes.',cite:['SIMULATED ROLLOUT']};
  if(/why|reason|plan|goal|decision|happen/.test(q))return {text:frame.agent.decision+'. '+frame.agent.reason,cite};
  const entity=frame.facts.find(f=>q.includes(f.id.toLowerCase()))||frame.facts.find(f=>f.label.toLowerCase().split(' ').filter(w=>w.length>3).some(w=>new RegExp('\\b'+w+'\\b').test(q)));
  if(entity)return {text:`${entity.id} / ${entity.label}: ${formatValue(entity)}. ${entity.fresh?'Current':'Unknown or stale'} · ${entity.basis}.`,cite:[entity.id]};
  return {text:'Ask about the current plan, changes, approval, next task, forecast, or an entity such as '+frame.facts[0].id+'. Answers are grounded in this controller snapshot.',cite:[]};
}
export function formatValue(f) {return f.value==null?'Unknown':(finite(f.value)?number(f.value,f.unit==='bar'?1:0):f.value)+(f.unit?' '+f.unit:'');}

export class IntelligenceMemory {
  constructor(limit=100){this.limit=limit;this.frames=[];this.revision=0;}
  append(kind,s,context,now=Date.now()) {
    const previous=this.frames.at(-1);
    if(previous&&s.phase<0&&previous.phase>=0)this.frames=[];
    const frame=intelligenceFrame(kind,s,context,++this.revision,now);
    this.frames.push(frame);if(this.frames.length>this.limit)this.frames.shift();return frame;
  }
  export(){return {schema:'physical-intelligence-episode/v1',scope:'simulation-only',exportedAt:new Date().toISOString(),frames:this.frames};}
}

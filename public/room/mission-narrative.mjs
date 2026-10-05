const number=(v,d=1)=>Number.isFinite(v)?v.toFixed(d):'unknown';
export function missionNarration(kind,frame,s,done){const city=kind==='city',n=s.phase??-1,p=city?s.scene||{}:s.physics||{},proc=p.process||{},inspect=(s.plan||s.mission)?.inspectionOnly;
 if(['BLOCKED','ERROR','FAILED','STOPPED'].includes(s.status))return 'Mission held. '+(frame.events?.findLast(e=>e.layer==='SAFETY')?.text||'No further action is authorised. Review the evidence or reset.');
 if(done&&done.verified===false)return 'The action finished but acceptance checks did not pass. Review the recorded evidence before calling the mission complete.';
 if(done||s.status==='COMPLETE'){if(city)return `${inspect?'Survey':'Response'} verified: ${number(s.result?.vehiclesCleared,0)} vehicles served during this mission; survey vehicle ${p.drone?.state||'status unknown'}. ${inspect?'Signal timing was not changed.':'Check the signal record and field response below.'}`;return inspect?`Inspection recorded at ${number(p.pressure)} bar and ${number(proc.flow)} L/min. No valve or pump change was authorised.`:`Cooling restored: ${number(proc.flow)} L/min at ${number(p.pressure)} bar. Duty isolated; standby ${number((proc.standbyRPM??0)*100,0)}%. The original fault still needs repair.`;}
 if(n<0)return city?'J-01 gives the main road only 5 seconds of green. Compare a 20-second plan, survey the junction, then approve the change after pedestrian clearance.':'P-204 has low cooling flow and elevated pressure. Inspect the instrument, approve isolation and standby supply, then verify the resulting flow.';
 if(s.status==='AWAITING APPROVAL')return city?'Survey evidence is ready. Approve the signal plan: all-red → crossing clearance → longer east–west green. No timing change has been released yet.':`Inspection confirms ${number(p.pressure)} bar and ${number(proc.flow)} L/min. Approve closing V-12 and starting SB-02. Equipment is unchanged while approval is pending.`;
 const stageCity=[
  'Reading both camera sources. Vehicle observations inform demand; pedestrian observations constrain the signal controller.',
  `Binding camera observations to junction J-01. Current main-road queue: ${number(p.queue,0)} vehicles. Signal feedback: ${p.signal||'unknown'}.`,
  inspect?'Validating a survey-only mission. Signal-control authority is excluded.':'Grounding the request in J-01, its signal controller and available survey assets. Permission is checked separately.',
  'Comparing two 45-second simulated rollouts with identical arrivals: current timing versus a longer main-road green.',
  `${p.drone?.state==='Docked'?'Preparing survey':p.drone?.state||'Survey in progress'}. Collecting junction evidence before requesting permission to change the signals.`,
  'Requesting operator permission for this junction and this timing change only.',
  inspect?'Survey-only task: no signal actuation. Waiting for the survey vehicle to return.':cityExecution(p),
  `Verifying signal feedback, ${number(s.result?.vehiclesCleared??p.ewPassed,0)} recorded vehicles served, field-team arrival and survey-vehicle return.`
 ];
 const stageFactory=[
  'Reading video occupancy and process sensors. The rendered worker is a persistent simulation actor—not a person tracked from the stock clip.',
  `Binding FT-02 flow and PT-04 pressure to P-204. Current values: ${number(proc.flow)} L/min and ${number(p.pressure)} bar.`,
  inspect?'Validating inspection-only scope. No equipment change is permitted.':'Checking the requested asset, supported robot skills and the exact recovery scope.',
  'Selecting an inspection route. The local planner avoids the occupied aisle and keeps a recovery path.',
  proc.diagnosis?`Inspection evidence recorded. Comparing isolation alone with isolation plus standby; current flow ${number(proc.flow)} L/min.`:'R-07 is approaching the cooling skid to read the instrument and corroborate the sensor evidence.',
  'Requesting permission to close V-12 and start the independent standby supply.',
  p.valve<=1.45?`Executing approved duty isolation. V-12 position ${number(p.valve,2)} rad; standby waits for closure read-back.`:`V-12 is closed. Starting SB-02: ${number((proc.standbyRPM??0)*100,0)}% speed. Flow is now ${number(proc.flow)} L/min.`,
  `Checking flow above 45 L/min, pressure below 8 bar and duty-valve closure. Now: ${number(proc.flow)} L/min, ${number(p.pressure)} bar. Robot returns with evidence.`
 ];return(city?stageCity:stageFactory)[Math.max(0,Math.min(7,n))];}
export function cityExecution(p){if(p.policy==='transition'||['ALL RED','WALK','CLEARANCE'].includes(p.signal))return `Approved plan is waiting on local interlocks: ${p.signal||'ALL RED'}. ${p.pedestrians||0} pedestrians remain in the crossing; conflicting traffic stays stopped.`;return `Signal controller is applying ${p.policy||'unknown'} timing: ${p.signal||'unknown'} green. Main-road queue ${number(p.queue,0)}; cumulative main-road vehicles served ${number(p.ewPassed,0)}. Survey vehicle ${p.drone?.state||'unknown'}.`;}
export function signalReadback(p){const adaptive=p.policy==='adaptive'||p.policy==='transition',green=p.signal==='EW'?adaptive?20:5:p.signal==='NS'?adaptive?8:19:null;return{signal:p.signal||'Unknown',policy:p.policy||'Unknown',ew:adaptive?20:5,ns:adaptive?8:19,remaining:green===null?null:Math.max(0,green-(p.stageTime||0)),ewGreen:p.signal==='EW'&&!p.hazard&&p.pedestrians===0,nsGreen:p.signal==='NS'&&!p.hazard&&p.pedestrians===0};}

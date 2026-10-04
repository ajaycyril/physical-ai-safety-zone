// Read-only explanation model. All measurements retain the source frame and basis.
export function liveStepModel(kind, index, frame, runtime = {}, now = Date.now()) {
  if (!frame) return {ready:false, title:'Connecting to shared world state…', rows:[], events:[], links:[]};
  const city=kind==='city', facts=frame.facts||[], agent=frame.agent||{}, coordination=frame.coordination||{};
  const ids=city
    ? [['CAM-T01','CAM-P01','J-01'],['J-01','SG-01','CAM-P01'],['CAM-T01','CAM-P01','SG-01'],['J-01','SG-01'],['D-01','F-01','WX-AD'],['SG-01','D-01','F-01'],['SG-01','J-01','D-01','F-01'],['J-01','SG-01','D-01','F-01']]
    : [['CAM-01','P-204','FT-02'],['P-204','V-12','SB-02','FT-02'],['CAM-01','R-07','V-12'],['R-07','CAM-01','P-204'],['P-204','PT-204','FT-02'],['V-12','SB-02','FT-02'],['V-12','SB-02','FT-02','P-204'],['FT-02','P-204','V-12','SB-02']];
  const age=now-Date.parse(frame.at), connected=Number.isFinite(age)&&age>=-1000&&age<3500;
  const value=f=>!f||!f.fresh||!connected||f.value==null?'Unknown':(typeof f.value==='number'?f.value.toFixed(f.unit==='bar'?1:f.unit==='m/s'?1:0):String(f.value))+(f.unit?' '+f.unit:'');
  const rows=ids[Math.max(0,Math.min(7,index))].map(id=>facts.find(f=>f.id===id)).filter(Boolean).map(f=>({id:f.id,label:f.label,value:value(f),basis:f.basis||'UNKNOWN',fresh:!!f.fresh&&connected,source:f.source||f.id,frame:f.frame,at:f.at,confidence:f.confidence,pose:f.pose}));
  const at=id=>value(facts.find(f=>f.id===id));
  const approvals=agent.approval;
  let title,detail;
  switch(index){
    case 0: title=city?`${at('CAM-T01')} vehicles; ${at('CAM-P01')} people detected.`:`Cooling flow ${at('FT-02')}; pressure ${at('P-204')}.`; detail='These are current observations, not a diagnosis. Video and simulation feedback retain separate source labels.';break;
    case 1: title=city?`J-01: ${at('J-01')}; signal ${at('SG-01')}.`:`P-204 → V-12 → SB-02: one connected cooling circuit.`;detail=city?'The observation sources, crossing constraint and response assets are linked in the shared state below.':'The shared state links the pump to its isolation valve and standby supply. The links explain which downstream actions depend on each other.';break;
    case 2: title=agent.output||'No mission compiled';detail=frame.missionId?`Validated mission ${frame.missionId}. ${agent.reason||''}`:'No compiled mission yet. Continue to validate the instruction against the current evidence and supported skills.';break;
    case 3: title=frame.prediction?.title||agent.route||'No plan available yet';detail=frame.prediction?.note||agent.reason||'A plan is produced only after validation. No future result is assumed.';break;
    case 4: title=agent.decision||'Inspection evidence pending';detail=agent.reason||'Waiting for the local inspection result.';break;
    case 5: title=approvals?'Permission recorded':'No permission recorded for intervention';detail=approvals?`${approvals.scope||'See mission scope'} · ${approvals.actor||'recorded actor'} · ${approvals.at||'timestamp unavailable'}`:'Read the proposed scope. The next equipment-changing action cannot run until you approve.';break;
    case 6: title=city?`Signal ${at('SG-01')}; survey ${at('D-01')}.`:`Valve ${at('V-12')}; standby ${at('SB-02')}.`;detail=coordination.lastFeedback||'Waiting for controller read-back. Receipt of a command does not prove completion.';break;
    default: title=coordination.lastFeedback||'Completion evidence pending';detail=coordination.workOrder?.id?`Maintenance record ${coordination.workOrder.id}. The original fault still requires maintenance.`:'Verify the recorded result against the original goal. A predicted result is not completion evidence.';
  }
  if(!connected){title='Shared-state feed is stale';detail='Measurements are marked unknown until a fresh controller frame arrives. Last-seen source metadata is retained.';}
  return {ready:true,connected,revision:frame.revision,at:frame.at,title,detail,rows,
    links:index===1?(frame.links||[]).slice(0,6):[],
    prediction:index>=3&&frame.prediction?frame.prediction:null,
    resources:index>=4?(frame.resources||[]).map(r=>({id:r.id,state:connected?r.state:'Unknown',source:r.source})):[],
    decision:index>=2?{input:agent.input||'Not compiled',at:agent.inputAt,output:agent.output||'Not compiled',reason:agent.reason,mode:agent.mode}:null,
    events:(frame.events||[]).filter(e=>e.layer!=='SIGNAL'||index>=6).slice(-3),
    eventCount:coordination.evidenceCount??frame.events?.length??0,
    missionId:frame.missionId,status:runtime.status||frame.status,
    world:frame.world||{},approval:approvals};
}

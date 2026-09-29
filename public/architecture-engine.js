export const layers={
 eand:[
 {name:'Customer & mission',role:'Request · quote · track · receive',actors:['e& Mission Portal','Mission API'],owns:'Customer request and delivery',input:'Customer goal',output:'Mission request'},
 {name:'Applications',role:'Domain evidence and operational outcomes',actors:['QCC VMS','Optelos','Inkers Observance','Inkers Kael'],owns:'Security, assets and construction workflows',input:'Mission + site context',output:'Evidence requirement'},
 {name:'AI intelligence',role:'Visual inference, defects and spatial context',actors:['Levatas'],owns:'Observations with provenance',input:'Frames · imagery · LiDAR',output:'Detection + confidence'},
 {name:'Intelligence orchestration',role:'Sequence work across drone and robot fleets',actors:['Extended from AlphaZ RMS'],owns:'Cross-fleet task logic shown in photo',input:'Mission intent + detections',output:'Tasks + preconditions'},
 {name:'Native platforms',role:'Fleet-native planning, routes and health',actors:['Qualcomm Command Center','AlphaZ RMS'],owns:'Drone and ground-robot fleet execution',input:'Approved task',output:'Command + feedback'},
 {name:'Physical fleets',role:'Capture · inspect · move · return evidence',actors:['Drone fleet + docks','Ground robot fleet'],owns:'Embodied execution and sensing',input:'Bounded commands',output:'Telemetry + evidence'}],
 analog:[
 {name:'Ana · intent',role:'Ground the goal and explain the plan',actors:['Ana','Enterprise workflows'],owns:'Proposed goal and interaction contract',input:'Operator goal',output:'Grounded goal'},
 {name:'World Model · state',role:'Resolve entities, relationships and uncertainty',actors:['Entity graph','Spatial memory','Provenance'],owns:'Proposed shared operational state',input:'Observations + history',output:'Belief + constraints'},
 {name:'Model services',role:'Perceive, reason and compare possible outcomes',actors:['Vision adapters','Cosmos-class reference'],owns:'Proposed versioned model interfaces',input:'Frames + belief + candidates',output:'Inference + prediction'},
 {name:'Hive · mission',role:'Plan, authorize, recover and verify',actors:['Mission graph','Policy','Evidence ledger'],owns:'Proposed governed mission lifecycle',input:'Grounded goal + predictions',output:'Approved skill sequence'},
 {name:'Capability adapters',role:'Translate common skills to native platforms',actors:['Qualcomm','AlphaZ','Formant option','OEM / ROS 2'],owns:'Proposed vendor-neutral execution boundary',input:'Scoped skill',output:'Native command + read-back'},
 {name:'Robotics · execution',role:'Local control remains on the embodiment',actors:['Ground robots','Drones','Infrastructure'],owns:'Proposed bounded runtime integration',input:'Skill + safety constraints',output:'State + completion evidence'}]
};
export const cases={
 cooling:{title:'Cooling failure',asset:'P-204',goal:'Restore cooling supply',app:'Optelos',input:'Pressure 9.4 bar; duty flow 18 L/min',observation:'Restriction suspected; inspect V-12',action:'Inspect, isolate V-12, start SB-02',result:'Supply verified at 58 L/min',demo:'/demos/factory',kind:'factory'},
 traffic:{title:'Junction congestion',asset:'J-01',goal:'Relieve the queue safely',app:'QCC VMS',input:'Queue 18 vehicles; crossing occupied',observation:'Crossing clear required before green',action:'Survey, clear crossing, adjust signal',result:'Queue trend falls; pedestrian interlock held',demo:'/demos/city',kind:'city'},
 fire:{title:'Fire verification',asset:'BLDG-07',goal:'Verify alarm and escalate evidence',app:'QCC VMS',input:'Alarm event; visual confirmation absent',observation:'Unconfirmed alarm; thermal evidence required',action:'Dispatch observation-only verification',result:'Evidence package routed to human responder',demo:'/demos/city',kind:'city'},
 construction:{title:'Construction progress',asset:'ZONE-C',goal:'Compare site capture with the plan',app:'Observance → Kael',input:'Scheduled capture; BIM revision 12',observation:'Coverage gaps in east service zone',action:'Capture waypoints; compare planned geometry',result:'Variance package delivered to project workflow',demo:'/demos/factory',kind:'factory'}
};
const sequence=[0,1,2,3,4,5,2,0];
const verbs=['Ground request','Resolve context','Interpret evidence','Authorize mission','Dispatch skill','Execute task','Verify result','Deliver evidence'];
export function createRun(mode,key,environment,now=Date.now()){
 const c=cases[key];if(!c||!layers[mode])throw Error('Unknown scenario');
 return{id:'SIM-'+String(now).slice(-6),mode,key,status:'RUNNING',step:0,progress:0,elapsed:0,approved:false,environment:environment?structuredClone(environment):null,events:[],asset:c.asset};
}
export function stepContract(run,index=run.step){
 const c=cases[run.key],layer=sequence[index],mode=run.mode,actor=layers[mode][layer];const route=run.environment?.decision?.mode==='drone'?'Drone candidate':'Ground response';
 const actions=[c.goal,mode==='eand'?c.app:'Resolve '+c.asset,c.observation,'Scope '+c.action,route+' / bounded skill',c.action,'Independent read-back',c.result];
 const inputs=[{goal:c.goal,asset:c.asset},{mission:run.id,asset:c.asset},{evidence:c.input,basis:'SIMULATED'},{finding:c.observation,scope:c.asset},{approved:run.approved,weather:run.environment?.weather?.observedAt||'unavailable',policy:route},{skill:c.action,controller:'SIMULATED'},{requested:c.action,readback:c.result},{evidence:c.result,mission:run.id}];
 const outputs=[{mission:run.id,goal:c.goal},{entity:c.asset,required:'timestamped evidence'},{finding:c.observation,basis:'SIMULATED'},{authorization:run.approved?'released':'operator review required',scope:c.asset},{route,adapter:mode==='eand'?(c.kind==='factory'?'AlphaZ RMS':'Qualcomm / AlphaZ'):'Capability adapter'},{status:'task executed',asset:c.asset,basis:'SIMULATED'},{verified:c.result,provenance:'demonstration result'},{outcome:c.result,ledger:run.id}];
 return{index,layer,title:verbs[index],actor:actor.name,action:actions[index],input:inputs[index],output:outputs[index]};
}
export function advanceRun(run,seconds){
 if(run.status!=='RUNNING')return run;
 const dt=Math.max(0,Math.min(seconds,1));run.elapsed+=dt;run.progress+=dt/2.4;
 if(run.progress<1)return run;
 if(run.step===3&&!run.approved){run.status='AWAITING APPROVAL';run.progress=1;return run;}
 const contract=stepContract(run);run.events.push({...contract,at:run.elapsed});run.progress=0;
 if(run.step===7)run.status='COMPLETE';else run.step++;
 return run;
}
export function approveRun(run){if(run.status==='AWAITING APPROVAL'){run.approved=true;run.status='RUNNING';run.progress=0;}return run;}
export const activeLayer=run=>sequence[run.step];

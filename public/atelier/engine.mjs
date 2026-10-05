// Interactive engineering examples only. No real equipment or partner service is connected.
export const names=['Ready','Resolve request','Open application workflow','Interpret evidence','Choose capability','Collect inspection evidence','Await operator approval','Execute approved recovery','Verify feedback','Outcome accepted'];
export const layerMap=[-1,0,1,2,3,4,3,5,4,0];
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export class MissionExample{
 constructor(){this.reset();}
 reset(){this.time=Date.now();this.elapsed=0;this.phase=0;this.phaseTime=0;this.verifyTime=0;this.paused=false;this.expired=false;this.approved=false;this.inspectionOnly=false;this.valve=1;this.standby=false;this.flow=18;this.pressure=9.4;this.revision=0;this.mission=null;this.events=[];this.history=[];this.outcome=null;this.capture();this.event('OBSERVATION','FT-02 and PT-04 sampled','LOCAL_SENSOR_MODEL');}
 get fresh(){return !this.expired&&this.time-this.sample.at<3500;}
 get busy(){return this.phase>0&&this.phase<9;}
 get layer(){return layerMap[this.phase];}
 capture(){this.revision++;this.sample={at:this.time,revision:this.revision,flow:this.flow,pressure:this.pressure,basis:'LOCAL_PROCESS_SIMULATION'};this.history.push({...this.sample});if(this.history.length>80)this.history.shift();}
 event(type,text,source='MISSION_MODEL'){this.events.push({at:this.time,type,text,source,revision:this.revision});if(this.events.length>80)this.events.shift();}
 start(inspectionOnly=false){if(this.busy)return'A mission is already active.';if(!this.fresh)return'Refresh the evidence before requesting a mission.';this.phase=1;this.phaseTime=0;this.approved=false;this.inspectionOnly=inspectionOnly;this.paused=false;this.outcome=null;this.mission='M-'+Math.floor(this.time).toString(36).toUpperCase();this.event('INTENT',inspectionOnly?'Inspection-only request accepted':'Cooling recovery investigation accepted');return null;}
 advance(){this.phase++;this.phaseTime=0;this.event('HANDOFF',names[this.phase]);}
 approve(){if(this.phase!==6)return'No action is awaiting approval.';if(!this.fresh)return'Approval held: evidence is stale.';this.approved=true;this.event('AUTHORITY','V-12 close and SB-02 start approved','LOCAL_OPERATOR');this.advance();return null;}
 expire(){this.expired=true;this.event('SOURCE','FT-02 / PT-04 source expired');}
 refresh(){this.expired=false;this.capture();this.event('SOURCE','Fresh circuit sample received');}
 tick(seconds){const dt=clamp(Number(seconds)||0,0,1);this.time+=dt*1000;this.elapsed+=dt;
  if(this.phase===7&&this.approved&&!this.paused){this.valve=Math.max(0,this.valve-dt*.48);if(this.valve<.02&&!this.standby){this.standby=true;this.event('READBACK','Duty valve closed; standby started','ACTUATOR_MODEL');}}
  const target=this.standby?58:18*this.valve;this.flow+=(target-this.flow)*(1-Math.exp(-dt/2.8));const pressureTarget=4.2+5.2*this.valve;this.pressure+=(pressureTarget-this.pressure)*(1-Math.exp(-dt/1.7));
  if(!this.expired&&this.time-this.sample.at>=950)this.capture();
  if(!this.busy||this.paused)return;this.phaseTime+=dt;
  const durations={1:1.3,2:1.3,3:1.8,4:1.8,5:3.2};
  if(this.phase<6&&this.phaseTime>durations[this.phase]&&this.fresh){if(this.phase===5&&this.inspectionOnly){this.phase=9;this.outcome='Inspection complete · no actuation';this.event('OUTCOME',this.outcome,'INSTRUMENT_MODEL');}else this.advance();}
  if(this.phase===7&&this.valve<.02&&this.standby&&this.phaseTime>4)this.advance();
  if(this.phase===8){this.verifyTime=this.fresh&&this.flow>45&&this.pressure<8&&this.valve<.02&&this.standby?this.verifyTime+dt:0;if(this.verifyTime>2.5){this.outcome='Cooling restored · evidence accepted';this.advance();this.event('OUTCOME',this.outcome,'FEEDBACK_ACCEPTANCE');}}
 }
 decision(){if(!this.fresh)return'Source expired. Planning and approval wait for fresh evidence.';if(this.paused&&this.busy)return'Mission paused. Source observations continue.';if(this.phase===6)return'Approve only V-12 close and SB-02 start. No equipment change has been made.';if(this.phase===7)return`Valve ${Math.round(this.valve*100)}% open · standby ${this.standby?'running':'waiting for closed read-back'}.`;if(this.phase===8)return'Checking flow >45 L/min, pressure <8 bar and valve closure for 2.5 seconds.';if(this.phase===9)return this.outcome;return this.busy?names[this.phase]+'. Source revision '+this.revision+' retained.':'Low flow and elevated pressure justify inspection, not automatic actuation.';}
 predict(){if(!this.fresh)return{ok:false,reason:'Refresh the source before comparing futures.'};const s=this.sample;return{ok:true,basis:'FIRST_ORDER_PROCESS_MODEL',revision:s.revision,horizonSeconds:20,keep:s.flow,recovery:58+(s.flow-58)*Math.exp(-17.9/2.8),pressure:4.2+(s.pressure-4.2)*Math.exp(-17.9/1.7),assumptions:['V-12 closes in 2.1 seconds','Standby supply is available','Flow time constant: 2.8 seconds','Pressure time constant: 1.7 seconds']};}
 export(){return{schema:'physical-ops.example.v1',basis:'LOCAL_INTERACTIVE_SIMULATION',at:this.time,mission:this.mission,phase:names[this.phase],approved:this.approved,inspectionOnly:this.inspectionOnly,observation:{...this.sample,fresh:this.fresh},controller:{valveOpen:this.valve,standby:this.standby},outcome:this.outcome,events:this.events.slice(),history:this.history.slice()};}
}
export class RobotExample{
 constructor(kind='ground'){this.kind=kind;this.reset();}
 reset(){this.time=Date.now();this.stage=-1;this.elapsed=0;this.part=0;this.waiting=false;this.approved=false;this.complete=false;this.cancelled=false;this.energy=94;this.events=[];}
 start(){if(this.stage>=0&&!this.complete&&!this.cancelled)return;this.reset();this.stage=0;this.record('Task accepted');}
 record(text){this.events.push({at:this.time,stage:this.stage,text});}
 approve(){if(!this.waiting)return;this.waiting=false;this.approved=true;this.part=0;this.record('Scoped local task released by operator');}
 stop(){if(this.stage<0)return;this.waiting=false;this.cancelled=true;this.record('Task cancelled; local hold');}
 tick(dt){dt=clamp(dt,0,1);this.time+=dt*1000;if(this.stage<0||this.complete||this.cancelled||this.waiting)return;this.elapsed+=dt;this.part+=dt;this.energy-=dt*(this.kind==='drone'?.018:.007);const duration=this.stage===4?5.2:this.stage===5?2.5:1.6;if(this.part>=duration){if(this.stage===5){this.complete=true;this.record('Returned evidence accepted');return;}this.stage++;this.part=0;this.record(this.labels[this.stage]);if(this.stage===4&&!this.approved)this.waiting=true;}}
 get labels(){return this.kind==='drone'?['Resolve survey','Load flight skill','Check local sensing','Plan permitted route','Execute survey','Return and verify evidence']:this.kind==='arm'?['Resolve object','Select tool skill','Localise object','Plan collision-free motion','Execute manipulation','Verify object outcome']:['Resolve asset','Load inspection skill','Check local state','Plan route','Navigate and inspect','Return instrument evidence'];}
 get progress(){if(this.complete)return 1;if(this.stage<0)return 0;return Math.min(.99,(this.stage+Math.min(1,this.part/(this.stage===4?5.2:this.stage===5?2.5:1.6)))/6);}
}

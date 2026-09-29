/** Shared browser/server contract. Intent text selects supported skills, never raw actuators. */
export const COMMAND_VERSION = '6.0';
export const examples = {
 city:[
  {title:'Coordinate traffic',text:'Reduce congestion at J-01. Protect pedestrians and ask before changing signals.',hint:'Survey · approval · signal plan · verify'},
  {title:'Survey only',text:'Survey J-01 only. Do not change the traffic signals.',hint:'Weather-aware survey · no signal changes'},
  {title:'Ground inspection',text:'Inspect J-01 using the ground unit. Keep the drone docked.',hint:'F-01 inspection · no flight · no signal changes'}
 ],
 factory:[
  {title:'Recover cooling',text:'Restore cooling at P-204. Isolate V-12 and start standby SB-02 after approval.',hint:'Diagnose · permit · isolate · standby · verify'},
  {title:'Inspection only',text:'Inspect cooling skid P-204 only. Do not actuate the valve.',hint:'Gauge + process signals · no plant changes'},
  {title:'Audit instruments',text:'Compare the pressure gauge and transmitter at P-204. Do not isolate.',hint:'Cross-check evidence · no plant changes'}
 ]
};
const rejection=(error,code=422)=>({ok:false,error,code});
export function compileGoal(raw,environment){
 const text=typeof raw==='string'?raw.trim():'';
 if(!['city','factory'].includes(environment))return rejection('Unknown operating environment.');
 if(text.length<8||text.length>500)return rejection('Enter a goal of 8–500 characters.');
 let s=text.toLowerCase().replace(/[’‘]/g,"'").replace(/\b(j|p|v|sb|r|f|d)\s*-?\s*(\d{2,3})\b/g,'$1-$2');
 const safety=s.replace(/\b(do not|don't|never)\s+(bypass|disable|ignore)\s+(the\s+)?(safety|approval|interlocks?|pedestrians?)/g,'preserve safeguards');
 if(/\b(bypass|skip|disable|ignore|override)\b.{0,35}\b(safety|approvals?|interlocks?|pedestrians?|people|stop)\b|\bwithout\s+(approval|permission)|don'?t stop for/.test(safety))return rejection('Safety, pedestrian clearance and scoped approval cannot be bypassed.',403);
 const allowed=environment==='city'?['j-01','d-01','f-01']:['p-204','pt-204','v-12','sb-02','r-07','d-01'];
 const ids=s.match(/\b(?:j|p|pt|v|sb|r|f|d)-\d{2,3}\b/g)||[];
 const unknown=ids.find(id=>!allowed.includes(id));
 if(unknown)return rejection(`${unknown.toUpperCase()} is not an executable target in this environment.`);
 if(/\b(delete|erase|purchase|email|download|upload|train|learn|weld|grasp|pick up|open the valve|restart the duty|real (drone|robot|signal))\b/.test(s))return rejection('That action is not in the installed skill set. Choose an example; arbitrary robot actions are not supported.');
 const withoutIds=s.replace(/\b(?:j|p|pt|v|sb|r|f|d)-\d{2,3}\b/g,'');
 if(/\d/.test(withoutIds))return rejection('Custom timing, thresholds and coordinates are not supported. The installed safety limits stay fixed.');
 if(environment==='city'){
  if(!/\b(traffic|junction|survey|inspect|congestion|pedestrian|j-01)\b/.test(s))return rejection('Use a traffic, junction or inspection goal.');
  const groundOnly=/\bground\b|\bf-01\b|keep (?:the )?drone (?:docked|home)|do not fly|don't fly|no (?:drone|flight)/.test(s);
  const forbiddenChange=/(?:do not|don't|never)\s+(?:change|adjust|apply|switch|control)|no (?:signal|traffic) changes|(?:survey|inspect|inspection)[ -]only|only (?:survey|inspect)/.test(s);
  const asksForChange=/\b(relieve|reduce|ease|clear|optimise|optimize|coordinate|respond|apply|adjust|change|switch|manage)\b/.test(s);
  const inspectionOnly=forbiddenChange||!asksForChange;
  return{ok:true,version:COMMAND_VERSION,environment,mode:inspectionOnly?'survey':'response',inspectionOnly,groundOnly,target:'J-01',title:inspectionOnly?(groundOnly?'Ground inspection':'Survey only'):'Traffic response',summary:inspectionOnly?`${groundOnly?'Ground unit':'Weather-aware survey'} · signals unchanged`:'Survey → scoped approval → signal plan → feedback',actions:inspectionOnly?['observe','ground','validate','predict','survey','verify']:['observe','ground','validate','predict','survey','approve','signal','verify'],limits:['J-01 only','Simulation actuators','Weather gate','Pedestrian clearance'],authority:inspectionOnly?'No signal changes':'Operator approval required'};
 }
 if(!/\b(inspect|inspection|cooling|skid|pump|pressure|valve|gauge|transmitter|p-204|v-12|sb-02|diagnose|compare)\b/.test(s))return rejection('Use a cooling-skid, pressure or instrument-inspection goal.');
 const noChange=/(?:do not|don't|never)\s+(?:isolate|close|actuate|change)|no (?:actuation|isolation|plant changes)|(?:inspect|inspection)[ -]only|only inspect/.test(s);
 const inspectionOnly=noChange||!/\b(isolate|close|restore|recover|recovery|stabilize|stabilise|standby)\b/.test(s);
 return{ok:true,version:COMMAND_VERSION,environment,mode:inspectionOnly?'inspect':'recovery',inspectionOnly,groundOnly:false,target:'P-204',title:inspectionOnly?'Read-only inspection':'Cooling recovery',summary:inspectionOnly?'Inspect → compare signals → record → dock':'Diagnose → approval → isolate + standby → verify → dock',actions:inspectionOnly?['observe','ground','validate','navigate','inspect','verify','dock']:['observe','ground','validate','navigate','inspect','approve','isolate','standby','verify','dock'],limits:['P-204 / V-12 / SB-02','Simulation actuators','Fixed feedback thresholds'],authority:inspectionOnly?'No plant changes':'Operator approval required'};
}

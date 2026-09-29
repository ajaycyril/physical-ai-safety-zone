import {compileGoal} from '../../public-command-bridge';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
type Observation={fresh?:boolean;recordedAt?:string;sourceId?:string;frameId?:number;vehicles?:number;people?:number;score?:number|null};
const valid=(o:Observation,source:string)=>o&&o.sourceId===source&&o.fresh===true&&Number.isFinite(o.frameId)&&Number.isFinite(Date.parse(o.recordedAt||''))&&Math.abs(Date.now()-Date.parse(o.recordedAt||''))<12000;
const count=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?Math.max(0,Math.min(50,Math.round(v))):0;
export async function GET(){return Response.json({status:'ready',service:'City mission compiler',mode:'bounded deterministic compiler',scope:'simulation-only',tools:['world.query','policy.check','rollout.compare','drone.survey','signal.apply','evidence.commit']},{headers});}
export async function POST(req:Request){try{
 const text=await req.text();if(text.length>16000)return Response.json({error:'Request too large'},{status:413,headers});
 const body=JSON.parse(text);const intent=typeof body.intent==='string'?body.intent.trim():'';
 const command=compileGoal(intent,'city');if(!command.ok)return Response.json({error:command.error},{status:command.code,headers});
 const a=body.observations?.traffic as Observation,b=body.observations?.crossing as Observation;
 if(!valid(a,'CAM-T01')||!valid(b,'CAM-P01'))return Response.json({error:'Fresh frames from both cameras are required before dispatch.'},{status:409,headers});
 return Response.json({id:'CITY-'+crypto.randomUUID().slice(0,8),mode:'bounded deterministic compiler',scope:'J-01 / simulated district only',createdAt:new Date().toISOString(),intent,inspectionOnly:command.inspectionOnly,groundOnly:command.groundOnly,command,observations:{trafficFrame:a.frameId,crossingFrame:b.frameId,vehicles:count(a.vehicles),pedestrians:count(b.people)},checks:[{name:'Evidence',pass:true},{name:'Service',pass:true},{name:'Simulation scope',pass:true}],actions:command.actions,constraints:{minAllRedSeconds:2,pedestrianClearanceRequired:true,humanApprovalRequired:!command.inspectionOnly,noRealInfrastructure:true},provenance:'Independent stock clips mapped to a scenario. No geographic reconstruction.'},{headers});
}catch{return Response.json({error:'Invalid mission request'},{status:400,headers});}}

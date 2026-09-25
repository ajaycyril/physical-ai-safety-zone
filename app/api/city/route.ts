export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
type Observation = {fresh?: boolean; recordedAt?: string; sourceId?: string; frameId?: number; vehicles?: number; people?: number; score?: number|null};
const valid = (o: Observation, source: string) => o && o.sourceId === source && o.fresh === true && Number.isFinite(o.frameId) && Number.isFinite(Date.parse(o.recordedAt||'')) && Math.abs(Date.now()-Date.parse(o.recordedAt||''))<12000;
const count = (v: unknown) => typeof v==='number' && Number.isFinite(v) ? Math.max(0,Math.min(50,Math.round(v))) : 0;
export async function GET() { return Response.json({status:'ready',service:'City mission compiler',mode:'bounded deterministic compiler',scope:'simulation-only',tools:['world.query','policy.check','rollout.compare','drone.survey','signal.apply','evidence.commit']},{headers}); }
export async function POST(req: Request) {
 try {
  const text=await req.text(); if(text.length>16000)return Response.json({error:'Request too large'},{status:413,headers});
  const body=JSON.parse(text); const intent=typeof body.intent==='string'?body.intent.trim():'';
  if(intent.length<8||intent.length>500||!/(traffic|junction|j-01|pedestrian|congestion|city|survey)/i.test(intent))return Response.json({error:'Use a junction, traffic or survey goal for this scenario.'},{status:400,headers});
  if(/disable.*(safety|interlock)|ignore.*pedestrian|bypass.*approval/i.test(intent))return Response.json({error:'The pedestrian interlock and action approval cannot be bypassed.'},{status:403,headers});
  const a=body.observations?.traffic as Observation,b=body.observations?.crossing as Observation;
  if(!valid(a,'CAM-T01')||!valid(b,'CAM-P01'))return Response.json({error:'Fresh frames from both cameras are required before dispatch.'},{status:409,headers});
  return Response.json({id:'CITY-'+crypto.randomUUID().slice(0,8),mode:'bounded deterministic compiler',scope:'J-01 / simulated district only',createdAt:new Date().toISOString(),intent,inspectionOnly:/survey only|inspect only|no signal|do not change/i.test(intent),observations:{trafficFrame:a.frameId,crossingFrame:b.frameId,vehicles:count(a.vehicles),pedestrians:count(b.people)},checks:[{name:'Evidence',pass:true},{name:'Service',pass:true},{name:'Simulation scope',pass:true}],actions:['compare_rollouts','survey_junction','request_approval','clear_crossing','apply_signal_plan','dispatch_field_unit','verify_feedback'],constraints:{minAllRedSeconds:2,pedestrianClearanceRequired:true,humanApprovalRequired:true,noRealInfrastructure:true},provenance:'Independent stock clips mapped to a scenario. No geographic reconstruction.'},{headers});
 }catch{return Response.json({error:'Invalid mission request'},{status:400,headers});}
}

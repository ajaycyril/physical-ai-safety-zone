import { NextRequest, NextResponse } from 'next/server';
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){return json({status:'ready',scope:'simulation-only',service:'mission-compiler',version:2,skills:['observe','query_world','navigate','inspect_gauge','isolate_valve','verify','dock'],models:{intent:'bounded rule-based compiler',perception:'EfficientDet Lite0 on device'},capabilities:{robot:'R-07',valve:'V-12',safety:'independent local hold'}});}
export async function POST(req:NextRequest){
 try{
  if(Number(req.headers.get('content-length')||0)>32000)return json({error:'Request too large'},413);
  const raw=await req.text();if(raw.length>32000)return json({error:'Request too large'},413);
  const body=JSON.parse(raw);const intent=typeof body.intent==='string'?body.intent.trim():'';
  if(intent.length<3||intent.length>500)return json({error:'Use a mission between 3 and 500 characters.'},400);
  const s=body.world?.robot;if(!s||![s.x,s.y,s.battery].every((v:unknown)=>typeof v==='number'&&Number.isFinite(v)))return json({error:'A valid robot snapshot is required.'},400);
  if(s.battery<20)return json({error:'Battery below dispatch threshold. Dock first.'},409);
  if(!/inspect|cooling|skid|pump|pressure|valve|p-204|v-12/i.test(intent))return json({error:'This facility supports cooling-skid inspection and approved V-12 isolation. Try the sample mission.'},422);
  if(/bypass|ignore (safety|policy)|disable (safety|stop)|without approval/i.test(intent))return json({error:'Safety and approval cannot be bypassed.'},403);
  const inspectionOnly=/inspect(ion)?[- ]only|do not (isolate|close)|don't (isolate|close)|no (actuation|isolation)/i.test(intent);
  const isolate=!inspectionOnly&&/isolate|close|valve|restore|stabili[sz]e/i.test(intent);
  const camera=body.world?.observation||{};const occupied=camera.fresh===true&&camera.kind==='occupancy'?Boolean(camera.occupied):null;
  return json({id:'M-'+crypto.randomUUID().slice(0,8).toUpperCase(),createdAt:new Date().toISOString(),intent,mode:'bounded-mission-compiler',scope:'simulation-only',inspectionOnly:!isolate,route:{avoidCentralAisle:occupied!==false,reason:occupied===true?'Person detected in camera inspection region':occupied===false?'Fresh camera observation: zone clear':'Camera occupancy unknown: take conservative bypass'},checks:[{name:'Identity',result:'pass',detail:'demo.operator / simulation scope only'},{name:'Capability',result:'pass',detail:'R-07: navigate, scan, valve-adapter'},{name:'Battery',result:'pass',detail:s.battery.toFixed(1)+'% > 20% dispatch threshold'},{name:'Approval',result:'required',detail:'V-12 isolation requires a separate operator approval'}],steps:[{action:'inspect',target:'P-204',policy:'A* grid planner + position servos'},{action:'read',target:'P-204',policy:'Calibrated needle image analysis'},...(isolate?[{action:'isolate',target:'V-12',policy:'Scoped approval + joint-space valve skill'}]:[]),{action:'verify',target:'P-204',policy:'Feedback and evidence validation'},{action:'dock',target:'D-01',policy:'A* grid planner + position servos'}],evidence:{cameraFrame:camera.frameId??null,source:camera.source??'unknown',observedAt:body.world?.observedAt??null}});
 }catch{return json({error:'Invalid JSON mission request'},400);}
}

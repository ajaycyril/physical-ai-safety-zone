import {NextRequest,NextResponse} from 'next/server';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
export async function GET(){return NextResponse.json({status:'ready',mode:'bounded-city-mission-compiler',scope:'simulation-only',version:1},{headers});}
export async function POST(req:NextRequest){
 try{
  if(Number(req.headers.get('content-length')||0)>70000)return NextResponse.json({error:'Request too large'},{status:413,headers});
  const text=await req.text();if(text.length>70000)return NextResponse.json({error:'Request too large'},{status:413,headers});
  const body=JSON.parse(text);const intent=typeof body.intent==='string'?body.intent.trim():'';
  if(!intent||intent.length>500)return NextResponse.json({error:'Enter a city task (up to 500 characters).'},{status:400,headers});
  if(!/junction|traffic|city|signal|crossing|survey|corridor/i.test(intent))return NextResponse.json({error:'This demo supports junction survey and a protected signal response.'},{status:422,headers});
  if(/disable safety|ignore pedestrian|bypass approval|real signal|surveillance target/i.test(intent))return NextResponse.json({error:'Requested action is outside the simulation safety contract.'},{status:403,headers});
  if(body.simulationOnly!==true)return NextResponse.json({error:'Only simulated city assets are addressable.'},{status:403,headers});
  const feeds=body.observation?.feeds;
  for(const key of ['traffic','crossing']){const f=feeds?.[key];if(!f||f.fresh!==true||typeof f.ageMs!=='number'||f.ageMs<0||f.ageMs>5000)return NextResponse.json({error:'Fresh '+key+' camera evidence is required.'},{status:409,headers});if(!Number.isFinite(f.vehicles)||!Number.isFinite(f.people)||f.vehicles<0||f.people<0||f.vehicles>100||f.people>100)return NextResponse.json({error:'Invalid detection counts.'},{status:400,headers});}
  const surveyOnly=/survey only|inspect only|no changes|do not change/i.test(intent);
  return NextResponse.json({id:'CITY-'+crypto.randomUUID().slice(0,8),mode:'bounded rules, not an LLM',scope:'J-01 / simulation',surveyOnly,goal:intent,checks:[{name:'Scope',result:'pass',detail:'Public simulation; no real asset credentials'},{name:'Cameras',result:'pass',detail:'Both sources fresh at compilation'},{name:'Safety',result:'pass',detail:'All-red clearance and pedestrian interlock'},{name:'Approval',result:'required',detail:'User action required before applying signal plan'}],grounding:{trafficFrame:feeds.traffic.frameId,crossingFrame:feeds.crossing.frameId,vehicles:feeds.traffic.vehicles,people:feeds.crossing.people,source:'Client-reported, recorded video detections. Not trusted production telemetry.'},skills:['world.query','scenario.rollout','drone.survey',...(surveyOnly?[]:['operator.approve','junction.apply','field.dispatch']),'outcome.verify','episode.commit'],constraints:{maxDroneAltitude:9,geofence:13,minimumAllRed:2,protectPedestrians:true,requiresApproval:!surveyOnly},issuedAt:new Date().toISOString()},{headers});
 }catch{return NextResponse.json({error:'Malformed mission request'},{status:400,headers});}
}

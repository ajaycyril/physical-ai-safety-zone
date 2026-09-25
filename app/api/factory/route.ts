import { compileFactoryMission } from '../../../public/room/industrial-model.js';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
export async function GET() {
  return Response.json({status:'ready',service:'Industrial incident orchestrator',version:4,scope:'simulation-only',compiler:'bounded deterministic rules',capabilities:['correlate','inspect','diagnose','isolate','dispatch_service','restart','verify','dock']},{headers});
}
export async function POST(req:Request) {
  try {
    const raw=await req.text();if(raw.length>32000)return Response.json({error:'Request too large'},{status:413,headers});
    const result=compileFactoryMission(JSON.parse(raw),'F-'+crypto.randomUUID().slice(0,8).toUpperCase());
    return Response.json(result,{status:result.status,headers});
  } catch { return Response.json({error:'Invalid mission request'},{status:400,headers}); }
}

// Authored topology and deterministic scenario values. Never presented as live site telemetry.
const asset=(id,name,type,x,y,zone,metric,unit,value,limit,deps=[])=>({id,name,type,x,y,zone,metric,unit,value,baseline:value,limit,deps,basis:'SCENARIO',history:[],status:value>limit?'Alarm':'Nominal'});
export function createAssets(city){
 if(city)return [
 asset('J-01','Corniche / Al Khaleej','junction',345,190,'Corniche','Queue','veh',24,20,['CAM-T01','CAM-P01']),
 asset('J-02','Al Danah / Hamdan','junction',595,300,'Al Danah','Queue','veh',31,25,['CAM-04','SIG-02']),
 asset('J-03','Al Zahiyah / Zayed','junction',840,300,'Al Zahiyah','Queue','veh',17,25,['CAM-07','SIG-03']),
 asset('J-04','Al Bateen / service access','junction',345,510,'Al Bateen','Queue','veh',8,20,['CAM-09']),
 asset('J-05','Al Manhal / school crossing','junction',595,510,'Al Manhal','Queue','veh',19,18,['CAM-06']),
 asset('J-06','Al Nahyan / response corridor','junction',840,510,'Al Nahyan','Queue','veh',12,25,['CAM-08']),
 asset('CAM-T01','Corniche traffic camera','camera',315,166,'Corniche','Vehicles','observed',0,99,['J-01']),
 asset('CAM-P01','Corniche pedestrian crossing','camera',372,215,'Corniche','People','observed',0,99,['J-01']),
 ...[[545,277],[868,270],[567,536],[875,535],[314,537],[625,273]].map(([x,y],i)=>asset('CAM-0'+(i+4),'District CCTV '+(i+4),'camera',x,y,['Al Danah','Al Zahiyah','Al Manhal','Al Nahyan','Al Bateen','Al Danah'][i],'Frame age','s',2+i*.2,8,[])),
 asset('D-01','Corniche survey drone','drone',240,255,'Corniche','Battery','%',87,101,['DOCK-01']),
 asset('D-02','Public-realm survey drone','drone',932,424,'Al Zahiyah','Battery','%',72,101,['DOCK-02']),
 asset('F-01','Field inspection unit','vehicle',285,445,'Al Bateen','Battery','%',92,101,[]),
 asset('F-02','Road response unit','vehicle',745,485,'Al Nahyan','Battery','%',84,101,[]),
 asset('DOCK-01','Corniche drone port','dock',215,255,'Corniche','Link','ms',28,100,[]),
 asset('DOCK-02','District drone port','dock',958,424,'Al Zahiyah','Link','ms',31,100,[]),
 asset('SIG-02','Hamdan signal controller','signal',620,322,'Al Danah','Cycle','s',90,120,['J-02']),
 asset('SIG-03','Zayed signal controller','signal',864,327,'Al Zahiyah','Cycle','s',85,120,['J-03']),
 asset('AQ-01','Public-realm air sensor','sensor',740,170,'Corniche','PM2.5','µg/m³',18,35,[]),
 asset('WX-AD','Abu Dhabi regional weather','sensor',970,135,'Regional','Wind','m/s',0,8,[]),
 ];
 return [
 asset('P-204','Cooling duty pump','pump',510,245,'Cooling / U2','Pressure','bar',9.4,8,['V-12','SB-02','PT-204','FT-02']),
 asset('V-12','Duty isolation valve','valve',563,245,'Cooling / U2','Position','%',100,101,['P-204']),
 asset('SB-02','Standby cooling pump','pump',510,309,'Cooling / U2','Speed','%',0,101,['V-14','FT-02']),
 asset('V-14','Standby discharge valve','valve',563,309,'Cooling / U2','Position','%',100,101,['SB-02']),
 asset('PT-204','Discharge transmitter','sensor',615,225,'Cooling / U2','Pressure','bar',9.4,8,['P-204']),
 asset('FT-02','Cooling header flow','sensor',615,330,'Cooling / U2','Flow','L/min',34,100,['P-204','SB-02']),
 ...[0,1,2].map(i=>asset('TK-10'+(i+1),'Feedstock tank '+(i+1),'tank',145+i*72,175,'Tank farm / T1','Level','%',62+i*8,90,[])),
 ...[0,1].map(i=>asset('TK-20'+(i+1),'Product storage '+(i+1),'tank',145+i*85,288,'Tank farm / T1','Level','%',45+i*14,90,[])),
 asset('P-101','Transfer pump','pump',290,272,'Tank farm / T1','Pressure','bar',4.2,7,['TK-101','V-01']),
 asset('V-01','Feed isolation','valve',325,272,'Tank farm / T1','Position','%',100,101,['P-101']),
 ...[0,1,2].map(i=>asset('CV-0'+(i+1),'Packaging conveyor '+(i+1),'conveyor',785,178+i*67,'Process / P3','Speed','m/s',.8+i*.15,1.4,['M-0'+(i+1)])),
 ...[0,1,2].map(i=>asset('M-0'+(i+1),'Line drive '+(i+1),'motor',903,178+i*67,'Process / P3','Temperature','°C',58+i*8,78,['CV-0'+(i+1)])),
 asset('AHU-01','Process ventilation','equipment',815,390,'Process / P3','Temperature','°C',26,32,[]),
 asset('MCC-01','Motor control centre','equipment',452,130,'Utilities / U1','Load','%',68,90,['P-204','SB-02']),
 asset('COMP-01','Instrument air compressor','equipment',568,130,'Utilities / U1','Pressure','bar',6.8,8,[]),
 ...[0,1,2,3].map(i=>asset('CAM-F0'+(i+1),'Inspection camera '+(i+1),'camera',120+i*230,380,'Plant perimeter','Frame age','s',1.2+i*.3,8,[])),
 asset('CAM-L02','Loading bay camera','camera',890,496,'Logistics / L4','Activity','%',0,20,[]),
 asset('R-07','Mobile inspection manipulator','robot',404,477,'Service corridor','Battery','%',96,101,['DOCK-R1']),
 asset('R-08','Logistics AMR','robot',765,485,'Logistics / L4','Battery','%',82,101,['DOCK-R2']),
 asset('R-09','Perimeter inspection robot','robot',205,485,'Service corridor','Battery','%',73,101,['DOCK-R1']),
 asset('D-F01','External survey drone','drone',128,557,'Plant perimeter','Battery','%',91,101,['DOCK-D1']),
 asset('DOCK-R1','Inspection charging bay','dock',398,540,'Service corridor','Power','kW',1.6,3,[]),
 asset('DOCK-R2','Logistics charging bay','dock',682,540,'Logistics / L4','Power','kW',2.2,3,[]),
 asset('DOCK-D1','Drone docking station','dock',164,557,'Plant perimeter','Power','kW',.8,3,[]),
 asset('GAS-01','Tank farm gas detector','sensor',90,300,'Tank farm / T1','LEL','%',0,10,[]),
 asset('TEMP-02','Cooling return temperature','sensor',655,287,'Cooling / U2','Temperature','°C',48,45,['P-204']),
 ];
}
export function compileIntent(text,assets,selected){
 const q=text.trim().toLowerCase().replace(/[’‘]/g,"'").replace(/\b(j|p|v|sb|r|f|d)\s*-?\s*(\d{2,3})\b/g,'$1-$2');if(q.length<4)return{error:'Describe an inspection, survey, response or recovery goal.'};
 if(/bypass|ignore.*(safety|policy)|without approval|disable.*(interlock|safety)/i.test(q))return{error:'This request conflicts with the scenario authority policy. Keep interlocks and approval enabled.'};
 const explicit=q.match(/\b(?:j|p|v|sb|tk|cv|cam|r|f|d|m|ahu|comp|mcc|temp|pt|ft|aq|wx|sig|dock|gas)-[a-z0-9-]+\b/g)||[];
 const unknown=explicit.filter(id=>!assets.some(a=>a.id.toLowerCase()===id));if(unknown.length)return{error:'Unknown asset: '+unknown.join(', ')+'. Select an asset from the map or inventory.'};
 const matches=assets.filter(a=>q.includes(a.id.toLowerCase())||q.includes(a.name.toLowerCase())||(a.type==='junction'&&q.includes(a.zone.toLowerCase())));
 let targets=matches.length?matches:[selected];
 const zone=assets.find(a=>q.includes(a.zone.split(' / ')[0].toLowerCase()));if(!matches.length&&zone)targets=assets.filter(a=>a.zone===zone.zone);
 if(!matches.length&&!zone&&explicit.length===0){const type=/camera|cctv/.test(q)?'camera':/pump/.test(q)?'pump':/tank/.test(q)?'tank':/conveyor/.test(q)?'conveyor':/junction|traffic/.test(q)?'junction':null;if(type&&selected.type!==type)targets=assets.filter(a=>a.type===type).slice(0,1);}
 if(/all|district-wide|plant-wide/.test(q)){const type=/camera|cctv/.test(q)?'camera':/pump/.test(q)?'pump':/junction|traffic/.test(q)?'junction':null;if(type)targets=assets.filter(a=>a.type===type);}
 const readOnly=/inspect|survey|check|diagnos|audit|monitor|compare|assess|scan/.test(q);
 const change=/recover|restore|isolate|close|start|dispatch|respond|relieve|reduce|clear|reroute|stabili[sz]e|repair/.test(q);
 if(!readOnly&&!change)return{error:'I could not resolve an action. Try “inspect”, “survey”, “reduce congestion”, “dispatch response”, or “recover” with an asset or district.'};
 const inspectionOnly=/only|do not|don't|no actuation|without actuation|no signal/.test(q)||!change;
 if(!inspectionOnly&&targets.some(a=>!['junction','pump','motor','equipment','conveyor','valve'].includes(a.type)))return{error:'These targets support inspection only. Choose a controllable pump, valve, process drive or junction for intervention.'};
 return{intent:text,targets:targets.map(a=>a.id),inspectionOnly,action:inspectionOnly?'Inspect & record':targets.some(a=>a.type==='junction')?'Coordinate response':'Restore & verify',steps:['Ground targets','Check dependencies','Route resources',inspectionOnly?'Capture observations':'Request authority',inspectionOnly?'Compare state':'Execute scoped action','Verify & record']};
}

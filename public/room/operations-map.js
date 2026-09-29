const line=(x1,y1,x2,y2,color='#273e4a',width=1,extra='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" ${extra}/>`;
const rect=(x,y,w,h,fill='#14232d',stroke='#2a424f')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}"/>`;
const text=(x,y,t,cls='street-label')=>`<text x="${x}" y="${y}" class="${cls}">${t}</text>`;
function cityBase(){let s='<path d="M0 0H1100V95L955 83 805 65 670 75 515 95 405 130 290 138 190 107 80 112 0 92Z" fill="#0d2632"/>';
 s+='<path d="M0 96L80 116 190 112 290 145 405 137 515 102 670 82 805 72 955 90 1100 103" fill="none" stroke="#45606b" stroke-width="3"/>';
 for(let j=0;j<4;j++)s+=`<path d="M0 ${20+j*15} Q260 ${70+j*12} 540 ${20+j*12}T1100 ${30+j*12}" fill="none" stroke="#183844" stroke-width=".6"/>`;
 s+=text(150,64,'ARABIAN GULF','district-label');
 for(const y of [190,300,510]){s+=line(55,y,1040,y,'#1c2b35',26)+line(55,y,1040,y,'#72817a',.6,'stroke-dasharray="8 12"');}
 for(const x of [345,595,840])s+=line(x,145,x,610,'#1c2b35',26)+line(x,145,x,610,'#72817a',.6,'stroke-dasharray="8 12"');
 for(const [x,y,w,h]of [[85,215,225,60],[385,215,175,60],[635,215,170,60],[888,210,140,70],[85,340,225,130],[385,340,175,130],[635,340,170,130],[888,350,135,130],[85,550,225,45],[385,550,175,45],[635,550,170,45],[890,550,140,45]]){
  s+=rect(x-8,y-7,w+16,h+14,'#10202a','#223742');
  for(let bx=x;bx<x+w-22;bx+=31)for(let by=y;by<y+h-15;by+=27){const tall=(bx+by)%3===0;s+=rect(bx+3,by+3,21,17,'#080f15','#101f28')+rect(bx,by,21,17,tall?'#243944':'#1a2d38','#304853')+rect(bx+5,by+4,9,6,'#30434b','#40535c');}
 }
 // Corniche promenade and planted median strips.
 for(let x=100;x<1020;x+=22)s+=`<circle cx="${x}" cy="${154+Math.sin(x*.006)*9}" r="2.2" fill="#31524f"/>`;
 for(const [x,y]of [[345,190],[595,300],[840,300],[345,510],[595,510],[840,510]]){
  s+=rect(x-18,y-18,36,36,'#20333d','#36505b');
  for(let d=-9;d<=9;d+=4){s+=line(x+d,y-22,x+d,y-15,'#6b7c7e',1)+line(x-22,y+d,x-15,y+d,'#6b7c7e',1);}
 }
 s+=text(80,185,'CORNICHE ROAD')+text(380,294,'HAMDAN BIN MOHAMMED ST')+text(615,503,'SULTAN BIN ZAYED ST');
 s+=text(126,415,'AL BATEEN','district-label')+text(405,406,'AL DANAH','district-label')+text(660,405,'AL NAHYAN','district-label')+text(895,395,'AL ZAHIYAH','district-label');
 return s;
}
function factoryBase(){let s=rect(55,85,970,510,'#0e1b23','#3a4d55');
 const zones=[[77,110,280,235,'T1 / STORAGE & TRANSFER'],[390,110,278,235,'U2 / COOLING & UTILITIES'],[709,110,280,235,'P3 / PROCESS & PACKAGING'],[77,411,280,156,'S1 / MAINTENANCE'],[390,411,278,156,'R1 / ROBOT SERVICES'],[709,411,280,156,'L4 / LOGISTICS']];
 for(const [x,y,w,h,name]of zones){s+=rect(x,y,w,h,'#13222b','#304651')+text(x+10,y-10,name);s+=line(x,y+32,x+w,y+32,'#233b47');}
 s+=rect(56,355,968,42,'#1c2930','#2a3e46')+line(65,376,1015,376,'#7a826f',1,'stroke-dasharray="16 12"')+text(480,372,'SERVICE SPINE / RESTRICTED SPEED');
 for(let x=95;x<340;x+=48)for(let y=445;y<545;y+=38){s+=rect(x,y,32,22,'#283b42','#42545b');for(let k=0;k<3;k++)s+=line(x+5+k*9,y+2,x+5+k*9,y+20,'#16242c',2);}
 for(let x=734;x<976;x+=47){s+=rect(x,442,30,22,'#263b42','#49616b')+rect(x,530,30,22,'#23353d','#3c515b');}
 for(let y=168;y<320;y+=67){s+=rect(735,y,141,20,'#233c45','#4b646c');for(let k=0;k<20;k++)s+=line(739+k*6.6,y+2,739+k*6.6,y+18,'#14262f',1);}
 // Process pipe rack, redundant header and branch isolation topology.
 s+='<path d="M145 175H290V272H345V205H450V245H630V180H709 M230 288V320H345V293H450V309H630V335H704V242H735" fill="none" stroke="#345b68" stroke-width="7"/>';
 s+='<path d="M145 175H290V272H345V205H450V245H630V180H709 M230 288V320H345V293H450V309H630V335H704V242H735" fill="none" stroke="#6c8b94" stroke-width="1"/>';
 for(let x=410;x<=650;x+=38)s+=line(x,166,x,333,'#203843',1,'stroke-dasharray="3 4"');
 for(let x=60;x<1020;x+=18)s+=line(x,590,x+7,595,'#6c6650',1);
 s+=text(89,581,'PERIMETER FENCE / CONTROLLED ACCESS')+text(870,581,'GATE 04');return s;
}
function symbol(a){const c=a.status==='Alarm'?'#c69d62':'#83abae';switch(a.type){case'tank':return `<circle r="24" fill="#223540" stroke="#5b7885"/><circle r="19" fill="none" stroke="#3b5664"/><path d="M-20 -9H20M-20 9H20M0 -24V24" stroke="#405b67"/>`;case'pump':return `<rect x="-18" y="-11" width="38" height="22" fill="#243e49" stroke="#627d88"/><circle r="10" fill="#132a36" stroke="${c}"/><path d="M-5 -6L7 0-5 6Z" fill="${c}"/>`;case'valve':return `<path d="M-8 -6L8 6V-6L-8 6Z" fill="#243945" stroke="${c}"/>`;case'camera':return `<path d="M-7 -4H4V3H-7ZM4 -2L9 -4V4L4 2M-1 4V10" fill="#1a303a" stroke="${c}"/>`;case'junction':return `<rect x="-13" y="-13" width="26" height="26" fill="#172c38" stroke="${c}"/><path d="M0 -9V9M-9 0H9" stroke="${c}"/>`;case'drone':return `<path d="M-8 -8L8 8M8 -8L-8 8" stroke="${c}" stroke-width="2"/><rect x="-4" y="-4" width="8" height="8" fill="${c}"/>${[-8,8].flatMap(x=>[-8,8].map(y=>`<circle cx="${x}" cy="${y}" r="4" fill="none" stroke="${c}"/>`)).join('')}`;case'robot':case'vehicle':return `<rect x="-10" y="-6" width="20" height="12" fill="#36505b" stroke="${c}"/><path d="M-5 -8H5M-5 8H5" stroke="#aac2ca" stroke-width="2"/>`;case'dock':return `<rect x="-12" y="-12" width="24" height="24" fill="none" stroke="#3f6475" stroke-dasharray="3 2"/><path d="M-5 0H5M0 -5V5" stroke="#6d92a2"/>`;case'sensor':return `<circle r="5" fill="#152f3b" stroke="${c}"/><circle r="2" fill="${c}"/>`;default:return `<rect x="-10" y="-8" width="20" height="16" fill="#26404b" stroke="#698692"/><path d="M-6 -4H6M-6 0H6M-6 4H6" stroke="#526d7a"/>`;}}
export function mapMarkup(city,assets){return `<svg id="opsMapSvg" viewBox="0 0 1100 650" role="group" aria-label="${city?'District':'Plant'} asset topology"><defs><pattern id="opsGrid" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M25 0H0V25" fill="none" stroke="#1c303c" stroke-width=".4"/></pattern></defs><rect width="1100" height="650" fill="#0a151e"/><rect width="1100" height="650" fill="url(#opsGrid)"/>${city?cityBase():factoryBase()}<g class="sensor-overlay">${assets.filter(a=>a.type==='camera').map(a=>`<path d="M${a.x} ${a.y}l-43 72q45 24 86 0Z" fill="#558387" fill-opacity=".07" stroke="#47747b" stroke-opacity=".4" stroke-width=".7"/>`).join('')}</g><g class="route-overlay"><path d="${city?'M240 255H345V190H595V300H840V510H745':'M398 540V376H450V245H510M450 376H765V485'}" fill="none" stroke="#6a999d" stroke-width="1.5" class="route-line"/><g id="opsMissionRoute"></g></g><g id="opsMapAssets">${assets.map(a=>`<g class="map-asset" data-asset="${a.id}" tabindex="0" role="button" aria-label="Inspect ${a.id}, ${a.name}" transform="translate(${a.x} ${a.y})"><circle class="asset-hit" r="${a.type==='tank'?29:18}" fill="transparent" stroke="transparent"/>${symbol(a)}<text class="ops-asset-label" y="${a.type==='tank'?39:28}" text-anchor="middle" font-size="8" fill="#96afb9">${a.id}</text><circle class="asset-alarm" cx="12" cy="-13" r="2.5" fill="${a.status==='Alarm'?'#d4a15e':'#4b7776'}"/></g>`).join('')}</g><g id="opsFleetMotion"></g></svg>`;}

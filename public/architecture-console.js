import {layers,cases,createRun,advanceRun,approveRun,stepContract,activeLayer} from './architecture-engine.js';
const $=id=>document.getElementById(id),mode=document.body.dataset.architecture,items=[...document.querySelectorAll('.ax-layer')],esc=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
if(new URL(location.href).searchParams.get('view')==='eand'&&mode==='analog')location.replace('/eand-stack');
let run=null,selected=0,follow=true,last=performance.now(),previous='';
function rows(data){return Object.entries(data).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(typeof v==='object'?JSON.stringify(v):v)}</dd></div>`).join('');}
function inspect(){const layer=layers[mode][selected];let c=run?(follow?stepContract(run):[...run.events].reverse().find(e=>e.layer===selected)):null;
 $('axLayerName').textContent=layer.name;$('axAction').textContent=c?.action||layer.role;$('axStep').textContent=c?`STEP ${c.index+1}/8 · ${c.title.toUpperCase()}`:'LAYER CONTRACT';
 $('axInput').innerHTML=rows(c?.input||{receives:layer.input,owner:layer.owns});$('axOutput').innerHTML=rows(c?.output||{returns:layer.output,actors:layer.actors.join(' / ')});
 document.querySelector('.ax-contracts article:last-child h3').textContent=c&&run.status!=='COMPLETE'&&c.index===run.step?'EXPECTED OUTPUT / SIMULATED':'OUTPUT / SIMULATED';
 $('axFollow').textContent=follow?'Following mission':'Follow mission';items.forEach((e,i)=>e.classList.toggle('is-selected',selected===i));
}
function render(force=false){const active=run?activeLayer(run):-1;if(follow&&run)selected=active;
 for(const [i,e]of items.entries()){const current=i===active&&run.status!=='COMPLETE',done=run?.events.some(ev=>ev.layer===i);e.classList.toggle('is-active',current);e.classList.toggle('is-complete',!!done);e.setAttribute('aria-pressed',String(i===selected));e.style.setProperty('--progress',current?run.progress*100+'%':done?'100%':'0%');e.querySelector('.ax-layer-state').textContent=current?(run.status==='AWAITING APPROVAL'?'REVIEW':run.status==='PAUSED'?'PAUSED':'ACTIVE'):done?'DONE':'READY';}
 const packet=document.querySelector('.ax-packet');packet.style.opacity=run&&run.status!=='COMPLETE'?'1':'0';if(active>=0)packet.style.top=(items[active].offsetTop+items[active].offsetHeight/2)+'px';
 $('axProgress').style.width=run?(run.status==='COMPLETE'?'100%':((run.step+run.progress)/8*100)+'%'):'0%';$('axPause').disabled=!run||!['RUNNING','PAUSED'].includes(run.status);$('axPause').textContent=run?.status==='PAUSED'?'Resume':'Pause';$('axStatus').textContent=run?`${cases[run.key].title} · ${run.status} · ${Math.round(run.elapsed)}s`:'Choose a use case';
 $('axApproval').hidden=run?.status!=='AWAITING APPROVAL';$('axScope').textContent=run?`${cases[run.key].asset} · ${cases[run.key].action}`:'';
 const signature=run?`${run.step}/${run.status}/${run.events.length}/${selected}/${follow}`:'idle'+selected;if(force||signature!==previous){previous=signature;inspect();$('axEvents').innerHTML=run?.events.length?[...run.events].reverse().map(e=>`<li><time>${e.at.toFixed(1)}s</time>${esc(e.actor)} → ${esc(e.title)}</li>`).join(''):'<li>Waiting for a completed stage.</li>';}
}
for(const b of document.querySelectorAll('[data-case]'))b.onclick=()=>{run=createRun(mode,b.dataset.case,window.__environment);follow=true;selected=0;last=performance.now();document.querySelectorAll('[data-case]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$('axDemo').href=cases[run.key].demo;render(true);};
items.forEach((b,i)=>b.onclick=()=>{selected=i;follow=false;render(true);});
$('axFollow').onclick=()=>{follow=true;render(true);};$('axPause').onclick=()=>{if(run)run.status=run.status==='PAUSED'?'RUNNING':'PAUSED';last=performance.now();render(true);};$('axApprove').onclick=()=>{if(run)approveRun(run);follow=true;render(true);};$('axReset').onclick=()=>{run=null;follow=true;selected=0;document.querySelectorAll('[data-case]').forEach(b=>b.setAttribute('aria-pressed','false'));render(true);};
$('axExport').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({basis:'ARCHITECTURE SIMULATION',mode,run,environment:run?.environment},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`${mode}-trace.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);};
const timer=setInterval(()=>{const now=performance.now(),dt=(now-last)/1000;last=now;if(document.hidden)return;if(run)advanceRun(run,dt*Number($('axSpeed').value));render();},100);
window.__architecture={state:()=>run,mode,select:key=>document.querySelector(`[data-case="${key}"]`)?.click()};addEventListener('pagehide',()=>clearInterval(timer),{once:true});render(true);

const initialCase=new URL(location.href).searchParams.get('case');if(cases[initialCase])window.__architecture.select(initialCase);
addEventListener('environment:update',e=>{if(run&&run.step<4){run.environment=structuredClone(e.detail);render(true);}});

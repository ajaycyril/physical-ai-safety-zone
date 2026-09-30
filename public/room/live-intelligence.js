import {IntelligenceMemory,answerFromFrame,formatValue} from './live-intelligence-model.js';
import {renderBridge} from './render-upgrade.js';

const $=id=>document.getElementById(id), city=!!$('cityScene'), kind=city?'city':'factory';
const esc=s=>String(s??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const memory=new IntelligenceMemory(100);
const sceneEntities=new Set(['P-204','R-07','V-12','SB-02','J-01','SG-01','D-01','F-01']);
let selected='mission',worldView='state',follow=true,latest,frozen=null,previousPhase='',selectedEntity=city?'J-01':'P-204',timer,persisted='',saved=[];
const storageKey='pi-intelligence-episodes-v1:'+kind;
const previousEpisodes=()=>saved.filter(e=>e.frames.at(-1)?.missionId!==latest?.missionId);
try{const parsed=JSON.parse(localStorage.getItem(storageKey)||'[]');if(Array.isArray(parsed))saved=parsed.filter(e=>e?.schema==='physical-intelligence-episode/v1'&&Array.isArray(e.frames)&&e.frames.every(f=>f?.world&&f?.agent&&Array.isArray(f.facts)&&Array.isArray(f.events))).slice(-2);}catch{}
const state=()=>city?window.__city?.state():window.__room?.state();
const clock=at=>at?new Date(at).toLocaleTimeString('en-GB',{hour12:false}):'Unknown';
const kv=(key,value)=>`<div class="intel-kv"><span>${esc(key)}</span><b>${esc(value)}</b></div>`;
const badge=(text,type='')=>`<span class="intel-badge ${type}">${esc(text)}</span>`;

function select(tab,manual=true){
  if(manual)follow=false;
  selected=tab;document.body.classList.toggle('intel-open',tab!=='mission');
  $('intelPanel').hidden=tab==='mission';
  document.querySelectorAll('[data-intel-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.intelTab===tab)));
  $('intelFollow').setAttribute('aria-pressed',String(follow));
  $('intelFollow').title=follow?'Following the mission through each layer':'Follow the mission automatically';
  if(tab==='mission')return;
  const headings={world:['World model','State · provenance · memory'],agent:['Contextual agent','ANA equivalent · bounded reasoning'],hive:['Operations coordination','HIVE equivalent · simulated adapters']};
  const [title,sub]=headings[tab];
  $('intelPanel').innerHTML=`<header><div><h2>${title}</h2><span>${sub}</span></div><span id="intelMode" class="intel-live">LIVE</span></header>
    ${tab==='world'?'<nav class="intel-subtabs" aria-label="World model views">'+['state','prediction','memory'].map(t=>`<button data-world-view="${t}" aria-pressed="${worldView===t}">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')+'</nav>':''}
    <button id="intelGate" hidden>Approval waiting · Review scope →</button><div class="intel-scroll"><div id="intelContent"></div>${tab==='agent'?'<div class="intel-query"><div id="intelAnswer" role="status">Ask about the current world state or decision.</div><div class="intel-suggestions"><button data-ask="Why this plan?">Why this plan?</button><button data-ask="What is blocked?">What is blocked?</button><button data-ask="What happens next?">Next task</button></div><form id="intelQuestion"><input aria-label="Ask the live agent" placeholder="Ask about this mission…" maxlength="240"><button type="submit" aria-label="Ask">↗</button></form></div>':''}</div>
    <footer><span id="intelRevision"></span><button data-intel-export>Export episode ↗</button></footer>`;
  if(tab==='agent')$('intelQuestion').onsubmit=e=>{e.preventDefault();ask(e.target.querySelector('input').value);};
  render();
}

function graph(frame){
  const ids=city?['CAM-T01','CAM-P01','J-01','SG-01','D-01','F-01']:['CAM-01','R-07','P-204','V-12','SB-02','FT-02'];
  const positions=[[54,24],[256,24],[54,82],[256,82],[54,140],[256,140]];
  const node=id=>positions[ids.indexOf(id)];
  return `<svg class="intel-graph ${frame.phase>=0&&!frame.held?'streaming':''}" viewBox="0 0 310 165" role="group" aria-label="Live entity dependency graph">${frame.links.filter(([a,b])=>node(a)&&node(b)).map(([a,b,label])=>{const x=node(a),y=node(b);return `<path d="M${x[0]},${x[1]}L${y[0]},${y[1]}"><title>${esc(a+' '+label+' '+b)}</title></path>`;}).join('')}${ids.map((id,i)=>{const f=frame.facts.find(f=>f.id===id),[x,y]=positions[i];return `<g tabindex="0" role="button" aria-label="Inspect ${id}" data-intel-entity="${id}" class="${selectedEntity===id?'selected':''} ${f?.fresh?'':'unknown'}"><rect x="${x-45}" y="${y-14}" width="90" height="28" rx="4"/><text x="${x}" y="${y+4}" text-anchor="middle">${id}</text><circle cx="${x+36}" cy="${y-8}" r="2.5"/></g>`;}).join('')}</svg>`;
}

function worldContent(frame){
  if(worldView==='prediction'){
    const p=frame.prediction;
    return p?`${badge(p.basis)}<h3>${esc(p.title)}</h3><div class="intel-comparison">${p.rows.map(([label,value,unit])=>{const max=Math.max(...p.rows.map(r=>r[1]),1);return `<div><span>${esc(label)}</span><b>${Number(value).toFixed(1)} <small>${esc(unit)}</small></b><i style="--fill:${Math.max(0,value/max)*100}%"></i></div>`;}).join('')}</div><p>${esc(p.note)}</p><div class="intel-callout">Prediction informs a proposal. Approval and independent controller feedback determine execution and completion.</div>`:`${badge('WAITING FOR ROLLOUT')}<h3>Compare before committing.</h3><p>${city?'The mission clones current traffic demand and compares two timing plans.':'The process model compares isolation alone with isolation plus standby supply.'}</p><p>Start the mission to generate its forecast.</p>`;
  }
  if(worldView==='memory'){
    const f=frozen||frame;
    return `<div class="intel-memory-controls"><button data-memory="previous">← Earlier state</button><button data-memory="live" ${!frozen?'disabled':''}>Return to live</button></div>${badge(frozen?'RECORDED SNAPSHOT / '+clock(f.at):'CURRENT STATE',frozen?'amber':'')}<h3>One episode. Every handoff.</h3>${kv('Mission',f.missionId||'Not dispatched')}${kv('Retained state revisions',memory.frames.length)}${kv('Controller samples',f.world.sampleCount)}<div class="intel-events">${f.events.slice(-7).reverse().map(e=>`<div><time>${clock(e.at)}</time><span><b>${esc(e.layer)}</b>${esc(e.text)}</span></div>`).join('')||'<p>No mission events yet.</p>'}</div>${previousEpisodes().length?`<button class="intel-previous" data-memory="saved">Inspect previous saved episode (${previousEpisodes().length})</button>`:''}<p class="intel-note">Memory is retained in this browser. Historical evidence never replaces current controller state.</p>`;
  }
  const entity=frame.facts.find(f=>f.id===selectedEntity)||frame.facts[0];
  return `<div class="intel-source-summary">${badge(frame.world.current+'/'+frame.world.total+' cameras current',frame.world.current<frame.world.total?'amber':'')}${badge('REV '+frame.revision)}</div>${graph(frame)}
    <div class="intel-entity"><div><b>${esc(entity.id)}</b><span>${esc(entity.label)}</span><strong>${esc(formatValue(entity))}</strong></div><small>${esc(entity.basis)} · ${entity.fresh?'CURRENT':'UNKNOWN / STALE'}${entity.frame!=null?' · FRAME '+entity.frame:''}</small>${entity.ageMs!=null?`<small>Age ${(entity.ageMs/1000).toFixed(1)}s / ${(entity.ttlMs/1000).toFixed(1)}s freshness limit</small>`:''}${sceneEntities.has(entity.id)?`<button data-intel-focus="${esc(entity.id)}">Locate in scene ↗</button>`:'<small>Source joined by entity ID; no calibrated 3D pose.</small>'}</div>
    <div class="intel-facts">${frame.facts.filter(f=>f.id!==entity.id).map(f=>`<button data-intel-entity="${esc(f.id)}"><span>${esc(f.id)} <small>${esc(f.label)}</small></span><b class="${f.fresh?'':'intel-unknown'}">${esc(formatValue(f))}</b></button>`).join('')}</div>`;
}

function agentContent(f){
  const checks=f.agent.checks;
  const explanation=f.agent.reason;
  return `<div class="intel-source-summary">${badge(f.agent.mode)}${badge(f.agent.approval?'AUTHORITY RECORDED':'SCOPED AUTHORITY',f.agent.approval?'':'amber')}</div><h3>${esc(f.agent.decision)}</h3><p>${esc(explanation)}</p>
    <div class="intel-handoff"><div><small>${f.agent.inputAt?'COMPILED FROM / '+clock(f.agent.inputAt):'READ'}</small><b>${esc(f.agent.input)}</b></div><span>↓</span><div><small>PROPOSE</small><b>${esc(f.agent.output)}</b></div></div>
    ${checks.length?'<div class="intel-checks">'+checks.map(c=>`<div>${badge(c.result==='required'?'REQUIRED':c.pass===true||c.result==='pass'?'PASS':c.result||'CHECK',c.result==='required'?'amber':'')}<span>${esc(c.name)}</span></div>`).join('')+'</div>':'<p class="intel-note">Validation results appear when the mission service returns a plan.</p>'}
    <div class="intel-callout">${esc(f.agent.approval?f.agent.approval.scope+' · '+f.agent.approval.actor:f.agent.route)}</div>`;
}

function hiveContent(f){
  const pose=values=>Array.isArray(values)&&values.every(v=>typeof v==='number'&&Number.isFinite(v))?values.map(v=>v.toFixed(1)).join(', ')+' m':'Awaiting pose';
  return `<div class="intel-source-summary">${badge(f.held?'CONTROLLER HELD':f.complete?'MISSION COMPLETE':f.missionId?'MISSION ACTIVE':'STANDBY',f.held?'amber':'')}${badge(f.coordination.evidenceCount+' events')}</div>
    <div class="intel-resources">${f.resources.map(r=>`<button data-intel-focus="${r.id}"><div><b>${r.id}</b><span>${esc(r.role)}</span><strong>${esc(r.state)}</strong></div><small>${esc(r.pose?pose(r.pose):r.detail||r.source)}${r.held?' · HELD':''}</small></button>`).join('')}</div>
    <ol class="intel-tasks">${f.tasks.map(t=>`<li class="${t.state}" title="${esc(t.dependency)}"><i>${t.state==='done'?'✓':t.state==='skipped'?'–':'·'}</i><span><b>${esc(t.title)}</b><small>${esc(t.owner)} · ${esc(t.dependency)}</small></span><em>${t.state}</em></li>`).join('')}</ol>
    <div class="intel-controls"><button data-runtime-control="pause" ${!f.missionId||f.complete||stoppedStatus(f.status)?'disabled':''}>${f.paused?'Resume':'Pause'} mission</button><button data-runtime-control="stop" ${!f.missionId||f.complete||stoppedStatus(f.status)?'disabled':''}>Stop</button></div>
    <div class="intel-callout">${f.coordination.workOrder?esc(f.coordination.workOrder.id+' · '+f.coordination.workOrder.status):esc(f.coordination.routing+' · '+f.coordination.lastFeedback)}</div>`;
}

function render(){
  if(!latest)return;
  const frame=selected==='world'&&worldView==='memory'&&frozen?frozen:latest;
  const fresh=latest.world.current===latest.world.total;
  $('intelWorldStatus').textContent=`${latest.world.current}/${latest.world.total} sources`;
  $('intelAgentStatus').textContent=latest.complete?'Verified':latest.status==='AWAITING APPROVAL'?'Approval':latest.held?'Held':latest.missionId?'Plan active':'Observing';
  $('intelHiveStatus').textContent=latest.held?'Held':latest.complete?'Verified':latest.tasks.filter(t=>t.state==='active').length+' active';
  $('intelWorldStatus').classList.toggle('warning',!fresh);
  $('intelAgentStatus').classList.toggle('warning',latest.status==='AWAITING APPROVAL');
  if(selected==='mission')return;
  $('intelGate').hidden=latest.status!=='AWAITING APPROVAL';
  const mode=$('intelMode');mode.textContent=frozen&&selected==='world'&&worldView==='memory'?'REPLAY':latest.held?'HELD':'LIVE';mode.classList.toggle('historical',mode.textContent!=='LIVE');
  $('intelRevision').textContent=`${clock(frame.at)} · rev ${frame.revision}`;
  const content=$('intelContent'),focused=content.contains(document.activeElement)?document.activeElement:null,oldGraph=content.querySelector('.intel-graph');
  const focusKey=focused?Object.entries(focused.dataset).find(([key])=>['intelEntity','intelFocus','memory','runtimeControl'].includes(key)):null;
  content.innerHTML=selected==='world'?worldContent(frame):selected==='agent'?agentContent(frame):hiveContent(frame);
  const newGraph=content.querySelector('.intel-graph');
  if(oldGraph&&newGraph&&oldGraph.outerHTML===newGraph.outerHTML)newGraph.replaceWith(oldGraph);
  if(focusKey){const target=[...content.querySelectorAll('button,[role=button]')].find(b=>b.dataset[focusKey[0]]===focusKey[1]);target?.focus({preventScroll:true});}
}

function ask(question){if(!question.trim()||!latest)return;const answer=answerFromFrame(question,latest,memory.frames[Math.max(0,memory.frames.length-12)]);$('intelAnswer').innerHTML=`<b>${esc(question)}</b><p>${esc(answer.text)}</p><small>${esc(answer.cite.join(' · '))} · rev ${latest.revision} / ${clock(latest.at)}</small>`;}
function exportEpisode(){const data=memory.export(),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`${kind}-${latest?.missionId||'world-state'}-intelligence.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function sample(){
  const s=state();if(!s||document.hidden)return;
  latest=memory.append(kind,s,{environment:window.__abuDhabi?.snapshot(),comparison:!city&&s.physics?.process?.diagnosis?window.__plant?.comparison():null});
  const marker=[s.phase,s.status].join('/');
  if(follow&&marker!==previousPhase&&window.__demoDirector?.state().active){const tab=s.status==='AWAITING APPROVAL'?'mission':city&&s.phase===3?'world':s.phase<=1?'world':s.phase<=3?'agent':s.phase<=6?'hive':'world';if(s.phase===7)worldView='memory';else if(city&&s.phase===3)worldView='prediction';if(tab!==selected)select(tab,false);}
  if(follow&&s.status==='COMPLETE'&&marker!==previousPhase)select('mission',false);
  previousPhase=marker;
  if((latest.complete||stoppedStatus(latest.status))&&latest.missionId&&persisted!==latest.missionId+'/'+latest.status){persisted=latest.missionId+'/'+latest.status;const episode=memory.export();saved=[...saved.filter(e=>e.frames.at(-1)?.missionId!==latest.missionId),episode].slice(-2);try{localStorage.setItem(storageKey,JSON.stringify(saved));}catch{/* Export remains available if browser storage is full. */}}
  render();
}
const stoppedStatus=s=>['STOPPED','BLOCKED','FAILED','ERROR'].includes(s);

function build(){
  const parent=$('demoNarrative')?.parentElement;if(!parent)return false;
  const tabs=document.createElement('nav');tabs.id='intelTabs';tabs.className='intelligence-tabs';tabs.setAttribute('aria-label','Live operating layers');tabs.innerHTML='<div role="tablist" aria-label="Live operating layers">'+[['mission','Mission'],['world','World'],['agent','Agent'],['hive','Hive']].map(([id,label])=>`<button role="tab" data-intel-tab="${id}" aria-selected="${id==='mission'}">${label}</button>`).join('')+'</div><button id="intelFollow" aria-pressed="true" aria-label="Follow the mission automatically">↻ Follow</button>';
  parent.append(tabs);const panel=document.createElement('section');panel.id='intelPanel';panel.className='intelligence-panel';panel.hidden=true;panel.setAttribute('aria-label','Live intelligence workspace');parent.append(panel);
  const rail=document.createElement('div');rail.className='intel-status-rail';rail.innerHTML='<button data-intel-tab="world"><i></i>World model <b id="intelWorldStatus">Connecting</b></button><span>→</span><button data-intel-tab="agent"><i></i>Agent <b id="intelAgentStatus">Observing</b></button><span>→</span><button data-intel-tab="hive"><i></i>Hive <b id="intelHiveStatus">Standby</b></button>';document.querySelector('.demo-intro>div').append(rail);
  document.addEventListener('click',e=>{const b=e.target.closest('button,[data-intel-entity]');if(!b)return;
    if(b.dataset.intelTab)select(b.dataset.intelTab);
    if(b.id==='intelGate'){window.__demoDirector?.explore();select('mission');}
    if(b.id==='intelFollow'){follow=true;previousPhase='';$('intelFollow').setAttribute('aria-pressed','true');sample();}
    if(b.dataset.worldView){worldView=b.dataset.worldView;frozen=null;select('world');}
    if(b.dataset.intelEntity){selectedEntity=b.dataset.intelEntity;render();}
    if(b.dataset.intelFocus){const id=b.dataset.intelFocus;renderBridge.focus(id==='SG-01'?'J-01':id);}
    if(b.dataset.ask)ask(b.dataset.ask);
    if(b.hasAttribute('data-intel-export'))exportEpisode();
    if(b.dataset.memory==='previous'){const index=frozen?memory.frames.findIndex(f=>f.revision===frozen.revision):memory.frames.length;frozen=memory.frames[Math.max(0,index-6)]||memory.frames[0];render();}
    if(b.dataset.memory==='live'){frozen=null;render();}
    if(b.dataset.memory==='saved'){frozen=previousEpisodes().at(-1)?.frames.at(-1)||null;render();}
    if(b.dataset.runtimeControl){$(b.dataset.runtimeControl==='pause'?(city?'pauseCity':'pauseBtn'):(city?'stopCity':'stopBtn')).click();sample();}
  });
  panel.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)&&e.target.dataset.intelEntity){e.preventDefault();selectedEntity=e.target.dataset.intelEntity;render();}});
  $('demoPlay').addEventListener('click',()=>{follow=true;frozen=null;worldView='state';previousPhase='';select('mission',false);});
  $('demoMode').addEventListener('click',()=>{follow=false;select('mission');});
  return true;
}
const boot=setInterval(()=>{if(!build())return;clearInterval(boot);sample();const layer=new URL(location.href).searchParams.get('layer');if(['world','agent','hive'].includes(layer))select(layer);timer=setInterval(sample,750);},150);
addEventListener('pagehide',()=>{clearInterval(boot);clearInterval(timer);},{once:true});
window.__liveIntelligence={state:()=>({selected,follow,frame:latest,frozen,retained:memory.frames.length}),select,export:()=>memory.export(),ask:q=>answerFromFrame(q,latest,memory.frames[Math.max(0,memory.frames.length-12)])};

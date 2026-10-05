import {liveStepModel} from './walkthrough-live-model.js';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'Unknown').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let key='',mounted=false;
const text=(id,value)=>{const e=$(id);if(e&&e.textContent!==String(value))e.textContent=String(value);};
const time=at=>at&&Number.isFinite(Date.parse(at))?new Date(at).toLocaleTimeString('en-GB',{hour12:false}):'No source time';
function mount(){
 const dialog=$('walkthroughDialog');if(!dialog)return false;
 dialog.setAttribute('aria-modal','false');dialog.setAttribute('aria-label','Live step guide');
 const live=document.createElement('section');live.id='walkthroughLive';live.setAttribute('aria-label','Live world-state evidence');
 live.innerHTML='<div class="wl-feed"><span id="wlConnection">CONNECTING</span><span id="wlRevision"></span></div><h3 id="wlTitle"></h3><p id="wlDetail"></p><div id="wlFacts" class="wl-facts"></div><div id="wlLinks" class="wl-links"></div><div id="wlPrediction"></div><details class="wl-details"><summary>Decision inputs and latest events <span id="wlEventCount"></span></summary><div id="wlDecision"></div><ol id="wlEvents"></ol></details>';
 $('walkthroughQuestion').after(live);
 const details=document.createElement('details');details.className='wl-details wl-how';const summary=document.createElement('summary');summary.textContent='Why this step matters';details.append(summary);
 for(const el of [...dialog.querySelectorAll('#walkthroughMeaning,.walkthrough-example,.walkthrough-contract,.walkthrough-watch')])details.append(el);
 dialog.querySelector('.walkthrough-body').append(details);
 $('demoNarrative').insertBefore(dialog,$('demoNarrative').querySelector('.demo-narrative-body'));
 mounted=true;return true;
}
export function updateWalkthrough(d,runtime){
 if(!mounted&&!mount())return;
 const dialog=$('walkthroughDialog'),frame=window.__liveIntelligence?.state().frame;
 const index=d.dialogStage>=0?d.dialogStage:Math.max(0,d.stage),model=liveStepModel(d.kind,index,frame,runtime);
 const isReview=index<d.stage,approval=!isReview&&index===5&&runtime.status==='AWAITING APPROVAL';
 const next=$('walkthroughNext');next.disabled=!isReview&&!d.waiting&&!approval;
 text('walkthroughNext',isReview?'Return to current step':approval?'Approve simulated action':d.waiting?'Run this step →':d.finished?'Outcome verified':'Step running…');
 const waiting=d.waiting||approval;
 text('walkthroughStatus',isReview?'Reviewing an earlier explanation · readings remain live; actions are not rewound.':runtime.paused?'Operator pause is active. Resume to continue execution.':waiting?'Next action is waiting for you. The scene, cameras and world state remain live.':'This step is executing. Watch the scene and the live evidence below.');
 dialog.dataset.waiting=String(waiting);dialog.dataset.live='true';
 text('wlConnection',!model.ready?'CONNECTING':model.connected?'LIVE WORLD STATE':'STALE FEED');
 text('wlRevision',model.ready?`rev ${model.revision} · ${time(model.at)}`:'Waiting for the shared state');
 text('wlTitle',model.title);text('wlDetail',model.detail||'No measurements have been supplied yet.');
 const freshKey=JSON.stringify([index,model.revision,model.connected]);if(key===freshKey)return;key=freshKey;
 $('walkthroughLive').dataset.revision=String(model.revision||0);
 $('wlFacts').innerHTML=model.rows.map(f=>`<article data-live-fact="${esc(f.id)}" data-fresh="${f.fresh}"><div><span>${esc(f.label)}</span><strong data-live-value>${esc(f.value)}</strong></div><small><b>${esc(f.id)}</b> · ${esc(f.basis)}${f.frame!=null?' · frame '+esc(f.frame):''}${!f.fresh?' · STALE / UNKNOWN':''}</small></article>`).join('');
 $('wlLinks').innerHTML=model.links.map(([a,b,rel])=>`<div><b>${esc(a)}</b><span>${esc(rel)} →</span><b>${esc(b)}</b></div>`).join('');
 $('wlPrediction').innerHTML=model.prediction?`<section class="wl-prediction"><small>${esc(model.prediction.basis)} · NOT AN OBSERVED OUTCOME</small>${model.prediction.rows.map(([label,v,unit])=>`<div><span>${esc(label)}</span><b>${Number.isFinite(v)?v.toFixed(1):'Unknown'} ${esc(unit)}</b></div>`).join('')}</section>`:'';
 const decision=model.decision;
 $('wlDecision').innerHTML=decision?`<p><b>Decision used:</b> ${esc(decision.input)}${decision.at?' · '+esc(time(decision.at)):''}</p><p><b>Compiled output:</b> ${esc(decision.output)}</p><p><b>Reasoning path:</b> ${esc(decision.mode||'Bounded policy engine')}</p>`:'';
 text('wlEventCount',model.eventCount==null?'':`${model.eventCount} events`);
 $('wlEvents').innerHTML=model.events.map(e=>`<li><small>${esc(e.layer)} · ${esc(time(e.at))}</small><p>${esc(e.text)}</p></li>`).join('');
}

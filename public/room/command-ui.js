import {compileGoal,examples} from './command-contract.mjs';
const $=id=>document.getElementById(id),city=!!$('cityScene'),kind=city?'city':'factory';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const input=$(city?'cityIntent':'intent'),form=$(city?'cityIntentForm':'intentForm');
let plan=null,previous='',activePlan=null,resetting=false;
const state=()=>city?window.__city?.state():window.__room?.state();
const idle=()=>!state()||['READY','IDLE','COMPLETE','BLOCKED','STOPPED','STARTING'].includes(state().status);
const open=(title,html)=>window.__console?.openPopup(title,html);
function preview(){plan=compileGoal(input.value,kind);input.setCustomValidity(plan.ok?'':plan.error);const el=$('goalPreview');el.dataset.ok=String(plan.ok);el.innerHTML=plan.ok?`<i></i><b>${esc(plan.title)}</b><span>${esc(plan.summary)}</span>`:`<i></i><span>${esc(plan.error)}</span>`;return plan;}
function showExamples(){open('Choose an outcome',`<p class="fs-intro">Type your own wording. The installed skills stay bounded.</p><div class="fs-examples">${examples[kind].map((e,i)=>`<button type="button" data-example="${i}"><b>${esc(e.title)}</b><span>${esc(e.hint)}</span><code>${esc(e.text)}</code></button>`).join('')}</div><small>Preview below the command shows the interpreted action. Unknown targets, custom timing and unsafe overrides are refused. This is not a free-form robotics foundation model.</small>`);}
function demoGuide(){window.__console?.closePopup();if(window.__demoDirector){document.body.classList.add('demo-guided');window.dispatchEvent(new Event('resize'));}else open('One-minute mission story','<p>Start with the problem. Follow the evidence, scoped approval, action and verified outcome.</p>');}
function build(){
 document.body.classList.add('fieldstack-finished');
 const holder=document.createElement('div');holder.className='fs-command';form.replaceWith(holder);holder.append(form);
 const line=document.createElement('div');line.id='goalPreview';line.className='fs-goal-preview';line.setAttribute('role','status');line.setAttribute('aria-live','polite');holder.append(line);
 const tools=document.createElement('div');tools.className='fs-goal-tools';tools.innerHTML='<button type="button" id="goalExamples">Examples</button><button type="button" id="demoGuide">Demo guide</button>';holder.append(tools);
 $('goalExamples').onclick=showExamples;$('demoGuide').onclick=demoGuide;
 if(city)input.value=examples.city[0].text;
 input.setAttribute('aria-label',city?'Editable city mission goal':'Editable factory mission goal');input.placeholder='Describe an outcome…';input.addEventListener('input',preview);input.addEventListener('focus',()=>holder.classList.add('focused'));input.addEventListener('blur',()=>holder.classList.remove('focused'));
 form.addEventListener('submit',async e=>{
  const p=preview();if(!p.ok){e.preventDefault();e.stopImmediatePropagation();input.reportValidity();return;}
  if(resetting){e.preventDefault();e.stopImmediatePropagation();return;}
  if(['COMPLETE','BLOCKED','STOPPED'].includes(state()?.status)){
   e.preventDefault();e.stopImmediatePropagation();resetting=true;const text=input.value;
   try{await(city?window.__cityOps:window.__factoryOps)?.reset();input.value=text;preview();}finally{resetting=false;}
   form.requestSubmit();return;
  }
  activePlan={...p,text:input.value};window.__console?.closePopup();
 },true);
 document.addEventListener('click',async e=>{const button=e.target.closest('[data-example]');if(!button)return;if(!idle()){open('Mission is executing','<p>Stop or complete the current mission before choosing another outcome.</p>');return;}const example=examples[kind][Number(button.dataset.example)];if(!example)return;const s=state();if(s&&['COMPLETE','BLOCKED','STOPPED'].includes(s.status))await(city?window.__cityOps:window.__factoryOps)?.reset();input.value=example.text;input.dispatchEvent(new Event('input',{bubbles:true}));window.__console?.closePopup();input.focus();},true);
 const views=document.querySelector(city?'.view-buttons':'.scene-tabs');if(views){const b=document.createElement('button');b.id='siteOverview';b.type='button';b.textContent=city?'District':'Whole floor';b.title='Inspect the expanded site without changing the mission';b.onclick=()=>window.__siteDetail?.focus('site');views.prepend(b);}
 const caption=document.querySelector(city?'.brief h1':'.headline h1');if(caption)caption.innerHTML=city?'One district. <em>A coordinated response.</em>':'One fault. <em>A coordinated recovery.</em>';
 if(!city){const h=document.querySelector('.perception-panel .panel-heading>span');if(h)h.textContent='CAM-01 / AISLE → ROUTE';const source=$('sourceStatus');if(source)source.textContent='Actual detections → route constraint';const l=document.querySelector('.uc-extra-camera .panel-heading>span');if(l)l.textContent='CAM-L02 / SERVICE ACCESS';}
 preview();
}
build();
const timer=setInterval(()=>{if(previous!==input.value){previous=input.value;preview();}const s=state();$('goalExamples').disabled=!idle();if(s?.plan?.command)activePlan={...s.plan.command,text:s.plan.intent};if(s?.inspectionOnly||s?.plan?.inspectionOnly){const skipped=document.querySelector(city?'#cityFlow button[data-phase="5"]':'#flowSteps button[data-phase="5"]');if(skipped){skipped.dataset.skipped='true';skipped.title='No actuation requested; approval not required';}}else document.querySelectorAll('[data-skipped]').forEach(e=>delete e.dataset.skipped);},500);
window.__goalConsole={preview:()=>({...plan}),active:()=>activePlan,examples:()=>examples[kind],openExamples:showExamples,guide:demoGuide};
window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});

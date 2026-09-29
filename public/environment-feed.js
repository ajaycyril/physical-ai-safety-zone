// One visible, source-labelled public-data strip across the interactive surfaces.
const targets=[...document.querySelectorAll('[data-environment-feed]')];
let data=null,timer;
const safe=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const value=(v,u)=>Number.isFinite(v)?v.toFixed(1)+u:'Unavailable';
export async function refreshEnvironment(){
 try{const r=await fetch('/api/environment',{signal:AbortSignal.timeout(14000)});if(!r.ok)throw Error();data=await r.json();}
 catch{data={weather:{status:'unavailable'},airQuality:{status:'unavailable'},decision:{mode:'ground',label:'Ground fallback'},checkedAt:new Date().toISOString()};}
 window.__environment=data;window.dispatchEvent(new CustomEvent('environment:update',{detail:data}));
 for(const el of targets){const w=data.weather,a=data.airQuality;el.innerHTML=`<span class="env-location">ABU DHABI <i></i></span><span><b>${value(w.temperatureC,'°C')}</b><small>${safe(w.basis||'UNKNOWN')} · ${w.station?'OMAA':'REGIONAL'}</small></span><span><b>${value(w.windMs,' m/s')}</b><small>WIND · ${w.observedAt?new Date(w.observedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'NO OBSERVATION'}</small></span><span><b>PM2.5 ${value(a.pm25,'')}</b><small>µg/m³ · ${safe(a.basis||'UNKNOWN')}</small></span><span><b>${safe(data.decision.label)}</b><small>DEMO ROUTING POLICY</small></span><details><summary>Sources</summary><p><a href="https://aviationweather.gov/data/metar/?id=OMAA" target="_blank" rel="noreferrer">NOAA / OMAA</a> · ${safe(w.observedAt||'unavailable')}<br><a href="https://open-meteo.com/en/docs/air-quality-api" target="_blank" rel="noreferrer">Open-Meteo / CAMS</a> · ${safe(a.validAt||'unavailable')}<br>Weather is regional ${safe(w.basis?.toLowerCase()||'unknown')} context. Air quality is a regional model, not a site sensor.</p></details><button type="button" aria-label="Refresh public environmental data">↻</button>`;el.querySelector('button').onclick=refreshEnvironment;}
 return data;
}
export function connectEnvironment(el){if(!targets.includes(el))targets.push(el);refreshEnvironment();if(!timer)startTimer();}
function startTimer(){timer=setInterval(()=>{if(!document.hidden)refreshEnvironment();},300000);addEventListener('pagehide',()=>clearInterval(timer),{once:true});}
if(targets.length){refreshEnvironment();startTimer();}

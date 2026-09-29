// Keep navigation, cameras, physics and inspection in one workspace.
const ready=setInterval(()=>{
 const runtime=document.getElementById('opsRuntime'),inspector=document.getElementById('ucInspector');
 if(!runtime||!inspector)return;
 clearInterval(ready);runtime.open=true;
 const city=!!document.getElementById('cityScene');
 const headline=document.querySelector(city?'.brief h1':'.headline h1');
 if(headline)headline.innerHTML=city?'Abu Dhabi <em>district operations.</em>':'Industrial <em>robot operations.</em>';
 const switcher=document.createElement('nav');switcher.className='compact-context';switcher.setAttribute('aria-label','Demo environments');
 switcher.innerHTML=`<a href="/demos/factory" ${city?'':'aria-current="page"'}>Factory</a><a href="/demos/city" ${city?'aria-current="page"':''}>City</a><span>3D simulation · live video inference</span><button type="button" data-signals>Sources & context</button>`;
 runtime.prepend(switcher);
 switcher.querySelector('button').onclick=()=>document.querySelector('.uc-header-signals')?.click();
 addEventListener('pi:inspect',e=>window.__operations?.pick(e.detail.id));
 document.getElementById('ucEntity').addEventListener('change',e=>window.__operations?.pick(e.target.value));
 const wm=document.getElementById('opsWorldModel');if(wm)inspector.querySelector('header').append(wm);
 // ResizeObserver is authoritative after layout changes and inline inspector switches.
 const scene=document.querySelector('.analog-header');
 const resize=new ResizeObserver(()=>{document.body.style.setProperty('--analog-header-height',scene.getBoundingClientRect().height+'px');window.dispatchEvent(new Event('resize'));});resize.observe(scene);
 addEventListener('pagehide',()=>resize.disconnect(),{once:true});
},100);

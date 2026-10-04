const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const reveal=[...document.querySelectorAll('[data-reveal],.content-grid article,.section,.layer,.partner-grid article,.roadmap-detail')];
if(!reduced&&'IntersectionObserver'in window){const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target);}}),{threshold:.08,rootMargin:'0px 0px -8% 0px'});reveal.forEach(el=>{el.classList.add('reveal-ready');io.observe(el);});}else reveal.forEach(el=>el.classList.add('is-visible'));
const parallax=[...document.querySelectorAll('[data-parallax]')];
let raf=0;
function frame(){raf=0;if(reduced)return;const y=scrollY;document.documentElement.style.setProperty('--page-y',y);for(const el of parallax){const factor=Number(el.dataset.parallax||.04),rect=el.getBoundingClientRect(),center=rect.top+rect.height/2-innerHeight/2;el.style.setProperty('--parallax-y',Math.max(-42,Math.min(42,-center*factor))+'px');}
 const map=document.querySelector('.reference-blueprint');if(map){const r=map.getBoundingClientRect(),p=Math.max(0,Math.min(1,(innerHeight*.7-r.top)/(r.height+innerHeight*.15)));map.style.setProperty('--flow-progress',p);}
 const hero=document.querySelector('.thesis-hero');if(hero){const r=hero.getBoundingClientRect(),p=Math.max(0,Math.min(1,(innerHeight-r.top)/(r.height+innerHeight)));hero.style.setProperty('--hero-progress',p);}
}
addEventListener('scroll',()=>{if(!raf)raf=requestAnimationFrame(frame)},{passive:true});addEventListener('resize',frame);frame();
for(const a of document.querySelectorAll('a[href^="#"]'))a.addEventListener('click',e=>{const t=document.querySelector(a.getAttribute('href'));if(t){e.preventDefault();t.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});}});

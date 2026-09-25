const classes=new Set(['car','truck','bus','motorcycle','bicycle']);
const iou=(a,b)=>{const x=Math.max(a.x,b.x),y=Math.max(a.y,b.y),w=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-x),h=Math.max(0,Math.min(a.y+a.h,b.y+b.h)-y);return w*h/(a.w*a.h+b.w*b.h-w*h||1);};
export class CityVision {
 constructor(onObservation,onStatus){this.onObservation=onObservation;this.onStatus=onStatus;this.ready=false;this.busy=false;this.counter=0;this.next=0;this.running=true;this.pending=new Map();this.sources={};this.worker=null;this.paused=false;}
 async init(){
  this.manifest=await fetch('/media/city-manifest.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Video manifest unavailable');return r.json();});
  for(const [key,videoId]of [['traffic','trafficVideo'],['crossing','crossingVideo']]){
   const info=this.manifest.sources[key];if(!info?.available)throw Error('Recorded '+key+' video unavailable');
   const video=document.getElementById(videoId),overlay=document.getElementById(key+'Overlay');this.sources[key]={video,overlay,info,lastTime:-1,tracks:[],nextTrack:1,obs:null};video.src=info.file;video.muted=true;video.loop=true;
   video.addEventListener('error',()=>this.onStatus('Video decode error: '+key));await video.play().catch(()=>{this.onStatus('Press Play samples to start the video.');});
  }
  this.worker=new Worker('/room/vision-worker.js',{type:'module'});this.worker.onmessage=e=>this.receive(e.data);this.worker.onerror=e=>this.onStatus('Detector unavailable: '+e.message);this.worker.postMessage({type:'init'});
  this.timer=setInterval(()=>this.frame(),260);return this.manifest;
 }
 async play(){this.paused=false;await Promise.all(Object.values(this.sources).map(s=>s.video.play().catch(()=>{})));}
 pause(){this.paused=true;Object.values(this.sources).forEach(s=>s.video.pause());}
 receive(m){
  if(m.type==='ready'){this.ready=true;this.onStatus('EfficientDet · on-device');return;}
  if(m.type==='error'){this.busy=false;this.ready=false;this.onStatus('Vision model unavailable: '+m.message);return;}
  if(m.type!=='result')return;this.busy=false;const source=this.pending.get(m.frameId);this.pending.delete(m.frameId);if(!source)return;const s=this.sources[source];
  const detections=m.detections.filter(d=>classes.has(d.label)||d.label==='person');const previous=s.tracks,used=new Set();s.tracks=detections.map(d=>{let best=null,match=.07;for(const p of previous){if(used.has(p.id)||p.label!==d.label)continue;const v=iou(p.box,d.box);if(v>match){match=v;best=p;}}if(best)used.add(best.id);return{...d,id:best?.id||s.nextTrack++};});
  const vehicles=detections.filter(d=>classes.has(d.label)),people=detections.filter(d=>d.label==='person');const scores=(source==='traffic'?vehicles:people).map(d=>d.score);
  const canvas=document.createElement('canvas');canvas.width=288;canvas.height=162;try{canvas.getContext('2d').drawImage(s.video,0,0,288,162);}catch{}
  s.obs={source,sourceId:source==='traffic'?'CAM-T01':'CAM-P01',frameId:m.frameId,videoTime:m.videoTime,receivedAt:performance.now(),recordedAt:new Date().toISOString(),vehicles:vehicles.length,people:people.length,score:scores.length?Math.max(...scores):null,latency:Math.round(m.latency),width:m.width,height:m.height,detections:s.tracks,provenance:'recorded stock video / EfficientDet Lite0',thumbnail:canvas.toDataURL('image/jpeg',.45)};
  this.draw(s,m.width,m.height);this.onObservation(source,this.get(source));
 }
 get(key){const s=this.sources[key]?.obs;if(!s)return{fresh:false,source:key,vehicles:0,people:0,ageMs:null};const age=performance.now()-s.receivedAt;return{...s,ageMs:Math.round(age),fresh:age<4000&&!this.paused};}
 all(){return{traffic:this.get('traffic'),crossing:this.get('crossing')};}
 async frame(){if(!this.running||this.paused||!this.ready||this.busy)return;const key=['traffic','crossing'][this.next++%2],s=this.sources[key];if(!s||s.video.readyState<2||s.video.paused||s.video.currentTime===s.lastTime)return;s.lastTime=s.video.currentTime;this.busy=true;const width=640,height=Math.round(640*s.video.videoHeight/s.video.videoWidth);try{const bitmap=await createImageBitmap(s.video,{resizeWidth:width,resizeHeight:height,resizeQuality:'low'});const frameId=++this.counter;this.pending.set(frameId,key);this.worker.postMessage({type:'frame',bitmap,width,height,videoTime:s.video.currentTime,timestamp:performance.now(),frameId},[bitmap]);}catch(e){this.busy=false;this.onStatus('Frame unavailable: '+e.message);}}
 draw(s,w,h){const canvas=s.overlay;canvas.width=w;canvas.height=h;const c=canvas.getContext('2d');c.clearRect(0,0,w,h);c.lineWidth=2;c.font='15px sans-serif';for(const d of s.tracks){const b=d.box,color=d.label==='person'?'#f4c88c':'#9deacf';c.strokeStyle=color;c.strokeRect(b.x,b.y,b.w,b.h);const text=d.label+' #'+d.id+' '+Math.round(d.score*100)+'%',tw=c.measureText(text).width+12,yy=Math.max(0,b.y-23);c.fillStyle='#0b1520e6';c.fillRect(b.x,yy,tw,23);c.fillStyle=color;c.fillText(text,b.x+6,yy+17);}}
 dispose(){this.running=false;clearInterval(this.timer);this.worker?.terminate();Object.values(this.sources).forEach(s=>{s.video.pause();s.video.removeAttribute('src');s.video.load();});}
}

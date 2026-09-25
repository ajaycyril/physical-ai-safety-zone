// A seeded car-following junction simulation. No real traffic signals are connected.
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export class CityModel {
 constructor(){this.reset();}
 reset(){Object.assign(this,{t:0,cars:[],nextId:1,signal:'NS',stageTime:0,policy:'fixed',pedestrianDemand:0,crossers:[],throughput:0,ewPassed:0,demand:4,arrivalClock:[0,0,0,0],changeLog:[],hazard:false,seed:21});for(let l=0;l<4;l++)for(let i=0;i<(l<2?6:3);i++)this.addCar(l,-4-i*1.48);}
 rand(){this.seed=(1664525*this.seed+1013904223)>>>0;return this.seed/4294967296;}
 addCar(lane,p=-14){const id=this.nextId++;this.cars.push({id,lane,p,v:0,kind:id%9===0?'bus':id%6===0?'taxi':'car',tone:id%5});}
 setDemand(vehicles,people){this.demand=clamp(vehicles,1,20);this.pedestrianDemand=clamp(people,0,6);}
 junctionClear(){return !this.cars.some(c=>c.p> -2.9&&c.p<3.4);}
 transition(signal){if(this.signal===signal)return;this.changeLog.push({t:this.t,from:this.signal,to:signal});this.signal=signal;this.stageTime=0;if(signal==='WALK')this.crossers=Array.from({length:clamp(this.pedestrianDemand,1,4)},(_,i)=>({id:i,p:-3.4-i*.4}));}
 requestPlan(){this.policy='transition';this.transition('ALL RED');}
 tick(dt){
 this.t+=dt;this.stageTime+=dt;
 for(const p of this.crossers)p.p+=dt*1.35;this.crossers=this.crossers.filter(p=>p.p<3.5);
 if(this.policy==='transition'){
  if(this.signal==='ALL RED'&&this.stageTime>=2&&this.junctionClear()){if(this.pedestrianDemand>0)this.transition('WALK');else{this.policy='adaptive';this.transition('EW');}}
  else if(this.signal==='WALK'&&this.stageTime>=6&&this.crossers.length===0)this.transition('CLEARANCE');
  else if(this.signal==='CLEARANCE'&&this.stageTime>=1.5){this.policy='adaptive';this.transition('EW');}
 }else if(this.policy==='adaptive'){
  if(this.signal==='EW'&&this.stageTime>=20)this.transition('ALL RED');
  else if(this.signal==='ALL RED'&&this.stageTime>=2)this.transition('NS');
  else if(this.signal==='NS'&&this.stageTime>=8){this.policy='transition';this.transition('ALL RED');}
 }else{
  if(this.signal==='NS'&&this.stageTime>=19)this.transition('ALL RED');
  else if(this.signal==='ALL RED'&&this.stageTime>=2)this.transition('EW');
  else if(this.signal==='EW'&&this.stageTime>=5)this.transition('CLEARANCE');
  else if(this.signal==='CLEARANCE'&&this.stageTime>=2)this.transition('NS');
 }
 for(let lane=0;lane<4;lane++){
  this.arrivalClock[lane]+=dt;const spacing=lane<2?clamp(5-this.demand*.12,2.8,5):7;
  const group=this.cars.filter(c=>c.lane===lane).sort((a,b)=>b.p-a.p);
  if(this.arrivalClock[lane]>=spacing){this.arrivalClock[lane]=0;if(!group.length||group.at(-1).p>-12.5)this.addCar(lane);}
  let lead=null;
  for(const car of group){
   const green=!this.hazard&&this.crossers.length===0&&(lane<2?this.signal==='EW':this.signal==='NS');
   let free=2.8;
   if(!green&&car.p< -2.8)free=Math.min(free,Math.max(0,(-3.05-car.p)*1.8));
   if(lead)free=Math.min(free,Math.max(0,(lead.p-car.p-1.3)*2));
   if(this.hazard)free=0;
   car.v+=clamp(free-car.v,-dt*6,dt*2.2);car.v=Math.max(0,car.v);car.p+=car.v*dt;lead=car;
  }
 }
 this.cars=this.cars.filter(c=>{if(c.p>14.5){this.throughput++;if(c.lane<2)this.ewPassed++;return false;}return true;});
 }
 snapshot(){return{t:this.t,signal:this.signal,stageTime:this.stageTime,policy:this.policy,queue:this.cars.filter(c=>c.lane<2&&c.p< -2.8&&c.v<.35).length,vehicles:this.cars.length,throughput:this.throughput,ewPassed:this.ewPassed,pedestrians:this.crossers.length,carStates:this.cars.map(c=>({...c})),crossers:this.crossers.map(c=>({...c})),hazard:this.hazard};}
 clone(){const next=new CityModel();Object.assign(next,JSON.parse(JSON.stringify(this)));return next;}
 projection(){const fixed=this.clone(),adaptive=this.clone();adaptive.requestPlan();const a=[],b=[];for(let n=0;n<600;n++){fixed.tick(.05);adaptive.tick(.05);if(n%20===0){a.push(fixed.snapshot().queue);b.push(adaptive.snapshot().queue);}}return{horizon:30,current:this.snapshot().queue,fixed:fixed.snapshot().queue,adaptive:adaptive.snapshot().queue,fixedTrace:a,adaptiveTrace:b,method:'Two cloned, seeded car-following rollouts. Identical initial state and arrivals; different signal policies.',assumptions:'Illustrative junction geometry and dynamics. Video counts scale modeled demand; not calibrated real-world queue predictions.'};}
}
export function lanePose(car){const p=car.p;return car.lane===0?{x:p,z:.62,yaw:0}:car.lane===1?{x:-p,z:-.62,yaw:Math.PI}:car.lane===2?{x:-.62,z:p,yaw:-Math.PI/2}:{x:.62,z:-p,yaw:Math.PI/2};}

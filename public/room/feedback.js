import { Facility } from './facility.js';
// Controller completion is decided from MuJoCo feedback, never animation duration.
const p=Facility.prototype;
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
p.reach=async function(predicate,label,signal){
 const ticket=this.cancelId;let elapsed=0,last=performance.now();
 for(;;){
  if(signal?.aborted||ticket!==this.cancelId)throw Error('Mission cancelled');
  if(this.holds.has('fault'))throw Error('Physics fault while '+label);
  const now=performance.now();if(!this.holds.size)elapsed+=now-last;last=now;
  if(!this.holds.size&&predicate())return;
  if(elapsed>60000)throw Error('Feedback timeout: '+label);
  await new Promise(resolve=>setTimeout(resolve,80));
 }
};
p.face=async function(yaw,signal){
 this.target.yaw=this.state.yaw+wrap(yaw-this.state.yaw);
 await this.reach(()=>Math.abs(wrap(this.target.yaw-this.state.yaw))<.065,'base alignment',signal);
 await this.wait(180,signal);
};
p.arm=async function(joints,ms=1000,signal){
 const started=performance.now();this.target.joints=[...joints];
 await this.reach(()=>this.state.joints.every((value,i)=>Math.abs(value-joints[i])<.075),'arm joint targets',signal);
 // Minimum visual dwell only. This cannot turn incomplete motion into success.
 await this.wait(Math.max(100,ms-(performance.now()-started)),signal);
};
p.isolate=async function(signal){
 await this.face(0,signal);
 await this.arm([0,-.42,.45,0],1600,signal);
 this.grip=1;await this.wait(600,signal);
 this.target.valve=1.57;
 await this.arm([0,-.42,.45,1.57],2100,signal);
 await this.reach(()=>this.state.valve>=1.45,'V-12 closed feedback',signal);
 this.grip=0;
 await this.arm([0,-1.2,2.15,0],1300,signal);
 return this.state.valve;
};

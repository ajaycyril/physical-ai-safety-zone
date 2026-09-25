import * as T from 'three';
import { Facility } from './facility.js';
import './feedback.js';
import { IndustrialPlant, clamp } from './industrial-model.js';

/** The robot and valve use MuJoCo. Process, conveyor and service resource are explicit simulation adapters. */
export class IndustrialFacility extends Facility {
  constructor(host, feed, onState) {
    super(host, feed, onState);
    this.plant = new IndustrialPlant(); this.serviceState = 'On call'; this.serviceProgress = 0;
    this.faultRoute = false; this.serviceMove = null; this.serviceWorking = false;
    this.expansion(); this.state.pressure = this.plant.pressure;
  }
  expansion() {
    const dark = 0x29333f, steel = 0xbac7d0;
    this.pipe([4.5,.05,.43],[5.05,.05,.43],.09,0x638f8c);
    this.pipe([5.05,.05,.43],[5.05,.75,.85],.07,0x638f8c);
    this.filterHousing = this.cyl(5.05,.75,.87,.19,.46,0xad8060);
    this.cartridge = this.cyl(5.05,.75,1.03,.115,.25,steel);
    for (let i=0;i<6;i++) this.ring([5.05,.75,.93+i*.031],.118,'z',0x59616c);
    this.statusLights = [];
    this.pipe([5.6,1.9,0],[5.6,1.9,2.1],.025,dark);
    for(let i=0;i<3;i++) this.statusLights.push(this.cyl(5.6,1.9,2.16+i*.14,.073,.105,0x334050));
    this.box(-3.5,-3.74,.59,4.4,.58,.16,dark);
    this.box(-3.5,-3.74,.72,4.4,.42,.10,0x596b70);
    for(let x=-5.45;x<-1.45;x+=.3)this.pipe([x,-4.0,.78],[x,-3.48,.78],.042,steel);
    for(const x of [-5.2,-2])for(const y of [-3.96,-3.52])this.box(x,y,.3,.07,.07,.6,dark);
    this.parts=[];for(let i=0;i<5;i++){const part=new T.Group();this.box(0,0,0,.27,.30,.19,0x8dabb1,part);this.box(0,0,.13,.16,.20,.07,0xc0cbd3,part);this.scene.add(part);this.parts.push(part);}
    this.conveyorOffset=0;
    this.serviceCart=new T.Group();this.scene.add(this.serviceCart);this.serviceCart.position.set(-5,2.7,0);
    this.box(0,0,.39,.65,.48,.21,0xa6b9bd,this.serviceCart);
    this.box(0,0,.56,.54,.4,.14,0x426e70,this.serviceCart);
    for(const x of [-.22,.22])for(const y of [-.25,.25]){const w=this.cyl(x,y,.17,.10,.075,dark,this.serviceCart);w.rotation.x=0;}
    this.technician=new T.Group();this.serviceCart.add(this.technician);this.technician.position.x=-.63;
    this.mesh(new T.SphereGeometry(.12,14,10),this.mat(0xd2ab8e),[0,0,1.48],this.technician);
    this.cyl(0,0,1.57,.135,.055,0xe8c66d,this.technician);
    this.box(0,0,1.15,.30,.21,.45,0xdfb564,this.technician);
    this.box(.005,-.112,1.12,.30,.015,.045,0xc8dcce,this.technician);
    this.techArms=[];this.techLegs=[];
    for(const side of [-1,1]){
      const arm=new T.Group();arm.position.set(side*.20,0,1.32);this.technician.add(arm);this.pipe([0,0,0],[0,0,-.37],.052,0xc39878,arm);this.techArms.push(arm);
      const leg=new T.Group();leg.position.set(side*.09,0,.92);this.technician.add(leg);this.pipe([0,0,0],[0,0,-.72],.067,dark,leg);this.techLegs.push(leg);
    }
    this.flowCurve=new T.CatmullRomCurve3([new T.Vector3(2.55,1.65,1.90),new T.Vector3(2.55,.05,1.90),new T.Vector3(2.55,.05,.43),new T.Vector3(4.55,.05,.43),new T.Vector3(5.05,.75,.86)]);
    this.flowDots=[];for(let i=0;i<12;i++){const m=new T.Mesh(new T.SphereGeometry(.035,8,6),new T.MeshBasicMaterial({color:0x9cf0d8}));this.scene.add(m);this.flowDots.push(m);}
    this.lockout=this.box(2.80,-.01,1.16,.10,.07,.16,0xe5a158);this.lockout.visible=false;this.scene.traverse(o=>o.layers.enable(1));this.robot.traverse(o=>o.layers.disable(1));
  }
  tick(dt) {
    const request = this.target.valve;
    if(this.plant?.valveStuck && request>.65)this.target.valve=.65;
    super.tick(dt);
    this.target.valve=request;
    if(!this.plant)return;
    if(!this.holds.size){
      this.plant.tick(dt,this.state.valve);this.state.pressure=this.plant.pressure;
      if(this.plant.lineCommand)this.conveyorOffset+=dt*.38;
      if(this.serviceMove){const pos=this.serviceCart.position,t=this.serviceMove.target,dx=t.x-pos.x,dy=t.y-pos.y,d=Math.hypot(dx,dy);if(d<.05){const job=this.serviceMove;this.serviceMove=null;job.resolve();}else{const step=Math.min(d,dt*1.7);pos.x+=dx/d*step;pos.y+=dy/d*step;this.serviceCart.rotation.z=Math.atan2(dy,dx);}}
      if(this.serviceWorking)this.serviceProgress=Math.min(1,this.serviceProgress+dt/3.4);
    }
  }
  renderState(s) {
    super.renderState(s);if(!this.plant||!this.parts)return;
    const p=s.process||this.plant.snapshot(),time=s.t;
    this.parts.forEach((m,i)=>{m.position.set(-5.5+((s.conveyorOffset??this.conveyorOffset)+i*.82)%4.15,-3.74,.90);m.children[0].material.color.setHex(p.lineState==='Producing'?0x8dabb1:0xc79072);});
    this.flowDots.forEach((m,i)=>{m.visible=p.flow>1;m.position.copy(this.flowCurve.getPoint((time*.045*Math.min(p.flow/30,1.5)+i/12)%1));});
    const color=this.plant.blockage>.4?0xa87352:0x74a696;this.filterHousing.material.color.setHex(color);
    this.statusLights.forEach((m,i)=>{const on=i===0?p.lineState==='Producing':i===1?p.lineState==='Controlled stop':p.lineState==='Quality hold';m.material.color.setHex(on?[0x81d6b3,0xe5c16c,0xe58d8a][i]:0x334050);m.material.emissive.setHex(on?[0x164c38,0x715325,0x672e31][i]:0);});
    this.lockout.visible=this.state.valve>1.45&&p.rpm<40;
    const walking=!!this.serviceMove;
    this.techLegs.forEach((leg,i)=>leg.rotation.x=walking?Math.sin(time*7+i*Math.PI)*.38:0);
    this.techArms.forEach((arm,i)=>arm.rotation.y=this.serviceWorking?-.7+Math.sin(time*5+i)*.18:walking?Math.sin(time*7+i*Math.PI)*.22:0);
    this.cartridge.position.z=1.03+(this.serviceWorking?.27*Math.sin(Math.PI*this.serviceProgress):0);
    if(s.servicePose){this.serviceCart.position.fromArray(s.servicePose);}
  }
  snapshot() {const s=super.snapshot();return{...s,process:this.plant?.snapshot(),serviceState:this.serviceState,serviceProgress:this.serviceProgress,servicePose:this.serviceCart?.position.toArray(),conveyorOffset:this.conveyorOffset,requestedValve:this.target.valve,jointTargets:[...this.target.joints]};}
  async measuredWait(predicate,label,signal,timeout=16) {
    const start=this.state.t,ticket=this.cancelId;
    for(;;){
      if(signal?.aborted||ticket!==this.cancelId)throw Error('Mission cancelled');
      if(this.holds.has('fault'))throw Error('Physics fault while '+label);
      if(!this.holds.size&&predicate())return;
      if(this.state.t-start>timeout)throw Error('Feedback timeout: '+label);
      await new Promise(r=>setTimeout(r,60));
    }
  }
  async moveValve(closed,signal){
    if(this.autoFocus)this.actionFocus={position:new T.Vector3(-.85,-3.65,2.7),target:new T.Vector3(2.05,.05,.86)};await this.face(0,signal);await this.arm([0,-.42,.45,closed?0:1.57],700,signal);
    this.grip=1;await this.wait(300,signal);this.target.valve=closed?1.57:0;
    this.target.joints=[0,-.42,.45,closed?1.57:0];
    await this.measuredWait(()=>closed?this.state.valve>1.45:this.state.valve<.12,closed?'V-12 did not close':'V-12 did not open',signal,9);
    await this.measuredWait(()=>Math.abs(this.state.joints[3]-(closed?1.57:0))<.1,'wrist target',signal,10);
    this.grip=0;await this.arm([0,-1.2,2.15,0],700,signal);return this.state.valve;
  }
  async serviceTo(x,y,signal){
    if(signal.aborted)throw Error('Mission cancelled');
    return new Promise((resolve,reject)=>{
      const abort=()=>{this.serviceMove=null;reject(Error('Service dispatch cancelled'));};signal.addEventListener('abort',abort,{once:true});
      this.serviceMove={target:{x,y},resolve:()=>{signal.removeEventListener('abort',abort);resolve();},reject};
    });
  }
  async service(signal,onState){
    this.serviceState='Dispatched';onState?.(this.serviceState);
    for(const p of [[-5,-2.35],[5.05,-2.35],[5.05,.05]])await this.serviceTo(...p,signal);
    this.serviceState='At skid';onState?.(this.serviceState);
    if(this.state.valve<1.45||this.plant.pressure>.6||this.plant.pumpSpeed>.025)throw Error('Service blocked by isolation interlock.');
    this.serviceState='Replacing strainer';this.serviceWorking=true;this.serviceProgress=0;onState?.(this.serviceState);
    await this.measuredWait(()=>this.serviceProgress>=1,'service task',signal,8);
    this.plant.service(this.state.valve);this.serviceWorking=false;this.serviceState='Work completed';onState?.(this.serviceState);
    await this.serviceTo(5.05,-1.9,signal);this.serviceState='Clear of plant';onState?.(this.serviceState);
  }
  cancel(reason='Cancelled') {super.cancel(reason);if(this.serviceMove){const j=this.serviceMove;this.serviceMove=null;j.reject?.(Error(reason));}this.serviceWorking=false;}
  reset(scenario='restriction'){super.reset();this.plant.reset(scenario);this.serviceState='On call';this.serviceProgress=0;this.serviceWorking=false;this.serviceMove=null;this.serviceCart.position.set(-5,2.7,0);this.state.pressure=this.plant.pressure;this.conveyorOffset=0;}
}

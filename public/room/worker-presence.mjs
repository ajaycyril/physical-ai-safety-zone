// A persistent simulated actor. Video detections update a constraint, not existence.
export class WorkerPresence {
 constructor(){this.y=1.4;this.requested=false;this.lastPositive=-Infinity;this.inZone=false;this.revision=0;}
 observe(detected,now){this.requested=Boolean(detected);if(detected)this.lastPositive=now;}
 update(dt,now){const occupied=this.requested||now-this.lastPositive<2200,target=occupied?-.55:1.4;const old=this.y;this.y+=Math.sign(target-this.y)*Math.min(Math.abs(target-this.y),Math.max(0,Math.min(dt,.12))*.72);this.inZone=occupied||this.y<1.05;if(Math.abs(this.y-old)>1e-5)this.revision++;return{visible:true,y:this.y,inZone:this.inZone,moving:Math.abs(this.y-old)>1e-5,detected:occupied,revision:this.revision};}
 reset(){this.y=1.4;this.requested=false;this.lastPositive=-Infinity;this.inZone=false;}
}

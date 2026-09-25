import * as T from 'three';
import { Facility } from './facility.js';
// Presentation-only extension: cameras and render layers never change controls,
// simulated state, policy decisions or mission outcomes.
const proto=Facility.prototype;
const makeScene=proto.makeScene;
proto.makeScene=function(){
 makeScene.call(this);
 this.autoFocus=true;
 this.actionFocus=null;
 // The sensor view omits the robot's own body to avoid a near-plane occlusion.
 // The main view still renders every articulated component.
 this.scene.traverse(o=>o.layers.enable(1));
 this.robot.traverse(o=>o.layers.disable(1));
 this.feedCamera.layers.set(1);
};
const setView=proto.setView;
proto.setView=function(mode,options={}){
 if(!options.automatic)this.autoFocus=mode==='follow';
 this.actionFocus=null;
 setView.call(this,mode);
 const names=['orbit','follow','robotView'];
 names.forEach((id,i)=>document.getElementById(id+'Btn')?.classList.toggle('on',mode===['overview','follow','robot'][i]));
};
const navigate=proto.navigate;
proto.navigate=async function(...args){
 if(this.autoFocus)this.setView('follow',{automatic:true});
 return navigate.apply(this,args);
};
const frame=proto.animate;
proto.animate=function(now){
 if(this.actionFocus&&this.autoFocus){
  this.cameraMode='action';this.controls.enabled=false;
  this.camera.position.lerp(this.actionFocus.position,.07);
  this.controls.target.lerp(this.actionFocus.target,.07);
 }
 frame.call(this,now);
};
const inspect=proto.inspect;
proto.inspect=async function(...args){
 if(this.autoFocus)this.actionFocus={position:new T.Vector3(-1.6,-2.25,2.9),target:new T.Vector3(1.7,1.25,1.0)};
 return inspect.apply(this,args);
};
const isolate=proto.isolate;
proto.isolate=async function(...args){
 if(this.autoFocus)this.actionFocus={position:new T.Vector3(-.85,-3.65,2.7),target:new T.Vector3(2.05,.05,.86)};
 return isolate.apply(this,args);
};
const reset=proto.reset;
proto.reset=function(...args){
 reset.apply(this,args);this.autoFocus=true;this.setView('overview',{automatic:true});
};

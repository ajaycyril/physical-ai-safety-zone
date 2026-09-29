import * as T from 'three';
// Apply the shared operations palette to the richer site-detail geometry.
// Original runtime assets and incoming procedural context retain their controllers.
export function industrialContext(i,kind){
 i.controls.autoRotate=false;i.piMotion=false;
 i.scene.background=new T.Color(0x09121a);i.scene.fog=new T.FogExp2(0x09121a,kind==='city'?.006:.016);
 i.scene.traverse(o=>{if(o.isLight){if(!o.userData.analogToned){o.intensity*=.8;o.userData.analogToned=true;}o.color?.setHex(0xc9d8e0);if(o.groundColor)o.groundColor.setHex(0x25333d);}if(o.isMesh&&o.material?.color&&!o.material.map){const h={};o.material.color.getHSL(h);o.material.color.setHSL(.56,.14,Math.min(h.l,.48));o.material.roughness=.77;}});
}

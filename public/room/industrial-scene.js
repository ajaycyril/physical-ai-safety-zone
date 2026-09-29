import * as T from 'three';
import {enrichSite} from './realistic-sites.js';
// Retain the facility's material identities and neutral, readable lighting.
export function industrialContext(i,kind){
 enrichSite(i,kind);
 i.controls.autoRotate=false;i.piMotion=false;
 i.scene.background=new T.Color(0x17212a);
 i.scene.fog=new T.FogExp2(0x17212a,kind==='city'?.0025:.006);
 i.scene.traverse(o=>{if(o.isLight&&!o.userData.analogToned){o.userData.analogToned=true;o.color?.setHex(0xf1f0e8);if(o.groundColor)o.groundColor.setHex(0x52616b);}});
 if(i.renderer){i.renderer.toneMapping=T.ACESFilmicToneMapping;i.renderer.toneMappingExposure=1.15;}
}

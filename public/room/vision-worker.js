import { FilesetResolver, ObjectDetector } from '/vendor/vision/vision_bundle.mjs';
let detector=null;
self.onmessage=async({data:m})=>{
 try{
  if(m.type==='init'){
   const files=await FilesetResolver.forVisionTasks('/vendor/vision/wasm');
   // The module loader publishes ModuleFactory explicitly. The classic loader
   // uses a script-scoped var, which is not a worker global after dynamic import.
   files.wasmLoaderPath='/vendor/vision/wasm/vision_wasm_module_internal.js';
   files.wasmBinaryPath='/vendor/vision/wasm/vision_wasm_module_internal.wasm';
   detector=await ObjectDetector.createFromOptions(files,{canvas:new OffscreenCanvas(32,32),baseOptions:{modelAssetPath:'/media/efficientdet.tflite',delegate:'CPU'},runningMode:'VIDEO',scoreThreshold:.32,maxResults:10});
   self.postMessage({type:'ready'});
  } else if(m.type==='frame' && detector){
   const t=performance.now();
   try{
    const result=detector.detectForVideo(m.bitmap,m.timestamp);
    const detections=result.detections.map(d=>({box:{x:d.boundingBox.originX,y:d.boundingBox.originY,w:d.boundingBox.width,h:d.boundingBox.height},label:d.categories[0]?.categoryName||'unknown',score:d.categories[0]?.score||0}));
    self.postMessage({type:'result',detections,width:m.width,height:m.height,videoTime:m.videoTime,frameId:m.frameId,latency:performance.now()-t});
   }finally{m.bitmap.close();}
  } else if(m.type==='close'){detector?.close();detector=null;self.close();}
 }catch(e){m.bitmap?.close?.();self.postMessage({type:'error',message:e instanceof Error?e.message:String(e)});}
};

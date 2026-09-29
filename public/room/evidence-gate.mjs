/** Wait for genuinely current evidence; never relabel old observations as fresh. */
export async function waitForEvidence(read,{signal,timeoutMs=12000,pollMs=150,onWait=()=>{},onRelease=()=>{}}={}){
 const start=performance.now();let waiting=false;
 try{while(true){
  if(signal?.aborted)throw new Error('Evidence wait cancelled');
  const observations=read();
  if(observations?.traffic?.fresh===true&&observations?.crossing?.fresh===true)return observations;
  if(performance.now()-start>=timeoutMs)throw new Error('Current camera frames unavailable. Resume the videos, then retry.');
  if(!waiting){waiting=true;onWait();}
  await new Promise((resolve,reject)=>{const done=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);resolve();};const abort=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);reject(new Error('Evidence wait cancelled'));};const timer=setTimeout(done,pollMs);signal?.addEventListener('abort',abort,{once:true});});
 }}finally{if(waiting)onRelease();}
}

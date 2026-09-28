// Demonstration routing policy, not aircraft certification or flight clearance.
export const WEATHER_POLICY={id:'AD-WX-01',version:1,maxAgeMinutes:90,maxWindMs:8,maxGustMs:12,minVisibilityM:3000};
export function weatherDecision(weather,now=Date.now()){
 const p=WEATHER_POLICY,age=weather?.observedAt?(now-Date.parse(weather.observedAt))/60000:Infinity;
 const valid=weather?.status==='available'&&Number.isFinite(age)&&age>=-5&&age<=p.maxAgeMinutes;
 const numeric=typeof weather?.windMs==='number'&&Number.isFinite(weather.windMs);
 const reasons=[];
 if(!valid)reasons.push('Weather missing or stale');
 if(weather?.basis!=='OBSERVED')reasons.push('No current airport observation');
 if(!numeric)reasons.push('Wind observation unavailable');
 if(numeric&&weather.windMs>p.maxWindMs)reasons.push('Wind exceeds demo threshold');
 if(typeof weather?.gustMs==='number'&&weather.gustMs>p.maxGustMs)reasons.push('Gust exceeds demo threshold');
 if(typeof weather?.visibilityM!=='number')reasons.push('Visibility observation unavailable');
 else if(weather.visibilityM<p.minVisibilityM)reasons.push('Visibility below demo threshold');
 return{policy:p.id,mode:reasons.length?'ground':'drone',label:reasons.length?'Ground response':'Drone candidate',reasons:reasons.length?reasons:['Within demonstration weather envelope'],ageMinutes:Number.isFinite(age)?Math.max(0,age):null,source:weather?.source||'Unavailable',observedAt:weather?.observedAt||null,limits:p,scope:'Simulation routing only. Regional airport weather does not establish conditions at a specific site or permission to fly.'};
}

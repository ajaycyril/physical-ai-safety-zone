const finite=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
export function parseAirQuality(payload,now=Date.now()){
 const c=payload?.current,time=typeof c?.time==='number'?c.time*1000:NaN;
 if(!Number.isFinite(time)||time>now+3600000||now-time>10800000)throw Error('Air-quality model time is missing or stale');
 const pm25=finite(c.pm2_5),pm10=finite(c.pm10),aqi=finite(c.us_aqi),dust=finite(c.dust);
 if([pm25,pm10,aqi,dust].every(v=>v===null))throw Error('No air-quality values');
 return{status:'available',basis:'MODELED',source:'CAMS / Open-Meteo',sourceUrl:'https://open-meteo.com/en/docs/air-quality-api',validAt:new Date(time).toISOString(),fetchedAt:new Date(now).toISOString(),pm25,pm10,aqi,dust,units:{pm25:'µg/m³',pm10:'µg/m³',aqi:'US AQI',dust:'µg/m³'},notice:'Regional CAMS model estimate, not a street sensor. Open-Meteo / CAMS attribution, CC BY 4.0.'};
}

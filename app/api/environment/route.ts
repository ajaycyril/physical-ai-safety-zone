import {getAbuDhabiWeather} from '../../../lib/abu-dhabi-weather';
// @ts-ignore Browser-safe shared source contract.
import {parseAirQuality} from '../../../public/room/environment-contract.js';
// @ts-ignore Browser-safe policy.
import {weatherDecision} from '../../../public/room/weather-policy.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=15;
async function air(){try{
 const r=await fetch('https://air-quality-api.open-meteo.com/v1/air-quality?latitude=24.4539&longitude=54.3773&current=pm10,pm2_5,us_aqi,dust&timeformat=unixtime',{next:{revalidate:600},signal:AbortSignal.timeout(5500)});
 if(!r.ok)throw Error('Air-quality source unavailable');return parseAirQuality(await r.json());
}catch{return{status:'unavailable',basis:'UNKNOWN',source:'CAMS / Open-Meteo',sourceUrl:'https://open-meteo.com/en/docs/air-quality-api',validAt:null,pm25:null,pm10:null,aqi:null,dust:null,notice:'Current regional air-quality model unavailable. No estimated replacement values.'};}}
export async function GET(){const [weather,airQuality]=await Promise.all([getAbuDhabiWeather(),air()]);return Response.json({location:'Abu Dhabi',weather,airQuality,decision:weatherDecision(weather),checkedAt:new Date().toISOString(),refreshSeconds:300},{headers:{'Cache-Control':'public, max-age=30, s-maxage=300, stale-while-revalidate=300'}});}

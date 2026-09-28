import {getAbuDhabiWeather} from '../../../lib/abu-dhabi-weather';
// @ts-ignore Shared browser-safe JavaScript policy.
import {weatherDecision} from '../../../public/room/weather-policy.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=15;
export async function GET(){const weather=await getAbuDhabiWeather();return Response.json({weather,decision:weatherDecision(weather),integration:'Abu Dhabi regional context',checkedAt:new Date().toISOString()},{headers:{'Cache-Control':'public, max-age=30, s-maxage=300, stale-while-revalidate=300'}});}

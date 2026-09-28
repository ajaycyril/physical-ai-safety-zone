import test from 'node:test';import assert from 'node:assert/strict';import {weatherDecision} from '../public/room/weather-policy.js';
const now=Date.now(),good={status:'available',basis:'OBSERVED',source:'test METAR',observedAt:new Date(now-20*60000).toISOString(),windMs:3,gustMs:null,visibilityM:10000};
test('current observed context selects a drone candidate',()=>assert.equal(weatherDecision(good,now).mode,'drone'));
test('high wind selects a ground response',()=>assert.equal(weatherDecision({...good,windMs:11},now).mode,'ground'));
test('high gust selects a ground response',()=>assert.equal(weatherDecision({...good,gustMs:14},now).mode,'ground'));
test('stale observation cannot be presented as current',()=>assert.equal(weatherDecision({...good,observedAt:new Date(now-100*60000).toISOString()},now).mode,'ground'));
test('modeled fallback is not treated as observed evidence',()=>assert.equal(weatherDecision({...good,basis:'MODELED'},now).mode,'ground'));
test('unavailable and malformed data fail to ground response',()=>{for(const w of [null,{}, {...good,windMs:null},{...good,visibilityM:null},{...good,observedAt:'invalid'}])assert.equal(weatherDecision(w,now).mode,'ground');});

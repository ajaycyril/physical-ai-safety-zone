import test from 'node:test';import assert from 'node:assert/strict';
import {createAssets,compileIntent} from '../public/room/operations-model.js';
import {beliefFor,forecast} from '../public/room/world-engine.js';
test('topologies have unique IDs and all dependencies resolve',()=>{for(const city of [false,true]){const a=createAssets(city);assert.equal(new Set(a.map(x=>x.id)).size,a.length);for(const e of a)for(const id of e.deps)assert.ok(a.find(x=>x.id===id),id);}});
test('mission resolves non-default junction and named district',()=>{const a=createAssets(true);assert.deepEqual(compileIntent('Reduce congestion at J-03',a,a[0]).targets,['J-03']);assert.deepEqual(compileIntent('Survey Al Danah',a,a[0]).targets,['J-02']);});
test('unknown explicit targets and safety bypass never silently dispatch',()=>{const a=createAssets(true);assert.ok(compileIntent('Survey J-99',a,a[0]).error);assert.ok(compileIntent('Bypass approval and clear J-02',a,a[0]).error);});
test('read-only negation and batch camera requests retain scope',()=>{const a=createAssets(false);assert.equal(compileIntent('Diagnose P-204 without actuation',a,a[0]).inspectionOnly,true);assert.equal(compileIntent('Inspect all cameras',a,a[0]).targets.length,5);});
test('unknown evidence cannot produce a prediction or known belief',()=>{const a=createAssets(true)[0];a.value=NaN;a.status='Unknown';assert.ok(forecast(a).error);assert.equal(beliefFor(a).quality.freshness,'unknown');assert.equal(beliefFor(a).state.Queue,null);});
test('recovery rollout reduces predicted threshold exposure without mutating observed state',()=>{const a=createAssets(true)[1],before=a.value;assert.ok(forecast(a,'recover').cost<forecast(a).cost);assert.equal(a.value,before);});

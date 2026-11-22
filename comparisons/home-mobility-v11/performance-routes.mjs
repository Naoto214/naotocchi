// Profile whole movement requests and their nested route slices without a renderer or a simulated touch.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {forest} from '../home-mobility-v9/movement-scene.mjs';

const game = process.env.MOBILITY_GAME;
const arms = ['v10', 'v11-foot', 'v11'];
const rows = [];
for (const [order, sequence] of [['forward', arms], ['reverse', arms.toReversed()]]) {
  for (const arm of sequence) {
    const name = 'home-production-model-mobility-' + arm + '.js';
    let source = fs.readFileSync(path.join(game, name), 'utf8');
    const sourceSHA256 = createHash('sha256').update(source).digest('hex');
    const samples = new Map();
    const timed = (key, fn) => {
      const start = process.hrtime.bigint(), cpu = process.threadCpuUsage();
      try { return fn(); }
      finally {
        const wall = Number(process.hrtime.bigint() - start) / 1e6;
        const used = process.threadCpuUsage(cpu);
        if (!samples.has(key)) samples.set(key, {wallMs: [], cpuMs: []});
        samples.get(key).wallMs.push(wall);
        samples.get(key).cpuMs.push((used.user + used.system) / 1000);
      }
    };
    const functions = ['move','step','stepRelief','offerYield','yieldLeg','localIntentRoute'];
    if (source.includes('function chooseWanderGoal(')) functions.push('chooseWanderGoal');
    for (const key of functions) {
      const signature = source.match(new RegExp('function ' + key + '\\([^)]*\\)\\s*\\{'))?.[0];
      assert.ok(signature, key);
      source = source.replace(signature, signature + `return timed('${key}',()=>native_${key}.apply(this,arguments));} `
        + signature.replace(key, 'native_' + key));
    }
    for (const [label, iterator] of [['ambientSlice','r.search'], ['manualSlice', 'request.pairSearch']]) {
      const call = 'result=' + iterator + '.next();';
      assert.equal(source.split(call).length, 2);
      source = source.replace(call, `result=timed('${label}',()=>${iterator}.next());`);
    }
    const mod = {exports:{}};
    new Function('module','timed',source)(mod,timed);
    const {model} = forest(mod.exports,214);
    const initialFeet = model.snapshot().map(({key,x,y})=>[key,x,y]);
    for (let n=0; n<6000; n++) model.step(.1,{reducedMotion:false});
    const summary = values => {
      const sorted = values.toSorted((a,b)=>a-b);
      const percentile = p => sorted[Math.ceil(p*sorted.length)-1];
      return {n:sorted.length, total:values.reduce((sum,x)=>sum+x,0), p50:percentile(.5),
        p95:percentile(.95), p99:percentile(.99), max:sorted.at(-1)};
    };
    rows.push({arm,order,source:name,sourceSHA256,initialFeet,metrics:model.metrics(),timing:
      Object.fromEntries([...samples].map(([key,series]) =>
        [key,{wallMs:summary(series.wallMs), cpuMs:summary(series.cpuMs)}]))});
  }
}
assert.ok(rows.every(r=>JSON.stringify(r.initialFeet)===JSON.stringify(rows[0].initialFeet)));
for (const arm of arms)
  assert.deepEqual(rows.find(r=>r.arm===arm).metrics, rows.find(r=>r.arm===arm&&r.order==='reverse').metrics);
fs.writeFileSync(process.argv[2],JSON.stringify({node:process.version,seed:214,seconds:600,rows})+'\n');

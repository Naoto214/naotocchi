// Opt-in preload for the existing movement tests, using the same model and inputs.
// MOBILITY_GAME=... HELPER_COST_OUT=... node -r ./helper-cost.cjs movement.test.mjs
const fs = require('node:fs');
const vm = require('node:vm');
const {syncBuiltinESMExports} = require('node:module');
const {performance} = require('node:perf_hooks');

const samples = {stepRelief: [], ambientPairSlice: [], dragPairSlice: []};
const runInNewContext = vm.runInNewContext;
vm.runInNewContext = function (source, context, ...options) {
  if (typeof source === 'string' && source.includes('function stepRelief(flags) {')) {
    context.helperMeter = (label, fn) => {
      const start = performance.now();
      try {
        return fn();
      } finally {
        samples[label].push(performance.now() - start);
      }
    };
    source = source.replace('function stepRelief(flags) {',
      "function stepRelief(flags) {return helperMeter('stepRelief',()=>measureStepRelief(flags));}\nfunction measureStepRelief(flags) {");
    for (const [generator, name] of [['r.search','ambientPairSlice'], ['request.pairSearch','dragPairSlice']]) {
      const next = generator + '.next()';
      source = source.replace('result=' + next + ';', "result=helperMeter('" + name + "',()=>" + next + ');');
    }
  }
  return runInNewContext.call(this, source, context, ...options);
};
syncBuiltinESMExports();

process.on('exit', status => {
  if (status !== 0 || !process.env.HELPER_COST_OUT) return;
  const result = {runtime:process.version, measuredIn:'20 native movement regression cases', phases:{}};
  for (const [name, values] of Object.entries(samples)) {
    if (!values.length) throw new Error('Missing observations: ' + name);
    values.sort((a,b)=>a-b);
    const percentile = p => +values[Math.ceil(p * values.length)-1].toFixed(4);
    result.phases[name] = {calls:values.length,p50ms:percentile(.5),p95ms:percentile(.95),
      p99ms:percentile(.99),maxMs:percentile(1)};
  }
  fs.writeFileSync(process.env.HELPER_COST_OUT, JSON.stringify(result)+'\n');
});

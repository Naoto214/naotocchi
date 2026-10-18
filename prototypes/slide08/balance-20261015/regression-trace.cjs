const Module = require('node:module'),
  fs = require('node:fs'),
  original = Module._load,
  start = Date.now();
let steps = 0,
  sims = 0;
const log = (x) =>
  fs.appendFileSync(
    process.env.SLIDE08_TRACE_LOG || '/tmp/slide08-phase3b4-progress.jsonl',
    JSON.stringify({ ms: Date.now() - start, ...x }) + '\n',
  );
Module._load = function (id, parent, isMain) {
  const result = original.apply(this, arguments);
  if (id === 'node:test') {
    return new Proxy(result, {
      apply(fn, thisArg, args) {
        const i = args.findLastIndex((x) => typeof x === 'function'),
          callback = args[i];
        if (i >= 0)
          args[i] = function (...a) {
            log({ start: args[0], steps, sims });
            try {
              return callback.apply(this, a);
            } finally {
              log({ end: args[0], steps, sims });
            }
          };
        return Reflect.apply(fn, thisArg, args);
      },
    });
  }
  if (id.endsWith('runtime-harness.cjs')) {
    return {
      ...result,
      harness(...args) {
        const h = result.harness(...args),
          M = h.api.meguruMod,
          create = M.createSimulation;
        M.createSimulation = function (...a) {
          const sim = create.apply(this, a),
            step = sim.step;
          sims++;
          sim.step = function (...q) {
            steps++;
            if (steps % 10000 === 0) log({ steps, sims });
            return step.apply(this, q);
          };
          return sim;
        };
        return h;
      },
    };
  }
  return result;
};

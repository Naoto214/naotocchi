// Explicit over-cap party fixture: preserve the historical 27-actor geometry stress
// checks independently of production relationship/accompaniment policy (cap 2).
const {harness:runtimeHarness}=require('./runtime-harness.cjs');
exports.harness=(options={})=>{const h=runtimeHarness(options),M=h.api.meguruMod;
 const registry=M.buildRegistry, create=M.createSimulation;
 M.buildRegistry=()=>{const r=registry();for(const a of r.residents)a.withPlayer=!!a.related;return r;};
 M.createSimulation=(opts={})=>{
  const sim=create({...opts,registry:opts.registry||M.buildRegistry()}),enter=sim.enterRegion;
  sim.enterRegion=(id,opts={})=>enter(id,{...opts,registry:opts.registry||M.buildRegistry()});return sim;
 };
 return h;
};

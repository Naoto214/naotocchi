// Run the existing lifecycle/conversation contracts with the shipped Home pair.
// No assertion, game rule, clock, random source or save fixture is changed.
const runtime=require('../tests/helpers/runtime-harness.cjs');
const harness=runtime.harness;
// DOM-only unit fixtures supply Canvas/Image APIs; actual decoding is checked in browser CI.
const fs=require('fs');
class FixtureImage {set src(value){this._src=value;if(!fs.existsSync(value))throw Error('Missing fixture image '+value);this.complete=true;this.onload?.();}get src(){return this._src;}}
const canvasContext=new Proxy({measureText:text=>({width:String(text).length*8}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(target,key)=>key in target?target[key]:()=>{}});
runtime.harness=options=>harness({imageClass:FixtureImage,canvasContext,...options,homeDiorama:true,productionHome:!process.env.HOME_CONTRACT_LEGACY});
for(const file of [
 'growth-balance-test.cjs','save-compat-test.cjs','save-integrity-test.cjs',
 'menu-12-test.cjs','story-navigation-test.cjs','individuality-runtime-test.cjs',
 'home-household-test.cjs','home-household-conversation-test.cjs',
 'relationship-expression-integration-test.cjs','relationship-reaction-test.cjs',
 'relationship-free-life-runtime-test.cjs','motion-v2-test.cjs',
 'conversation-director-integration-test.cjs','conversation-v2-integration-test.cjs',
 'conversation-postgame-test.cjs','conversation-quick-test.cjs',
 'conversation-full-rollout-test.cjs','home-v12-conversation-test.cjs',
 'minigame-lifecycle-test.cjs','quick-mode-test.cjs','progress-counts-test.cjs'
])require('../tests/'+file);

const test=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./helpers/runtime-harness.cjs');
const {installDistancePose}=require('../tools/character-3d/nonplayer-review.cjs');
test('QA front/back actor heading survives the real party simulation before rendering',()=>{
 const h=harness({fullDisplay:true,deterministic:true}),s=h.api.state();Object.assign(s,{stage:'growing',speciesLine:'dog',isSleeping:false,isSick:false,energy:100,health:100,hunger:80,regionId:'forest',companions:[{id:'box',bond:100}]});s.lifetime.companionsRecruited=['box'];h.api.render();
 const sim=h.api.meguruMod.createSimulation({regionId:'forest',env:{time:'day',weather:'sunny',season:'spring',region:'forest'}}),a=sim.party.find(a=>a.id==='box');assert.ok(a);const originalStep=sim.step;
 for(const [view,heading]of [['front',Math.PI],['back',0]]){const release=installDistancePose(sim,a,view);for(let i=0;i<20;i++){const events=sim.step(1/60,{x:.3,y:-1});assert.ok(Array.isArray(events));assert.equal(a.heading,heading);assert.equal(a.x,sim.player.x+85);assert.equal(a.z,sim.player.z+15);assert.equal(a.behavior,'idle');}release();assert.equal(sim.step,originalStep);}
});

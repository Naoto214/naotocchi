const { harness } = require('/home/user/naotocchi/tests/helpers/runtime-harness.cjs');
const h = harness(), s = h.api.state();
Object.assign(s, { stage: 'growing', isSleeping: false, energy: 100 });
h.api.render();
const calls=[]; h.api.audio.voice=(...a)=>{calls.push(a);return true;};
h.api.startQuickRun('count'); h.advance(40);
console.log(JSON.stringify(calls), 'args length', calls[0] && calls[0].length);
console.log('shapeCue with question:', JSON.stringify(h.api.audio._shapeCue('いくつ',{question:true}).text), 'without:', JSON.stringify(h.api.audio._shapeCue('いくつ').text));

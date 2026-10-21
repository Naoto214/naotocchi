const {harness}=require('/home/user/naotocchi/tests/helpers/runtime-harness.cjs');
const out=[];const log=(...a)=>{const s=a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' ');out.push(s);console.log(s);};
const h=harness();const s=h.api.state();
s.speciesLine='cat';s.stageIndex=6;s.gender='female';s.orientationId='bi';s.attractedTo=['male','female','nonbinary'];
let g=h.api.decodeGuestCode(h.api.encodeGuestCode());
log('G1 fresh-life guest traitCounts',g.traitCounts,'affinityTrait',h.api.guestCandidate(g).affinityTrait);
s.traitCounts.gentle=10;g=h.api.decodeGuestCode(h.api.encodeGuestCode());
log('G2 legacy-like (gentle=10) guest affinityTrait',h.api.guestCandidate(g).affinityTrait);
// hand-edited code: decoder accepts any finite number
const payload=JSON.parse(decodeURIComponent(Buffer.from(h.api.encodeGuestCode().replace('NAOTOCCHI1:',''),'base64').toString('latin1')));
payload.t={gentle:0,wild:0,calm:0,brave:0,romantic:999};
const forged='NAOTOCCHI1:'+Buffer.from(encodeURIComponent(JSON.stringify(payload)),'latin1').toString('base64');
g=h.api.decodeGuestCode(forged);
log('G3 hand-edited code accepted:',!!g,'traitCounts',g&&g.traitCounts,'affinity',g&&h.api.guestCandidate(g).affinityTrait,'self traitCounts unchanged',s.traitCounts);
require('fs').writeFileSync(__dirname+'/verify-guest.out.txt',out.join('\n')+'\n');

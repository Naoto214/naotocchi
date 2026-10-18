import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseEggPolicy} from '../egg-policy.mjs';
import {start} from '../optimization.mjs';
import {applyAction} from '../session.mjs';
const pair=()=>{const s=start({gauge:2},1);s.board[13][0]={id:1,k:0,s:8};s.board[13][1]={id:2,k:1,s:8};s.nextId=3;s.gauge=2;return s;};
test('action ablation forbids transform throughout the lookahead',()=>{
 const s=pair();assert.equal(chooseEggPolicy(s,'active').type,'transform');
 assert.equal(chooseEggPolicy(s,'active',{allowedTypes:['drop']}).type,'drop');
});
test('fixed reserve points gate low-stage transforms independently of gauge price',()=>{
 const s=pair();s.board[13][0].s=4;s.board[13][1].s=4;s.gauge=6;
 assert.equal(chooseEggPolicy(s,'active',{allowedTypes:['transform'],reservePoints:24}),null);
 assert.equal(chooseEggPolicy(s,'active',{allowedTypes:['transform'],reservePoints:0}).type,'transform');
});
test('immediate winning conversion bypasses resource reserve',()=>{
 const s=pair();const a=chooseEggPolicy(s,'active',{reservePoints:24});
 assert.ok(applyAction(s,a,false).last.deaths>0);
});
test('transform penalty discourages low-value tool-only play',()=>{
 const s=pair();s.board[13][0].s=4;s.board[13][1].s=4;s.gauge=6;
 assert.equal(chooseEggPolicy(s,'active',{allowedTypes:['transform'],reservePoints:0,transformPenalty:1e6}),null);
});
import {burden,contributions,runTrial,selectPolicy} from '../gauge-comparison.mjs';
import {stateHash,placements,replay} from '../session.mjs';
import {standardRules} from '../rules.mjs';
test('screen inputs separate hard drop, movements, waits and four-step tools',()=>{
 const b=burden([{type:'drop',path:['left','left','rotate','down','hard']},{type:'egg'},{type:'transform'},{type:'bulk'}]);
 assert.deepEqual(b.logical,{drop:1,egg:1,transform:1,bulk:1});
 assert.equal(b.screenDiscrete,16); // four explicit drop commands (down is a wait) plus 3 x four-tap tools
 assert.equal(b.screenHold,15); // repeated left as a single hold
 assert.equal(b.toolInputs,12);assert.equal(b.downSteps,1);
 assert.equal(b.maxTransformStreak,1);
});
test('source contribution counts secondary waves and actual win trigger',()=>{
 const s=pair(),a={type:'transform',x:1,y:13,to:0};
 const c=contributions(s,[a]);assert.equal(c.transform.deathGroups,1);assert.equal(c.drop.deathGroups,0);
 assert.equal(c.winTrigger,'transform');assert.equal(c.transform.actions,1);
});
test('trial stops on bound, reproduces initial bag, and preserves standard gauge',()=>{
 const c={id:'tiny',gauge:3,options:{}};
 const t=runTrial(c,300,{drops:2,actions:8});assert.equal(t.metrics.status,'censored');
 assert.equal(t.metrics.drops,2);assert.equal(t.initial.rules.gaugeUnit,3);
 assert.equal(standardRules().gaugeUnit,8);
 assert.deepEqual(t.initial.queue,start({gauge:8},300).queue);
 assert.equal(stateHash(replay({version:t.initial.version,initial:t.initial,actions:t.actions,hash:t.hash})),t.hash);
});
test('selection predeclared: wins then lower transform burden then total burden then id',()=>{
 const rows=[{id:'a',wins:3,transforms:500,screenInputs:900},{id:'b',wins:3,transforms:300,screenInputs:1000},{id:'c',wins:2,transforms:0,screenInputs:1}];
 assert.equal(selectPolicy(rows),'b');
 assert.equal(selectPolicy([{id:'a',wins:3,transforms:300,screenInputs:1001},rows[1]]),'b');
});
import fs from 'node:fs';
test('forbidden second-ply transform cannot distort the chosen drop',()=>{
 const f=JSON.parse(fs.readFileSync(new URL('./fixtures/gauge-second-ply.json',import.meta.url)));
 assert.deepEqual(chooseEggPolicy(f.initial,'active',f.options),f.expected);
 assert.notDeepEqual(f.expected,f.wrong);
});

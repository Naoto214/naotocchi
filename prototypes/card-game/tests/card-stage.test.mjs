import test from 'node:test';import assert from 'node:assert/strict';
import {createGame,DEFAULT_DECK} from '../engine.mjs';
import {HotseatSession} from '../ui-session.mjs';
import {cardStageMarkup,actionParts,cardActions} from '../ui-presentation.mjs';
import {stageScale,STAGE_MAX_SCALE} from '../ui-viewport.mjs';
import {CARDS} from '../engine.mjs';
const opening=()=>{const x=new HotseatSession({autoAdvance:true});x.start(createGame(2,{A:DEFAULT_DECK,B:DEFAULT_DECK}));x.reveal();return x;};

test('card stage shows the official card and actions only: no repeated name/text, related-rule link or separate guide',()=>{
 const x=opening(),v=x.projection,c=v.players.A.hand[0],html=cardStageMarkup(c,{v,viewer:'A'});
 assert.equal(v.choice.kind,'egg_bottom');
 assert.match(html,/class="stage-card"/);assert.match(html,/class="card-face/);assert.match(html,/art-delivery\/large\//);
 for(const gone of ['detail-summary','effect-scroll','full-effect','learning-related','関連ルールを読む','choice-guide','必須選択：このカードを選ぶ','たまごの準備'])assert.ok(!html.includes(gone),gone);
 // The ability text appears exactly once: on the card itself.
 assert.equal(html.split(c.text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;')).length-1,c.text?1:0);
 // Current state stays: turn/actor status and the back-to-board button.
 assert.match(html,/Aのターン・Aの選択待ち/);assert.match(html,/data-close>盤面へ ×/);
});
test('egg exchange button: short main label plus the outcome note, and it carries the exact engine action',()=>{
 const x=opening(),v=x.projection,c=v.players.A.hand[0],[a]=cardActions(v,'A',c),html=cardStageMarkup(c,{v,viewer:'A'});
 assert.deepEqual(actionParts(v,a),{main:`${c.name}を選ぶ`,note:'山札の一番下へ戻します'});
 assert.ok(html.includes(`data-action="${a.id}"`));assert.match(html,/<span class="action-main">[^<]+を選ぶ<\/span><small class="action-note">※ 山札の一番下へ戻します<\/small><\/button>/);
 // The confirmation/operation panel wording is unchanged.
 assert.match(a.displayLabel,/山札の下へ戻す/);
});
test('notes follow the real action: placement slot for plays, none for pass, payment vs target for activation picks',()=>{
 assert.deepEqual(actionParts(null,{kind:'play',label:'まねっこサルをなかまへ',destination:{seat:'A',index:3}}),{main:'まねっこサルをなかまへ',note:'配置先：なかま①'});
 // Swapping a companion: name the card that leaves (the engine appends the new one), never a wrong slot.
 const board={players:{A:{board:{companions:[{id:'c1',name:'きまぐれなねこ'},{id:'c2',name:'きまぐれなねこ'}],prepared:[]}}}};
 assert.deepEqual(actionParts(board,{kind:'play',label:'カメレオンを出す／きまぐれなねこと交代',targetCard:'c2',destination:{seat:'A',index:4}}).note,'なかま②のきまぐれなねこと入れ替えます');
 // Equipment goes to an empty prepared slot; its target is elsewhere, so the slot note stays.
 assert.equal(actionParts(board,{kind:'place',label:'おべんとうばこ → ねこ',targetCard:'c1',destination:{seat:'A',index:6}}).note,'配置先：準備①');
 assert.deepEqual(actionParts(null,{kind:'pass',displayLabel:'応答しない（パス）'}),{main:'応答しない（パス）',note:''});
 const v={effect:{kind:'card',name:'サングラスのカメレオン'}};
 assert.deepEqual(actionParts(v,{kind:'choose',choiceCard:'x',pickName:'ねこ',pickKind:'activation_selection',moveKey:null,moveCost:false}),{main:'ねこを選ぶ',note:'サングラスのカメレオンの対象にします'});
 assert.deepEqual(actionParts(v,{kind:'choose',choiceCard:'x',pickName:'ねこ',pickKind:'activation_selection',moveKey:null,moveCost:true}),{main:'ねこを選ぶ',note:'支払いに使います'});
 assert.deepEqual(actionParts(v,{kind:'choose',choiceCard:'x',pickName:'ねこ',pickKind:'activation_selection',moveKey:'discard',moveCost:true}),{main:'ねこを支払いに選ぶ',note:'支払いとして捨て札に置きます'});
 assert.deepEqual(actionParts(v,{kind:'choose',label:'一番下に置く'}),{main:'一番下に置く',note:''});
});
test('catalog, read-only and hidden cards: no actions; hidden shows only the card back',()=>{
 const c=CARDS['W-city'];
 assert.doesNotMatch(cardStageMarkup(c,{catalog:true}),/data-action=|stage-band/);
 const hidden=cardStageMarkup({...c,hidden:true,id:'B:x:1'},{v:opening().projection,viewer:'A'});
 assert.match(hidden,/card-back-approved/);assert.doesNotMatch(hidden,/data-action=/);assert.match(hidden,/相手の伏せ札は確認できません/);
});
test('stage scale: portrait whole card when readable, else full width with scroll; landscape always whole; zoom fills the width, never wider than the stage',()=>{
 assert.equal(stageScale(358,700,{portrait:true}),358/320);            // 390×844: whole card fits at full width
 assert.equal(stageScale(288,410,{portrait:true}),410/480);             // 320×568, one button: whole card, still readable
 assert.equal(stageScale(288,300,{portrait:true}),288/320);            // 320×568, three choices: fills the width, stage scrolls
 assert.equal(stageScale(500,300,{portrait:false}),300/480);           // landscape: always the whole card, no scrolling
 assert.equal(stageScale(500,300,{portrait:false,zoom:true}),500/320);  // tap: fill the stage width
 assert.equal(stageScale(2000,3000,{zoom:true}),STAGE_MAX_SCALE);
 for(const [w,h] of [[200,900],[288,200],[500,300]])for(const zoom of [false,true])assert.ok(stageScale(w,h,{zoom})*320<=w+1e-9);
});

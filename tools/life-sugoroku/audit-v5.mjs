// Read-only inventory of all official definitions; execution probes live in tests.
import fs from 'node:fs';
import vm from 'node:vm';
import {POOLS} from '../../prototypes/life-sugoroku/tournament-v4.mjs';
const source=fs.readFileSync('prototypes/life-sugoroku/official/games.js','utf8');
const quickSource=fs.readFileSync('prototypes/life-sugoroku/official/quick.js','utf8');
const script=fs.readFileSync('script.js','utf8');
const realm=vm.createContext({});
// Attach source text in the disposable analysis realm, never in shipped files.
vm.runInContext(source.replace('game.id = id;', 'game.id = id; game.auditSource = game.start.toString();'),realm);
vm.runInContext(quickSource,realm);
const api=realm.installNaotocchiMinigames({SEASON:{SPRING:'spring',SUMMER:'summer',AUTUMN:'autumn',WINTER:'winter'}});
const quick=realm.installNaotocchiQuick({}).QUICK_GAMES;
const normal=[...api.MINIGAMES,...Object.values(api.REGION_MINIGAMES).flat().map(x=>x.game),...Object.values(api.SEASONAL_MINIGAMES).flat().map(x=>x.game||x)];
if(normal.length!==100||quick.length!==50)throw Error('Official inventory changed');
const names=Object.fromEntries([...script.matchAll(/'([^']+)': \{ name: '([^']+)'/g)].map(m=>[m[1],m[2]]));
const reasons={knock:'CPUが指定回数で止まる制御が必要',wait:'待機のみで同点になりやすい。対戦への採用を保留',spin:'円周ドラッグのCPU入力が未実装',sneak:'時間をかける連続ドラッグのCPU入力が未実装',rhythm:'easy CPUの3 seed検査で入力0・得点0。反応間隔の調整が必要','air-hockey':'パックの可視観測・CPUパドル追従・復帰の実装と検証が必要','frogger-road':'車・足場の可視観測・CPU経路・復帰の実装と検証が必要','pipe-connect':'パイプの可視観測・CPU解法・復帰の実装と検証が必要'};
const rows=[];
for(const g of quick){const eligible=POOLS.quick.includes(g.id);rows.push({pool:'quick',id:g.id,name:g.cue,implementation:'正式原本に定義あり',baseSeconds:g.dur/1000,session:'同一種3試行、正式cue/result演出込み30秒以内を候補別検証',end:'成功／失敗または時間切れ。3試行終了で正式callback',scoring:'正式成功回数から0/33/67/100点。時間タイブレークは採用せず同点同順位',comparison:'4席同じseed・固定ゲーム難度、得点降順、15/10/5/0',cpu:eligible?'正式targetへの入力。新規ゲームは試行別の見落としと反応遅延あり':reasons[g.id],input:g.uses,safari:'物理iPhone未検証',resume:eligible?'仮想60Hz入力ジャーナルの復帰試験対象':'未実装／未検証',adoption:eligible?'V5検証対象':'保留',reason:eligible?null:reasons[g.id]});}
for(const g of normal){let body=g.auditSource;const factory=body.match(/factory\(/);if(factory){const at=source.indexOf("mg('"+g.id+"'");const ref=source.slice(at,at+450).match(/randomThemeGame\((\w+)/)?.[1];if(ref){const start=source.indexOf('function '+ref+'('),end=source.indexOf('\n  function ',start+10);body=source.slice(start,end<0?undefined:end);}}
 const durations=[...body.matchAll(/mgDuration\((\d+)/g)].map(m=>+m[1]/1000),eligible=POOLS.game.includes(g.id);
 rows.push({pool:'game',id:g.id,name:names[g.id]||g.id,implementation:'正式原本に定義あり',baseSeconds:[...new Set(durations)],durationNote:'ソースのmgDuration引数。総所要時間は未測定。空配列は可変／手番／別関数で要追加確認',endAndControls:script.match(new RegExp('"'+g.id+'": "([^"\\n]+)"'))?.[1]||'正式startの終了分岐を追加確認',scoring:'正式callbackの得点。新規の独自得点は作らない',scoreEvidence:body.split('\n').filter(l=>/const score =|onComplete\(/.test(l)).map(l=>l.trim()).slice(-5),comparison:'4席同じseed・固定ゲーム難度、得点降順、同点同順位15/10/5/0',cpu:eligible?(g.id==='lights-out'?'可視ライト状態を解法で操作':'可視焼き具合ゲージをタップ'):'未実装',input:'正式操作の継承が必要（上記endAndControls参照）',safari:'物理iPhone未検証',resume:eligible?'仮想60Hz入力ジャーナルの復帰試験対象':'未検証',adoption:eligible?'V5検証対象':'保留',reason:eligible?null:reasons[g.id]||'専用CPU・操作UI依存・60秒完了・保存復帰・実ブラウザーが未検証'});
}
fs.writeFileSync('docs/life-sugoroku/V5-MINIGAME-AUDIT.json',JSON.stringify({scope:'150定義の静的監査。未検証を対応済みに数えない。採用数はVERSION-5.mdの実行結果を参照',rows},null,2)+'\n');
fs.writeFileSync('docs/life-sugoroku/V5-MINIGAME-AUDIT.md','# V5 正式150種類の再利用監査\n\n原本ソースの静的確認とアダプターの対応状況。全150本を実機検証した報告ではありません。詳細10項目は隣のJSONを参照。所要時間は元の時間制限で、読み上げ・結果表示・交代時間を含みません。\n\n|種別|ID|正式名|元の秒数|V5判定／残課題|\n|---|---|---|---|---|\n'+rows.map(r=>`|${r.pool}|${r.id}|${r.name}|${Array.isArray(r.baseSeconds)?r.baseSeconds.join('/')||'追加確認':r.baseSeconds}|${r.reason||'実行・CPU・復帰・ブラウザー検証対象'}|`).join('\n')+'\n');
console.log(JSON.stringify({quick:quick.length,normal:normal.length,candidates:{quick:POOLS.quick.length,game:POOLS.game.length}}));

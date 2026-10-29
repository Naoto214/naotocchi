// Read-only extraction of the official cards related to early birth and stage growth, with a rule-based
// classification of what each effect is triggered by and what it gives. Card texts come verbatim from
// full-catalog.mjs; nothing is changed. Usage: node tools/target_cards.mjs  (writes results/target-cards.{json,md})
import {readFileSync,writeFileSync} from 'node:fs';import {dirname,join} from 'node:path';import {fileURLToPath} from 'node:url';
import {CATALOG} from '../../full-catalog.mjs';
const here=dirname(fileURLToPath(import.meta.url)),res=join(here,'..','results');
const usage=JSON.parse(readFileSync(join(res,'card-usage.json'),'utf8'));
// Non-main cards selected by effect (not by name): they reward birth/time-skip/transform, read the main's stage or
// growth path, reward a main that stays, or only work while/after the egg phase.
const NON_MAIN=['C-shiba','E-fateful-transform','E-mirror','E-midlife-album','G-doodle-jump','G-jump-quest','G-line-trace',
 'G-picross-5','G-solitaire-klondike','G-hang-glider-3d','I-c_time_back','I-c_time_forward','I-c_transform','P-snow_spirit',
 'P-sunflower_partner','W-city','W-snow','W-star_stop','W-mountain','G-downhill-mountain','I-c_egg_normal','I-c_egg_rare','G-connect-four'];
const KW=/たんじょう|ときおくり|へんしん|段階|あり続け|開始時から/;
const cards=Object.values(CATALOG).filter(c=>c.type==='main'?(c.stage<=3||KW.test(c.text)):NON_MAIN.includes(c.id));
function trigger(t){
 if(/たんじょうした時/.test(t))return 'birth';
 if(/ときおくりでこの段階になっていない|ときおくりしないことを選ぶ/.test(t))return 'stay';
 if(/ときおくりでこの段階|ときおくり直前|ときおくりで⑦か⑧/.test(t))return 'skip_arrival';
 if(/この段階になった時/.test(t))return 'arrival_any';
 if(/(ときおくり|へんしん).{0,12}メイン枠から捨て札/.test(t))return 'leave_by_move';
 if(/へんしんで(この段階|メイン枠に置かれた)/.test(t))return 'transform_arrival';
 if(/ときおくりを(行った|2回)|ときおくりしていた|ときおくりしない|ときおくりする時|ときおくりの時|ときおくりで支払/.test(t))return 'skip_related';
 if(/へんしん/.test(t))return 'transform_related';
 if(/あり続け|開始時から/.test(t))return 'stay';
 if(/段階/.test(t))return 'stage_ref';
 if(/たまご/.test(t))return 'egg_ref';
 if(t==='能力なし。')return 'vanilla';
 return 'ongoing';
}
function gives(t){const g=[];if(/そだち\+/.test(t))g.push('そだち');if(/時を?[0-9１-９]?少なく|時.少なく|時コストを/.test(t))g.push('時');
 if(/引く|手札に加え|手札に戻す/.test(t))g.push('手札');if(/山札上.{0,6}見|山札の一番上か/.test(t)&&!g.includes('手札'))g.push('山札操作');
 if(/ちから|ちえ/.test(t))g.push('能力値');return g.length?g:['なし'];}
// What early birth gains / long waiting loses / relation to a direct high-stage birth, by trigger class.
const EVAL={
 birth:['①〜③で早く出せば必ず得る（たんじょう時だけ）','高段階で直接たんじょうすると得られない','直接高段階では不成立'],
 skip_arrival:['低段階で出しておき、ときおくりで到達した時だけ得る','待機して直接出すと得られない','直接たんじょうでは不成立'],
 arrival_any:['経路を問わず到達時に得る','待機しても直接たんじょうで得られる（損失なし）','直接高段階でも成立（中立）'],
 leave_by_move:['このメインから先へ進む時に得る（成長途中の報酬）','待機中は得られない','直接高段階の後は不成立'],
 transform_arrival:['へんしんで出た時に得る','たまごからでは不成立','直接たんじょうでは不成立'],
 skip_related:['ときおくりを行うターンに得る（低段階から育てるほど機会が多い）','待機中は機会がない','直接高段階では機会が減る'],
 transform_related:['メインがいる時のへんしんに得る','待機中は不成立','中立'],
 stay:['同じメインが場にいる時間が長いほど得る','待機分だけ回数が減る','中立（出した後は同じ）'],
 stage_ref:['段階の関係で得る','状況次第','状況次第'],
 egg_ref:['たまご中に使う／たまごでないメインを要求','カードにより逆','中立'],
 vanilla:['能力なし（能力値だけ）','—','—'],
 ongoing:['場にいるターン数だけ使える（早いほど回数が多い）','待機分だけ回数が減る','中立（出した後は同じ）'],
};
const U=usage.cpu_decks.cards,T=usage.test_decks_e1.cards;
const rows=cards.map(c=>{const tr=trigger(c.text),u=U[c.id]??T[c.id],src=U[c.id]?'CPU7デッキ':T[c.id]?'旧試験デッキ':null;
 return {id:c.id,name:c.name,type:c.type,stage:c.stage??null,power:c.power??null,wisdom:c.wisdom??null,cost:c.cost,rare:!!c.rare,text:c.text,
  trigger:tr,gives:gives(c.text),early_gain:EVAL[tr][0],wait_loss:EVAL[tr][1],direct_high:EVAL[tr][2],
  usage:u?{source:src,seats:u.seats,drawn:u.drawn,play_per_draw:u.play_per_draw,activate_per_play:u.activate_per_play,stuck_per_draw:u.stuck_per_draw}:null};});
writeFileSync(join(res,'target-cards.json'),JSON.stringify(rows,null,1));
const count=(f)=>rows.reduce((m,r)=>(m[f(r)]=(m[f(r)]??0)+1,m),{});
const L=['# 早期たんじょう・段階成長に関係する正式カード（自動抽出、本文は正式カタログのまま）','',
 `対象 ${rows.length}枚：メイン①〜③ ${rows.filter(r=>r.type==='main'&&r.stage<=3).length}枚、条件語を持つメイン④〜⑧ ${rows.filter(r=>r.type==='main'&&r.stage>3).length}枚、メイン以外 ${rows.filter(r=>r.type!=='main').length}枚。`,'',
 '発動の分類：'+Object.entries(count(r=>r.trigger)).map(([k,v])=>`${k} ${v}`).join('、'),'',
 '使用状況：play/draw＝引いた枚数あたりの使用、act/play＝使用あたりの能力発動、stuck＝引いて試合終了時も手札に残った割合。CPU7デッキ6,600戦、なければ旧試験デッキ1,680戦。空欄はどのCPUデッキにも入っていないカード。','',
 '| ID | 名前 | 段階 | 能力値 | 分類 | 得るもの | 早期たんじょうの利益 | 長期待機での損失 | 直接高段階との関係 | 使用状況 | 本文 |','|---|---|---|---|---|---|---|---|---|---|---|'];
for(const r of rows)L.push(`| ${r.id} | ${r.name} | ${r.stage??r.type} | ${r.power!=null?r.power+'/'+r.wisdom:'時'+r.cost} | ${r.trigger} | ${r.gives.join('・')} | ${r.early_gain} | ${r.wait_loss} | ${r.direct_high} | ${r.usage?`${r.usage.source} play/draw ${r.usage.play_per_draw} act/play ${r.usage.activate_per_play} stuck ${r.usage.stuck_per_draw}`:''} | ${r.text.replace(/\|/g,'／')} |`);
writeFileSync(join(res,'target-cards.md'),L.join('\n')+'\n');
console.log(rows.length,JSON.stringify(count(r=>r.trigger)),rows.filter(r=>r.usage).length);

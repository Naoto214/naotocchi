// Builds isolated copies of the official card-game modules for the breakup-penalty comparison.
// The official files under prototypes/card-game/ are only READ (sha256 recorded before and after).
// Each variant is a full copy in build/<variant>/ with exact-string patches; a patch that does not
// match exactly once aborts the build, so a changed upstream file can never be patched silently.
// Usage: node lib/build-variants.mjs            (writes build/A, build/B, build/C, build/C2, build/Cx and build/manifest.json)
import {readdirSync,readFileSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const HERE=dirname(fileURLToPath(import.meta.url)),SRC=join(HERE,'..','..'),OUT=join(HERE,'..','build');
const sha=t=>createHash('sha256').update(t).digest('hex');
const files=readdirSync(SRC).filter(f=>f.endsWith('.mjs')).sort();
const before=Object.fromEntries(files.map(f=>[f,sha(readFileSync(join(SRC,f)))]));
function patch(text,from,to,label){const n=text.split(from).length-1;if(n!==1)throw Error(`patch ${label}: expected 1 match, found ${n}`);return text.replace(from,()=>to);}

// The single place where the official engine applies the breakup/divorce penalty (engine.mjs discardField).
const PENALTY_SITE="if(key==='partner'){p.relationship=null;grow(s,a,-10);}";
// Same behaviour for every variant except the amount; the experiment log hook does not touch game state.
const PENALTY_NEW="if(key==='partner'){const __stage=p.relationship,__g=p.growth,__pen=__BP_PENALTY(__stage,context);p.relationship=null;grow(s,a,-__pen);globalThis.__bpLog?.({kind:'leave',actor:a,cardId:s.cards[id].cardId,stage:__stage,penalty:__pen,applied:__g-p.growth,cause:context.cause??'cost',effectActor:context.effectActor??null,destination:context.destination??'discard',noPenalty:!!context.noPenalty,round:s.round,serial:s.serial});}";
// Replacement (らぶれたー / サボテン etc.) usage log, also state-neutral.
const REPL_SITE="s.replacementUsed??=[];s.replacementUsed.push(o.key);h.log(s,`${o.actor}：${card(s,o.source).name}の置換を適用`);return r.replace;}";
const REPL_NEW="s.replacementUsed??=[];s.replacementUsed.push(o.key);globalThis.__bpLog?.({kind:'replacement',actor:o.actor,cardId:card(s,o.source).id,round:s.round,serial:s.serial});h.log(s,`${o.actor}：${card(s,o.source).name}の置換を適用`);return r.replace;}";

// Trial card for plan C (NOT an official card). Event, すぐつかう, 時1, same shape as はじめてのデート / なかなおり.
const AMICABLE={id:'E-amicable-breakup',name:'円満な別れ',type:'event',cost:1,rare:false,
 text:'自分の交際中のこいびと1枚を対象として発動できる。対象を持ち主の手札に戻す。この効果で別れる場合、そだち−10を受けない。',
 source:'experiment breakup-penalty-20261029 (trial card, not canonical)',source_sha256:'-',method:'すぐつかう'};
const AMICABLE2={...AMICABLE,text:'相手のターンに、自分の交際中のこいびと1枚を対象として発動できる。対象を持ち主の手札に戻す。この効果で別れる場合、そだち−10を受けない。'};

const VARIANTS={
 A:{note:'現行：別れ−10・離婚−10（記録用フックのみ。挙動は正式版と同一）',penalty:'10',version:null},
 B:{note:'結婚前の別れ−5・離婚−10',penalty:'stage===4?10:5',version:'exp-B'},
 C:{note:'現行−10＋試作カード「円満な別れ」（いつでも・時1）',penalty:'10',version:'exp-C',card:AMICABLE,condition:'ownPartnerDating'},
 C2:{note:'現行−10＋試作カード「円満な別れ」制限版（相手のターンにだけ・時1）',penalty:'10',version:'exp-C2',card:AMICABLE2,condition:'ownPartnerDatingOpponentTurn'},
 // Control for deck composition: the same card slot, but the card gives no exemption (a plain self-bounce that still costs −10).
 Cx:{note:'対照：「円満な別れ」と同じ枠に、−10を免除しない同型カード（デッキ変更の影響だけを測る）',penalty:'10',version:'exp-Cx',card:{...AMICABLE,text:'（対照）自分の交際中のこいびと1枚を対象として発動できる。対象を持ち主の手札に戻す。'},condition:'ownPartnerDating',noExemption:true},
};
rmSync(OUT,{recursive:true,force:true});
const manifest={source:'prototypes/card-game/*.mjs',sourceSha256:before,variants:{}};
for(const [v,cfg] of Object.entries(VARIANTS)){
 const dir=join(OUT,v);mkdirSync(dir,{recursive:true});const out={};
 for(const f of files)out[f]=readFileSync(join(SRC,f),'utf8');
 let eng=patch(out['engine.mjs'],PENALTY_SITE,PENALTY_NEW,'penalty');
 eng+=`\nconst __BP_PENALTY=(stage,ctx)=>ctx.noPenalty?0:(${cfg.penalty});\n`;
 if(cfg.version)eng=patch(eng,"export const VERSION='hotseat-5';",`export const VERSION='hotseat-5+${cfg.version}';`,'version');
 out['engine.mjs']=eng;
 out['replacements.mjs']=patch(out['replacements.mjs'],REPL_SITE,REPL_NEW,'replacement-log');
 if(cfg.card){
  out['full-catalog.mjs']=patch(out['full-catalog.mjs'],'export const CATALOG = {',`export const CATALOG = {\n  ${JSON.stringify(cfg.card.id)}: ${JSON.stringify(cfg.card)},`,'catalog');
  out['rules.mjs']=patch(out['rules.mjs'],"quick('E-misunderstanding',[move()],{target:'opponentPartner'});",
   `quick('E-misunderstanding',[move()],{target:'opponentPartner'});\nquick('${cfg.card.id}',[{op:'move',destination:'hand',noPenalty:${!cfg.noExemption}}],{target:'ownPartner',condition:'${cfg.condition}'});`,'rule');
  out['effects.mjs']=patch(out['effects.mjs'],"case 'personVacancy':",
   "case 'ownPartnerDating':return !!b.partner&&p.relationship!==null&&p.relationship<4;case 'ownPartnerDatingOpponentTurn':return s.turn!==a&&!!b.partner&&p.relationship!==null&&p.relationship<4;case 'personVacancy':",'condition');
  out['effects.mjs']=patch(out['effects.mjs'],"departure=h.discardField(s,own,l.target,{defer:true,cause:'effect',effectActor:a,destination:e.destination});",
   "departure=h.discardField(s,own,l.target,{defer:true,cause:'effect',effectActor:a,destination:e.destination,noPenalty:!!e.noPenalty&&own===a});",'move');
 }
 for(const [f,t] of Object.entries(out))writeFileSync(join(dir,f),t);
 manifest.variants[v]={note:cfg.note,penalty:cfg.penalty,version:cfg.version?`hotseat-5+${cfg.version}`:'hotseat-5',card:cfg.card??null,
  patchedSha256:Object.fromEntries(Object.entries(out).filter(([f,t])=>sha(t)!==before[f]).map(([f,t])=>[f,sha(t)]))};
}
const after=Object.fromEntries(files.map(f=>[f,sha(readFileSync(join(SRC,f)))]));
if(JSON.stringify(after)!==JSON.stringify(before))throw Error('official sources changed during build');
manifest.officialUnchanged=true;
writeFileSync(join(OUT,'manifest.json'),JSON.stringify(manifest,null,1));
console.log(JSON.stringify(Object.fromEntries(Object.entries(manifest.variants).map(([k,v])=>[k,{version:v.version,patched:Object.keys(v.patchedSha256)}]))));

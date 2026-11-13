const $=id=>document.getElementById(id);let variant='C',crop='full',live=false,engine,revision=0;
const state={round:7,firstTime:4,secondTime:9,firstGrowth:65,secondGrowth:40,end:10};const initial={...state};
const fields=[['round','現在ラウンド',0,12,1],['firstTime','先攻の残り時',0,12,1],['secondTime','後攻の残り時',0,12,1],['firstGrowth','先攻のそだち',0,100,5],['secondGrowth','後攻のそだち',0,100,5],['end','終了ラウンド（I〜XII）',1,12,1]];
async function update(){const request=++revision;const name=variant==='A'?'A：V12 S1・修正前':variant==='B'?'B：V13・局所変形あり':'C：V14・原形復元／余白評価中';$('caption').textContent=crop==='stand'?'スタンドA・保存版V13の概念図':name;
 for(const[id,on]of[['before',variant==='A'],['after',variant==='B'],['restored',variant==='C'],['full',crop==='full'],['ten',crop==='ten'],['stand',crop==='stand']])$(id).setAttribute('aria-pressed',String(on));
 $('detail').textContent=variant==='A'?'保存版S1：メイン＋30%、左右数字・ローマ数字＋10%。':'メイン＋30%、左右数字・ローマ数字は拡大前の現行仕様。';$('controls').hidden=!live||crop==='stand';$('live').hidden=live||crop==='stand';
 if(crop==='stand'){$('display').innerHTML='<img src="../v13/evidence/stand-A.jpg" width="1350" height="615" alt="スタンドA 正面・側面・背面の概念図">';return;}
 if(!live){$('display').innerHTML=`<img src="evidence/${variant}-${crop}.jpg" alt="${name} ${crop==='ten'?'10付近の拡大':'時計全体'}">`;return;}
 engine??=await import('./clock-v14.mjs');if(request!==revision)return;$('display').innerHTML=engine.render(state,{variant,crop});
}
$('fields').innerHTML=fields.map(([k,label,min,max,step])=>`<label>${label}<input id="${k}" aria-label="${label}" type="number" min="${min}" max="${max}" step="${step}" value="${state[k]}"></label>`).join('');
for(const[k,,min,max,step]of fields)$(k).oninput=()=>{const n=Number($(k).value);if(!Number.isInteger(n)||n<min||n>max||(n-min)%step){return;}state[k]=n;update();};
$('restored').onclick=()=>{variant='C';update();};$('before').onclick=()=>{variant='A';update();};$('after').onclick=()=>{variant='B';update();};for(const c of ['full','ten','stand'])$(c).onclick=()=>{crop=c;update();};$('live').onclick=()=>{live=true;update();};$('light').onclick=()=>{live=false;update();};$('reset').onclick=()=>{Object.assign(state,initial);for(const[k]of fields)$(k).value=state[k];update();};

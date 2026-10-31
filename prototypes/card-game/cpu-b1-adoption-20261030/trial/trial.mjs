// CPU B1（中級の能力値選択）試遊版の追加UI。正式ゲーム（app.mjs）より先に読み込む。ゲーム処理・保存形式には触れない。
// - 能力値選択の場面から始める：正式の「保存した対戦に戻る」と同じ復帰処理を使う（CPU対戦の保存を試遊版の保存領域に置いて復帰）。
//   同じ場面を「新しい方針（heuristic-2）」と「旧保存（heuristic-1）」の両方で開ける。
// - 画面下の小さな表示：いまのCPU対戦の方針の版と、CPUが最後に選んだ能力値（試遊版の保存から読むだけ）。
import DATA from './scenarios.json' with {type:'json'};
const CPU_KEY='naotocchi-cpu-match-v1',JA={power:'ちから',wisdom:'ちえ',パンチ:'パンチ（ちから）',キック:'キック（ちから）',ガード:'ガード（ちえ）'};
function load(key,policy){
 const s=DATA.scenarios.find(x=>x.key===key);if(!s)return;
 try{localStorage.setItem(CPU_KEY,s.saves[policy]);}catch{return;}
 const select=document.getElementById('match-mode');select.value='cpu';select.dispatchEvent(new Event('change'));
 document.getElementById('restore').click();
}
const panel=document.createElement('section');panel.className='trial-panel';panel.setAttribute('aria-labelledby','trial-title');
panel.innerHTML=`<h2 id="trial-title">CPU 能力値選択（B1）試遊版</h2>
<p>中級CPUが、ちょうせんの種目（ちから／ちえ）に合う能力値を選ぶ改善を確かめる本人用の版です。正式版とは保存が分かれています（正式版の対戦・戦績・マイデッキには触れません）。</p>
<h3>確認の手順</h3>
<ol><li>ふだんどおり「ひとり（CPU）」で、初級・中級それぞれと対戦する（初級は今までと同じ動き）。</li>
<li>下の場面から始めて、CPUの選んだ能力値を画面下の表示で確かめる。</li>
<li>対戦の途中でページを閉じて開き直し（対戦は操作のたびに自動で保存されます）、「ひとりであそぶ」→「保存した対戦に戻る」で続きができること、画面下の「方針」が保存した時と同じであることを確かめる。</li></ol>
<h3>能力値選択の場面から始める（中級CPU）</h3>
<div class="trial-scenarios">${DATA.scenarios.map(s=>`<div><span>R${s.round}：${s.label}<br><small>勝負の種目：${s.parameter}。新しい方針の予定：${s.expected['heuristic-2']}／旧保存の予定：${s.expected['heuristic-1']}</small></span>
<div class="row"><button type="button" data-trial-load="${s.key}" data-policy="heuristic-2">新しい方針で開く</button><button type="button" data-trial-load="${s.key}" data-policy="heuristic-1">旧保存（heuristic-1）として開く</button></div></div>`).join('')}</div>`;
document.getElementById('welcome').prepend(panel);
panel.addEventListener('click',e=>{const b=e.target.closest('button[data-trial-load]');if(b)load(b.dataset.trialLoad,b.dataset.policy);});
// 画面下の表示（試遊版の保存を読むだけ）
const badge=document.createElement('div');badge.className='trial-badge';badge.hidden=true;badge.setAttribute('aria-live','polite');document.body.append(badge);
// 対戦を開いた（または復帰した）時点の操作数を覚え、それより後にCPUが選んだ型だけを表示する（前の履歴の型は出さない）。
let last='',base=null,ident=null;
setInterval(()=>{
 const playing=!document.getElementById('game').hidden&&document.getElementById('match-mode')?.value==='cpu';
 let raw=null;try{raw=localStorage.getItem(CPU_KEY);}catch{}
 if(!playing||!raw){badge.hidden=true;base=null;ident=null;return;}
 let d;try{d=JSON.parse(raw);}catch{return;}
 const cmds=d.game?.commands??[],id=JSON.stringify([d.game?.seed,d.humanSeat,d.policySeed,d.recordsMeta?.id??null]);
 if(id!==ident||base===null||cmds.length<base){ident=id;base=cmds.length;}
 let pick='';
 for(let i=cmds.length-1;i>=base;i--){let c;try{c=JSON.parse(cmds[i]);}catch{continue;}if(c&&c.variant in JA){pick=JA[c.variant];break;}}
 const text=`方針：${d.policy}（${d.difficulty==='beginner'?'初級':'中級'}）${pick?`　この画面でCPUが選んだ型：${pick}`:''}`;
 if(text!==last){badge.textContent=text;last=text;}badge.hidden=false;
},300);

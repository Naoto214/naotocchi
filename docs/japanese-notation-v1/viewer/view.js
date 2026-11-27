'use strict';
const $=s=>document.querySelector(s);
const node=(tag,txt,cls)=>{const el=document.createElement(tag);if(txt!==undefined)el.textContent=txt;if(cls)el.className=cls;return el;};
const labels=['すべて','変更推奨','保留','維持'];
const prefix='https://github.com/Naoto214/naotocchi/blob/9539e462e78452ad6da5f72d454911679b4ec20e/';
let page=0,mode='変更推奨',items=[],catalog=[],dictionary=[],matches={},counts={};
const unpack=r=>r.map(i=>dictionary[i]);
const fmt=n=>n.toLocaleString('ja-JP');
function ref(source){const m=source.match(/^([^:#\s]+):(\d+)/);if(!m)return node('code',source);const a=node('a',source);a.href=prefix+m[1]+'#L'+m[2];a.target='_blank';a.rel='noopener';return a;}
function display(item,activeRows){
 const el=node('article',undefined,'entry');
 const approvals=[...new Set(activeRows.filter(r=>r[6]&&/正式カード名|進化名|正式名称|名称/.test(r[1])).map(r=>r[6]))];
 const meta=node('div',item.d+'　·　'+[...new Set(activeRows.map(r=>r[0]))].slice(0,4).join(' ／ '),'meta');if(approvals.length)meta.append('　',node('span','承認済み '+approvals.join('、'),'pill'));el.append(meta);
 const pair=node('div',undefined,'pair');
 for(const [txt,title] of [[item.t,'現行表記'],[[...new Set(activeRows.map(r=>r[4]))].join(' ／ '),'推奨表記・比較案']]){
  const col=node('div');col.append(node('div',title,'label'),node('p',txt,title==='現行表記'?'':'proposed'));pair.append(col);
 }
 el.append(pair);
 if(new Set(activeRows.map(r=>r[8])).size>1)el.append(node('p','用途によって判断が分かれます。出典を開くと用途別の候補を確認できます。','meta'));
 const first=activeRows.find(r=>r[8]===item.d)||activeRows.find(r=>r[8]!=='維持')||activeRows[0];
 el.append(node('p',first[5],'reason'));
 const detail=node('details',undefined,'context'),sum=node('summary','使用場所・ID・出典（'+fmt(activeRows.length)+'件）');detail.append(sum);detail.addEventListener('toggle',()=>{
  if(!detail.open||detail.childElementCount>1)return;
  const links=node('ul');
  for(const r of activeRows){const [area,role,id,source,to,reason,approval,other,j]=r;const li=node('li');li.append(node('strong',area+' ／ '+role),'　'+(id||'')+'　',ref(source),node('div',j+'　'+to+'　'+reason));
   if(other)li.append(node('div',other,'meta'));
   const m=matches[id];if(m)li.append(node('div','本編との照合　'+m.kind+'　'+(m.mainName||'本編表題なし')+' ／ '+m.cardName,'meta'));if(approval)li.append(node('span',approval,'pill'));links.append(li);}
  detail.append(links);
 });el.append(detail);return el;
}
const sections={
 'ホーム・育成':/ホーム|育成|お世話|せかい|プロフィール|あいてむ|なかま|こいびと|結婚|へんしん|たまご|データ・|個性/,
 '図鑑・実績・物語':/ずかん|じっせき|物語|ものがたり|エンディング|ムービー|いっしょうカード/,
 'CARD GAME':/^CARD GAME/,
 'なおぽよ。':/なおぽよ/,'なおころ。':/なおころ/,
 'ミニゲーム・クイック':/ミニゲーム|クイック/,'めぐる':/めぐる/,
 '設定・その他':/設定|起動|復旧|読み上げ|通信|つうしん|データ・|シール|でざいん|画面共通/
};
const approvedName=r=>Boolean(r[6]&&/正式カード名|進化名|正式名称|名称/.test(r[1]));
function draw(){
 const query=$('#search').value.trim().normalize('NFKC').toLowerCase(),area=$('#area').value,ap=$('#approved').value;
 const visibleRow=r=>(!area||(area.startsWith('group:')?sections[area.slice(6)].test(r[0]):r[0]===area))&&(!ap||approvedName(r));
 items=catalog.filter(item=>(mode==='すべて'||item.d===mode)&&(!query||item.hay.includes(query))&&item.r.some(visibleRow));
 const start=page*30; $('#status').textContent=items.length?fmt(items.length)+'件中 '+fmt(start+1)+'〜'+fmt(Math.min(start+30,items.length))+'件':'該当する表記はありません。';
 $('#prev').disabled=page===0;$('#next').disabled=start+30>=items.length;
 $('#rows').replaceChildren(...items.slice(start,start+30).map(item=>display(item,item.r)));
 for(const b of $('#decisions').children)b.setAttribute('aria-pressed',String(b.dataset.val===mode));
}
async function start(){
 const [data,map]=await Promise.all(['audit.json','matching.json'].map(async f=>{const res=await fetch(f);if(!res.ok)throw Error(res.status);return res.json();}));
 dictionary=data.dictionary;matches=Object.fromEntries(map.map(m=>[m.cardId,m]));counts=data.counts;
 catalog=data.items.map(i=>{const r=i.r.map(unpack);return {...i,r,areas:[...new Set(r.map(x=>x[0]))],approved:r.some(x=>x[6]&&(/正式カード名|進化名|正式名称|名称/.test(x[1]))),hay:[i.t,...new Set(r.flatMap(x=>[x[2],x[4],x[7]]))].join(' ').normalize('NFKC').toLowerCase()};});
 $('#total').textContent=fmt(catalog.length)+'固有表記 ／ '+fmt(counts.rows)+'件の出典・用途記録';
 for(const l of labels){const b=node('button',l+'　'+fmt(l==='すべて'?catalog.length:counts[l]));b.type='button';b.dataset.val=l;b.onclick=()=>{mode=l;page=0;draw();};$('#decisions').append(b);}
 const broad=node('optgroup');broad.label='分野全体';for(const a of Object.keys(sections)){const opt=node('option',a+' 全体');opt.value='group:'+a;broad.append(opt);}$('#area').append(broad);
 const screens=node('optgroup');screens.label='個別の画面';$('#area').append(screens);
 for(const a of [...new Set(catalog.flatMap(i=>i.areas))].sort((a,b)=>a.localeCompare(b,'ja'))){const opt=node('option',a);opt.value=a;screens.append(opt);}
 for(const id of ['search','area','approved'])$('#'+id).addEventListener(id==='search'?'input':'change',()=>{if(id==='approved'&&$('#approved').value)mode='すべて';page=0;draw();});
 for(const [id,delta] of [['prev',-1],['next',1]])$('#'+id).onclick=()=>{page+=delta;draw();$('#status').scrollIntoView({block:'start'});};draw();
}
start().catch(()=>$('#status').textContent='監査データを読み込めませんでした。ページを再読み込みしてください。');

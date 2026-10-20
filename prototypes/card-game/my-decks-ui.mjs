import {addCollectionCard} from './collection.mjs';
import {CARDS,TYPE_NAMES,DEFAULT_DECK,validateDeck} from './engine.mjs';
import {DeckLibrary,MAX_DECKS,MY_DECK_KEY,filterCards} from './my-decks.mjs';
import {cardMarkup,cardRarityLabel} from './ui-presentation.mjs';

// Editor owns only deck drafts. Match sessions receive fresh arrays at their existing boundary.
export function mountMyDecks({inspect,message,onChange}){
 const $=id=>document.getElementById(id),node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const action=(text,fn)=>{const b=node('button',text);b.type='button';b.onclick=fn;return b;};
 let suspended=false;
 let library,blocked='',saved=false,edited,signature='',rows=new Map();
 try{library=new DeckLibrary(localStorage);}catch(e){blocked='保存データを読み込めません。元データは変更せず、この画面のみで編集します。'+e.message;library=new DeckLibrary({getItem:()=>null,setItem:()=>{throw Error(blocked);}});}
 edited=library.data.selected.A;
 const valid=d=>{try{validateDeck(d.cards);return '準備OK';}catch(e){return e.message;}};
 const inform=text=>{$('deck-save-status').textContent=text;message(text);};
 function persist(){try{library.save();saved=true;$('deck-save-status').textContent='自動保存済み';}catch(e){saved=false;inform('未保存：容量・保存設定を確認し、JSONを書き出してください。'+e.message);}}
 function run(fn,{catalog=false}={}){try{fn();persist();refresh(catalog);}catch(e){inform(e.message);}}
 function download(raw,filename){const url=URL.createObjectURL(new Blob([raw],{type:'application/json'})),a=node('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function options(select){const value=select.value;select.replaceChildren();for(const d of library.data.decks){const o=node('option',`${d.name} · ${d.cards.length}/40`);o.value=d.id;select.append(o);}select.value=value;}
 function renderLibrary(){
  const list=$('my-deck-list'),top=list.scrollTop;list.replaceChildren();
  for(const d of library.data.decks){const row=node('article');row.className='my-deck-item';row.classList.toggle('selected',d.id===edited);const edit=action(d.name,()=>{edited=d.id;refresh(true);$('deck-name').focus({preventScroll:true});});edit.className='my-deck-open';edit.dataset.deckId=d.id;edit.setAttribute('aria-pressed',String(d.id===edited));row.append(edit,node('small',`${d.cards.length}/40枚 · ${valid(d)}`));list.append(row);}
  list.scrollTop=top;
  for(const seat of ['A','B']){options($('select-deck-'+seat));$('select-deck-'+seat).value=library.data.selected[seat];}
  $('deck-name').value=library.get(edited).name;
  $('my-deck-total').textContent=`${library.data.decks.length} / ${MAX_DECKS} デッキ`;
  $('deck-create').disabled=$('deck-duplicate').disabled=library.data.decks.length>=MAX_DECKS;
  $('deck-delete').disabled=library.data.decks.length===1;
 }
 function filters(){return {query:$('card-search').value,type:$('card-type').value,attribute:$('card-attribute').value,species:$('card-species').value,stage:$('card-stage').value};}
 function preview(c){const b=action('',()=>inspect(c.id,{catalog:true,origin:b}));b.className='card-tap catalog-preview';b.setAttribute('aria-label',c.name+'を拡大');b.innerHTML=cardMarkup(c,{compact:true});return b;}
 function buildCatalog(force=false){
  const f=filters(),key=JSON.stringify(f);if(!force&&signature===key&&$('catalog-list').children.length)return;signature=key;
  const entries=filterCards(f),list=$('catalog-list');rows=new Map();const fragment=document.createDocumentFragment();
  for(const c of entries){const row=node('article');row.className='catalog-card';row.dataset.cardId=c.id;row.append(preview(c),node('strong',c.name),node('small',`${TYPE_NAMES[c.type]}${c.attribute?' · '+c.attribute:''}${c.stage?' · '+c.stage+'段階':''} · ${cardRarityLabel(c)}`));
   const controls=node('div');controls.className='deck-card-controls';const minus=action('−',()=>run(()=>library.change(edited,c.id,-1))),count=node('span'),plus=action('＋',()=>run(()=>library.change(edited,c.id,1)));minus.setAttribute('aria-label',c.name+'を1枚減らす');plus.setAttribute('aria-label',c.name+'を1枚追加');plus.dataset.add=c.id;minus.dataset.remove=c.id;controls.append(minus,count,plus);row.append(controls);fragment.append(row);rows.set(c.id,{minus,plus,count});
  }
  list.replaceChildren(fragment);list.scrollTop=0;$('catalog-count').textContent=`${entries.length} / 452種類を表示`;
 }
 function counts(){const d=library.get(edited),m=new Map();for(const id of d.cards)m.set(id,(m.get(id)??0)+1);
  for(const [id,r] of rows){const n=m.get(id)??0,max=CARDS[id].rare?1:3;r.count.textContent=`${n} / ${max}`;r.minus.disabled=n===0;r.plus.disabled=d.cards.length>=40||n>=max;}
  $('deck-count').textContent=`${d.cards.length} / 40枚 · あと${40-d.cards.length}枚 · ${valid(d)}`;
  const list=$('deck-list'),scroll=list.scrollTop;list.replaceChildren();
  for(const [id,n] of m){const row=node('div');row.className='deck-row';const b=action(CARDS[id].name,()=>inspect(id,{catalog:true,origin:b}));row.append(b,node('span',`×${n}`),action('− 1枚',()=>run(()=>library.change(edited,id,-1))));list.append(row);}list.scrollTop=scroll;
  $('deck-contents-count').textContent=`投入中のカード（${d.cards.length}枚）`;
 }
 function refresh(force=false){renderLibrary();if($('deck-editor').open&&!suspended&&!$('welcome').hidden){buildCatalog(force);counts();}const decks=library.selectedDecks();onChange(decks);$('new').disabled=!['A','B'].every(s=>{try{validateDeck(decks[s]);return true;}catch{return false;}});for(const s of ['A','B'])$('deck-valid-'+s).textContent=valid(library.get(library.data.selected[s]));}
 for(const [id,label] of Object.entries(TYPE_NAMES)){const o=node('option',label);o.value=id;$('card-type').append(o);}
 for(const attr of [...new Set(Object.values(CARDS).map(c=>c.attribute).filter(Boolean))]){const o=node('option',attr);o.value=attr;$('card-attribute').append(o);}
 for(const c of Object.values(CARDS).filter(c=>c.type==='main'&&c.stage===1)){const o=node('option',c.name.replace(/[①-⑧]/g,''));o.value=c.species;$('card-species').append(o);}
 for(let i=1;i<=8;i++){const o=node('option',i+'段階');o.value=String(i);$('card-stage').append(o);}
 $('card-search').oninput=()=>{buildCatalog();counts();};
 for(const id of ['card-type','card-attribute','card-species','card-stage'])$(id).onchange=()=>{buildCatalog();counts();};
 $('filter-reset').onclick=()=>{for(const id of ['card-search','card-type','card-attribute','card-species','card-stage'])$(id).value='';buildCatalog();counts();};
 $('deck-editor').ontoggle=()=>{if($('deck-editor').open){buildCatalog();counts();}};
 $('deck-name').oninput=()=>{try{library.rename(edited,$('deck-name').value);persist();const d=library.get(edited);for(const b of document.querySelectorAll('.my-deck-open'))if(b.dataset.deckId===edited)b.textContent=d.name;for(const s of ['A','B'])for(const option of $('select-deck-'+s).options)if(option.value===edited)option.textContent=`${d.name} · ${d.cards.length}/40`;}catch(e){inform(e.message);}};
 $('deck-name').onchange=()=>{$('deck-name').value=library.get(edited).name;};
 $('deck-create').onclick=()=>run(()=>{edited=library.create().id;},{catalog:true});
 $('deck-duplicate').onclick=()=>run(()=>{edited=library.duplicate(edited).id;},{catalog:true});
 $('deck-delete').onclick=()=>{const d=library.get(edited);if(confirm(`「${d.name}」を削除しますか？選択中の席には先頭のデッキを設定します。`))run(()=>{library.remove(edited);edited=library.data.decks[0].id;},{catalog:true});};
 $('deck-default').onclick=()=>{if(confirm('編集中のデッキを標準の40枚に戻しますか？'))run(()=>library.replace(edited,DEFAULT_DECK));};
 $('deck-clear').onclick=()=>{if(confirm('編集中のデッキのカードをすべて外しますか？'))run(()=>library.replace(edited,[]));};
 $('deck-export').onclick=()=>download(library.exportJSON(),'naotocchi-my-decks.json');
 $('deck-legacy-export').onclick=()=>download(JSON.stringify({version:1,decks:library.selectedDecks()},null,2),'naotocchi-decks.json');
 $('deck-import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>100000)throw Error('ファイルが大きすぎます');const raw=await file.text(),replace=$('deck-import-mode').value==='replace';if(replace&&!confirm('現在のマイデッキをすべて置き換えます。必要なデッキは先に書き出してください。バックアップを復元しますか？'))return;run(()=>{const added=library.importJSON(raw,{replace});edited=added[0].id;},{catalog:true});}catch(err){inform('読込を拒否しました：'+err.message);}finally{e.target.value='';}};
 for(const s of ['A','B'])$('select-deck-'+s).onchange=()=>run(()=>library.select(s,$('select-deck-'+s).value));
 // A stale second tab must never silently replace another tab's saved library.
 window.addEventListener('storage',e=>{if(e.key!==MY_DECK_KEY)return;blocked='別タブでデッキが変更されました。編集内容を書き出してから再読込してください。';library.storage={getItem:()=>{throw Error(blocked);},setItem:()=>{throw Error(blocked);}};inform(blocked);});
 window.addEventListener('beforeunload',e=>{if(!saved){e.preventDefault();e.returnValue='';}});
 if(blocked)inform(blocked);else persist();refresh();
 return {list:()=>library.data.decks.map(d=>({id:d.id,name:d.name,cards:[...d.cards]})),edited:()=>edited,add:(id,card)=>{const result=addCollectionCard(library,id,card);saved=true;refresh();return result;},suspend:()=>{suspended=true;rows.clear();signature='';$('catalog-list').replaceChildren();},resume:()=>{suspended=false;refresh(true);},refresh:()=>refresh(true),release:()=>{rows.clear();signature='';$('catalog-list').replaceChildren();$('deck-list').replaceChildren();}};
}

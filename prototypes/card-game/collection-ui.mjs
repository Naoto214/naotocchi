import {relatedChapter} from './rulebook-content.mjs';
import {CARDS,TYPE_NAMES} from './engine.mjs';
import {collectionCards,collectionPage,CollectionPreferences,COLLECTION_KEY,EGG} from './collection.mjs';
import {cardMarkup,eggCardMarkup,eggDetailMarkup,escapeHTML as h} from './ui-presentation.mjs';
import {fitMainCardCopy} from './ui-art-loading.mjs';

export function mountCollection({decks,onRule=()=>{},onOpen=()=>{},onClose=()=>{}}){
 const $=id=>document.getElementById(id),dialog=document.createElement('dialog');
 dialog.id='collection-dialog';dialog.setAttribute('aria-label','カードコレクション');
 dialog.innerHTML=`<header class="collection-toolbar"><div><small>NAOTOCCHI</small><h2>カードコレクション</h2></div><button id="collection-close" type="button">戻る ×</button></header>
 <p id="collection-status" role="status" aria-live="polite"></p>
 <section id="collection-notice" hidden><p>カードコレクションには、なおとっち本編でまだ出会っていないキャラクターや出来事も登場します。</p><button id="collection-ack" type="button">確認してひらく</button></section>
 <div id="collection-shelf"><button id="collection-cover" type="button" aria-label="カードファイルを開く" aria-describedby="collection-cover-caption"><span class="binder-spine"></span><img src="ui-assets/card-back-approved.png" class="binder-cover-art" alt="正式カード裏面の植物紋章" draggable="false"><span class="binder-title"><strong>NAOTOCCHI</strong><span>CARD COLLECTION</span></span></button><span class="binder-caption" id="collection-cover-caption">453 CARDS · 51 PAGES<br>タップしてひらく</span></div>
 <section id="collection-book" hidden><div class="collection-book-tools"><button id="collection-to-cover" type="button">表紙へ</button><span id="collection-count"></span><button id="collection-favorites-only" type="button" aria-pressed="false">♡ お気に入り</button></div>
 <label class="collection-search">カード名・効果を検索<input id="collection-query" type="search" placeholder="カード名・効果・ID"></label>
 <details class="collection-filter-panel"><summary>分類・属性などで絞り込む</summary><div class="collection-filters">${[['type','分類'],['attribute','属性'],['species','メインの種族'],['stage','成長段階'],['rarity','レア区分']].map(([key,label])=>`<label>${label}<select id="collection-${key}"><option value="">すべて</option></select></label>`).join('')}</div></details>
 <div class="collection-filter-summary"><span id="collection-filter-status"></span><button id="collection-reset" type="button">絞り込みを解除</button></div>
 <div class="binder-page"><div class="binder-rings" aria-hidden="true"><i></i><i></i><i></i></div><div id="collection-grid" aria-label="9ポケットのカードファイル"></div></div>
 <nav class="collection-pagination" aria-label="ページ移動"><button id="collection-prev" type="button">‹ 前へ</button><span id="collection-page" role="status" aria-live="polite"></span><button id="collection-next" type="button">次へ ›</button></nav><p class="collection-hint">左右にスワイプでページ移動 · カードをタップで詳細</p></section>
 <section id="collection-detail" hidden aria-label="カード詳細"><div class="collection-toolbar"><button id="collection-detail-close" type="button">‹ ファイルに戻る</button><span id="collection-detail-position"></span></div>
 <div class="collection-detail-layout"><div class="collection-detail-visual"><button id="collection-flip-card" type="button" aria-label="カードを裏返す"><span id="collection-flipper" data-side="front"><span class="collection-front"></span><span class="collection-back"><img src="ui-assets/card-back-approved.png" alt="正式カード裏面・青銀の植物紋章" draggable="false"></span></span></button><div class="collection-detail-nav"><button id="collection-card-prev" type="button" aria-label="前のカード">‹</button><button id="collection-flip" type="button">裏を見る</button><button id="collection-card-next" type="button" aria-label="次のカード">›</button></div></div>
 <div class="collection-detail-copy"><h2 id="collection-card-name"></h2><p id="collection-card-meta"></p><div id="collection-card-effect"></div><button id="collection-rulebook" type="button">関連ルールを読む</button><button id="collection-favorite" type="button" aria-pressed="false">♡ お気に入り</button><button id="collection-add" type="button">デッキに追加</button><div id="collection-deck-picker" hidden><label>追加先のマイデッキ<select id="collection-deck-target"></select></label><button id="collection-add-confirm" type="button">このデッキに1枚追加</button><button id="collection-picker-close" type="button">選択を閉じる</button></div><p id="collection-detail-status" role="status" aria-live="polite"></p></div></div></section>
 <svg class="collection-filter-defs" width="0" height="0" aria-hidden="true"><filter id="collection-gold" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1.5 1 -1.5 0 -.12 1.5 1 -1.5 0 -.12 1.5 1 -1.5 0 -.12 0 0 0 1 0"/><feComponentTransfer><feFuncR type="table" tableValues=".035 .08 .68 .96"/><feFuncG type="table" tableValues=".12 .23 .55 .84"/><feFuncB type="table" tableValues=".095 .17 .28 .51"/></feComponentTransfer></filter></svg>`;
 document.body.append(dialog);
 let prefs,storageError='';
 try{prefs=new CollectionPreferences(localStorage);}catch(e){storageError=e.message;prefs=new CollectionPreferences({getItem:()=>null,setItem:()=>{throw Error(storageError);}});}
 let page=prefs.data.page,basePage=page,filtered=false,active=false,list=[],detailIndex=-1,detailList=[],origin,opened=false,scroll=0;
 const filters=()=>({query:$('collection-query').value,type:$('collection-type').value,attribute:$('collection-attribute').value,species:$('collection-species').value,stage:$('collection-stage').value,rarity:$('collection-rarity').value,favoritesOnly:$('collection-favorites-only').getAttribute('aria-pressed')==='true'});
 const announce=(message,detail=false)=>{$(detail?'collection-detail-status':'collection-status').textContent=message;};
 function store(patch){try{prefs.update(patch);return true;}catch(e){announce('保存できません：'+e.message);return false;}}
 function option(id,value,label){const o=document.createElement('option');o.value=value;o.textContent=label;$(id).append(o);}
 option('collection-type','special','特別カード');for(const [id,label] of Object.entries(TYPE_NAMES))option('collection-type',id,label);
 for(const attr of new Set(Object.values(CARDS).map(c=>c.attribute).filter(Boolean)))option('collection-attribute',attr,attr);
 for(const c of collectionCards({type:'main',stage:'1'}))option('collection-species',c.species,c.name.replace(/[①-⑧]/g,''));
 for(let i=1;i<=8;i++)option('collection-stage',String(i),i+'段階');option('collection-rarity','rare','レア');option('collection-rarity','normal','通常');
 function favoriteButton(b,id){const yes=prefs.data.favorites.includes(id);b.textContent=yes?'♥':'♡';b.setAttribute('aria-pressed',String(yes));b.setAttribute('aria-label',(yes?'お気に入りを解除：':'お気に入りに登録：')+(CARDS[id]?.name??'たまご'));}
 function renderPage(){
  list=collectionCards(filters(),prefs.data.favorites);const view=collectionPage(list,page);page=view.page;
  $('collection-count').textContent=`${list.length} / 453種類`;$('collection-page').textContent=`${list.length?page+1:0} / ${list.length?view.pages:0} ページ`;
  $('collection-prev').disabled=page===0;$('collection-next').disabled=!list.length||page>=view.pages-1;
  $('collection-filter-status').textContent=filtered?'絞り込み中':'全カードを公開中';
  $('collection-grid').innerHTML=view.cards.map(c=>`<article class="collection-pocket"><button type="button" class="collection-card-tap" data-collection-card="${h(c.id)}" aria-label="${h(c.name)}の詳細">${c.viewOnly?eggCardMarkup():cardMarkup(c,{compact:true})}</button><div class="collection-pocket-label"><span>${h(c.form??c.name)}</span><button type="button" data-collection-favorite="${h(c.id)}"></button></div></article>`).join('')+Array.from({length:9-view.cards.length},()=>'<div class="collection-pocket empty-pocket" aria-hidden="true"></div>').join('');
  for(const img of $('collection-grid').querySelectorAll('img'))img.loading='lazy';
  for(const b of $('collection-grid').querySelectorAll('[data-collection-favorite]'))favoriteButton(b,b.dataset.collectionFavorite);
  if(!list.length)$('collection-filter-status').textContent='該当するカードはありません';
 }
 function changeFilters(){const next=Object.values(filters()).some(Boolean);if(!filtered&&next)basePage=page;page=next?0:basePage;filtered=next;renderPage();}
 function movePage(delta){const next=collectionPage(list,page+delta).page;if(next===page)return;page=next;if(!filtered){basePage=page;store({page});}renderPage();$('collection-grid').animate?.([{opacity:.65,transform:`translateX(${delta*8}px)`},{opacity:1,transform:'translateX(0)'}],{duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:180});}
 function toggleFavorite(id){try{prefs.toggle(id);if(detailIndex>=0)favoriteButton($('collection-favorite'),id);renderPage();announce('お気に入りを保存しました',detailIndex>=0);}catch(e){announce('お気に入りを保存できません：'+e.message,detailIndex>=0);}}
 function showDetail(index){
  detailIndex=index;const c=detailList[index];$('collection-detail').hidden=false;$('collection-book').hidden=true;$('collection-shelf').hidden=true;
  $('collection-flipper').dataset.side='front';$('collection-flip').textContent='裏を見る';$('collection-flip-card').setAttribute('aria-label','カードを裏返す');
  $('collection-flipper').querySelector('.collection-front').innerHTML=c.viewOnly?eggCardMarkup({detail:true}):cardMarkup(c,{detail:true});
  $('collection-card-name').textContent=c.name;$('collection-card-meta').textContent=[c.viewOnly?'特別カード・閲覧専用':TYPE_NAMES[c.type],c.attribute,c.stage?`成長段階 ${c.stage}`:'',c.viewOnly?'':`時コスト ${c.cost}`,c.type==='main'?`ちから ${c.power} · ちえ ${c.wisdom}`:'',c.viewOnly?'':c.rare?'レア':'通常'].filter(Boolean).join(' · ');
  if(c.viewOnly){const tmp=document.createElement('div');tmp.innerHTML=eggDetailMarkup();$('collection-card-effect').replaceChildren(tmp.querySelector('.effect-scroll'));}else $('collection-card-effect').textContent=c.text;
  $('collection-add').disabled=!!c.viewOnly;$('collection-add').textContent=c.viewOnly?'たまごはデッキに追加できません':'デッキに追加';favoriteButton($('collection-favorite'),c.id);
  $('collection-card-prev').disabled=index===0;$('collection-card-next').disabled=index===detailList.length-1;$('collection-detail-position').textContent=`${index+1} / ${detailList.length}`;
  $('collection-deck-picker').hidden=true;announce('',true);dialog.scrollTop=0;fitMainCardCopy(dialog);
 }
 function closeDetail(){detailIndex=-1;$('collection-detail').hidden=true;$('collection-book').hidden=false;$('collection-flipper').querySelector('.collection-front').replaceChildren();renderPage();dialog.scrollTop=scroll;const b=$('collection-grid').querySelector(`[data-collection-card="${active}"]`);(b??$('collection-next')).focus({preventScroll:true});}
 function flip(){const back=$('collection-flipper').dataset.side==='front';$('collection-flipper').dataset.side=back?'back':'front';$('collection-flip').textContent=back?'表を見る':'裏を見る';$('collection-flip-card').setAttribute('aria-label',back?'カードを表に戻す':'カードを裏返す');}
 function picker(){const select=$('collection-deck-target'),previous=select.value;select.replaceChildren();for(const d of decks.list()){const o=document.createElement('option');o.value=d.id;o.textContent=`${d.name} · ${d.cards.length}/40枚`;select.append(o);}select.value=previous||decks.edited();if(!select.value&&select.options.length)select.selectedIndex=0;$('collection-deck-picker').hidden=false;}
 $('collection-add').onclick=picker;$('collection-picker-close').onclick=()=>{$('collection-deck-picker').hidden=true;};
 $('collection-add-confirm').onclick=()=>{try{const result=decks.add($('collection-deck-target').value,detailList[detailIndex].id);picker();announce(`「${result.name}」に追加しました · ${result.count}/40枚`,true);}catch(e){announce('追加できません：'+e.message,true);}};
 $('collection-favorite').onclick=()=>toggleFavorite(detailList[detailIndex].id);
 $('collection-grid').onclick=e=>{const b=e.target.closest('button');if(b?.dataset.collectionFavorite)toggleFavorite(b.dataset.collectionFavorite);else if(b?.dataset.collectionCard){active=b.dataset.collectionCard;detailList=[...list];scroll=dialog.scrollTop;showDetail(detailList.findIndex(c=>c.id===active));$('collection-detail-close').focus({preventScroll:true});}};
 $('collection-detail-close').onclick=closeDetail;$('collection-flip').onclick=flip;$('collection-flip-card').onclick=flip;
 const moveCard=delta=>{const next=detailIndex+delta;if(next>=0&&next<detailList.length)showDetail(next);};
 $('collection-card-prev').onclick=()=>moveCard(-1);$('collection-card-next').onclick=()=>moveCard(1);
 $('collection-prev').onclick=()=>movePage(-1);$('collection-next').onclick=()=>movePage(1);
 $('collection-query').oninput=changeFilters;for(const key of ['type','attribute','species','stage','rarity'])$('collection-'+key).onchange=changeFilters;
 $('collection-favorites-only').onclick=()=>{const b=$('collection-favorites-only');b.setAttribute('aria-pressed',String(b.getAttribute('aria-pressed')!=='true'));changeFilters();};
 $('collection-reset').onclick=()=>{for(const key of ['query','type','attribute','species','stage','rarity'])$('collection-'+key).value='';$('collection-favorites-only').setAttribute('aria-pressed','false');changeFilters();};
 $('collection-cover').onclick=()=>{opened=true;$('collection-shelf').hidden=true;$('collection-book').hidden=false;renderPage();};
 $('collection-to-cover').onclick=()=>{opened=false;$('collection-book').hidden=true;$('collection-shelf').hidden=false;$('collection-grid').replaceChildren();};
 $('collection-ack').onclick=()=>{store({noticeSeen:true});$('collection-notice').hidden=true;$('collection-shelf').hidden=false;$('collection-cover').focus();};
 function close(){dialog.close();}
 $('collection-close').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();if(detailIndex>=0)closeDetail();else close();});
 dialog.addEventListener('close',()=>{detailIndex=-1;$('collection-detail').hidden=true;$('collection-grid').replaceChildren();$('collection-flipper').querySelector('.collection-front').replaceChildren();document.body.classList.remove('collection-open');decks.resume();origin?.focus({preventScroll:true});onClose();});
 function open(button,editor=false){origin=button;if(editor)$('collection-deck-target').replaceChildren();onOpen();decks.suspend();dialog.showModal();document.body.classList.add('collection-open');announce(storageError?'保存データは変更しません：'+storageError:'');$('collection-notice').hidden=prefs.data.noticeSeen;$('collection-shelf').hidden=!prefs.data.noticeSeen||opened;$('collection-book').hidden=!prefs.data.noticeSeen||!opened;if(opened&&prefs.data.noticeSeen)renderPage();dialog.scrollTop=0;}
 // Horizontal intent only. Cancel vertical/multi-touch gestures; capture synthetic click after swipe.
 function swipes(el,move){let start=null,suppressUntil=0;el.addEventListener('pointerdown',e=>{if(e.isPrimary===false||e.button>0){start=null;return;}start={x:e.clientX,y:e.clientY,id:e.pointerId};});el.addEventListener('pointercancel',()=>{start=null;});el.addEventListener('pointerup',e=>{if(!start||e.pointerId!==start.id)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;start=null;if(Math.abs(dx)>48&&Math.abs(dx)>Math.abs(dy)*1.6){suppressUntil=Date.now()+450;move(dx<0?1:-1);}});el.addEventListener('click',e=>{if(Date.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();}},true);}
 swipes($('collection-grid'),movePage);swipes($('collection-flip-card'),moveCard);
 dialog.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const delta=e.key==='ArrowLeft'?-1:1;if(detailIndex>=0)moveCard(delta);else if(opened)movePage(delta);}});
 window.addEventListener('storage',e=>{if(e.key!==COLLECTION_KEY)return;try{prefs=new CollectionPreferences(localStorage);if(dialog.open&&opened)renderPage();if(detailIndex>=0)favoriteButton($('collection-favorite'),detailList[detailIndex].id);}catch(err){announce(err.message);}});
 $('collection-rulebook').onclick=e=>onRule(relatedChapter(detailList[detailIndex]),e.currentTarget);
 return {open,close};
}

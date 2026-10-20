import {CARDS} from './engine.mjs';
import {CHAPTERS,GLOSSARY,SOURCES,searchChapters,relatedChapter} from './rulebook-content.mjs';
import {TutorialSession,LearningProgress,LESSONS} from './tutorial.mjs';
import {cardMarkup,eggCardMarkup,escapeHTML as h} from './ui-presentation.mjs';
import {fitMainCardCopy} from './ui-art-loading.mjs';
const slots=['セカイ','メイン','こいびと','なかま①','なかま②','なかま③','準備①','準備②','準備③'];
const tags=text=>h(text).replace(/そだち|準備枠|チェーン|通常行動|ラウンド|応答|発動|解決|交際|対象|誘発/g,term=>`<button type="button" class="learn-term" data-learn-term="${term}">${term}</button>`);
const flow=parts=>`<ol class="learn-flow">${parts.map(x=>`<li>${h(x)}</li>`).join('')}</ol>`;
export function diagramMarkup(kind){
 if(kind==='board')return `<figure class="learn-diagram"><figcaption>あなたから見た3×3フィールド</figcaption><div class="learn-board">${slots.map((s,i)=>`<div class="learn-board-cell"><span>${s}</span>${i===1?eggCardMarkup():`<i aria-hidden="true">${['♧','', '♡','◇','◇','◇','▧','▧','▧'][i]}</i>`}</div>`).join('')}</div><p>手札（自分だけ） · 山札（順序は非公開） · 発動領域 · 捨て札（公開）</p></figure>`;
 const sequences={victory:['100へ到達','その後に始まる相手ターン','終了処理後まで100維持','R1〜R9なら早期勝利'],egg:['通常1ドロー','たまごなら追加1ドロー','手札1枚を山札の下へ'],birth:['手札のメイン','段階ぶんの時を払う','たまごに完全に重ねる'],growth:['かめ①','時2で かめ③','時1で ヒトデ①'],romance:['交際0','時1で1','別ターンに2','別ターンに3','別ターンに結婚 +10'],methods:['すぐつかう → 発動領域','みにつける → 準備枠','しかける → 準備枠（裏）'],challenge:['能力を選んで宣言','比較前に応答','同じ能力を比較','勝者 そだち+5'],chain:['B：コインを発動','A：じんとりを発動','双方連続パス','じんとり → コインの順に解決'],round:['Aのターン','Bのターン','次のラウンドへ']};
 return sequences[kind]?`<figure class="learn-diagram">${flow(sequences[kind])}</figure>`:'';
}
function sourceMarkup(text){return text.split(/\n\n+/).map(block=>{if(block.startsWith('#'))return `<h4>${h(block.replace(/^#+\s*/,''))}</h4>`;return `<p class="learn-source-paragraph">${h(block)}</p>`;}).join('');}
export function mountLearning({onOpen=()=>{},onClose=()=>{},onCollection=()=>{},onCpu=()=>{}}={}){
 const $=id=>document.getElementById(id);
 function modal(id,label){const d=document.createElement('dialog');d.id=id;d.className='learning-dialog';d.setAttribute('aria-label',label);document.body.append(d);return d;}
 const book=modal('rulebook-dialog','正式ルールブック'),practice=modal('tutorial-dialog','あそびかたを覚える'),card=modal('learning-card-dialog','練習カードの詳細'),term=modal('learning-term-dialog','用語の説明');
 book.innerHTML=`<header class="learn-header"><div><small>NAOTOCCHI · GUIDEBOOK</small><h2>ルールブック</h2></div><button id="rulebook-close" type="button">戻る ×</button></header><div class="learn-book-tools"><label>ルールを検索<input id="rulebook-search" type="search" placeholder="たんじょう、時、100、応答…"></label><button id="rulebook-toc" type="button">目次</button><button id="rulebook-collection" type="button">カードを探す</button></div><div id="rulebook-results" role="status" aria-live="polite"></div><div id="rulebook-body" class="learn-body"></div>`;
 practice.innerHTML=`<header class="learn-header"><div><small>NAOTOCCHI · FIRST STEPS</small><h2>あそびかたを覚える</h2></div><button id="tutorial-close" type="button">途中で終了 ×</button></header><div class="learn-practice-tools"><button id="tutorial-lessons" type="button">STEPを選ぶ</button><button id="tutorial-resume" type="button">続きから</button><button id="tutorial-restart" type="button">このSTEPを最初から</button><button id="tutorial-all-restart" type="button">STEP 1から</button><button id="tutorial-skip" type="button">このSTEPをスキップ</button></div><div id="tutorial-lesson-list" class="learn-body"></div><div id="tutorial-play" class="learn-body" hidden></div><p id="tutorial-storage" class="learn-small" role="status"></p>`;
 term.innerHTML='<div id="learning-term-copy" class="learn-body"></div><button id="learning-term-close" type="button">閉じる</button>';
 let storage;try{storage=localStorage;}catch{storage={getItem:()=>null,setItem:()=>{throw Error('storage unavailable');}};}
 const progress=new LearningProgress(storage);let t=null,resultMode=false,chapter=0,bookOrigin,practiceOrigin,cardAction=null,cardOrigin=null,paused=false;
 // Suspend learning dialogs while navigating; a return frame retains their exact content.
 const dialogs=[book,practice,card,term],navigation=[];
 function suspend(){return dialogs.filter(d=>d.open).map(d=>{const snapshot={d,scroll:d.scrollTop,body:d===book?$('rulebook-body').innerHTML:null,query:d===book?$('rulebook-search').value:null,chapter};d.close();return snapshot;});}
 function restoreFrame(frame){for(const s of frame.suspended){if(s.d===book){$('rulebook-body').innerHTML=s.body;$('rulebook-search').value=s.query;chapter=s.chapter;}s.d.showModal();s.d.scrollTop=s.scroll;}returnFocus(frame.origin);}
 function syncOpen(){document.body.classList.toggle('learning-open',dialogs.some(d=>d.open));}
 function show(d){onOpen();if(!d.open){const frame={d,origin:document.activeElement,suspended:suspend()};navigation.push(frame);d.showModal();}syncOpen();onOpen();}
 function close(d){if(!d.open)return;d.close();const frame=navigation.at(-1);if(frame?.d===d){navigation.pop();restoreFrame(frame);}syncOpen();onClose();}
 function closeAll(){navigation.length=0;for(const d of dialogs)if(d.open)d.close();syncOpen();onClose();}
 function collectionClosed(){const frame=navigation.at(-1);if(frame?.d==='collection'){navigation.pop();restoreFrame(frame);syncOpen();}}
 function saveProgress(patch){const ok=progress.save(patch);$('tutorial-storage').textContent=ok?'練習は通常対戦のセーブと別に保存しています。':'このブラウザでは練習の進み具合を保存できません。画面を閉じるまで練習できます。';}
 function returnFocus(origin){if(origin?.isConnected)origin.focus({preventScroll:true});}
 function closeBook(){close(book);}
 function closePractice(){close(card);close(practice);}
 $('rulebook-close').onclick=closeBook;$('tutorial-close').onclick=closePractice;
 book.addEventListener('cancel',e=>{e.preventDefault();closeBook();});practice.addEventListener('cancel',e=>{e.preventDefault();closePractice();});
 card.addEventListener('cancel',e=>{e.preventDefault();closeCard();});term.addEventListener('cancel',e=>{e.preventDefault();close(term);});
 $('learning-term-close').onclick=()=>close(term);
 for(const d of [book,practice,card,term])d.addEventListener('click',e=>{e.stopPropagation();if(e.detail>1)return;const b=e.target.closest('button');if(!b)return;
  if(b.dataset.learnTerm){$('learning-term-copy').innerHTML=`<h2>${h(b.dataset.learnTerm)}</h2><p>${h(GLOSSARY[b.dataset.learnTerm])}</p>`;show(term);$('learning-term-close').focus();}
 });
 function examples(ids=[]){return ids.length?`<div class="learn-examples" aria-label="実際のカード">${ids.map(id=>`<button type="button" data-learn-example="${h(id)}" aria-label="${h(CARDS[id].name)}の詳細">${cardMarkup(CARDS[id],{compact:true})}<span>${h(CARDS[id].name)}</span></button>`).join('')}</div><p class="learn-small">カードをタップして、効果全文と通常時コストを確認できます。</p>`:'';}
 function sourceSearch(query){
  if(!query.trim())return '';
  const q=query.normalize('NFKC').toLowerCase();
  const rows=SOURCES.map(s=>({s,lines:s.text.split(/\n\n+/).filter(p=>p.normalize('NFKC').toLowerCase().includes(q))})).filter(x=>x.lines.length);
  return `<details class="learn-sources"><summary>正式文書の一致箇所（${rows.reduce((n,x)=>n+x.lines.length,0)}件）</summary>${rows.map(({s,lines})=>`<h4>${h(s.text.split('\n')[0].replace(/^# /,''))}</h4>${lines.map(p=>`<p class="learn-source-paragraph">${h(p)}</p>`).join('')}`).join('')||'<p>一致する裁定はありません。</p>'}</details>`;
 }
 function toc(query=''){
  chapter=0;const chapters=searchChapters(query);$('rulebook-results').textContent=query?`「${query}」：${chapters.length}章が見つかりました。詳細な裁定は各章の正式文書から確認できます。`:'';
  $('rulebook-body').innerHTML=`${!query?'<section class="learn-book-cover"><span class="learn-emblem" aria-hidden="true">✧</span><small>はじめての一手から、細かな裁定まで</small><h3>人生をつくる、<br>小さなカードの世界。</h3><p>まず短く読んで、気になったところだけ詳しく。</p><button type="button" data-learn-start>カードを触って覚える →</button></section>':''}<nav class="learn-contents" aria-label="ルールブックの目次">${chapters.map(c=>`<button type="button" data-learn-chapter="${c.id}"><span>${String(c.id).padStart(2,'0')}</span><div><strong>${h(c.title)}</strong><small>${h(c.summary)}</small></div><b aria-hidden="true">›</b></button>`).join('')||'<p>一致するルールがありません。別の言葉で検索してください。</p>'}</nav>${sourceSearch(query)}`;
 }
 function renderChapter(id){
  const c=CHAPTERS.find(c=>c.id===id);if(!c)return;chapter=id;$('rulebook-results').textContent='';
  $('rulebook-body').innerHTML=`<article class="learn-chapter"><span class="learn-kicker">CHAPTER ${String(id).padStart(2,'0')} / 15</span><h3>${h(c.title)}</h3><p class="learn-lead">${tags(c.summary)}</p>${diagramMarkup(c.diagram)}${examples(c.cards)}<details class="learn-rulings"><summary>詳しいルールと大切な条件</summary>${c.details.map(d=>`<p>${tags(d)}</p>`).join('')}</details><details class="learn-glossary"><summary>用語を確認する</summary><div>${Object.keys(GLOSSARY).map(k=>`<button type="button" class="learn-term" data-learn-term="${h(k)}">${h(k)}</button>`).join('')}</div></details><details class="learn-sources"><summary>正式文書の全文・細かな裁定</summary><p>この試遊版の正本に基づく内容です。下の文書は画面内で全文を読めます。古いテストデッキの配分は構築制限ではありません。</p>${c.sources.map(p=>{const s=SOURCES.find(x=>x.path===p);return `<details><summary>${h(s.text.split('\n')[0].replace(/^# /,''))}</summary><div>${sourceMarkup(s.text)}</div></details>`;}).join('')}</details><nav class="learn-chapter-nav"><button type="button" data-learn-chapter="${Math.max(1,id-1)}" ${id===1?'disabled':''}>‹ 前の章</button><button type="button" data-learn-toc>目次へ</button><button type="button" data-learn-chapter="${Math.min(15,id+1)}" ${id===15?'disabled':''}>次の章 ›</button></nav></article>`;book.scrollTop=0;
 }
 function openBook(id=0,origin=document.activeElement){bookOrigin=origin;$('rulebook-search').value='';id?renderChapter(id):toc();show(book);$('rulebook-close').focus();}
 $('rulebook-toc').onclick=()=>{toc();book.scrollTop=0;};$('rulebook-search').oninput=e=>toc(e.target.value);$('rulebook-collection').onclick=()=>{navigation.push({d:'collection',origin:$('rulebook-collection'),suspended:suspend()});syncOpen();onCollection($('rulebook-collection'));};
 book.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||e.detail>1)return;if(b.dataset.learnChapter)renderChapter(Number(b.dataset.learnChapter));if(b.hasAttribute('data-learn-toc'))toc();if(b.dataset.learnExample)openCard(CARDS[b.dataset.learnExample],null,b);if(b.hasAttribute('data-learn-start'))openTutorial(b);});
 function openCard(c,action=null,origin=document.activeElement){
  cardOrigin=origin;cardAction=action?{id:action.id,revision:t.state.revision,epoch:t.epoch}:null;
  card.innerHTML=`<header class="learn-header"><h2>${h(c?.name??'たまご')}</h2><button id="learning-card-close" type="button">戻る ×</button></header><div class="learn-card-detail"><div class="learn-full-card">${c?cardMarkup(c,{detail:true}):eggCardMarkup({detail:true})}</div><div><h3>${h(c?.name??'通常たまご')}</h3><p>${c?`通常時コスト ${c.stage??c.cost}`:'メイン枠の最下層にある、デッキ外の状態表示カードです。'}</p><p>${h(c?.text??'通常ドロー後にさらに1枚引き、手札1枚を山札の下へ戻します。ちから・ちえはなく、ちょうせんを行うことも受けることもできません。')}</p>${action?`<p class="learn-hint">今回の操作：${h(action.label)}</p><button id="learning-card-confirm" class="learn-primary" type="button">${h(action.label)} →</button>`:'<p class="learn-small">確認だけなので、練習の状態は変わりません。</p>'}<button id="learning-card-rules" type="button">関連ルールを読む</button></div></div>`;
  $('learning-card-close').onclick=closeCard;$('learning-card-rules').onclick=()=>openBook(relatedChapter(c??{id:'special-egg'}),$('learning-card-rules'));if(action)$('learning-card-confirm').onclick=()=>{const a=cardAction;closeCard();if(a)perform(a);};show(card);fitMainCardCopy(card);$('learning-card-close').focus();
 }
 function closeCard(){if(!card.open)return;cardAction=null;close(card);}
 function lessonMenu(){resultMode=false;$('tutorial-play').hidden=true;$('tutorial-lesson-list').hidden=false;const n=progress.data.completed.length;
  $('tutorial-lesson-list').innerHTML=`<section class="learn-welcome"><span class="learn-kicker">9 STEPS · 自分のペースで</span><h3>カードを触って、<br>あそびかたを覚えよう。</h3><p>1つずつ短く練習。途中でやめても、通常対戦のセーブには影響しません。</p><p><strong>${n} / 9 STEPを練習済み</strong> · 好きなSTEPから始められます。</p></section><div class="learn-lesson-grid">${LESSONS.map((l,i)=>`<button type="button" data-learn-lesson="${i}"><span>STEP ${i+1}</span><strong>${h(l.title)}</strong><small>${progress.data.completed.includes(i)?'✓ 練習済み':'タップして練習 →'}</small></button>`).join('')}</div><button id="tutorial-cpu" class="learn-primary" type="button">CPU初級の対戦準備へ →</button><p class="learn-small">保存済みの対戦は保持します。対戦準備で「新しい対戦を開始」を選ぶまで開始しません。</p>`;
  $('tutorial-cpu').onclick=()=>{closeAll();onCpu();};
 }
 function startLesson(i,step=0){t=new TutorialSession(i,step);resultMode=false;paused=false;saveProgress({lesson:i,step:t.step,seen:true});renderPractice();}
 function openTutorial(origin=document.activeElement){practiceOrigin=origin;lessonMenu();show(practice);$('tutorial-close').focus();}
 $('tutorial-lessons').onclick=lessonMenu;$('tutorial-resume').onclick=()=>startLesson(progress.data.lesson,progress.data.step);
 $('tutorial-restart').onclick=()=>startLesson(t?.lesson??progress.data.lesson);$('tutorial-all-restart').onclick=()=>startLesson(0);
 $('tutorial-skip').onclick=()=>{if(t&&!t.done)saveProgress({lesson:Math.min(8,t.lesson+1),step:0});lessonMenu();};
 practice.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||e.detail>1)return;
  if(b.dataset.learnLesson!==undefined){startLesson(Number(b.dataset.learnLesson));return;}
  if(b.hasAttribute('data-learn-continue')){resultMode=false;renderPractice();return;}
  if(b.hasAttribute('data-learn-read')){t.next();saveCurrent();renderPractice();return;}
  if(b.hasAttribute('data-learn-action')){perform({id:t.expectedAction.id,revision:Number(b.dataset.revision),epoch:Number(b.dataset.epoch)});return;}
  if(b.dataset.learnCard){const v=resultMode?t.lastResult:t.projection;const cards=Object.values(v.players).flatMap(p=>[...(p.hand??[]),...p.discard,p.board.main,p.board.partner,p.board.world,...p.board.companions,...p.board.prepared]).filter(c=>c&&!c.hidden);const c=cards.find(c=>c.id===b.dataset.learnCard);if(!c){$('tutorial-hint').textContent='このカードの内容は非公開です。';return;}const a=resultMode?null:t.expectedAction;const eligible=a&&(a.source===c.id||a.value===c.id);if(!eligible&&!resultMode)$('tutorial-hint').textContent='カードの内容を確認できます。練習を進めるときは金色に光るカードを選んでください。';openCard(c,eligible?a:null,b);return;}
  if(b.hasAttribute('data-learn-egg')){openCard(null,null,b);return;}
  if(b.hasAttribute('data-learn-rules'))openBook(t.definition.chapter,b);
  if(b.dataset.learnZone){const v=resultMode?t.lastResult:t.projection;const p=v.players[b.dataset.seat];$('tutorial-hint').textContent=b.dataset.learnZone==='deck'?`山札：${p.deckCount}枚。順序と中身は非公開です。`:`公開捨て札：${p.discard.map(c=>c.name).join('、')||'ありません'}`;}
  if(b.hasAttribute('data-learn-unpause')){paused=false;renderPractice();}
 });
 function saveCurrent(){saveProgress({lesson:t.lesson,step:t.step,completed:t.done?[...new Set([...progress.data.completed,t.lesson])]:progress.data.completed,seen:true});}
 function perform(a){if(paused||resultMode||!t)return;try{if(!t.perform(a.id,a.revision,a.epoch)){return;};resultMode=true;saveCurrent();renderPractice();}catch(error){$('tutorial-hint').textContent='練習を安全に停止しました。「このSTEPを最初から」でやり直せます。';}}
 function practiceBoard(v,seat,expected){const p=v.players[seat],b=p.board,cs=[b.world,b.main,b.partner,...Array.from({length:3},(_,i)=>b.companions[i]),...Array.from({length:3},(_,i)=>b.prepared[i])];
  return `<section class="learn-side"><h4>${seat==='A'?'あなた A':'練習相手 B'} <span>そだち ${p.growth} · 時 ${p.time}</span></h4><div class="learn-board">${cs.map((c,i)=>`<div class="learn-board-cell"><span>${slots[i]}</span>${c?c.hidden?`<div class="learn-card-back">${cardMarkup(null,{compact:true})}<small>しかけたカード</small></div>`:`<button type="button" data-learn-card="${h(c.id)}" aria-label="${h(c.name)}の詳細">${cardMarkup(c,{compact:true})}</button>`:i===1?`<button type="button" data-learn-egg aria-label="たまごの説明">${eggCardMarkup()}</button>`:'<i aria-hidden="true">·</i>'}</div>`).join('')}</div><div class="learn-zone-bar"><button type="button" data-learn-zone="deck" data-seat="${seat}">山札 ${p.deckCount}</button><span>手札 ${p.handCount}</span><button type="button" data-learn-zone="discard" data-seat="${seat}">捨て札 ${p.discard.length}</button><span>交際 ${p.relationship===4?'結婚':p.relationship??'なし'}</span></div></section>`;
 }
 function renderPractice(){
  $('tutorial-lesson-list').hidden=true;$('tutorial-play').hidden=false;
  if(paused){$('tutorial-play').innerHTML='<section class="learn-welcome"><h3>練習を一時停止しました</h3><p>元の対戦の手札は隠されています。</p><button type="button" data-learn-unpause>練習を再開する</button></section>';return;}
  const l=t.definition,v=resultMode?t.lastResult:t.projection,a=resultMode?null:t.expectedAction,done=t.done&&!resultMode;
  const focusId=a?.source??a?.value;
  $('tutorial-play').innerHTML=`<div id="tutorial-progress" class="learn-kicker">STEP ${t.lesson+1} / 9 · ${h(l.title)} · ${Math.min(t.step+1,l.steps.length)} / ${l.steps.length}</div><progress value="${t.lesson+(t.done?1:t.step/l.steps.length)}" max="9" aria-label="練習の進行"></progress>
  <section class="learn-instruction"><h3>${done?'このSTEPの練習ができました':resultMode?'操作の結果を見てみよう':h(t.current.title)}</h3><p>${done?h(t.outcome):resultMode?`そだち A ${v.players.A.growth} / B ${v.players.B.growth} · 時 A ${v.players.A.time} / B ${v.players.B.time}${v.result?` · ${v.result.winner?v.result.winner+'の勝利':'引き分け'}（${h(v.result.reason)}）`:''}`:tags(t.current.copy)}</p>${resultMode?'<button type="button" class="learn-primary" data-learn-continue>確認して次へ →</button>':done?`<div id="tutorial-finish"><button type="button" class="learn-primary" data-learn-lesson="${Math.min(8,t.lesson+1)}">${t.lesson<8?'次のSTEPへ →':'STEP 9をもう一度'}</button><p>STEPを選ぶ画面からCPU初級へ進めます。</p></div>`:a&&!focusId?`<button type="button" class="learn-primary" data-learn-action data-revision="${t.state.revision}" data-epoch="${t.epoch}">${h(a.kind==='pass'?(v.phase==='normal'?'ターン終了を申し出る':v.actor==='B'?'相手もパスするのを確認':'応答しない'):a.label)} →</button>`:!a?'<button type="button" class="learn-primary" data-learn-read>確認して次へ →</button>':'<p class="learn-small">↓ 金色のカードをタップ → 詳細で操作を確認</p>'}<button type="button" data-learn-rules>このSTEPのルール</button></section>
  <p id="tutorial-hint" role="status" aria-live="polite">練習用の固定局面です。間違えてもペナルティはありません。</p>
  <div class="learn-match-meta">R${v.round} / 10 · ${v.turn}のターン · ${v.phase==='normal'?'通常行動':v.phase==='finished'?'対戦終了':v.phase==='choice'?'必須選択':'応答・効果処理'}</div>
  ${v.chain.length?`<section class="learn-chain"><h4>発動領域 · 上から解決</h4><ol>${[...v.chain].reverse().map(c=>`<li>${h(c.actor+'：'+c.name)}</li>`).join('')}</ol></section>`:''}
  <section class="learn-hand"><h4>あなたの手札 <span>カードをタップで詳細</span></h4><div>${(v.players.A.hand??[]).map(c=>`<button type="button" data-learn-card="${h(c.id)}" class="${focusId===c.id?'learn-next-card':''}" aria-label="${h(c.name)}${focusId===c.id?'・次に選ぶカード':''}">${cardMarkup(c,{compact:true})}<span>${h(c.name)}</span>${focusId===c.id?'<strong>これをタップ</strong>':''}</button>`).join('')||'<p>今の手札はありません。</p>'}</div></section>
  <div class="learn-table"><details class="learn-opponent" ${t.lesson===6||t.lesson===7?'open':''}><summary>相手のフィールドを見る（そだち ${v.players.B.growth} · 時 ${v.players.B.time}）</summary>${practiceBoard(v,'B',a)}</details>${practiceBoard(v,'A',a)}</div>
  <details class="learn-log" ${resultMode?'open':''}><summary>練習の結果・処理履歴</summary><ol>${v.log.map(x=>`<li>${h(x)}</li>`).join('')||'<li>この固定局面から練習を始めます。</li>'}</ol></details>`;
  practice.scrollTop=0;
 }
 function privacyPause(){if(practice.open&&t&&!$('tutorial-play').hidden){paused=true;closeCard();renderPractice();}}
 window.addEventListener('blur',privacyPause);document.addEventListener('visibilitychange',()=>{if(document.hidden)privacyPause();});
 // First-use invitation is optional and uses only its own progress key.
 const invitation=$('learning-invitation');if(invitation){invitation.hidden=progress.data.seen||progress.data.completed.length===9;$('learning-play-now').onclick=()=>{saveProgress({seen:true});invitation.hidden=true;$('new')?.scrollIntoView?.({block:'center'});};}
 return {openBook,openTutorial,collectionClosed,isOpen:()=>[book,practice,card,term].some(d=>d.open)};
}

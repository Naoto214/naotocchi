import {CARDS} from './engine.mjs';
import {CHAPTERS,GLOSSARY,searchChapters,relatedChapter,rulingsForChapter,searchRules} from './rulebook-content.mjs';
import {TutorialSession,LearningProgress,LESSONS} from './tutorial.mjs';
import {cardMarkup,eggCardMarkup,gameMarkup,detailMarkup,workflowMarkup,eggDetailMarkup,cardActions,zoneMarkup,escapeHTML as h} from './ui-presentation.mjs';
import {fitMainCardCopy} from './ui-art-loading.mjs';
import {ActionInputGuard} from './ui-render.mjs';
const slots=['セカイ','メイン','こいびと','なかま①','なかま②','なかま③','準備①','準備②','準備③'];
const tags=text=>h(text).replace(/そだち|準備枠|チェーン|通常行動|ラウンド|応答|発動|解決|交際|対象|誘発/g,term=>`<button type="button" class="learn-term" data-learn-term="${term}">${term}</button>`);
const flow=parts=>`<ol class="learn-flow">${parts.map(x=>`<li>${h(x)}</li>`).join('')}</ol>`;
export function diagramMarkup(kind){
 if(kind==='board')return `<figure class="learn-diagram"><figcaption>あなたから見た3×3フィールド</figcaption><div class="learn-board">${slots.map((s,i)=>`<div class="learn-board-cell"><span>${s}</span>${i===1?eggCardMarkup():`<i aria-hidden="true">${['♧','', '♡','◇','◇','◇','▧','▧','▧'][i]}</i>`}</div>`).join('')}</div><p>手札（自分だけ） · 山札（順序は非公開） · 発動領域 · 捨て札（公開）</p></figure>`;
 const sequences={victory:['100へ到達','その後に始まる相手ターン','終了処理後まで100維持','R1〜R9なら早期勝利'],egg:['通常1ドロー','たまごなら追加1ドロー','手札1枚を山札の下へ'],birth:['手札のメイン','段階ぶんの時を払う','たまごに完全に重ねる'],growth:['かめ①','時2で かめ③','時1で ヒトデ①'],romance:['交際0','時1で1','別ターンに2','別ターンに3','別ターンに結婚 +10'],methods:['すぐつかう → 発動領域','みにつける → 準備枠','しかける → 準備枠（裏）'],challenge:['能力を選んで宣言','比較前に応答','同じ能力を比較','勝者 そだち+5'],chain:['B：コインを発動','A：じんとりを発動','双方連続パス','じんとり → コインの順に解決'],round:['Aのターン','Bのターン','次のラウンドへ']};
 return sequences[kind]?`<figure class="learn-diagram">${flow(sequences[kind])}</figure>`:'';
}
// Render the curated normative text, including tables, without executable Markdown.
function ruleText(text){
 const inline=x=>tags(x.replace(/\*\*/g,'').replace(/`([^`]+)`/g,'$1'));
 return text.split(/\n\n+/).map(block=>{
  const lines=block.trim().split('\n');
  if(lines.every(x=>x.trim().startsWith('|'))){const rows=lines.filter(x=>!/^\|[\s:|\-]+\|$/.test(x));return '<table class="learn-rule-table"><tbody>'+rows.map((row,i)=>'<tr>'+row.split('|').slice(1,-1).map(cell=>`<${i?'td':'th'}>${inline(cell.trim())}</${i?'td':'th'}>`).join('')+'</tr>').join('')+'</tbody></table>';}
  if(lines.every(x=>/^[-*] /.test(x)))return '<ul>'+lines.map(x=>'<li>'+inline(x.slice(2))+'</li>').join('')+'</ul>';
  return '<p>'+inline(block).replace(/\n/g,'<br>')+'</p>';
 }).join('');
}
function practiceMarkup(html){
 return html.replace(/id="(hand|operation-panel|result)"/g,'id="tutorial-$1"')
 .replace(/data-(inspect|browse)=/g,'data-learn-card=').replace(/data-egg-detail=/g,'data-learn-egg=')
 .replace(/data-action=/g,'data-learn-command=').replace(/data-zone=/g,'data-learn-zone=')
 .replace(/data-close(?=[ >])/g,'data-learn-close').replace(/data-related-rule=/g,'data-learn-related=')
 .replace(/data-(workflow|result-history)(?=[ >])/g,'data-learn-workflow')
 .replace(/data-menu(?=[ >])/g,'data-learn-tools').replace(/data-home(?=[ >])/g,'data-learn-cpu')
 .replace(/data-hand-toggle(?=[ >])/g,'data-learn-hand-toggle')
 .replace(/<button[^>]*data-reorder[^>]*>[\s\S]*?<\/button>/g,'').replace('<small>長押しで並び替え</small>','')
 .replace(/<button[^>]*data-result-reopen[^>]*>[\s\S]*?<\/button>/g,'')
 .replace('aria-label="保存・受け渡しメニュー"','aria-label="STEP選択・再開・やり直し"');
}
export function mountLearning({onOpen=()=>{},onClose=()=>{},onCollection=()=>{},onCpu=()=>{}}={}){
 const $=id=>document.getElementById(id);
 function modal(id,label){const d=document.createElement('dialog');d.id=id;d.className='learning-dialog';d.setAttribute('aria-label',label);document.body.append(d);return d;}
 const book=modal('rulebook-dialog','正式ルールブック'),practice=modal('tutorial-dialog','あそびかたを覚える'),card=modal('learning-card-dialog','練習カードの詳細'),term=modal('learning-term-dialog','用語の説明');
 card.classList.add('card-detail');
 book.innerHTML=`<header class="learn-header"><div><small>NAOTOCCHI · GUIDEBOOK</small><h2>ルールブック</h2></div><button id="rulebook-close" type="button">戻る ×</button></header><div class="learn-book-tools"><label>ルールを検索<input id="rulebook-search" type="search" placeholder="たんじょう、時、100、応答…"></label><label class="learn-search-scope">範囲<select id="rulebook-scope"><option value="all">全15章</option><option value="chapter" disabled>この章</option></select></label><button id="rulebook-toc" type="button">目次</button><button id="rulebook-collection" type="button">カードを探す</button></div><div id="rulebook-results" role="status" aria-live="polite"></div><div id="rulebook-body" class="learn-body"></div>`;
 practice.innerHTML=`<header class="learn-header"><div><small>NAOTOCCHI · FIRST STEPS</small><h2>あそびかたを覚える</h2></div><button id="tutorial-close" type="button">途中で終了 ×</button></header><details id="tutorial-tools"><summary>STEP選択・再開・やり直し</summary><div class="learn-practice-tools"><button id="tutorial-lessons" type="button">STEPを選ぶ</button><button id="tutorial-resume" type="button">続きから</button><button id="tutorial-restart" type="button">このSTEPを最初から</button><button id="tutorial-all-restart" type="button">STEP 1から</button><button id="tutorial-skip" type="button">このSTEPをスキップ</button></div></details><div id="tutorial-lesson-list" class="learn-body"></div><div id="tutorial-play" class="learn-body" hidden></div><p id="tutorial-storage" class="learn-small" role="status"></p>`;
 term.innerHTML='<div id="learning-term-copy" class="learn-body"></div><button id="learning-term-close" type="button">閉じる</button>';
 let storage;try{storage=localStorage;}catch{storage={getItem:()=>null,setItem:()=>{throw Error('storage unavailable');}};}
 const progress=new LearningProgress(storage);let t=null,resultMode=false,chapter=0,bookOrigin,practiceOrigin,cardAction=null,cardOrigin=null,paused=false,scopeChapter=0,cpuTimer=null;
 const commandGuard=new ActionInputGuard(()=>({session:t,revision:t?.epoch,viewer:paused?null:'A'}));
 const cancelCpu=()=>{if(cpuTimer!==null)clearTimeout(cpuTimer);cpuTimer=null;};
 function stampCommands(){commandGuard.invalidate();commandGuard.stamp(document.querySelectorAll('#tutorial-dialog [data-learn-command],#learning-card-dialog [data-learn-command]'));}
 for(const d of [practice,card]){d.addEventListener('pointerdown',e=>commandGuard.begin(e.target.closest('[data-learn-command]')),true);d.addEventListener('pointercancel',()=>commandGuard.cancel(),true);d.addEventListener('click',e=>{const n=e.target.closest('[data-learn-command]');if(n&&!commandGuard.accept(n,e)){e.preventDefault();e.stopImmediatePropagation();}},true);}
 // Suspend learning dialogs while navigating; a return frame retains their exact content.
 const dialogs=[book,practice,card,term],navigation=[];
 function suspend(){cancelCpu();return dialogs.filter(d=>d.open).map(d=>{const snapshot={d,scroll:d.scrollTop,body:d===book?$('rulebook-body').innerHTML:null,query:d===book?$('rulebook-search').value:null,chapter,scopeChapter,scope:$('rulebook-scope').value};d.close();return snapshot;});}
 function restoreFrame(frame){for(const s of frame.suspended){if(s.d===book){$('rulebook-body').innerHTML=s.body;$('rulebook-search').value=s.query;chapter=s.chapter;scopeChapter=s.scopeChapter;$('rulebook-scope').value=s.scope;}s.d.showModal();s.d.scrollTop=s.scroll;}returnFocus(frame.origin);}
 function syncOpen(){document.body.classList.toggle('learning-open',dialogs.some(d=>d.open));}
 function show(d){cancelCpu();onOpen();if(!d.open){const frame={d,origin:document.activeElement,suspended:suspend()};navigation.push(frame);d.showModal();}syncOpen();onOpen();stampCommands();scheduleCpu();}
 function close(d){cancelCpu();if(!d.open)return;d.close();const frame=navigation.at(-1);if(frame?.d===d){navigation.pop();restoreFrame(frame);}syncOpen();onClose();stampCommands();scheduleCpu();}
 function closeAll(){cancelCpu();navigation.length=0;for(const d of dialogs)if(d.open)d.close();syncOpen();onClose();stampCommands();scheduleCpu();}
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
 function toc(query=''){
  const scoped=$('rulebook-scope').value==='chapter'?scopeChapter:0;
  const chapters=searchChapters(query).filter(c=>!scoped||c.id===scoped),hits=query.trim()?searchRules(query,scoped):[];
  $('rulebook-results').textContent=query?`「${query}」：${chapters.length}章・詳細裁定 ${hits.length}件。基本説明と詳しいルールの両方を検索しています。`:'';
  $('rulebook-body').innerHTML=`${!query?'<section class="learn-book-cover"><span class="learn-emblem" aria-hidden="true">✧</span><small>はじめての一手から、細かな裁定まで</small><h3>人生をつくる、<br>小さなカードの世界。</h3><p>まず基本を読んで、詳しい条件は各章の裁定へ。</p><button type="button" data-learn-start>CPUとあそびながら覚える →</button></section>':''}<nav class="learn-contents" aria-label="ルールブックの目次">${chapters.map(c=>`<button type="button" data-learn-chapter="${c.id}"><span>${String(c.id).padStart(2,'0')}</span><div><strong>${h(c.title)}</strong><small>${h(c.summary)}</small></div><b aria-hidden="true">›</b></button>`).join('')||'<p>一致するルールがありません。別の言葉で検索してください。</p>'}</nav>${hits.length?`<section class="learn-search-hits"><h3>詳しいルール・裁定の検索結果</h3>${hits.map(r=>`<article><button type="button" data-learn-ruling="${h(r.id)}" data-chapter="${r.chapter}">第${r.chapter}章 · ${h(r.title)}</button>${ruleText(r.text)}</article>`).join('')}</section>`:''}`;
 }
 function renderChapter(id,rulingId=null){
  const c=CHAPTERS.find(c=>c.id===id);if(!c)return;chapter=id;scopeChapter=id;$('rulebook-results').textContent='';
  const option=$('rulebook-scope').querySelector('[value="chapter"]');option.disabled=false;option.textContent=`第${id}章だけ`;
  const rulings=rulingsForChapter(id);
  $('rulebook-body').innerHTML=`<article class="learn-chapter"><span class="learn-kicker">CHAPTER ${String(id).padStart(2,'0')} / 15</span><h3>${h(c.title)}</h3><div class="learn-view-switch" role="group" aria-label="説明の詳しさ"><button type="button" data-learn-view="basic" aria-pressed="${!rulingId}">基本説明</button><button type="button" data-learn-view="detail" aria-pressed="${!!rulingId}">詳しいルール・裁定 (${rulings.length})</button></div><div id="rulebook-basic" ${rulingId?'hidden':''}><p class="learn-lead">${tags(c.summary)}</p>${diagramMarkup(c.diagram)}${examples(c.cards)}<div class="learn-rulings">${c.details.map(d=>`<p>${tags(d)}</p>`).join('')}</div><button type="button" data-learn-view="detail">条件・例外・処理順序を詳しく読む →</button></div><div id="rulebook-detail" class="learn-sources" ${rulingId?'':'hidden'}><p class="learn-small">この章に対応する正式な条件・例外・処理順序です。</p>${rulings.map(r=>`<section id="ruling-${h(r.id)}" data-rule-source="${h(r.source.path)}" data-rule-heading="${h(r.source.heading)}"><h4>${h(r.title)}</h4>${ruleText(r.text)}</section>`).join('')}</div><details class="learn-glossary"><summary>用語を確認する</summary><div>${Object.keys(GLOSSARY).map(k=>`<button type="button" class="learn-term" data-learn-term="${h(k)}">${h(k)}</button>`).join('')}</div></details><nav class="learn-chapter-nav"><button type="button" data-learn-chapter="${Math.max(1,id-1)}" ${id===1?'disabled':''}>‹ 前の章</button><button type="button" data-learn-toc>目次へ</button><button type="button" data-learn-chapter="${Math.min(15,id+1)}" ${id===15?'disabled':''}>次の章 ›</button></nav></article>`;
  book.scrollTop=0;if(rulingId)document.getElementById('ruling-'+rulingId)?.scrollIntoView?.({block:'start'});
 }
 function switchView(kind){$('rulebook-basic').hidden=kind!=='basic';$('rulebook-detail').hidden=kind!=='detail';book.querySelectorAll('.learn-view-switch button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.learnView===kind)));}
 function openBook(id=0,origin=document.activeElement){bookOrigin=origin;$('rulebook-search').value='';$('rulebook-scope').value='all';id?renderChapter(id):toc();show(book);$('rulebook-close').focus();}
 $('rulebook-toc').onclick=()=>{$('rulebook-search').value='';$('rulebook-scope').value='all';toc();book.scrollTop=0;};
 $('rulebook-search').oninput=e=>toc(e.target.value);$('rulebook-scope').onchange=()=>toc($('rulebook-search').value);
 $('rulebook-collection').onclick=()=>{navigation.push({d:'collection',origin:$('rulebook-collection'),suspended:suspend()});syncOpen();onCollection($('rulebook-collection'));};
 book.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||e.detail>1)return;
  if(b.dataset.learnChapter)renderChapter(Number(b.dataset.learnChapter));if(b.hasAttribute('data-learn-toc'))$('rulebook-toc').click();
  if(b.dataset.learnView)switchView(b.dataset.learnView);if(b.dataset.learnRuling)renderChapter(Number(b.dataset.chapter),b.dataset.learnRuling);
  if(b.dataset.learnExample)openCard(CARDS[b.dataset.learnExample],null,b);if(b.hasAttribute('data-learn-start'))openTutorial(b);
 });
 function openCard(c,action=null,origin=document.activeElement){
  cardOrigin=origin;cardAction=action?{id:action.id,revision:t.state.revision,epoch:t.epoch}:null;
  const v=practice.open?practiceView():null;
  card.innerHTML=practiceMarkup(c?detailMarkup(c,{v,viewer:'A',catalog:!v,readOnly:Boolean(v&&!action)}):eggDetailMarkup());
  card.querySelector('[data-learn-close]').id='learning-card-close';
  if(!action&&v)card.querySelector('.detail-copy')?.insertAdjacentHTML('beforeend','<p class="learn-small">確認だけです。練習を進めるには金色の枠を選んでください。</p>');
  const help=card.querySelector('[data-learn-related]');if(help)help.id='learning-card-rules';
  const command=card.querySelector('[data-learn-command]');if(command){command.id='learning-card-confirm';command.dataset.revision=t.state.revision;command.dataset.epoch=t.epoch;}
  $('learning-card-close').onclick=closeCard;show(card);fitMainCardCopy(card);$('learning-card-close').focus();
 }
 function closeCard(){if(!card.open)return;cardAction=null;close(card);}
 card.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||e.detail>1)return;
  if(b.hasAttribute('data-learn-close'))closeCard();
  if(b.dataset.learnRelated)openBook(Number(b.dataset.learnRelated),b);
  if(b.dataset.learnCommand){const ticket={id:b.dataset.learnCommand,revision:Number(b.dataset.revision),epoch:Number(b.dataset.epoch)};closeCard();perform(ticket);}
 });
 function lessonMenu(){cancelCpu();resultMode=false;$('tutorial-tools').open=false;$('tutorial-play').hidden=true;$('tutorial-lesson-list').hidden=false;const n=progress.data.completed.length;
  $('tutorial-lesson-list').innerHTML=`<section class="learn-welcome"><span class="learn-kicker">9 STEPS · 自分のペースで</span><h3>カードを触って、<br>あそびかたを覚えよう。</h3><p>CPUと同じ盤面で、1操作ずつ覚えましょう。練習用の局面は通常対戦のセーブに影響しません。</p><p><strong>${n} / 9 STEPを練習済み</strong> · 好きなSTEPから始められます。</p></section><div class="learn-lesson-grid">${LESSONS.map((l,i)=>`<button type="button" data-learn-lesson="${i}"><span>STEP ${i+1}</span><strong>${h(l.title)}</strong><small>${progress.data.completed.includes(i)?'✓ 練習済み':'タップして練習 →'}</small></button>`).join('')}</div><button id="tutorial-cpu" class="learn-primary" type="button">CPU初級の対戦準備へ →</button><p class="learn-small">保存済みの対戦は保持します。対戦準備で「新しい対戦を開始」を選ぶまで開始しません。</p>`;
  $('tutorial-cpu').onclick=()=>{closeAll();onCpu();};
 }
 function startLesson(i,step=0){cancelCpu();$('tutorial-tools').open=false;t=new TutorialSession(i,step);resultMode=false;paused=false;saveProgress({lesson:i,step:t.step,seen:true});renderPractice();}
 function openTutorial(origin=document.activeElement){practiceOrigin=origin;lessonMenu();show(practice);$('tutorial-close').focus();}
 $('tutorial-lessons').onclick=lessonMenu;$('tutorial-resume').onclick=()=>startLesson(progress.data.lesson,progress.data.step);
 $('tutorial-restart').onclick=()=>startLesson(t?.lesson??progress.data.lesson);$('tutorial-all-restart').onclick=()=>startLesson(0);
 $('tutorial-skip').onclick=()=>{if(t&&!t.done)saveProgress({lesson:Math.min(8,t.lesson+1),step:0});lessonMenu();};
 function practiceView(){
  const raw=resultMode?t.lastResult:t.projection,a=resultMode||t.done||t.isCpu?null:t.expectedAction;
  return {...raw,actions:a?raw.actions.filter(x=>x.id===a.id):[],cpuThinking:!resultMode&&t.isCpu};
 }
 practice.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||e.detail>1)return;
  if(b.dataset.learnLesson!==undefined){startLesson(Number(b.dataset.learnLesson));return;}
  if(b.hasAttribute('data-learn-continue')){resultMode=false;renderPractice();return;}
  if(b.dataset.learnCommand){perform({id:b.dataset.learnCommand,revision:Number(b.dataset.revision),epoch:Number(b.dataset.epoch)});return;}
  if(b.dataset.learnCard){const v=practiceView(),cards=Object.values(v.players).flatMap(p=>[...(p.hand??[]),...p.discard,p.board.main,p.board.partner,p.board.world,...p.board.companions,...p.board.prepared]).filter(c=>c&&!c.hidden),c=cards.find(c=>c.id===b.dataset.learnCard);if(!c){$('tutorial-hint').textContent='相手の伏せ札は非公開です。';return;}const a=cardActions(v,'A',c)[0];openCard(c,a??null,b);return;}
  if(b.hasAttribute('data-learn-egg')){openCard(null,null,b);return;}
  if(b.hasAttribute('data-learn-rules')){openBook(t.definition.chapter,b);return;}
  if(b.hasAttribute('data-learn-cpu')){closeAll();onCpu();return;}
  if(b.hasAttribute('data-learn-tools')){$('tutorial-tools').open=true;$('tutorial-tools').scrollIntoView?.({block:'start'});return;}
  if(b.hasAttribute('data-learn-workflow')){card.innerHTML=practiceMarkup(workflowMarkup(practiceView(),'A'))+`<section class="learn-log"><h3>練習の処理履歴</h3><ol>${practiceView().log.map(x=>`<li>${h(x)}</li>`).join('')}</ol></section>`;card.querySelectorAll('[data-learn-command]').forEach(n=>{n.dataset.revision=t.state.revision;n.dataset.epoch=t.epoch;});show(card);return;}
  if(b.hasAttribute('data-learn-hand-toggle')){const panel=$('tutorial-hand'),collapsed=panel.classList.toggle('hand-collapsed');b.setAttribute('aria-expanded',String(!collapsed));return;}
  if(b.dataset.learnZone){const v=practiceView(),p=v.players[b.dataset.seat];$('tutorial-hint').textContent=b.dataset.learnZone==='deck'?`山札：${p.deckCount}枚。順序と中身は非公開です。`:b.dataset.learnZone==='activation'?`発動領域：${v.chain.filter(c=>c.actor===b.dataset.seat).map(c=>c.name).join('、')||'ありません'}`:`捨て札：${p.discard.map(c=>c.name).join('、')||'ありません'}`;return;}
  if(b.hasAttribute('data-learn-unpause')){paused=false;renderPractice();}
 });
 function saveCurrent(){saveProgress({lesson:t.lesson,step:t.step,completed:t.done?[...new Set([...progress.data.completed,t.lesson])]:progress.data.completed,seen:true});}
 function perform(a){if(paused||resultMode||!t||t.isCpu)return;try{if(!t.perform(a.id,a.revision,a.epoch))return;afterCommand();}catch(error){stopPractice(error);}}
 function afterCommand(){resultMode=Boolean(!t.done&&t.current?.setup);saveCurrent();renderPractice();}
 function stopPractice(error){cancelCpu();paused=true;$('tutorial-hint').textContent='練習を停止しました。「このSTEPを最初から」で再開できます。';console.error('Tutorial stopped:',error);}
 function scheduleCpu(){
  cancelCpu();if(!practice.open||card.open||book.open||term.open||paused||resultMode||!t?.isCpu||$('tutorial-play').hidden||document.hidden)return;
  const active=t,revision=t.state.revision,epoch=t.epoch;
  cpuTimer=setTimeout(()=>{cpuTimer=null;if(t!==active||!practice.open||paused||resultMode||document.hidden)return;try{if(t.advanceCpu(revision,epoch))afterCommand();}catch(error){stopPractice(error);}},800);
 }
 function renderPractice(){
  cancelCpu();$('tutorial-lesson-list').hidden=true;$('tutorial-play').hidden=false;
  if(paused){$('tutorial-play').innerHTML='<section class="learn-welcome"><h3>練習を一時停止しました</h3><button type="button" data-learn-unpause>練習を再開する</button></section>';stampCommands();return;}
  const l=t.definition,v=practiceView(),a=resultMode||t.done||t.isCpu?null:t.expectedAction,done=t.done&&!resultMode;
  const result=t.lastAction?`${t.lastAction.actor==='A'?'あなた':'CPU'}：${t.lastAction.label}`:'';
  $('tutorial-play').innerHTML=`<div class="learn-coach"><div id="tutorial-progress" class="learn-kicker">STEP ${t.lesson+1} / 9 · ${h(l.title)} · ${Math.min(t.step+1,l.steps.length)} / ${l.steps.length}</div><progress value="${t.lesson+(t.done?1:t.step/l.steps.length)}" max="9" aria-label="練習の進行"></progress>
  <section class="learn-instruction"><div><h3>${done?'このSTEPをクリア！':resultMode?'ここまでの結果':h(t.current.title)}</h3><p>${done?h(t.outcome):resultMode?'配置・時・そだちを確認したら、次の練習局面へ進みましょう。':h(t.current.copy)}</p></div><button type="button" data-learn-rules>ルールを見る</button></section>
  ${result?`<p class="learn-last-result" role="status">✓ ${h(result)}</p>`:''}
  ${t.isCpu&&!resultMode?'<p class="learn-cpu-status" role="status">CPUが操作しています…</p>':''}
  ${resultMode?'<button type="button" class="learn-primary" data-learn-continue>次の練習局面へ →</button>':''}
  ${done?`<div id="tutorial-finish"><button type="button" class="learn-primary" ${t.lesson<8?`data-learn-lesson="${t.lesson+1}"`:'data-learn-cpu'}>${t.lesson<8?'次のSTEPへ →':'CPU初級であそぶ →'}</button></div>`:''}
  <p id="tutorial-hint" role="status" aria-live="polite">${a?'金色の枠が次の操作です。ほかのカードは確認だけできます。':'練習用の固定局面 · 通常対戦のセーブは変わりません。'}</p>
  </div><div id="tutorial-match" class="tutorial-match">${practiceMarkup(gameMarkup(v,'A'))}</div>`;
  $('tutorial-match').querySelectorAll('[data-learn-card]').forEach(n=>{
   const id=n.dataset.learnCard,p=v.players.A,b=p.board,focus=a&&(a.source===id||a.value===id||a.kind==='relationship'&&b.partner?.id===id||a.kind==='challenge'&&b.main?.id===id);
   if(focus){n.classList.add('learn-next-card');n.setAttribute('aria-label',n.getAttribute('aria-label')+'・次にタップ');}
  });
  $('tutorial-match').querySelectorAll('[data-learn-command]').forEach(n=>{n.dataset.revision=t.state.revision;n.dataset.epoch=t.epoch;n.classList.add('learn-next-command');});
  $('tutorial-play').scrollTop=0;stampCommands();scheduleCpu();
 }
 function privacyPause(){cancelCpu();if(practice.open&&t&&!$('tutorial-play').hidden){paused=true;closeCard();renderPractice();}}
 window.addEventListener('blur',privacyPause);document.addEventListener('visibilitychange',()=>{if(document.hidden)privacyPause();});
 // First-use invitation is optional and uses only its own progress key.
 const invitation=$('learning-invitation');if(invitation){invitation.hidden=progress.data.seen||progress.data.completed.length===9;$('learning-play-now').onclick=()=>{saveProgress({seen:true});invitation.hidden=true;$('new')?.scrollIntoView?.({block:'center'});};}
 return {openBook,openTutorial,collectionClosed,isOpen:()=>[book,practice,card,term].some(d=>d.open)};
}

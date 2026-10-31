// CARD GAME のもどる導線。リポジトリ直下を配信した静的サーバーに対して実行する。
// カードゲームトップ（対戦の準備を含む同じページ）の「なおとっちへもどる」だけが出ること、☰ 対戦メニューの3つの操作
// （対戦をつづける／カードゲームトップへもどる／なおとっちへもどる）、保存と再開、保存失敗時の警告、
// ボタンの文字が折り返さず縮みすぎていないことを、
// CPU対戦・2人対戦の両方、iPhone 縦横の大きさで確かめる。対戦終了後の移動は browser.cjs の最後で確かめる。
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict');
const BASE=process.env.RELEASE_BASE_URL||'http://127.0.0.1:8765/';
// CARD_URL / HOME_URL で試遊版（仮のメイン画面 home.html）にも同じ確認を流せる。
const GAME=process.env.CARD_URL||BASE+'prototypes/card-game/',HOME=process.env.HOME_URL||new URL(BASE).href;
const KEYS=['naotocchi-cpu-match-v1','naotocchi-hotseat-v1'];
const inView=async(p,sel)=>{await p.locator(sel).scrollIntoViewIfNeeded();const r=await p.locator(sel).boundingBox(),v=p.viewportSize();assert.ok(r,`${sel} が表示されていません`);assert.ok(r.height>=44,`${sel} の高さ ${r.height}`);assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=v.width+0.5&&r.y+r.height<=v.height+0.5,`${sel} が画面外 ${JSON.stringify(r)} ${JSON.stringify(v)}`);};
// ボタンの文字が1行に収まり（不自然な折り返しなし）、14px以上の大きさであること。
// 「閉じる ×」は全ダイアログ共通の既存の大きさ（12px）なので、行数だけを見る。
const oneLine=async(p,sel,minFont=14)=>{for(const r of await p.locator(sel).evaluateAll(ns=>ns.filter(n=>n.offsetParent).map(n=>{const g=document.createRange();g.selectNodeContents(n);const tops=new Set([...g.getClientRects()].filter(x=>x.width>0).map(x=>Math.round(x.top)));return {text:n.innerText,lines:tops.size,font:parseFloat(getComputedStyle(n).fontSize)};})))assert.ok(r.lines===1&&r.font>=minFont,`${sel}「${r.text}」 ${r.lines}行 ${r.font}px`);};
const atHome=async p=>{await p.waitForURL(u=>u.href===HOME||u.href===HOME+'index.html');};
const MENU=['menu-continue','menu-top','menu-home'];
// 手札の並び順・CPUデッキ設定は対戦を始めると正規に書かれるので、比べるのはマイデッキと戦績。
const PROTECT=['naotocchi-my-decks-v1','naotocchi-card-records-v1','naotocchi-card-records-v1-backup'];
(async()=>{const b=await (process.env.BROWSER==='webkit'?webkit:chromium).launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const errors=[];const shots=process.env.SCREENSHOT_DIR;
try{// 390×844 / 844×390（iPhone 標準）と 375×667 / 667×375（iPhone SE・mini 相当の小さい画面）。
for(const [name,viewport] of [['portrait',{width:390,height:844}],['landscape',{width:844,height:390}],['small-portrait',{width:375,height:667}],['small-landscape',{width:667,height:375}]]){
 const ctx=await b.newContext({viewport,isMobile:process.env.BROWSER!=='webkit'||undefined,hasTouch:true,deviceScaleFactor:2});const p=await ctx.newPage();p.on('pageerror',e=>errors.push(`${name}: ${e.message}`));
 const snap=()=>p.evaluate(keys=>keys.map(k=>localStorage.getItem(k)),PROTECT);
 const focused=()=>p.evaluate(()=>document.activeElement.id);
 const welcomeShown=async()=>{assert.ok(await p.locator('#welcome').isVisible(),'開始ページが出る');assert.equal(await p.locator('#game').isVisible(),false);assert.equal(await p.evaluate(()=>document.body.classList.contains('playing')),false);};
 const openMenu=async()=>{await p.locator('#game [data-menu]').tap();await p.locator('#menu-dialog').waitFor({state:'visible'});};
 const startMatch=async mode=>{await p.click(mode==='cpu'?'#solo-open':'#hotseat-open');await p.click('#new');await p.locator('#game').waitFor({state:'attached'});if(await p.locator('#reveal').isVisible())await p.click('#reveal');await p.locator('#game').waitFor({state:'visible'});};
 const resume=async(key,saved)=>{assert.equal(await p.evaluate(k=>localStorage.getItem(k),key),saved,'移動で保存が変わらない');await p.locator('#restore').click();if(await p.locator('#reveal').isVisible())await p.click('#reveal');await p.locator('#game').waitFor({state:'visible'});assert.ok(await p.locator('#game .card-face').count(),'再開後に盤面が出る');assert.deepEqual(JSON.parse(await p.evaluate(k=>localStorage.getItem(k),key)),JSON.parse(saved),'同じ対戦から再開');};

 // 1) CARD GAME トップ：ヘッダー右上の「なおとっちへもどる」。
 await p.goto(GAME);await inView(p,'#home-return');assert.equal(await p.locator('#home-return').innerText(),'なおとっちへもどる');
 if(shots)await p.screenshot({path:`${shots}/${name}-welcome.png`});
 await p.locator('#home-return').tap();await atHome(p);
 // 2) 対戦の準備（同じページ）：自分自身へ戻るボタンは置かない。もどる操作は「なおとっちへもどる」だけ。
 await p.goto(GAME);await oneLine(p,'#home-return');await p.locator('#solo-open').tap();
 assert.equal(await p.locator('#setup-back').count(),0);
 assert.deepEqual(await p.locator('#welcome button:visible, body>header a:visible').evaluateAll(ns=>ns.map(n=>n.innerText).filter(t=>/もどる/.test(t))),['なおとっちへもどる'],'カードゲームトップの戻る操作は「なおとっちへもどる」だけ');
 if(shots)await p.screenshot({path:`${shots}/${name}-setup.png`});
 const before=await snap();

 for(const mode of ['cpu','hotseat']){
  const key=mode==='cpu'?'naotocchi-cpu-match-v1':'naotocchi-hotseat-v1',route=mode==='cpu'?'ひとりであそぶ':'ふたりであそぶ';
  await p.goto(GAME);await startMatch(mode);
  assert.equal(await p.locator('#home-return').isVisible(),false,'対戦中はヘッダーを出さない');
  // ☰ の「もどる」は3つだけ。「対戦をつづける」で閉じて対戦のまま。
  await openMenu();for(const id of MENU)await inView(p,'#'+id);
  assert.deepEqual(await p.locator('#menu-leave button').allInnerTexts(),['対戦をつづける','カードゲームトップへもどる','なおとっちへもどる']);assert.equal(await p.locator('#menu-setup').count(),0);
  await oneLine(p,'#menu-leave button');await oneLine(p,'#menu-dialog [data-close]',0);
  if(shots&&mode==='cpu')await p.screenshot({path:`${shots}/${name}-menu.png`});
  await p.locator('#menu-continue').tap();assert.equal(await p.locator('#menu-dialog').isVisible(),false);assert.ok(await p.locator('#game').isVisible(),'対戦画面のまま');
  // カードゲームトップへ：確認 → つづける（何も変わらない）→ もう一度 → もどる → 「あそびかた」→「保存した対戦に戻る」で再開。
  await openMenu();await p.locator('#menu-top').tap();await p.locator('#menu-home-confirm').waitFor({state:'visible'});
  assert.match(await p.locator('#menu-home-confirm').innerText(),new RegExp(`カードゲームトップへもどりますか[\\s\\S]*端末に保存しました[\\s\\S]*「${route}」→「保存した対戦に戻る」`));
  assert.equal(await focused(),'menu-home-stay','既定のフォーカスは「対戦をつづける」');assert.equal(await p.locator('#menu-home-go').innerText(),'カードゲームトップへもどる');await oneLine(p,'#menu-home-confirm button');await inView(p,'#menu-home-go');await inView(p,'#menu-home-stay');
  if(shots&&mode==='cpu')await p.screenshot({path:`${shots}/${name}-confirm.png`});
  await p.locator('#menu-home-stay').tap();assert.equal(await p.locator('#menu-home-confirm').isVisible(),false);assert.ok(await p.locator('#menu-leave').isVisible());assert.equal(await focused(),'menu-top');
  assert.equal(await p.locator('#menu-home-go').count(),0);
  await p.locator('#menu-top').tap();let saved=await p.evaluate(k=>localStorage.getItem(k),key);assert.ok(saved);
  await p.locator('#menu-home-go').tap();await welcomeShown();
  assert.ok(await p.evaluate(()=>scrollY)<=1,'トップの位置へ');assert.equal(await focused(),'solo-open');
  assert.equal(await p.locator('#match-mode').inputValue(),mode,'戻った準備は今の対戦のあそびかた');
  await p.locator(mode==='cpu'?'#solo-open':'#hotseat-open').tap();
  assert.match(await p.locator('#resume-note').innerText(),new RegExp(`「${route}」の「保存した対戦に戻る」`));
  if(shots&&mode==='cpu')await p.screenshot({path:`${shots}/${name}-back-to-top-setup.png`});
  await resume(key,saved);assert.equal(await p.locator('#resume-note').isVisible(),false,'再開したら案内を消す');
  // なおとっちへ：ページを移動し、開き直して再開。
  await openMenu();await p.locator('#menu-home').tap();assert.match(await p.locator('#menu-home-confirm').innerText(),new RegExp(`なおとっちへもどりますか[\\s\\S]*「${route}」→「保存した対戦に戻る」`));
  saved=await p.evaluate(k=>localStorage.getItem(k),key);await p.locator('#menu-home-go').tap();await atHome(p);
  await p.goto(GAME);await p.locator(mode==='cpu'?'#solo-open':'#hotseat-open').tap();await resume(key,saved);
 }
 assert.deepEqual(await snap(),before,'マイデッキ・戦績の保存が変わらない');
 // 保存に失敗する端末：どの戻り先でも警告し、既定は「対戦をつづける」。
 await p.goto(GAME);await startMatch('cpu');
 await p.evaluate(()=>{Storage.prototype.setItem=function(){throw new Error('quota');};});
 for(const id of ['menu-top','menu-home']){
  await openMenu();await p.locator('#'+id).tap();
  assert.match(await p.locator('#menu-home-confirm').innerText(),/保存できませんでした/);assert.equal(await focused(),'menu-home-stay');assert.equal(await p.locator('#menu-home-go').innerText(),'保存せずにもどる');await oneLine(p,'#menu-home-confirm button');
  await p.locator('#menu-home-stay').tap();await p.locator('#menu-continue').tap();assert.ok(await p.locator('#game').isVisible());
 }
 // 開始画面から開いた ☰ メニュー（対戦なし）には、もどる操作を出さない（ヘッダーにある）。
 await p.goto(GAME);await p.locator('#welcome [data-menu]').tap();assert.equal(await p.locator('#menu-leave').isVisible(),false);
 await ctx.close();
}
assert.deepEqual(errors,[]);console.log('home-return browser checks passed');}
finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1);});

// CARD GAME → なおとっち（育成画面）へもどる導線。リポジトリ直下を配信した静的サーバーに対して実行する。
// 開始画面ヘッダーのリンク・対戦中 ☰ メニューの確認・保存と再開・保存失敗時の警告を、iPhone 縦横の大きさで確かめる。
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict');
const BASE=process.env.RELEASE_BASE_URL||'http://127.0.0.1:8765/';
// CARD_URL / HOME_URL で試遊版（仮のメイン画面 home.html）にも同じ確認を流せる。
const GAME=process.env.CARD_URL||BASE+'prototypes/card-game/',HOME=process.env.HOME_URL||new URL(BASE).href;
const KEYS=['naotocchi-cpu-match-v1','naotocchi-hotseat-v1'];
const inView=async(p,sel)=>{await p.locator(sel).scrollIntoViewIfNeeded();const r=await p.locator(sel).boundingBox(),v=p.viewportSize();assert.ok(r,`${sel} が表示されていません`);assert.ok(r.height>=44,`${sel} の高さ ${r.height}`);assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=v.width+0.5&&r.y+r.height<=v.height+0.5,`${sel} が画面外 ${JSON.stringify(r)} ${JSON.stringify(v)}`);};
const atHome=async p=>{await p.waitForURL(u=>u.href===HOME||u.href===HOME+'index.html');};
(async()=>{const b=await (process.env.BROWSER==='webkit'?webkit:chromium).launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const errors=[];const shots=process.env.SCREENSHOT_DIR;
try{for(const [name,viewport] of [['portrait',{width:390,height:844}],['landscape',{width:844,height:390}]]){
 const ctx=await b.newContext({viewport,isMobile:process.env.BROWSER!=='webkit'||undefined,hasTouch:true,deviceScaleFactor:2});const p=await ctx.newPage();p.on('pageerror',e=>errors.push(`${name}: ${e.message}`));
 // 開始画面：ヘッダー右上のリンクで育成画面へ。
 await p.goto(GAME);await inView(p,'#home-return');assert.equal(await p.locator('#home-return').innerText(),'なおとっちへもどる');
 if(shots)await p.screenshot({path:`${shots}/${name}-welcome.png`});
 await p.locator('#home-return').tap();await atHome(p);
 // 対戦中（CPU）：☰ → なおとっちへもどる → 確認 → 対戦をつづける／もどる。
 await p.goto(GAME);await p.click('#solo-open');await p.click('#new');await p.locator('#game').waitFor({state:'visible'});
 assert.equal(await p.locator('#home-return').isVisible(),false,'対戦中はヘッダーを出さない');
 const PROTECT=['naotocchi-my-decks-v1','naotocchi-card-records-v1','naotocchi-hand-order-v1','naotocchi-cpu-deck-pref-v1'];const snap=()=>p.evaluate(keys=>keys.map(k=>localStorage.getItem(k)),PROTECT);const before=await snap();
 await p.locator('#game [data-menu]').tap();await inView(p,'#menu-home');
 if(shots)await p.screenshot({path:`${shots}/${name}-menu.png`});
 await p.locator('#menu-home').tap();await p.locator('#menu-home-confirm').waitFor({state:'visible'});
 assert.match(await p.locator('#menu-home-confirm').innerText(),/端末に保存しました[\s\S]*「ひとりであそぶ」→「保存した対戦に戻る」/);
 assert.equal(await p.evaluate(()=>document.activeElement.id),'menu-home-stay','既定のフォーカスは「対戦をつづける」');
 await inView(p,'#menu-home-go');await inView(p,'#menu-home-stay');
 if(shots)await p.screenshot({path:`${shots}/${name}-confirm.png`});
 await p.locator('#menu-home-stay').tap();assert.equal(await p.locator('#menu-home-confirm').isVisible(),false);assert.ok(await p.locator('#menu-dialog .utility-nav').isVisible());
 await p.locator('#menu-dialog [data-close]').tap();assert.ok(await p.locator('#game').isVisible(),'対戦画面のまま');
 await p.locator('#game [data-menu]').tap();await p.locator('#menu-home').tap();
 const saved=await p.evaluate(()=>localStorage.getItem('naotocchi-cpu-match-v1'));assert.ok(saved);
 await p.locator('#menu-home-go').tap();await atHome(p);
 // 育成画面から再び CARD GAME を開き、保存した対戦へ戻れる。ほかの保存（マイデッキ等）は変わらない。
 await p.goto(GAME);
 assert.deepEqual(await snap(),before,'マイデッキ・戦績などの保存が変わらない');
 assert.equal(await p.evaluate(()=>localStorage.getItem('naotocchi-cpu-match-v1')),saved,'移動で保存が変わらない');
 await p.click('#solo-open');await p.click('#restore');await p.locator('#game').waitFor({state:'visible'});
 if(await p.locator('#reveal').isVisible())await p.click('#reveal');
 assert.ok(await p.locator('#game .card-face').count(),'再開後に盤面が出る');
 // ふたりであそぶ：案内文が「ふたりであそぶ」になる。
 await p.goto(GAME);await p.click('#hotseat-open');await p.click('#new');await p.locator('#game').waitFor({state:'attached'});
 if(await p.locator('#reveal').isVisible())await p.click('#reveal');
 await p.locator('#game [data-menu]').tap();await p.locator('#menu-home').tap();
 assert.match(await p.locator('#menu-home-confirm').innerText(),/「ふたりであそぶ」→「保存した対戦に戻る」/);
 await p.locator('#menu-home-go').tap();await atHome(p);
 await p.goto(GAME);await p.click('#hotseat-open');await p.click('#restore');await p.locator('#game').waitFor({state:'attached'});assert.equal(await p.locator('#game').isHidden(),false);
 // 保存に失敗する端末：警告を出し、既定は「対戦をつづける」。
 await p.goto(GAME);await p.click('#solo-open');await p.click('#new');await p.locator('#game').waitFor({state:'visible'});
 await p.evaluate(()=>{Storage.prototype.setItem=function(){throw new Error('quota');};});
 await p.locator('#game [data-menu]').tap();await p.locator('#menu-home').tap();
 assert.match(await p.locator('#menu-home-confirm').innerText(),/保存できませんでした/);assert.equal(await p.evaluate(()=>document.activeElement.id),'menu-home-stay');
 assert.equal(await p.locator('#menu-home-go').innerText(),'保存せずにもどる');
 await p.locator('#menu-home-stay').tap();await p.locator('#menu-dialog [data-close]').tap();assert.ok(await p.locator('#game').isVisible());
 // 開始画面から開いた ☰ メニュー（対戦なし）は確認なしで移動。
 await p.goto(GAME);await p.locator('#welcome [data-menu]').tap();await p.locator('#menu-home').tap();await atHome(p);
 await ctx.close();
}
assert.deepEqual(errors,[]);console.log('home-return browser checks passed');}
finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1);});

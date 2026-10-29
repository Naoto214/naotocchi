const {chromium,devices}=require('playwright');const fs=require('fs');
const OUT=process.argv[2],BASE='http://127.0.0.1:8765/prototypes/card-game/index.html';
const expected='1ターンに1回。自分のターンに、自分になかまがあり、準備枠にカードが2枚以上ある場合、時1を払い、自分の準備枠でみにつけられているカード1枚と、それを適正にみにつけられる、今の装備先とは別の自分のキャラクター1枚を対象として発動できる。その装備を後者へつけ替える。';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:true});const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(String(e)));
 const save=fs.readFileSync(OUT+'/save.json','utf8');
 await p.goto(BASE);await p.evaluate(s=>localStorage.setItem('naotocchi-hotseat-v1',s),save);await p.reload();
 const r={};
 // collection
 await p.click('#collection-open');if(await p.isVisible('#collection-ack'))await p.click('#collection-ack');if(await p.isVisible('#collection-cover'))await p.click('#collection-cover');
 await p.fill('#collection-query','いわばのタコ');await p.waitForTimeout(300);
 await p.screenshot({path:OUT+'/collection-grid.png'});
 await p.click('[data-collection-card="P-rock_octopus"]');await p.waitForTimeout(400);
 r.collectionEffect=(await p.textContent('#collection-card-effect')).trim();
 r.collectionFace=await p.evaluate(()=>document.querySelector('#collection-flipper .card-face')?.innerText??null);
 r.collectionFaceLong=await p.evaluate(()=>document.querySelector('#collection-flipper .card-face')?.classList.contains('long-copy')??null);
 await p.screenshot({path:OUT+'/collection-detail.png'});
 console.log(JSON.stringify({r,errors,ids:await p.evaluate(()=>[...document.querySelectorAll('button[id]')].filter(b=>b.offsetParent).map(b=>b.id))}));
 await b.close();})();

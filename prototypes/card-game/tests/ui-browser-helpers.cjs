// Test navigation uses the saved game's safe actor view to choose an action;
// every transition is still performed by clicking the actual production UI.
async function reveal(page){if(await page.locator('#curtain').isVisible())await page.locator('#reveal').click();}
async function closeDetail(page){if(await page.locator('#card-dialog').isVisible()){await page.locator('#card-dialog [data-close]').click();await page.locator('#card-dialog').waitFor({state:'hidden'});}}
async function projection(page){return page.evaluate(async()=>{const {decodeMatch}=await import('./records-match.mjs');const {session}=decodeMatch(localStorage.getItem('naotocchi-hotseat-v1'));session.reveal();return session.projection;});}
async function actionButton(page,a){
 const find=async()=>{const modal=await page.locator('#card-dialog').isVisible(),ns=page.locator(modal?'#card-dialog [data-action]':'#operation-panel [data-action]');const i=await ns.evaluateAll((ns,id)=>ns.findIndex(n=>n.dataset.action===id),a.id);if(i>=0)return ns.nth(i);
 // Declaration actions use the production select, not data-action buttons.
 const pickers=page.locator(modal?'#card-dialog select[data-declaration]':'#operation-panel select[data-declaration]');
 const p=await pickers.evaluateAll((nodes,id)=>nodes.findIndex(n=>[...n.options].some(o=>o.value===id)),a.id);
 return p<0?null:{click:()=>pickers.nth(p).selectOption(a.id)};};
 let b=await find();if(b)return b;await closeDetail(page);b=await find();if(b)return b;
 // Card use opens that card; required choices use the expanded exact engine list.
 if(!a.source){await page.locator('#operation-panel [data-workflow]').click();b=await find();if(b)return b;throw Error('Missing required operation '+a.label);}
 if(await page.locator('#hand.hand-collapsed').count())await page.locator('[data-hand-toggle]').click();
 let cards=page.locator('#game [data-inspect],#game [data-browse]'),i=await cards.evaluateAll((ns,id)=>ns.findIndex(n=>(n.dataset.inspect??n.dataset.browse)===id),a.source);
 if(i<0){const v=await projection(page),seat=Object.entries(v.players).find(([,p])=>p.discard.some(x=>x.id===a.source))?.[0];if(seat){await page.locator(`[data-zone="discard"][data-seat="${seat}"]`).click();cards=page.locator('#card-dialog [data-browse]');i=await cards.evaluateAll((ns,id)=>ns.findIndex(n=>(n.dataset.inspect??n.dataset.browse)===id),a.source);}}
 if(i>=0){await cards.nth(i).click();
 // ui-drag suppresses synthesized post-tap clicks for 400ms. Start the next
 // distinct human gesture after that existing input contract, without bypassing it.
 await page.waitForTimeout(410);const use=page.locator('#card-dialog .detail-copy [data-inspect]');if(await use.count())await use.click();b=await find();if(b)return b;}
 await closeDetail(page);await page.locator('#operation-panel [data-workflow]').click();b=await find();if(b)return b;
 throw Error('UI cannot reach engine action '+a.label);
}
module.exports={reveal,closeDetail,projection,actionButton};

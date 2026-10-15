// Test navigation uses the saved game's safe actor view to choose an action;
// every transition is still performed by clicking the actual production UI.
async function reveal(page){if(await page.locator('#curtain').isVisible())await page.locator('#reveal').click();}
async function closeDetail(page){if(await page.locator('#card-dialog').isVisible())await page.locator('#card-dialog [data-close]').click();}
async function projection(page){return page.evaluate(async()=>{const e=await import('./engine.mjs'),s=e.restore(localStorage.getItem('naotocchi-hotseat-v1'));return e.view(s,e.actor(s));});}
async function actionButton(page,a){
 const find=async()=>{const modal=await page.locator('#card-dialog').isVisible(),ns=page.locator(modal?'#card-dialog [data-action]':'#operation-panel [data-action]');const i=await ns.evaluateAll((ns,id)=>ns.findIndex(n=>n.dataset.action===id),a.id);return i<0?null:ns.nth(i);};
 let b=await find();if(b)return b;await closeDetail(page);b=await find();if(b)return b;
 // Card use opens that card; required choices use the expanded exact engine list.
 if(!a.source){await page.locator('#operation-panel [data-workflow]').click();b=await find();if(b)return b;throw Error('Missing required operation '+a.label);}
 if(await page.locator('#hand.hand-collapsed').count())await page.locator('[data-hand-toggle]').click();
 let cards=page.locator('#game [data-inspect]'),i=await cards.evaluateAll((ns,id)=>ns.findIndex(n=>n.dataset.inspect===id),a.source);
 if(i<0){const v=await projection(page),seat=Object.entries(v.players).find(([,p])=>p.discard.some(x=>x.id===a.source))?.[0];if(seat){await page.locator(`[data-zone="discard"][data-seat="${seat}"]`).click();cards=page.locator('#card-dialog [data-inspect]');i=await cards.evaluateAll((ns,id)=>ns.findIndex(n=>n.dataset.inspect===id),a.source);}}
 if(i>=0){await cards.nth(i).click();b=await find();if(b)return b;}
 await closeDetail(page);await page.locator('#operation-panel [data-workflow]').click();b=await find();if(b)return b;
 throw Error('UI cannot reach engine action '+a.label);
}
module.exports={reveal,closeDetail,projection,actionButton};

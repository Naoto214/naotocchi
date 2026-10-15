// Test navigation uses the saved game's safe actor view to choose an action;
// every transition is still performed by clicking the actual production UI.
async function reveal(page){if(await page.locator('#curtain').isVisible())await page.locator('#reveal').click();}
async function closeDetail(page){if(await page.locator('#card-dialog').isVisible())await page.locator('#card-dialog [data-close]').click();}
async function projection(page){return page.evaluate(async()=>{const e=await import('./engine.mjs'),s=e.restore(localStorage.getItem('naotocchi-hotseat-v1'));return e.view(s,e.actor(s));});}
async function actionButton(page,a){
 const target=()=>page.locator('[data-action]:visible');
 const find=async()=>{const index=await target().evaluateAll((ns,id)=>ns.findIndex(n=>n.dataset.action===id),a.id);return index<0?null:target().nth(index);};
 let b=await find();if(b)return b;
 await closeDetail(page);await page.locator('.table-top [data-workflow]').click();b=await find();if(b)return b;
 // A workflow groups card-specific actions under the matching card detail.
 const source=a.source;const candidates=await page.locator('#card-dialog [data-inspect]').evaluateAll(ns=>ns.map(n=>n.dataset.inspect));
 for(const id of source?[source]:candidates){
  let c=page.locator('[data-inspect]:visible');let index=await c.evaluateAll((ns,id)=>ns.findIndex(n=>n.dataset.inspect===id),id);
  if(index<0){await closeDetail(page);if(await page.locator('#hand.hand-collapsed').count())await page.locator('[data-hand-toggle]').click();c=page.locator('[data-inspect]:visible');index=await c.evaluateAll((ns,id)=>ns.findIndex(n=>n.dataset.inspect===id),id);}
  if(index<0){const v=await projection(page),seat=Object.entries(v.players).find(([,p])=>p.discard.some(x=>x.id===id))?.[0];if(seat){await page.locator(`[data-zone="discard"][data-seat="${seat}"]`).click();c=page.locator('#card-dialog [data-inspect]');index=await c.evaluateAll((ns,id)=>ns.findIndex(n=>n.dataset.inspect===id),id);}}
  if(index>=0){await c.nth(index).click();b=await find();if(b)return b;}
  await closeDetail(page);await page.locator('.table-top [data-workflow]').click();
 }
 throw Error('UI cannot reach engine action '+a.label);
}
module.exports={reveal,closeDetail,projection,actionButton};

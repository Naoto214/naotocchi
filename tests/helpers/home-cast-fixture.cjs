// Geometry/conversation tests need an explicit all-present roster. Production
// visits remain sparse; their lifecycle is covered by the free-life tests.
const assert=require('node:assert/strict');
const {guardedRoute}=require('./browser-route.cjs');
async function presentHomeCast(context,label,errors) {
 return guardedRoute(context,'**/script.js?*',label,errors,async route=>{
  const response=await route.fetch();let body=await response.text();
  for(const [signature,fixture] of [
   ['function homePresentCompanions() {','return state.companions;'],
   ['function homePresentPartner() {','return state.partner;'],
   ['function homeInitiative(type,key) {','return true;'],
  ]){
   assert.ok(body.includes(signature),label+': missing Home attendance boundary');
   body=body.replace(signature,signature+fixture);
  }
  await route.fulfill({response,body});
 });
}
module.exports={presentHomeCast};

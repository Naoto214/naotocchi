// Geometry/conversation tests need an explicit all-present roster. Production
// visits remain sparse; their lifecycle is covered by the free-life tests.
const assert=require('node:assert/strict');
const {guardedRoute}=require('./browser-route.cjs');
async function presentLegacyHomeCast(context,label,errors) {
 return guardedRoute(context,'**/script.js?*',label,errors,async route=>{
  const response=await route.fetch();let body=await response.text();
  // This suite asserts the legacy centered rows and speech-below-cast layout.
  // Exercise that retained fallback explicitly; the production 2.5D adapter
  // has separate real-browser matrices with fixed 5+4 controls and 76px speech.
  body='window.NaotocchiHomeDiorama=undefined;window.NaotocchiHomeDioramaModel=undefined;document.body.dataset.homeProduction="";\n'+body;
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
module.exports={presentLegacyHomeCast};

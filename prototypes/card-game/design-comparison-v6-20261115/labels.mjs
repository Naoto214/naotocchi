// Display-only helpers. Canonical name, stage, cost and search remain untouched.
const labels={main:'メイン',companion:'なかま',partner:'こいびと',world:'セカイ',play:'あそび',item:'あいてむ',event:'できごと'};
export function classificationLabel(card,mode='concise'){
 return card.type==='main'?(mode==='reference'?'メイン · ':'')+card.attribute:labels[card.type];
}
export function auxiliaryName(card){
 if(card.type!=='main')return '';
 const suffix=String.fromCodePoint(0x245f+card.stage);
 return card.name.endsWith(suffix)?card.name.slice(0,-suffix.length):card.name;
}

export const escapeHTML=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
// Display proposals only. The card names and text in data.json are canonical.
export const proposals={
 'きゅうきゅうばこ':[['救急箱','きゅうきゅうばこ']],
 'きおくのみずうみ':[['記憶','きおく'],'の',['湖','みずうみ']],
 'おおきなびょうき':[['大','おお'],'きな',['病気','びょうき']],
 'うんめいのへんしん':[['運命','うんめい'],'の',['変身','へんしん']],
 'おもいでのしゃしん':[['思','おも'],'い',['出','で'],'の',['写真','しゃしん']],
 'ながいきのひけつ':[['長生','ながい'],'きの',['秘訣','ひけつ']],
 'はやじまい':[['早','はや'],'じまい'],
 'ほしぞらのていりゅうじょ':[['星空','ほしぞら'],'の',['停留所','ていりゅうじょ']],
 'どこにもつながらないかいだん':['どこにもつながらない',['階段','かいだん']],
 'あやまりにきただいおういか':[['謝','あやま'],'りにきた',['大王','だいおう'],'イカ'],
 'むひょうじょうのせきぞう':[['無表情','むひょうじょう'],'の',['石像','せきぞう']],
 'あみものがすきなクモさん':[['編','あ'],'み',['物','もの'],'が',['好','す'],'きなクモさん'],
 'とくべつなたびのおもいで':[['特別','とくべつ'],'な',['旅','たび'],'の',['思','おも'],'い',['出','で']],
 'じかんにルーズなとけい':[['時間','じかん'],'にルーズな',['時計','とけい']],
};
const familiar=new Set(['大','思','出','早','好','物','旅','時間']);
export function titleInfo(card,mode='original',{compact=false,rubyPolicy='detail'}={}){
 const raw=card.title??card.name,parts=mode!=='original'?proposals[raw]:null;
 const text=parts?parts.map(p=>Array.isArray(p)?p[0]:p).join(''):raw;
 const em=[...text].reduce((n,c)=>n+(/[\x20-\x7e]/.test(c)?.62:1),0);
 const showRuby=mode==='ruby'&&!!parts&&parts.some(p=>Array.isArray(p)&&!familiar.has(p[0]))&&!(compact&&rubyPolicy==='detail');
 const width=showRuby?78:88,natural=width/(em*1.035);const size=Math.max(4.8,Math.min(7.4,natural));
 const html=parts?parts.map(p=>Array.isArray(p)?(showRuby&&!familiar.has(p[0])?`<ruby>${escapeHTML(p[0])}<rt>${escapeHTML(p[1])}</rt></ruby>`:escapeHTML(p[0])):escapeHTML(p)).join(''):escapeHTML(raw);
 return {text,html,size,lines:1,exception:raw.length>=12,changed:!!parts,raw,width,showRuby};
}

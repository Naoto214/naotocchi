// Presentation catalog shared by text, life records and Canvas. The strings
// used for saves, rules and dialogue remain the original stable identifiers.
(() => {
  'use strict';
  const normalize = text => String(text || '').replace(/[\uFE0E\uFE0F]/g, '');
  const escape = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const svg = art => `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24" fill="none" stroke="#694d3b" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">${art}</svg>`;
  const ALIASES = {
    '🌧':'☔','🌦':'☔','🌨':'❄','🌤':'☀','🌫':'☁','🌑':'🌙','🌠':'✨',
    '🎄':'🌲','🌷':'🌼','🏵':'🌼','🥀':'🍂','🪷':'🌸','🎋':'🌿','🎍':'🌿',
    '☃':'⛄','🐪':'🐫','🐳':'🐋','🐔':'🐓','💠':'💎','🔷':'💎',
    '⏱':'🕰','⏰':'🕰','🕐':'🕰','🎶':'🎵','🎖':'🏅','🥇':'🏅','🥈':'🏅',
  };
  const PICTURES = {
    '🐈‍⬛':'cat/06.png','🐶':'companions/shiba.png','🐱':'companions/cat_friend.png',
    '🐇':'companions/rabbit_friend.png','🐰':'companions/rabbit_friend.png',
    '🐼':'companions/panda.png','🦊':'companions/many_tail_fox.png','🦄':'companions/unicorn.png',
    '🐿':'companions/squirrel.png','🦉':'companions/owl.png','🦇':'companions/bat.png','🐌':'companions/snail.png',
    '🦔':'companions/hedgehog.png','🦜':'companions/parrot.png','🐓':'companions/chicken.png',
    '🐑':'companions/sheep.png','🐒':'companions/monkey.png','🦭':'companions/seal.png',
    '🦦':'companions/otter.png','🦝':'companions/tanuki.png','🐹':'companions/hamster.png','🗿':'companions/sekizou.png',
    '🐄':'partners/field_cow.png','🦌':'partners/grove_deer.png','🦍':'partners/gentle_gorilla.png',
    '🐻':'partners/forest_bear.png','🐐':'partners/cliff_goat.png','🦅':'partners/high_eagle.png',
    '🦂':'partners/desert_scorpion.png','🐙':'partners/rock_octopus.png','🐊':'partners/swamp_croc.png',
    '🕷':'partners/knitting_spider.png','🤖':'partners/robot_neighbor.png','⛄':'partners/snowman.png',
    '🧜':'partners/sea_mermaid.png','🧜‍♀':'partners/sea_mermaid.png',
  };
  const ART = {
    '💥':['しょうげき','<path fill="#efb465" d="m12 1 3 7 7-4-3 8 4 6-8-1-4 6-2-7-8-1 6-5-3-7 7 4z"/>'],
    '💨':['かぜ','<path d="M2 7h13c8 0 6-8 2-5M2 12h18M2 17h11c8 0 6 8 2 5" stroke="#91adb7" stroke-width="2"/>'],
    '🌬':['かぜ','<path d="M2 7h13c8 0 6-8 2-5M2 12h18M2 17h11c8 0 6 8 2 5" stroke="#91adb7" stroke-width="2"/>'],
    '💧':['しずく','<path fill="#8ebbc8" d="M12 1C8 8 3 12 3 16a9 7 0 0 0 18 0C21 12 16 8 12 1z"/><path stroke="#e4f0e9" d="M7 15q-2 4 2 5"/>'],
    '💦':['みずしぶき','<path fill="#8ebbc8" d="M8 2 2 13a6 6 0 0 0 12 0zm11 9-4 7a4 4 0 0 0 8 0z"/>'],
    '🌀':['うず','<path stroke="#8ca7bd" stroke-width="2.5" d="M12 12c7-8-8-9-8-1s16 14 18 2S7-4 2 5"/>'],
    '〰':['なみもよう','<path stroke="#8ca7bd" stroke-width="2.5" d="M1 12q5-10 11 0t11 0"/>'],
    '♨':['おんせん','<ellipse fill="#abc9cc" cx="12" cy="19" rx="10" ry="4"/><path d="M6 15c-5-6 5-7 0-13m6 13c-5-6 5-7 0-13m6 13c-5-6 5-7 0-13"/>'],
    '🏖':['すなはま','<path fill="#e8c795" d="M1 18q12-6 22 0v5H1z"/><path d="M13 5v15"/><path fill="#dd9e93" d="M3 10a10 9 0 0 1 20 0z"/>'],
    '⛺':['テント','<path fill="#b8be85" d="m12 2 11 20H1z"/><path fill="#655944" d="m12 9 6 13H6z"/>'],
    '🏕':['キャンプ','<path fill="#94aa7c" d="m5 1 5 14H0z"/><path fill="#d9b17f" d="m15 6 8 16H7z"/><path fill="#655944" d="m15 12 4 10h-8z"/>'],
    '🐣':['たまごからでたひな','<circle fill="#e6c46e" cx="12" cy="9" r="7"/><path fill="#fff1d6" d="m3 13 3 3 3-3 3 3 3-3 3 3 3-3v6q-9 8-18 0z"/><path d="M9 7v1m6-1v1"/><path fill="#d89b59" d="m10 11 2 2 2-2z"/>'],
    '🐥':['ひよこ','<path fill="#e6c46e" d="M5 10a7 7 0 1 1 14 0v3q7 8-7 9Q0 21 5 13z"/><path d="M9 7v1m6-1v1M9 22v2m6-2v2"/><path fill="#d89b59" d="m10 11 2 2 2-2z"/>'],
    '🐤':['ひよこ','<path fill="#e6c46e" d="M5 10a7 7 0 1 1 14 0v3q7 8-7 9Q0 21 5 13z"/><path d="M9 7v1m6-1v1M9 22v2m6-2v2"/><path fill="#d89b59" d="m10 11 2 2 2-2z"/>'],
    '🦆':['かも','<path fill="#9bae83" d="M14 11V5a4 4 0 1 1 7 3l-2 4q4 11-13 9l-5-8 8 3z"/><path fill="#d99d54" d="m21 5 3 1-3 2z"/><circle cx="18" cy="4" r=".8" fill="#584838"/>'],
    '🐍':['へび','<path fill="none" stroke="#95a779" stroke-width="6" d="M3 20h13c9 0 3-8-3-5S2 9 12 8h5"/><ellipse fill="#95a779" cx="18" cy="6" rx="5" ry="4"/><path d="M18 4v1m3 0v1m0 3 3 2"/>'],
    '🐝':['みつばち','<ellipse fill="#dbe7df" cx="8" cy="5" rx="5" ry="3"/><ellipse fill="#dbe7df" cx="16" cy="5" rx="5" ry="3"/><ellipse fill="#e6c46e" cx="12" cy="14" rx="8" ry="9"/><path stroke-width="3" d="M5 14h14M7 19h10"/><path d="M9 8v1m6-1v1"/>'],
    '🐡':['ふぐ','<path fill="#d9bd84" d="m4 6 3 2 1-5 4 3 5-3v5l5-1-2 5 3 3-4 2-1 5-5-2-4 2-2-4-5-1 3-4z"/><circle fill="#584838" cx="15" cy="11" r="1.5"/><path d="m17 15 3-1"/>'],
    '🦑':['いか','<path fill="#d7a093" d="m12 1 9 9-5 5H8l-5-5z"/><path stroke="#d7a093" stroke-width="3" d="M8 13v9m4-9v10m4-10v9"/><path d="M10 10v1m4-1v1"/>'],
    '🦐':['えび','<path stroke="#d58c77" stroke-width="5" d="M18 4C1-2-4 22 16 20l5-5"/><path d="m7 5-6-3m5 6L1 8m10 11v4m-6-7-3 3"/><circle cx="17" cy="4" r="1" fill="#584838"/>'],
    '🦞':['ロブスター','<ellipse fill="#cc806e" cx="12" cy="14" rx="4" ry="8"/><path stroke="#cc806e" stroke-width="3" d="M8 10 3 4m13 6 5-6M8 14l-5 3m13-3 5 3M8 18l-4 4m12-4 4 4"/><path fill="#cc806e" d="M5 1v6H1V1l2 3zm14 0v6h4V1l-2 3z"/>'],
    '🦀':['かに','<ellipse fill="#d99a7e" cx="12" cy="14" rx="7" ry="5"/><path stroke="#d99a7e" stroke-width="2.5" d="m6 11-4-6m16 6 4-6M6 15l-5 4m5-1-3 5m15-8 5 4m-5-1 3 5"/><path fill="#d99a7e" d="M5 1v6H1V1l2 3zm14 0v6h4V1l-2 3z"/><path d="M9 9V7m6 2V7"/>'],
    '🐋':['くじら','<path fill="#91b1c1" d="M2 14C-2 4 15 2 17 15l6-5-2 9Q4 25 2 14z"/><path d="M7 9v1m2-4V1M7 2l2 2 2-2"/>'],
    '🐬':['イルカ','<path fill="#94bac3" d="M2 14C3 2 15 1 18 10l5 2-5 2q-2 5-8 6l4-6-6 1-5 6z"/><path fill="#94bac3" d="m9 6 1-5 5 5"/><circle cx="16" cy="10" r="1" fill="#584838"/>'],
    '🦈':['さめ','<path fill="#99aab4" d="m1 14 7-6 2-7 5 7 8 4-8 5-5-2-7 7 1-7z"/><path fill="#fff1d6" d="m14 15 8-3-4 5z"/><circle cx="17" cy="11" r="1" fill="#584838"/>'],
  };
  const animalFace=(fill,ears,detail='') => `${ears}<ellipse fill="${fill}" cx="12" cy="13" rx="8" ry="9"/><path stroke-width="2" d="M8 10v1m8-1v1"/><path fill="#695346" d="m10 14 2 2 2-2z"/>${detail}`;
  Object.assign(ART,{
    '🦁':['ライオン',animalFace('#e4c080','<path fill="#b38858" d="m12 0 5 3 6 2-1 8 1 6-7 4-8 0-7-5 1-7 1-7 6-1z"/>')],
    '🐨':['コアラ',animalFace('#b9b9b1','<circle fill="#a4a9a5" cx="4" cy="6" r="4"/><circle fill="#a4a9a5" cx="20" cy="6" r="4"/>','<ellipse fill="#625d57" cx="12" cy="13" rx="2.5" ry="4"/>')],
    '🐀':['ねずみ',animalFace('#b7aba3','<circle fill="#cda9a0" cx="4" cy="5" r="4"/><circle fill="#cda9a0" cx="20" cy="5" r="4"/>','<path d="m7 15-7-2m7 4-6 2m16-4 7-2m-7 4 6 2"/>')],
    '🐗':['いのしし',animalFace('#ac8c75','<path fill="#ac8c75" d="M3 2 9 5H3zm18 0-6 3h6z"/>','<ellipse fill="#d0ad95" cx="12" cy="16" rx="5" ry="3"/><path d="M10 16h1m2 0h1"/><path fill="#fff2d6" d="m5 19-2-7 5 6zm14 0 2-7-5 6z"/>')],
    '🐴':['うま',animalFace('#bd9977','<path fill="#bd9977" d="m6 7-2-7 5 5m6 0 5-5-2 7"/>','<path fill="#695346" d="m7 6 3-6h5l2 6-4-2-3 4z"/><ellipse fill="#d6b28e" cx="12" cy="18" rx="6" ry="4"/>')],
    '🐫':['らくだ','<path fill="#d1b082" d="M2 19v-8q4-11 8-1 5-10 8 0V3l5-1v5h-2v13h-3v-6H6v8H3z"/><path d="M20 4h1"/>'],
    '🦒':['キリン','<path fill="#e1bf79" d="M7 23V10L4 7l3-5h10l3 5-5 5v11z"/><path stroke="#ac8458" stroke-width="3" d="M8 2V0m8 2V0M9 14h3m0 6h3"/><path d="M8 6v1m7-1v1"/>'],
    '🐘':['ぞう','<ellipse fill="#a6afb2" cx="5" cy="11" rx="4" ry="8"/><ellipse fill="#a6afb2" cx="19" cy="11" rx="4" ry="8"/><ellipse fill="#b5bec0" cx="12" cy="10" rx="7" ry="9"/><path stroke="#b5bec0" stroke-width="5" d="M12 13v6q5 7 8-1"/><path d="M8 8v1m8-1v1"/>'],
    '🦘':['カンガルー','<path fill="#c59d7b" d="m9 9-5-8 5 3 4-4 1 6 5 2-5 4v6l9 5-14-1-7 1 5-7z"/><path fill="#ead1ae" d="M9 13h4l-1 7H8z"/><path d="M14 7v1"/>'],
    '🕊':['はと','<path fill="#e5e4d1" d="m10 12-8-9 1 15c8 8 18 3 18-5V8a4 4 0 0 0-8-1z"/><path fill="#bca77b" d="m21 8 3 2-3 1z"/><path stroke="#7a9c70" d="m19 13 4 2m-3-1 1-3m1 4v3"/><circle cx="18" cy="7" r="1" fill="#584838"/>'],
    '🦕':['くびのながいきょうりゅう','<path fill="#9eb188" d="M2 21v-9q0-6 12-2V3q5-6 9 0v4h-5v14h-3v-6H7v6z"/><circle cx="20" cy="3" r="1" fill="#584838"/>'],
    '🦖':['きょうりゅう','<path fill="#9eae82" d="m1 19 8-5V6q1-8 13-4v7h-8l2 7 6 4-3 3-7-5-3 5H6l1-5z"/><path fill="#fff1d6" d="m14 7 2-2 2 2 2-2 2 2"/><circle cx="17" cy="3" r="1" fill="#584838"/>'],
  });
  const colors = ['#c47874','#e5c873','#83a478','#82a7c4','#ac92b8','#db9d65','#594f49','#f7efdc','#a98b73'];
  [...'🔴🟡🟢🔵🟣🟠⚫⚪🟤'].forEach((key,i) => { ART[key]=['いろのまる',`<circle fill="${colors[i]}" cx="12" cy="12" r="9"/>`]; });
  [...'🟥🟨🟩🟦🟪🟧⬛⬜🟫'].forEach((key,i) => { ART[key]=['いろのしかく',`<rect fill="${colors[i]}" x="3" y="3" width="18" height="18" rx="2"/>`]; });
  for (const [key,path,label] of [['➕','M3 12h18M12 3v18','たす'],['➖','M3 12h18','ひく'],['❌','m5 5 14 14M5 19 19 5','ばつ'],['✖','m5 5 14 14M5 19 19 5','ばつ'],['⭕','M12 3a9 9 0 1 0 .01 0','まる']]) ART[key]=[label,`<path stroke="#b67472" stroke-width="3" d="${path}"/>`];
  for (const [key,turn] of [['◀',180],['▶',0],['➡',0],['⬅',180],['⬆',270],['⬇',90],['⏬',90]]) ART[key]=['やじるし',`<path fill="#91adb7" transform="rotate(${turn} 12 12)" d="M2 9h11V3l10 9-10 9v-6H2z"/>`];
  ART['↔']=['さゆう','<path fill="#91adb7" d="m1 12 7-7v4h8V5l7 7-7 7v-4H8v4z"/>'];
  ART['🔺']=['さんかく','<path fill="#c47874" d="m12 2 11 20H1z"/>'];
  ART['🔘']=['えらぶ','<circle cx="12" cy="12" r="10"/><circle fill="#91adb7" cx="12" cy="12" r="5"/>'];
  // Atlas metadata is filled from the checked-in art manifests below.
  const ATLAS_FRAMES = {"ui":{"flower":[20,25,178,178],"ribbon":[229,31,168,168],"bowtie":[428,19,189,189],"paper":[641,23,180,180],"scarf":[842,28,182,182],"glasses":[1044,25,195,195],"band":[20,226,178,178],"hat":[220,222,195,195],"backpack":[428,220,187,187],"star_badge":[639,226,170,170],"paw_badge":[847,220,201,201],"letter":[1042,217,199,199],"crown":[29,440,168,168],"clover":[223,430,182,182],"charm":[426,427,189,189],"lantern":[623,421,204,204],"ring":[854,430,194,194],"naoto_crown":[1042,423,199,199],"world":[11,625,200,200],"book":[207,627,214,214],"medal":[425,631,195,195],"palette":[621,619,206,206],"sun":[834,625,214,214],"cloud":[1042,631,202,202],"rain":[14,844,188,188],"snow":[233,849,173,173],"moon":[430,833,200,200],"sunrise":[624,844,195,195],"sunset":[840,847,187,187],"candy":[1049,832,186,186],"bubbles":[18,1024,201,201],"balloon":[213,1026,201,201],"fireworks":[419,1039,186,186],"camera":[625,1027,214,214],"musicbox":[833,1030,199,199],"surprise":[1040,1024,204,204]},"care":{"food":[36.0,62.5,261,261],"game":[344.0,81.0,266,266],"clean":[627.0,44.0,289,289],"sleep":[946.0,55.0,298,298],"medicine":[31.5,364.0,251,251],"play":[344.0,356.0,263,263],"love":[665.0,370.0,262,262],"coin":[977.0,371.0,250,250],"gift":[33.0,660.5,249,249],"hunger":[333.0,650.0,287,287],"sick":[666.0,658.0,252,252],"danger":[981.0,669.0,223,223],"recovery":[32.0,945.5,257,257],"growth":[333.0,933.0,287,287],"decline":[669.0,967.5,237,237],"poop":[984.0,970.5,216,216]},"scenery":{"cherry_blossom":[43.0,50.0,267,267],"sunflower":[322.0,35.0,302,302],"maple_leaf":[639.0,37.0,295,295],"green_leaf":[970.5,70.0,247,247],"tree":[28.5,353.0,289,289],"pine":[325.0,341.0,301,301],"palm":[640.0,345.0,297,297],"cactus":[943.0,347.0,295,295],"snow_mountain":[27.0,635.0,310,310],"mountain":[344.0,645.0,292,292],"house":[647.0,646.0,285,285],"city":[949.0,644.5,272,272],"wheat":[33.5,923.0,293,293],"wave":[338.0,927.0,287,287],"shell":[650.0,933.0,264,264],"hibiscus":[937.0,928.0,295,295]}};
  const SCENERY_CLIPS = {"cherry_blossom":[47,58,306,309],"sunflower":[326,49,620,323],"maple_leaf":[657,41,916,328],"green_leaf":[997,74,1191,313],"tree":[36,357,310,638],"pine":[353,345,598,638],"palm":[658,349,919,638],"cactus":[980,351,1201,638],"snow_mountain":[31,678,333,902],"mountain":[348,676,632,906],"house":[651,668,928,909],"city":[953,655,1217,906],"wheat":[54,927,306,1212],"wave":[342,937,621,1204],"shell":[654,942,910,1188],"hibiscus":[941,948,1228,1203]};
  function create({knownHTML,symbolKeys={},symbols={},careKeys={},uiKeys={},food={},props={},species={},atlases={},currentActor}) {
    const art = {...globalThis.NaotocchiGameSymbolArt,...globalThis.NaotocchiUISymbolArt,...ART};
    const people = {};
    for (const line of Object.values(species)) for (const stage of line.stages || []) if (stage.asset) people[normalize(stage.emoji)] = stage;
    function resolve(emoji) {
      if (emoji === '\uE000') return currentActor?.() || null;
      let key=normalize(emoji); key=ALIASES[key] || key;
      if (key==='🥚') return {asset:'assets/characters/egg/intact.png',label:'たまご'};
      const symbol=symbolKeys[key] || props.symbols?.[key];
      if (symbol && symbols[symbol]) return {svg:svg(symbols[symbol][1]),label:symbols[symbol][0]};
      const icon=careKeys[key] || uiKeys[key];
      if (icon) {
        const group=careKeys[key]?'care':Object.hasOwn(ATLAS_FRAMES.scenery,icon)?'scenery':'ui';
        const frame=ATLAS_FRAMES[group][icon];
        if(frame) return {image:atlases[group],frame,clipBounds:group==='scenery'?SCENERY_CLIPS[icon]:undefined,atlas:group,icon,label:icon};
      }
      const prop=props.props?.[key];
      if(prop && props.art?.[prop]) return {svg:svg(props.art[prop][1]),label:props.art[prop][0]};
      const foodKey=props.food?.[key] || ({'🍫':'choco','🍤':'shrimp','🥦':'broccoli','🍱':'bento'})[key];
      if(foodKey && food[foodKey]) return {svg:svg(food[foodKey][1]),label:food[foodKey][0]};
      if(art[key]) return {svg:svg(art[key][1]),label:art[key][0]};
      if(PICTURES[key]) return {asset:'assets/characters/'+PICTURES[key],label:key};
      if(people[key]) return people[key];
      return null;
    }
    function html(emoji) {
      const d=resolve(emoji); if(!d)return '';
      // Existing CSS atlas frames/line icons remain the source of truth.
      const known=knownHTML?.(emoji); if(known)return known;
      const key=normalize(emoji),label=escape(d.label === key ? 'イラスト' : d.label || 'イラスト');
      const body=d.svg || (d.asset ? `<img src="${escape(d.asset)}" alt="" draggable="false" decoding="async">`
        : `<i class="care-icon${d.atlas==='care'?'':' ui-icon'}${d.atlas==='scenery'?' scenery-icon':''}" data-${d.atlas==='care'?'care':'ui'}-icon="${d.icon}" aria-hidden="true"></i>`);
      return `<span class="catalog-icon" role="img" aria-label="${label}">${body}<span class="icon-fallback" aria-hidden="true">${escape(emoji)}</span></span>`;
    }
    return {resolve,html,normalize};
  }
  globalThis.NaotocchiIllustrationCatalog={create,normalize};
})();

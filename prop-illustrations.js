// Small display-only props. Existing atlas/food art is supplied by the app;
// no life state, dialogue, region selection or game rules enter this module.
(() => {
  'use strict';
  const ART = {
    river:['みずべ','<path fill="#9caf89" d="m1 12 5-8 5 7 5-9 7 12v9H1z"/><path fill="#87bdca" d="M14 8c-9 4 7 5-1 9l-7 6h16l-6-5c8-5-10-5-2-10z"/><path fill="none" stroke="#e7f3df" d="m13 13 3 1m-7 6 5-1"/>'],
    desert:['さばく','<circle fill="#efc368" cx="17" cy="5" r="3"/><path fill="#ecc58a" d="M1 17q6-13 15-3l7 3v6H1z"/><path fill="#d4a979" d="M1 21q10-12 22-5v7H1z"/><path fill="none" stroke="#728e64" stroke-width="2.5" d="M6 16V8m0 5H3v-3m3 1h3V7"/>'],
    bird:['ことり','<path fill="#b7936b" d="m8 13-6-3 2 8c7 7 17 4 17-5V8a5 5 0 0 0-10-1z"/><path fill="#f5dfb9" d="M8 16q5-7 11-2c-1 7-8 9-11 2z"/><path fill="#8fa6af" d="m5 14 9-3c1 5-5 8-9 3z"/><path fill="#ecc36f" d="m21 8 3 2-3 1z"/><circle fill="#694d3b" cx="17" cy="7" r="1"/><path d="M12 21v2m5-3v3"/>'],
    apple:['りんご','<path fill="#d87978" d="M12 6C1 0 0 14 5 20q4 4 7 1 3 3 7-1c5-6 4-20-7-14z"/><path fill="#8eac72" d="M12 5q1-6 7-3-1 5-7 3z"/><path d="M12 7V2"/><path fill="none" stroke="#f9dcb2" stroke-width="2" d="M6 9q-3 3-1 6"/>'],
    grapes:['ぶどう','<path fill="none" stroke="#7f9c65" stroke-width="2" d="M12 6V1"/><path fill="#89a96f" d="M12 4q3-6 9-2-2 5-9 2z"/><g fill="#a38daf"><circle cx="8" cy="8" r="4"/><circle cx="16" cy="8" r="4"/><circle cx="6" cy="13" r="4"/><circle cx="13" cy="13" r="4"/><circle cx="18" cy="13" r="4"/><circle cx="10" cy="18" r="4"/><circle cx="15" cy="18" r="4"/><circle cx="12" cy="21" r="2.5"/></g>'],
    wrapped_candy:['キャンディ','<path fill="#88b1b6" d="m7 9-6-4v14l6-4zm10 0 6-4v14l-6-4z"/><circle fill="#e5a3a7" cx="12" cy="12" r="7"/><path fill="none" stroke="#fff0cb" stroke-width="3" d="m8 7 8 10m-8-3 3 4"/>'],
    rock:['いわ','<path fill="#9ea7ab" d="m1 18 4-12 10-4 6 7 2 11-12 3z"/><path fill="#b7bec0" d="m5 6 10-4-2 9-7 4z"/><path fill="none" d="m13 11 8-2M6 15l5 8m-5-8-5 3"/>'],
    barrier:['バリケード','<path fill="none" stroke-width="2.2" d="M5 4v18m14-18v18M2 22h6m8 0h6"/><path fill="#efc76e" d="M1 6h22v10H1z"/><path fill="#775b4b" stroke="none" d="m3 6 7 10h4L7 6zm10 0 7 10h3v-2l-6-8z"/>'],
    barrel:['ドラムかん','<path fill="#90a7ac" d="M4 4h16v16c-1 4-15 4-16 0z"/><ellipse fill="#b6c6c8" cx="12" cy="4" rx="8" ry="3"/><path d="M4 10h16M4 17h16"/><ellipse fill="#6c858b" cx="15" cy="4" rx="2" ry="1"/>'],
    warning:['ちゅうい','<path fill="#f2cb73" d="M10 3q2-3 4 0l9 17q1 3-3 3H4q-4 0-3-3z"/><path stroke-width="2.8" d="M12 8v7"/><circle fill="#694d3b" cx="12" cy="19" r="1.4"/>'],
    comet:['いんせき','<path fill="#e8b264" d="m1 1 19 8-9 13z"/><path fill="#f7d898" stroke="none" d="m5 5 13 8-5 5z"/><circle fill="#a38d81" cx="16" cy="16" r="7"/><path fill="none" d="M16 11q-5 0-4 4m7 0q2 3-1 4"/>'],
    satellite:['えいせい','<path fill="#91b6c7" d="M1 8h6v10H1zm16-5h6v10h-6z"/><path fill="none" d="M4 8v10M1 13h6M20 3v10m-3-5h6M7 13h3m4-5h3"/><path fill="#ded5bc" d="m9 6 6 1 1 11-6-1z"/><path fill="#d0b5a1" d="M8 3q5 7 10 1z"/><path d="m13 5 2-4"/>'],
    alien:['うちゅうのしょうがいぶつ','<path fill="#b598c5" d="M6 2h3v4h6V2h3v6h3v10h-4v4h-3v-5h-4v5H7v-4H3V8h3z"/><path fill="#fff2d7" d="M6 10h4v4H6zm8 0h4v4h-4z"/><path d="M8 11v1m8-1v1"/>'],
    car:['くるま','<path fill="#8bafb8" d="m5 4 14 0 3 7v9H2v-9z"/><path fill="#d6e7df" d="m7 6 10 0 2 6H5z"/><path fill="#f7df9d" d="M3 15h4v3H3zm14 0h4v3h-4z"/><path stroke-width="2.5" d="M4 20v3m16-3v3"/><path d="M9 18h6"/>'],
    truck:['トラック','<rect fill="#c4ae8a" x="4" y="1" width="16" height="13" rx="2"/><path fill="#8ea9a0" d="M2 13h20v8H2z"/><path fill="#d8e6df" d="M5 14h14v3H5z"/><path stroke-width="2.5" d="M4 21v2m16-2v2"/><path fill="#f7df9d" d="M3 18h4v2H3zm14 0h4v2h-4z"/>'],
    fuel:['ガソリン','<path fill="#cc8e7e" d="M2 2h12v20H2z"/><path fill="#d6e7df" d="M4 4h8v7H4z"/><path fill="none" stroke-width="2" d="M14 12h3v6q5 4 5-2V7l-4-4"/><path d="M18 5v4h4M1 23h15"/>'],
    burger:['ハンバーガー','<path fill="#e5b67b" d="M2 10a10 9 0 0 1 20 0zM2 18h20v4H2z"/><path fill="#7f9a66" d="m2 11 4 3 5-3 5 3 6-3v4H2z"/><path fill="#91624e" d="M2 15h20v4H2z"/><path stroke="#fff0c6" d="m8 5 1 1m5-2 1 1m3 2 1 1"/>'],
    planet:['わくせい','<circle fill="#bc9baf" cx="12" cy="12" r="8"/><path fill="none" stroke="#e1bf83" stroke-width="2.5" d="M8 5C-9 18 7 25 23 8q2-5-7-3"/><path fill="none" stroke="#d7b9c9" d="M9 5q1 4 8 4m-7 9 5 1"/>'],
  };
  const PROPS = {
    '🏞':'river','🏜':'desert','🐦':'bird','🍎':'apple','🍇':'grapes','🍬':'wrapped_candy',
    '🪨':'rock','🚧':'barrier','🛢':'barrel','⚠':'warning','☄':'comet','🛰':'satellite','👾':'alien',
    '🚗':'car','🚙':'car','🚚':'truck','⛽':'fuel','🍔':'burger','🪐':'planet',
  };
  const INLINE = new Set(['🏞','🏜','🪨','🚧','🛢','⚠','☄','🛰','🚗','🚙','🚚','⛽','🪐']);
  const SYMBOLS = {'🌟':'sparkles','✨':'sparkles','💫':'sparkles','⚡':'bolt','💎':'diamond','🔥':'fire'};
  const FOODS = {'🍙':'rice','🍓':'strawberry','🍒':'cherry','🍰':'slice'};
  // Generic animals are allowed only on game props, never on form-change text.
  const PICTURES = {'🐶':'dog/06.png','🐟':'salmon/06.png','🐠':'clownfish/05.png','🦋':'butterfly/07.png'};
  // Crop metadata copied from the existing atlas JSON. Keep transparent margins
  // and clip the scenic art without sampling its neighbors.
  const ATLASES = {
    '⭐':['ui',[639,226,170]],'🍀':['ui',[223,430,182]],
    '🎈':['ui',[213,1026,201]],'🎵':['ui',[833,1030,199]],'🌙':['ui',[430,833,200]],
    '🪙':['care',[977,371,250]],'💰':['care',[977,371,250]],
    '🌸':['scenery',[43,50,267],[47,58,306,309]],
    '🌳':['scenery',[28.5,353,289],[36,357,310,638]],
    '🌲':['scenery',[325,341,301],[353,345,598,638]],
    '🌴':['scenery',[640,345,297],[658,349,919,638]],
    '🌵':['scenery',[943,347,295],[980,351,1201,638]],
    '🐚':['scenery',[650,933,264],[654,942,910,1188]],
    '🌊':['scenery',[338,927,287],[342,937,621,1204]],
  };
  const normalize = value => String(value||'').replace(/[\uFE0E\uFE0F]/g,'');
  const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const svg = art => `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="#694d3b" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">${art}</svg>`;
  function create({document,atlases={},symbols={},food={}}) {
    const images=new Map();
    function iconHTML(emoji,context='comment') {
      const key=normalize(emoji);
      if (!INLINE.has(key) && !(context==='environment'&&key==='🐦')) return '';
      const name=PROPS[key],[label,art]=ART[name];
      return `<span class="comment-drawing" data-prop-symbol="${name}" role="img" aria-label="${label}">${svg(art)}<span class="icon-fallback" aria-hidden="true">${escape(emoji)}</span></span>`;
    }
    function imageFor(key) {
      if(images.has(key))return images.get(key);
      let source;
      if(Object.hasOwn(PICTURES,key)) source='assets/characters/'+PICTURES[key];
      else {
        const item=Object.hasOwn(PROPS,key)?ART[PROPS[key]]
          :Object.hasOwn(SYMBOLS,key)?symbols[SYMBOLS[key]]
          :Object.hasOwn(FOODS,key)?food[FOODS[key]]:null;
        if(!item)return null;
        source='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg(item[1]));
      }
      const image=document.createElement('img');
      image.hidden=true;image.alt='';image.dataset.propImage=key;
      // No onload callback, timers or game references: subsequent live frames
      // observe readiness; loading after retirement cannot restart a game.
      images.set(key,image);document.body.appendChild(image);image.src=source;
      return image;
    }
    function draw(ctx,emoji,x,y,size) {
      if(!ctx||![x,y,size].every(Number.isFinite)||size<=0)return false;
      const key=normalize(emoji),atlas=Object.hasOwn(ATLASES,key)?ATLASES[key]:null;
      const image=atlas?atlases[atlas[0]]:imageFor(key);
      if(!image?.complete||!(image.naturalWidth>0&&image.naturalHeight>0))return false;
      if(atlas&&(image.naturalWidth!==1254||image.naturalHeight!==1254))return false;
      ctx.save();
      try {
        ctx.imageSmoothingEnabled=!atlas&&!Object.hasOwn(PICTURES,key);
        if(atlas){
          const [fx,fy,side]=atlas[1],clip=atlas[2]||[fx,fy,fx+side,fy+side];
          const [left,top,right,bottom]=clip,scale=size/side;
          ctx.drawImage(image,left,top,right-left,bottom-top,
            x+(left-fx)*scale,y+(top-fy)*scale,(right-left)*scale,(bottom-top)*scale);
        }else{
          const scale=size/Math.max(image.naturalWidth,image.naturalHeight);
          const w=image.naturalWidth*scale,h=image.naturalHeight*scale;
          ctx.drawImage(image,x+(size-w)/2,y+(size-h)/2,w,h);
        }
        return true;
      }catch(_){return false;}finally{ctx.restore();}
    }
    return {iconHTML,draw};
  }
  const root=typeof globalThis!=='undefined'?globalThis:window;
  root.NaotocchiPropIllustrations={create, definitions:{art:ART,props:PROPS,symbols:SYMBOLS,food:FOODS,pictures:PICTURES}};
})();

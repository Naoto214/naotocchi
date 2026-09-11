// Geometry assertions for the three reported mobile regressions. This file is
// loaded only by the development QA page and the browser test, never the game.
(function (root) {
  function measureDialogs(doc = document) {
    const win=doc.defaultView;
    const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
    const visible=e=>e && e.getClientRects().length && win.getComputedStyle(e).visibility!=='hidden';
    const errors=[];
    const inside=r=>r.x>=-1 && r.y>=-1 && r.right<=win.innerWidth+1 && r.bottom<=win.innerHeight+1;
    const result={width:win.innerWidth,height:win.innerHeight,errors};
    const bubble=doc.getElementById('speechBubble');
    if(visible(bubble)) {
      const frames=[...doc.querySelectorAll('#petSprite .character-asset,.partner-emoji .character-asset,.companion-chip-small .character-asset')].filter(visible).map(img=>{
        const r=rect(img), asset=img.getAttribute('src').split('?')[0];
        const b=win.NaotocchiCastBounds?.[asset]?.box || [0,0,128,128];
        return {x:r.x+r.width*b[0]/128,y:r.y+r.height*b[1]/128,right:r.x+r.width*b[2]/128,bottom:r.y+r.height*b[3]/128};
      });
      const extra=[...doc.querySelectorAll('#petAccessory:not(.hidden),.partner-heart')].filter(visible).map(rect);
      const bodies=[...frames,...extra];
      const r=rect(bubble), top=Math.min(...bodies.map(b=>b.y)), bottom=Math.max(...bodies.map(b=>b.bottom));
      const gap=r.bottom<=top?top-r.bottom:r.y>=bottom?r.y-bottom:-1;
      result.speech={...r,castTop:top,castBottom:bottom,gap};
      if(!inside(r)) errors.push('dialogue leaves the viewport');
      if(gap<0 || gap>48) errors.push('dialogue is detached from or covers the painted cast');
    }
    const toast=doc.getElementById('mgResultToast');
    if(visible(toast)) {
      const score=toast.querySelector('.mg-result-score'), sub=toast.querySelector('.mg-result-sub');
      const rows=e=>{
        const range=doc.createRange();range.selectNodeContents(e);
        return [...new Set([...range.getClientRects()].filter(r=>r.width>0).map(r=>Math.round(r.y)))].length;
      };
      result.result={...rect(toast),scoreLines:rows(score),noteLines:rows(sub)};
      if(!inside(rect(toast))) errors.push('result leaves the viewport');
      if(visible(bubble)) {
        const a=rect(toast), b=rect(bubble);
        if(a.x<b.right && a.right>b.x && a.y<b.bottom && a.bottom>b.y) errors.push('result overlaps dialogue');
      }
      if(rows(score)!==1 || rows(sub)>2) errors.push('result text collapses into vertical strips');
      const button=toast.querySelector('button');
      if(button && (rect(button).width<44 || rect(button).height<44)) errors.push('retry target is smaller than 44px');
    }
    const quit=doc.getElementById('mgQuit');
    if(visible(quit)) {
      result.game=rect(doc.getElementById('minigameOverlay'));
      result.controls=[...quit.querySelectorAll('button')].filter(visible).map(e=>{
        const r=rect(e), hit=doc.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
        const clickable=hit===e || e.contains(hit);
        if(!inside(r) || !clickable) errors.push(e.id+' is offscreen or covered');
        if(r.width<44 || r.height<44) errors.push(e.id+' is smaller than 44px');
        if(e.scrollWidth>e.clientWidth+1) errors.push(e.id+' text overflows');
        return {id:e.id,...r,clickable};
      });
    }
    return result;
  }
  const resultSpecimen='<span class="mg-rank rank-C">C</span><div class="mg-result-body"><span class="mg-result-score">43点</span><span class="mg-result-sub">はじめての記録!</span></div><button type="button" class="mg-retry-btn">🔁 もういちど</button>';
  if(typeof module==='object' && module.exports) module.exports={measureDialogs,resultSpecimen};
  else {
    const report=()=>{
      const doc=document.getElementById('game')?.contentDocument;
      if(doc) document.getElementById('result').textContent=JSON.stringify(measureDialogs(doc),null,2);
    };
    document.getElementById('dialogMeasure').onclick=report;
    document.getElementById('dialogResult').onclick=()=>{
      const doc=document.getElementById('game').contentDocument, toast=doc.getElementById('mgResultToast');
      toast.innerHTML=resultSpecimen;toast.classList.remove('hidden');toast.style.animation='none';report();
    };
    document.getElementById('dialogLong').onclick=()=>{
      const doc=document.getElementById('game').contentDocument;
      doc.getElementById('speechText').textContent='いっしょにいろんなところへ出かけよう。'.repeat(12);
      doc.getElementById('speechBubble').classList.remove('hidden');report();
    };
  }
})(typeof window==='undefined'?null:window);

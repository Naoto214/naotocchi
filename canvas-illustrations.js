// Canvas presentation only. Text/data keys and game state remain owned by callers.
(() => {
  'use strict';
  const TOKENS=/\uE000|\p{Regional_Indicator}{2}|[#*0-9][\uFE0E\uFE0F]?\u20E3|\p{Extended_Pictographic}[\uFE0E\uFE0F]?\p{Emoji_Modifier}?(?:[\u{E0020}-\u{E007E}]+\u{E007F})?(?:\u200D\p{Extended_Pictographic}[\uFE0E\uFE0F]?\p{Emoji_Modifier}?(?:[\u{E0020}-\u{E007E}]+\u{E007F})?)*/gu;
  const tokenMatches=text=>[...text.matchAll(TOKENS)].filter(match=>!/^[©®]\uFE0E?$/.test(match[0]));
  const ready=image=>!!(image?.complete&&image.naturalWidth>0&&image.naturalHeight>0);
  function create({document,resolve}) {
    const sources=new Map(),external=new WeakMap(),proxies=new WeakMap(),originals=new WeakMap();
    let version=0;
    function observe(image) {
      let settle;
      const entry={image,done:false,promise:new Promise(done=>{settle=done;})};
      const finish=()=>{
        if(entry.done)return;
        entry.done=true;version++;
        image.removeEventListener?.('load',finish);image.removeEventListener?.('error',finish);
        settle(ready(image));
      };
      image.addEventListener?.('load',finish);image.addEventListener?.('error',finish);
      entry.finish=finish;
      return entry;
    }
    function description(emoji) {
      try{return resolve?.(emoji)||null;}catch(_){return null;}
    }
    function imageEntry(desc) {
      if(!desc)return null;
      if(desc.image) {
        let entry=external.get(desc.image);
        if(!entry){entry=observe(desc.image);external.set(desc.image,entry);if(desc.image.complete)entry.finish();}
        return entry;
      }
      const key=desc.asset||desc.svg;
      if(!key)return null;
      if(sources.has(key))return sources.get(key);
      try {
        const image=document.createElement('img'),entry=observe(image);
        sources.set(key,entry);image.alt='';
        image.src=desc.asset||'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(desc.svg);
        if(image.complete)entry.finish();
        return entry;
      }catch(_){sources.set(key,null);return null;}
    }
    function placeholder(ctx,x,y,size) {
      // A small drawn tile keeps the original hit/decoration box occupied while
      // loading or after failure. It never introduces a platform emoji glyph.
      ctx.fillStyle='#eedbb6';ctx.fillRect(x+size*.12,y+size*.12,size*.76,size*.76);
      ctx.fillStyle='#ad9477';ctx.fillRect(x+size*.3,y+size*.3,size*.4,size*.4);
    }
    function drawResolved(ctx,desc,x,y,size) {
      const entry=imageEntry(desc),image=entry?.image;
      ctx.save();
      try {
        if(ready(image)) {
          ctx.imageSmoothingEnabled=!!desc.svg;
          const frame=desc.frame;
          if(frame) {
            if(frame.length===4&&frame.every(Number.isFinite)&&frame[0]>=0&&frame[1]>=0&&frame[2]>0&&frame[3]>0
              &&frame[0]+frame[2]<=image.naturalWidth&&frame[1]+frame[3]<=image.naturalHeight) {
              const scale=size/Math.max(frame[2],frame[3]),w=frame[2]*scale,h=frame[3]*scale;
              const clip=desc.clipBounds||[frame[0],frame[1],frame[0]+frame[2],frame[1]+frame[3]];
              if(clip.length===4&&clip.every(Number.isFinite)&&clip[0]>=frame[0]&&clip[1]>=frame[1]
                &&clip[2]<=frame[0]+frame[2]&&clip[3]<=frame[1]+frame[3]&&clip[2]>clip[0]&&clip[3]>clip[1]) {
                // Crop inside the original frame without enlarging or moving
                // the motif when neighboring atlas pixels are excluded.
                ctx.drawImage(image,clip[0],clip[1],clip[2]-clip[0],clip[3]-clip[1],
                  x+(size-w)/2+(clip[0]-frame[0])*scale,y+(size-h)/2+(clip[1]-frame[1])*scale,
                  (clip[2]-clip[0])*scale,(clip[3]-clip[1])*scale);
                return true;
              }
            }
          }else {
            const scale=size/Math.max(image.naturalWidth,image.naturalHeight),w=image.naturalWidth*scale,h=image.naturalHeight*scale;
            ctx.drawImage(image,x+(size-w)/2,y+(size-h)/2,w,h);
            return true;
          }
        }
      }catch(_){/* A failed decode/draw must not interrupt a game frame. */}
      finally{ctx.restore();}
      ctx.save();try{placeholder(ctx,x,y,size);}finally{ctx.restore();}
      return true;
    }
    function drawSymbol(context,emoji,x,y,size) {
      const ctx=originals.get(context)||context;
      if(!ctx||![x,y,size].every(Number.isFinite)||size<=0)return false;
      return drawResolved(ctx,description(emoji),x,y,size);
    }
    function fontSize(ctx) {return Number(/([\d.]+)px\b/.exec(ctx.font||'')?.[1])||12;}
    function topAt(ctx,metrics,y,size) {
      const a=metrics.actualBoundingBoxAscent,d=metrics.actualBoundingBoxDescent;
      if(Number.isFinite(a)&&Number.isFinite(d)&&a+d>0)return y-a+(a+d-size)/2;
      return y-({top:0,hanging:.2,middle:.5,alphabetic:.85,ideographic:1,bottom:1}[ctx.textBaseline]??.85)*size;
    }
    function fillText(ctx,native,args) {
      const text=String(args[0]),matches=tokenMatches(text);
      if(!matches.length)return native.apply(ctx,args);
      const x=Number(args[1]),y=Number(args[2]),max=args.length>3?Number(args[3]):Infinity;
      if(!Number.isFinite(x)||!Number.isFinite(y)||!(max>0))return;
      const size=fontSize(ctx),pieces=[];
      let index=0,measureText=text;
      // The private actor marker has no font glyph. Its original sprite keeps
      // the same text advance as before while resolving to the current asset.
      for(const match of matches) {
        const desc=description(match[0]);
        if(match.index>index)pieces.push({text:text.slice(index,match.index)});
        pieces.push({emoji:match[0],desc,measure:desc?.emoji||match[0]});
        index=match.index+match[0].length;
      }
      if(index<text.length)pieces.push({text:text.slice(index)});
      measureText=pieces.map(p=>p.text??(p.emoji==='\uE000'&&!p.desc?.emoji?'\u3000':p.measure)).join('');
      const total=ctx.measureText(measureText).width;
      if(!(total>0))return;
      const scale=Math.min(1,max/total),width=total*scale;
      const rtl=ctx.direction==='rtl'||(ctx.direction==='inherit'&&(ctx.canvas?.dir||document?.documentElement?.dir)==='rtl');
      const align=ctx.textAlign;
      const right=align==='right'||align==='end'&&!rtl||align==='start'&&rtl;
      const left=x-(align==='center'?width/2:right?width:0);
      ctx.save();
      try {
        ctx.translate(left,0);if(scale!==1)ctx.scale(scale,1);
        ctx.textAlign='left';
        let prefix='';
        for(const piece of pieces) {
          const offset=ctx.measureText(prefix).width;
          if(piece.text!=null) {native.call(ctx,piece.text,offset,y);prefix+=piece.text;continue;}
          const glyph=piece.emoji==='\uE000'&&!piece.desc?.emoji?'\u3000':piece.measure;
          const metrics=ctx.measureText(glyph),advance=ctx.measureText(prefix+glyph).width-offset;
          drawResolved(ctx,piece.desc,offset+(advance-size)/2,topAt(ctx,metrics,y,size),size);
          prefix+=glyph;
        }
      }finally{ctx.restore();}
    }
    function canvas(context) {
      if(!context||originals.has(context))return context;
      if(proxies.has(context))return proxies.get(context);
      const methods=new Map();
      const proxy=new Proxy(context,{
        get(target,key) {
          const value=Reflect.get(target,key,target);
          if(typeof value!=='function')return value;
          if(!methods.has(key))methods.set(key,key==='fillText'?(...args)=>fillText(target,value,args):value.bind(target));
          return methods.get(key);
        },
        set(target,key,value){return Reflect.set(target,key,value,target);},
      });
      proxies.set(context,proxy);originals.set(proxy,context);return proxy;
    }
    function prepare(symbols=[]) {
      const values=typeof symbols==='string'?[symbols]:Array.from(symbols);
      const tokens=values.flatMap(value=>tokenMatches(String(value)).map(m=>m[0]));
      const entries=tokens.map(token=>imageEntry(description(token)));
      return Promise.all(entries.filter(Boolean).map(entry=>entry.promise));
    }
    return {canvas,drawSymbol,prepare,get version(){return version;}};
  }
  const root=typeof globalThis!=='undefined'?globalThis:window;
  root.NaotocchiCanvasIllustrations={create};
})();

// Read-only display observation. Never reads game closures, advances RNG,
// suppresses rendering, or changes the official rules. Coordinates are logical.
export function observeOfficialCanvas(ctx,{renderText}={}){
 let items=[],path=[],matrix=[1,0,0,1,0,0],clipped=false,stack=[];
 const point=(x,y)=>({x:matrix[0]*x+matrix[2]*y+matrix[4],y:matrix[1]*x+matrix[3]*y+matrix[5]});
 const color=c=>String(c).replace(/\s/g,'').replace(/#([0-9a-f])([0-9a-f])([0-9a-f])$/i,'#$1$1$2$2$3$3').replace(/,0\./g,',.');
 const style=()=>({fill:color(ctx.fillStyle),stroke:color(ctx.strokeStyle),alpha:Number.isFinite(ctx.globalAlpha)?ctx.globalAlpha:1,font:String(ctx.font),width:ctx.lineWidth,clipped});
 const wrap=(name,before)=>{const original=ctx[name].bind(ctx);ctx[name]=function(...args){before(...args);return original(...args);};};
 const push=item=>{if(items.length<4096)items.push({...style(),...item});};
 wrap('save',()=>stack.push({matrix:matrix.slice(),clipped}));
 wrap('restore',()=>{const s=stack.pop();if(s){matrix=s.matrix;clipped=s.clipped;}});
 wrap('translate',(x,y)=>{const p=point(x,y);matrix[4]=p.x;matrix[5]=p.y;});
 wrap('scale',(x,y)=>{matrix[0]*=x;matrix[1]*=x;matrix[2]*=y;matrix[3]*=y;});
 wrap('rotate',r=>{const [a,b,c,d]=matrix,C=Math.cos(r),S=Math.sin(r);matrix[0]=a*C+c*S;matrix[1]=b*C+d*S;matrix[2]=c*C-a*S;matrix[3]=d*C-b*S;});
 wrap('beginPath',()=>{path=[];});
 wrap('moveTo',(x,y)=>path.push({kind:'move',...point(x,y)}));
 wrap('lineTo',(x,y)=>path.push({kind:'line',...point(x,y)}));
 wrap('arc',(x,y,r)=>path.push({kind:'arc',...point(x,y),r}));
 wrap('rect',(x,y,w,h)=>path.push({kind:'rect',...point(x,y),w,h}));
 wrap('clip',()=>{clipped=true;});
 wrap('stroke',()=>push({kind:'stroke',path:path.map(p=>({...p}))}));
 wrap('fill',()=>push({kind:'fill',path:path.map(p=>({...p}))}));
 wrap('strokeRect',(x,y,w,h)=>push({kind:'strokeRect',...point(x,y),w,h}));
 wrap('fillRect',(x,y,w,h)=>push({kind:'rect',...point(x,y),w,h}));
 const recordText=(text,x,y)=>push({kind:'text',text:String(text),...point(x,y)});
 const nativeText=ctx.fillText.bind(ctx);ctx.fillText=(...args)=>{recordText(...args);return (renderText||nativeText)(...args);};
 return {recordText,reset(){items=[];},read(){return items;}};
}

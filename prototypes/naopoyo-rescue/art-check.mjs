import {loadSprites,drawSprite,speciesNames} from './sprites.mjs';
import {drawGate,drawExit,drawCondition} from './fixtures.mjs';
const root=document.querySelector('#samples');
function row(title,paint){const h=document.createElement('h2');h.textContent=title;const c=document.createElement('canvas');c.width=672;c.height=84;c.style.cssText='width:min(336px,100%);aspect-ratio:8/1;background:#e8efe0';const ctx=c.getContext('2d');ctx.scale(84,84);paint(ctx);root.append(h,c)}
const failed=await loadSprites();
for(const [species,name]of Object.entries(speciesNames))row(name,c=>{for(let i=0;i<8;i++){drawSprite(c,species,i+1,{x:i+.08,y:.035,w:.84,h:.65});c.fillStyle='#243d4a';c.font='bold .235px monospace';c.textAlign='center';c.fillText(String(i+1).padStart(2,'0'),i+.5,.91)}});
for(const species of Object.keys(speciesNames))row(speciesNames[species]+' 条件札',c=>{for(let i=0;i<8;i++){const f={x:i,y:0,species,...(i%3===0?{exact:i+1}:i%3===1?{min:i+1}:{max:i+1})};if(i%2)drawGate(c,f);else drawExit(c,f);drawCondition(c,f)}});
row('開門前 → 開門後 → 通過中',c=>{for(let i=0;i<3;i++){const f={x:i*2,y:0,species:'dog',min:2,open:i>0};drawGate(c,f,1,i===2);if(i===2)drawSprite(c,'frog',8,{x:4.30,y:.16,w:.64,h:.51});drawCondition(c,f)}});
document.querySelector('#status').textContent=failed.length?'画像読込エラー：再読み込みしてください。':'正式32枚＋ものしりふくろう 読み込み完了';

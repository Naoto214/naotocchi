// Shared, opt-in environmental presentation. No world or gameplay mutations.
export function installWind(material,clock,amplitude=3){
 material.userData.livingWind={clock,amplitude};
 const prior=material.onBeforeCompile;
 material.onBeforeCompile=function(shader,...rest){prior.call(this,shader,...rest);shader.uniforms.livingTime=clock;shader.uniforms.livingWind={value:amplitude};
  shader.vertexShader='uniform float livingTime; uniform float livingWind;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
    #ifdef USE_INSTANCING
      float phase = instanceMatrix[3].x * .012 + instanceMatrix[3].z * .008;
      float wave = sin(livingTime * .85 + phase) + .35 * sin(livingTime * 1.43 + phase * .7);
      mvPosition.x += wave * livingWind * clamp(position.y + .55, 0., 1.);
      gl_Position = projectionMatrix * mvPosition;
    #endif`);
 };
 material.customProgramCacheKey=()=> 'living-wind-v1';material.needsUpdate=true;
}
export function drawProjectedLife(ctx,actors,project,time){
 for(const a of actors||[]){if(a.kind==='car')continue;const p=project(a.x,a.y,a.z);if(!p)continue;const q=project(a.x,a.y+60,a.z);const k=Math.max(.35,Math.min(1.6,q?Math.abs(q.sy-p.sy)/25:.7));
  ctx.save();ctx.translate(p.sx,p.sy);ctx.scale(k*a.direction,k);const flap=Math.sin(time*.012+a.phase);
  if(a.kind==='bird'){ctx.strokeStyle='#344c4c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-13,-5-flap*6);ctx.quadraticCurveTo(-6,-7,0,0);ctx.quadraticCurveTo(6,-7,13,-5-flap*6);ctx.stroke();}
  if(a.kind==='butterfly'){ctx.fillStyle='#eac279';ctx.beginPath();ctx.ellipse(-3,0,2+Math.abs(flap)*4,5,-.3,0,Math.PI*2);ctx.ellipse(3,0,2+Math.abs(flap)*4,5,.3,0,Math.PI*2);ctx.fill();}
  if(a.kind==='fish'){ctx.globalAlpha=.65;ctx.fillStyle='#2c7182';ctx.beginPath();ctx.ellipse(0,0,12,4,0,0,Math.PI*2);ctx.moveTo(-9,0);ctx.lineTo(-18,5+flap*2);ctx.lineTo(-18,-5+flap*2);ctx.closePath();ctx.fill();}
  if(a.kind==='pedestrian'){ctx.fillStyle='#d9b89c';ctx.beginPath();ctx.arc(0,-27,4,0,Math.PI*2);ctx.fill();ctx.fillStyle=a.id%2?'#597b91':'#bb886b';ctx.fillRect(-5,-22,10,14);ctx.strokeStyle='#43535d';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-2,-8);ctx.lineTo(-3-flap*3,0);ctx.moveTo(2,-8);ctx.lineTo(3+flap*3,0);ctx.stroke();}
  ctx.restore();
 }
}

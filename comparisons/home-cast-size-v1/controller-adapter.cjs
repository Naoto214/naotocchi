// Generate the adapter in the comparison copy only. Keep route geometry,
// collision radii, official fit and model.sync inputs at their native sizes.
const {replaceOnce} = require('./rewrite.cjs');

function adaptController(source) {
  const replace = (from, to) => { source = replaceOnce(source, from, to); };
  // paint() already knows each actor's actual foot and gives body, equipment,
  // shadow and foreground mask matching transforms. Reuse that one local value.
  replace('depthScale=scene.navigation?.depthScale?.(a)||1;',
    'depthScale=(scene.navigation?.depthScale?.(a)||1)*env.HomeCastTrial.scale(a.kind);');
  // This is screen picking only. Preserve the priority and enlarged fallback
  // of the native hit test, plus its exact 100% behavior.
  replace('const bodyHit=a=>Math.abs(p.x-a.x)<=a.w*kx/2&&p.y>=a.y-a.h*ky&&p.y<=a.y;',
    `const bodyHit=a=>{
        const scale=env.HomeCastTrial.scale(a.kind);
        return Math.abs(p.x-a.x)<=a.w*kx*scale/2&&p.y>=a.y-a.h*ky*scale&&p.y<=a.y;
      };`);
  // Hold the model's clock without cancelling targets or advancing a catch-up
  // step on resume. The pinned environment clock is held by its own bridge.
  replace('for(let remaining=dt;remaining>1e-8;remaining-=.1)model.step',
    'for(let remaining=env.HomeCastTrial.settings.paused?0:dt;remaining>1e-8;remaining-=.1)model.step');
  replace('if(!blocked()){wasBlocked=false;model.step(0,',
    'if(!blocked()&&!env.HomeCastTrial.settings.paused){wasBlocked=false;model.step(0,');
  replace('function down(e){if(!enabled)return;', 'function down(e){if(!enabled||env.HomeCastTrial.settings.paused)return;');
  replace('function keydown(e){if(blocked())return;', 'function keydown(e){if(blocked()||env.HomeCastTrial.settings.paused)return;');
  replace("      paint();\n    }\n    let residentEnvelopeKey", `      paint();
      if(!env.HomeCastTrial.ready)trialSeatedNavigation=scene.navigation;
    }
    let residentEnvelopeKey`);
  replace('let paintedBodyScale=null,bodyScaleTime=0,paintedLandscape=null;',
    'let paintedBodyScale=null,bodyScaleTime=0,paintedLandscape=null,trialSeatedNavigation=null;');
  replace('return {model,update,sync,interrupt,prepareNewborn',
    `const trialController={
      repaint:paint,clearGesture,
      presentation(){
        const p=env.NaotocchiHomeViewport?.residentPresentation?.();
        const native=world?.stats(), beauty=env.HomeBeauty, box=beauty.paintRect;
        if(!native?.loaded||native.region!==beauty.settings.region||!scene?.navigation||
           !env.NaotocchiHomeViewport||pendingResidentPresentation||scene.navigation!==trialSeatedNavigation||
           !box?.width||!box.height||rows.size!==beauty.settings.count||
           stage.dataset.worldRenderer!=='art-25d'||doc.visibilityState==='hidden')return null;
        if(doc.getElementById('device')?.dataset.homeFixed==='true'&&!p)return null;
        const metrics=JSON.parse(stage.dataset.livingMetrics||'{}');
        const key=[native.region,native.projectionRevision,rows.size,p?.scaleX,p?.scaleY,p?.bodyScale,
          box.width,box.height,scene.width,scene.height].join('/');
        return {key,revision:native.projectionRevision,metricRevision:metrics.world?.projectionRevision,frame:frames};
      },
      inspect(){
        if(!scene)return [];
        const p=env.NaotocchiHomeViewport?.residentPresentation?.();
        const stageBox=stage.getBoundingClientRect();
        return model.snapshot().map(a=>{
          const row=rows.get(a.key);
          return {key:a.key,kind:a.kind,id:a.id,asset:row?.asset,label:row?.label,x:a.x,y:a.y,
            w:a.w,h:a.h,depth:scene.navigation?.depthScale?.(a)||1,
            foot:{x:stageBox.left+a.x*(p?.scaleX||1),y:stageBox.top+a.y*(p?.scaleY||1)},
            selected:model.selected()===a.key,activity:a.activity,direction:a.direction,
            target:a.target,source:a.source,route:a.route};
        });
      }
    };
    env.HomeCastTrial.attach(trialController);
    return {model,update,sync,interrupt,prepareNewborn`);
  replace("destroy(){env.removeEventListener?.('dayparts-qa-change'", "destroy(){env.HomeCastTrial.detach(trialController);env.removeEventListener?.('dayparts-qa-change'");
  return source;
}
module.exports = {adaptController};

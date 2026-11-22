// Instrument only the separate historical owl replay. The ordinary homes keep
// their original model instances, clock and drawing functions.
const {replaceExact}=require('../home-finish-v5/native-hooks.cjs');

function owlObservation(source){
  const move="    function move(key,p,source='tap',{pointerDrop=false}={}){";
  const observer=`    function move(key,p,source='tap',options={}){
      const capture=globalThis.OwlReplayCapture;
      if (!capture || source!=='ambient' || key!=='companion:owl' || Math.abs(clock-2)>.00001)
        return owlNativeMove(key,p,source,options);
      capture.before(p,clock);
      const accepted=owlNativeMove(key,p,source,options);
      capture.result(accepted);
      return accepted;
    }
`;
  return replaceExact(source,move,observer+move.replace('function move','function owlNativeMove'));
}
function owlPainting(source){
  const paint='    function paint(){';
  return replaceExact(source,paint,`    let recordedOwlHousehold=null;
    const liveOwlHousehold=model;
    function projection(){
      const box=stage.getBoundingClientRect(),portrait=env.NaotocchiHomeViewport?.residentPresentation?.();
      return portrait && {scale:[portrait.scaleX,portrait.scaleY],stage:[box.left,box.top]};
    }
    globalThis.OwlReplayPaint=Object.freeze({
      projection,
      show(household){
        recordedOwlHousehold=household;
        paint();
        const row=rows.get('companion:owl'),box=stage.getBoundingClientRect();
        const portrait=env.NaotocchiHomeViewport?.residentPresentation?.();
        if(!row||!portrait||!scene?.navigation)throw Error('Forest projection unavailable');
        return {scale:[portrait.scaleX,portrait.scaleY],stage:[box.left,box.top],
          bodyTranslation:row.owner.style.translate.split(' ').map(Number.parseFloat),
          feet:[...rows].map(([key,r])=>[key,Number.parseFloat(r.shadow.style.left),Number.parseFloat(r.shadow.style.top)]),
          owl:[box.left+Number.parseFloat(row.shadow.style.left)*portrait.scaleX,box.top+Number.parseFloat(row.shadow.style.top)*portrait.scaleY]};
      }
    });
`+paint+'\n      const model=recordedOwlHousehold || liveOwlHousehold;');
}
module.exports={owlObservation,owlPainting};

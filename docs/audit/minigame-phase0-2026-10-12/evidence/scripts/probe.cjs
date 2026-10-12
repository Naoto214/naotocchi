const path='/home/user/naotocchi/tests/helpers/runtime-harness.cjs';
const {harness}=require(path);
function run(score, sodachiGain){
  const h=harness(),s=h.api.state();
  Object.assign(s,{stage:'growing',isSleeping:false,isSick:false,energy:100,health:100,hunger:80,transformMeter:0});
  if(sodachiGain){ s.growth = h.api.sodachiCost(s.sodachi)-0.1; }
  let done;const game={id:'probe-x',start(_c,d){done=d;}};s.lifetime.minigamePlayCounts[game.id]=10;h.api.render();
  h.api.tryStartPlay(game);
  const before=h.get('petSprite').animations.length, sod=s.sodachi;
  done(score); h.advance(1);
  const after=h.get('petSprite').animations.length;
  const toastHidden=h.get('mgResultToast').classList.contains('hidden');
  const bubble=!h.get('speechBubble').classList.contains('hidden');
  console.log(JSON.stringify({score,sodachiGain,sodachiDelta:s.sodachi-sod,petAnimsAt1ms:after-before,toastHiddenAt1ms:toastHidden,bubbleAt1ms:bubble,text:h.get('speechText').textContent}));
}
run(90,false);run(10,false);run(50,false);run(50,true);run(90,true);

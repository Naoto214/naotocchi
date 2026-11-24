// The clock is reset once before this sampler. No seeking or simulation during observation.
async ({duration, checkpoints, active}) => {
  const source = document.querySelector('.home-art-canvas');
  const thumb = document.createElement('canvas');
  thumb.width = 208;
  thumb.height = Math.round(208 * source.height / source.width);
  const ctx = thumb.getContext('2d', {willReadFrequently:true});
  const read = () => {
    ctx.drawImage(source, 0, 0, thumb.width, thumb.height);
    return ctx.getImageData(0, 0, thumb.width, thumb.height).data;
  };
  const cast = document.querySelector('#castStage');
  const poses = () => [...cast.querySelectorAll('[data-diorama-actor]')].map(n => [n.dataset.dioramaActor,n.style.translate,n.style.scale]);
  const start = performance.now(), initialPoses = poses();
  let last = start, maxGap = 0, callbacks = 0;
  const records = [], previous = new Map(), dismissed=[];
  await new Promise(resolve => {
    function tick(now) {
      const wall=(now-start)/1000, t=active?HomeBeauty.clockSeconds:wall;
      // Use the player's real defer button when tracking 180 *active* seconds.
      const invite=document.getElementById('companionInviteOverlay');
      if(active && invite && !invite.classList.contains('hidden') && invite.getClientRects().length){
        document.getElementById('companionInviteLaterBtn').click();
        dismissed.push({wall,clock:HomeBeauty.clockSeconds});
      }
      maxGap = Math.max(maxGap, now-last);
      last = now; callbacks++;
      const k = checkpoints[records.length];
      if (k !== undefined && t >= k-0.5 && !previous.has(k)) {
        previous.set(k, {data:read(), t, clock:HomeBeauty.clockSeconds});
      } else if (k !== undefined && t >= k) {
        const old = previous.get(k), data = read();
        let changed = 0, total = 0;
        for (let i=0; i<data.length; i+=4) {
          const delta = Math.max(Math.abs(data[i]-old.data[i]), Math.abs(data[i+1]-old.data[i+1]), Math.abs(data[i+2]-old.data[i+2]));
          if(delta>=4) changed++;
          total+=delta;
        }
        records.push({checkpoint:k,wall,clock:HomeBeauty.clockSeconds,windowSeconds:t-old.t,clockDelta:HomeBeauty.clockSeconds-old.clock,
          changedPercent:100*changed/(data.length/4),meanChannelMax:total/(data.length/4),poses:poses(),
          paused:cast.dataset.dioramaPaused,speech:!document.getElementById('speechBubble')?.classList.contains('hidden'),
          image:thumb.toDataURL('image/jpeg',.89)});
        previous.delete(k);
        window.v4Checkpoint(k);
      }
      if((t>=duration && records.length===checkpoints.length) || wall>330) resolve();
      else requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
  return {records,dismissed,callbacks,maxGap,initialPoses,wall:(performance.now()-start)/1000,
    width:source.width,height:source.height,visible:document.visibilityState};
}

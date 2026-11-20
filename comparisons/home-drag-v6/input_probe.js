// Wall time and visible gesture feedback around trusted browser dispatch.
(() => {
  const qa = window.touchQA;
  for (const type of ['pointerdown','pointermove','pointerup','pointercancel']) {
    document.addEventListener(type, e => {
      if (!qa.log) return;
      qa.log.phase=type;
      (qa.log.inputTimes ||= {})[type] = {begin:performance.now(),eventStamp:e.timeStamp};
    }, true);
    document.addEventListener(type, e => {
      const log=qa.log, sample=log?.inputTimes?.[type];
      if(!sample)return;
      sample.end=performance.now();
      log.phase='simulation';
      if(type==='pointerdown'&&log.visualDown?.visible&&log.visualDown.key===qa.key) sample.timeToVisual=sample.end-e.timeStamp;
      if(type==='pointerup'||type==='pointercancel') {
        sample.gate=qa.gates();
        requestAnimationFrame(()=>{sample.frame=performance.now();});
      }
      const marker=document.querySelector('.diorama-target');
      (log.markers||=[]).push([type,marker?.hidden===false,marker?.className,marker?.dataset?.state||null]);
    });
  }
})();

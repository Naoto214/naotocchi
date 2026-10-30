// Advance at most one operation per frame, after the previous animation ends.
export function playbackClock(clock, delta, playing, moving){
 if(!playing)return {elapsed:0,advance:false};
 const elapsed=clock.elapsed+Math.max(0,delta);
 if(elapsed>=1700&&!moving)return {elapsed:0,advance:true};
 return {elapsed,advance:false};
}

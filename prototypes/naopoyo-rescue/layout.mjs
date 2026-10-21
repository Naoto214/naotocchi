// Responsive board geometry. Never changes the engine grid or pointer coordinates.
export function boardSize(width,height){
 const w=Math.max(0,Math.min(width,height*8/6));return {width:w,height:w*6/8};
}
export function fitBoard(host,frame){
 const fit=()=>{
  // Frame owns a 1px border on each side. Canvas remains exactly 8:6 inside it.
  const bounds=host.getBoundingClientRect();
  const size=boardSize(bounds.width-2,bounds.height-2);
  frame.style.width=`${size.width+2}px`;
 };
 new ResizeObserver(fit).observe(host);fit();
 // Safari's browser chrome / orientation can resize the visual viewport mid-session.
 window.visualViewport?.addEventListener('resize',fit);
}

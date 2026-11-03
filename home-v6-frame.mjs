// Removing the document releases its animation loop, world and decoded images.
export function releaseFrame(frame){frame.onload=null;delete frame.dataset.ready;frame.src='about:blank';}

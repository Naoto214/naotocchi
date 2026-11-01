// Original artwork is immutable. Local, smoothly tapered SVG contour displacement.
export const patches=[{x:211,y:326,r:145,dx:20,dy:10},{x:322,y:175,r:85,dx:8,dy:16},{x:512,y:865,r:57,dx:0,dy:-10}];
export function artwork(face,id='contour13',uri='displacement.png'){
 const copy=face.replace(/v6-\d+/g,m=>m+'-local');
 return `<g data-v13-contour="local"><defs><radialGradient id="${id}-fade"><stop offset=".85" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></radialGradient><mask id="${id}-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024">${patches.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="url(#${id}-fade)"/>`).join('')}</mask><filter id="${id}" x="0" y="0" width="1024" height="1024" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feImage href="${uri}" x="0" y="0" width="1024" height="1024" result="map"/><feDisplacementMap in="SourceGraphic" in2="map" scale="80" xChannelSelector="R" yChannelSelector="G"/></filter></defs>${face}<g mask="url(#${id}-mask)"><g filter="url(#${id})">${copy}</g></g></g>`;
}

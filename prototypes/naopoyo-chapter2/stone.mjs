// Shared chapter-two stone silhouette: original wall art, not a new image asset.
export function drawStone(c,x,y){
 c.fillStyle='#4b655a';c.beginPath();c.roundRect(x+.025,y+.055,.95,.93,.13);c.fill();
 c.fillStyle='#8c9c85';c.beginPath();c.roundRect(x+.05,y+.045,.90,.72,.12);c.fill();
 c.fillStyle='#b5c798';c.fillRect(x+.14,y+.075,.70,.065);
 c.strokeStyle='#65735f';c.lineWidth=.04;c.beginPath();c.moveTo(x+.13,y+.55);c.lineTo(x+.47,y+.46);c.lineTo(x+.67,y+.68);c.stroke();
}
export function drawMagicRock(c,g,{pulse=0,occupied=false,variant='A'}={}){
 const {x,y}=g;c.save();drawStone(c,x,y);
 c.strokeStyle=occupied?'#b9f0df':'#436d69';c.lineWidth=.045;c.beginPath();c.roundRect(x+.09,y+.085,.82,.65,.10);c.stroke();
 c.fillStyle=variant==='C'?'#c8f6ed66':'#53665d';c.beginPath();c.roundRect(x+.28,y+.19,.44,.49,.07);c.fill();
 if(pulse>0){c.globalAlpha=pulse*.35;c.fillStyle='#d6fff3';c.beginPath();c.roundRect(x+.035,y+.05,.93,.91,.13);c.fill();c.globalAlpha=1;}
 c.font='900 .46px system-ui';c.textAlign='center';c.textBaseline='middle';c.lineWidth=.035;c.strokeStyle='#344a44';
 if(variant==='B'){c.shadowColor='#b2ffe5';c.shadowBlur=8;}
 c.strokeText(String(g.exact),x+.5,y+.44);c.fillStyle=variant==='C'?'#244c48':'#f6f9de';c.fillText(String(g.exact),x+.5,y+.44);
 c.restore();
}

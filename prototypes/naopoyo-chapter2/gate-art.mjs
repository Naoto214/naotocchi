// A stone arch adapted from PR #445, designs.mjs @ 2b50389d.
// One-cell Canvas art only; collision remains the unchanged v6 full cell.
const tau=Math.PI*2;
function path(c,pts,fill,stroke){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=.018;c.stroke()}}
function rr(c,x,y,w,h,r,col){c.fillStyle=col;c.beginPath();c.roundRect(x,y,w,h,r);c.fill()}
function line(c,pts,col,w=.02){c.strokeStyle=col;c.lineWidth=w;c.lineCap='round';c.lineJoin='round';c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke()}
function oval(c,x,y,rx,ry,col){c.fillStyle=col;c.beginPath();c.ellipse(x,y,rx,ry,0,0,tau);c.fill()}
function moss(c,x,y,s=1){oval(c,x,y,.10*s,.027*s,'#708664');oval(c,x+.07*s,y-.018*s,.07*s,.025*s,'#9daf78');oval(c,x-.04*s,y-.015*s,.045*s,.023*s,'#c2cc8c')}
function number(c,n,x=.50,y=.48,size=.46,col='#f3efd2'){
 // Real-size glyph coordinates avoid subpixel-font quantization at 1-cell scale.
 c.save();c.translate(x,y);c.scale(.01,.01);c.font=`900 ${size*100}px system-ui,sans-serif`;c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';c.lineWidth=4.0;c.strokeStyle='#294941';c.strokeText(String(n),0,1);c.fillStyle=col;c.fillText(String(n),0,0);c.restore();
}
function arch(c){
 c.beginPath();c.moveTo(.075,.92);c.lineTo(.075,.42);c.bezierCurveTo(.075,.14,.23,.055,.50,.055);c.bezierCurveTo(.77,.055,.925,.14,.925,.42);c.lineTo(.925,.92);c.lineTo(.72,.92);c.lineTo(.72,.44);c.bezierCurveTo(.72,.31,.64,.27,.50,.27);c.bezierCurveTo(.36,.27,.28,.31,.28,.44);c.lineTo(.28,.92);c.closePath();
}
export function drawGate(c,g,{front=false}={}) {
 const {pulse=0,occupied=false}=g;
 c.save();c.translate(g.x,g.y);c.beginPath();c.rect(.015,.015,.97,.97);c.clip();
 if(!front){
  c.save();c.globalAlpha*=1-(occupied?.62:pulse*.42);
  oval(c,.50,.93,.44,.043,'#354e463d');
  c.save();c.translate(.025,.045);arch(c);c.fillStyle='#4b655a';c.fill();c.restore();
  arch(c);const grad=c.createLinearGradient(.12,.08,.83,.88);grad.addColorStop(0,'#bdc6a5');grad.addColorStop(.45,'#98a88e');grad.addColorStop(1,'#7d927d');c.fillStyle=grad;c.fill();c.strokeStyle='#4e695b';c.lineWidth=.025;c.stroke();
  c.beginPath();c.moveTo(.115,.38);c.bezierCurveTo(.13,.14,.28,.09,.49,.09);c.bezierCurveTo(.68,.09,.84,.17,.88,.38);c.strokeStyle='#d7dbb9';c.lineWidth=.035;c.stroke();
  line(c,[[.08,.52],[.27,.50]],'#607861');line(c,[[.08,.73],[.28,.71]],'#607861');line(c,[[.73,.53],[.92,.55]],'#607861');line(c,[[.72,.75],[.92,.77]],'#607861');
  line(c,[[.25,.13],[.32,.30]],'#708569');line(c,[[.74,.14],[.67,.30]],'#708569');
  path(c,[[.40,.075],[.60,.075],[.575,.29],[.425,.29]],'#a9b798','#728871');
  moss(c,.23,.12,.8);moss(c,.84,.86,.6);
  const light=c.createLinearGradient(.3,.3,.7,.9);light.addColorStop(0,'#547d7670');light.addColorStop(1,'#9bc7a535');c.fillStyle=light;c.beginPath();c.roundRect(.29,.31,.42,.58,[.20,.20,.02,.02]);c.fill();
  line(c,[[.31,.84],[.31,.43],[.36,.35]],'#c6e2cc',.022);

  c.restore();
  if(pulse>0){
   c.save();c.globalAlpha*=pulse*.28;c.fillStyle='#efffe0';
   c.beginPath();c.roundRect(.285,.30,.43,.61,[.20,.20,.025,.025]);c.fill();c.restore();
  }
  // The condition stays opaque even while the stone becomes translucent.
  if(!occupied)number(c,g.exact,.50,.57,.49,'#fff2d0');
 } else if(occupied) {
  // Cream condition on the jamb; the actor keeps its white number above its head.
  const anchor=g.numberAnchor||{x:.145,y:.58};
  number(c,g.exact,anchor.x,anchor.y,.30,'#fff2b7');
 }
 c.restore();
}

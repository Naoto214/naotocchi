// Design study only. No game state, input, collision or storage code.
export const names={A:'苔むした石アーチ',B:'森の光の結界',C:'古代の石扉',D:'自然石の刻印',E:'ねむり根の輪'};
const tau=Math.PI*2;
function path(c,pts,fill,stroke){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=.018;c.stroke()}}
function rr(c,x,y,w,h,r,col){c.fillStyle=col;c.beginPath();c.roundRect(x,y,w,h,r);c.fill()}
function line(c,pts,col,w=.02){c.strokeStyle=col;c.lineWidth=w;c.lineCap='round';c.lineJoin='round';c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke()}
function oval(c,x,y,rx,ry,col){c.fillStyle=col;c.beginPath();c.ellipse(x,y,rx,ry,0,0,tau);c.fill()}
function moss(c,x,y,s=1){oval(c,x,y,.10*s,.027*s,'#708664');oval(c,x+.07*s,y-.018*s,.07*s,.025*s,'#9daf78');oval(c,x-.04*s,y-.015*s,.045*s,.023*s,'#c2cc8c')}
function number(c,n,x=.50,y=.48,size=.46,col='#f3efd2'){
 // Real-size glyph coordinates avoid subpixel-font quantization at 1-cell scale.
 c.save();c.translate(x,y);c.scale(.01,.01);c.font=`900 ${size*100}px "Arial",sans-serif`;c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';c.lineWidth=3.2;c.strokeStyle='#294941';c.strokeText(String(n),0,1);c.fillStyle=col;c.fillText(String(n),0,0);c.restore();
}
function arch(c){
 c.beginPath();c.moveTo(.075,.92);c.lineTo(.075,.42);c.bezierCurveTo(.075,.14,.23,.055,.50,.055);c.bezierCurveTo(.77,.055,.925,.14,.925,.42);c.lineTo(.925,.92);c.lineTo(.72,.92);c.lineTo(.72,.44);c.bezierCurveTo(.72,.31,.64,.27,.50,.27);c.bezierCurveTo(.36,.27,.28,.31,.28,.44);c.lineTo(.28,.92);c.closePath();
}
export function drawDesign(c,g,{variant='A',phase=0,front=false,occupied=false,effect='halo'}={}){
 const n=g.exact;c.save();c.translate(g.x,g.y);c.beginPath();c.rect(.015,.015,.97,.97);c.clip();
 // Whole fixture ghosts for matching passage, including the top and jambs.
 const ghost=occupied?.70:phase*.68;
 if(!front){
 c.globalAlpha*=1-ghost;
 oval(c,.50,.93,.44,.043,'#354e463d');
 if(variant==='A'){
  c.save();c.translate(.025,.045);arch(c);c.fillStyle='#4b655a';c.fill();c.restore();
  arch(c);const grad=c.createLinearGradient(.12,.08,.83,.88);grad.addColorStop(0,'#bdc6a5');grad.addColorStop(.45,'#98a88e');grad.addColorStop(1,'#7d927d');c.fillStyle=grad;c.fill();c.strokeStyle='#4e695b';c.lineWidth=.025;c.stroke();
  c.beginPath();c.moveTo(.115,.38);c.bezierCurveTo(.13,.14,.28,.09,.49,.09);c.bezierCurveTo(.68,.09,.84,.17,.88,.38);c.strokeStyle='#d7dbb9';c.lineWidth=.035;c.stroke();
  line(c,[[.08,.52],[.27,.50]],'#607861');line(c,[[.08,.73],[.28,.71]],'#607861');line(c,[[.73,.53],[.92,.55]],'#607861');line(c,[[.72,.75],[.92,.77]],'#607861');
  line(c,[[.25,.13],[.32,.30]],'#708569');line(c,[[.74,.14],[.67,.30]],'#708569');
  path(c,[[.40,.075],[.60,.075],[.575,.29],[.425,.29]],'#a9b798','#728871');
  moss(c,.23,.12,.8);moss(c,.84,.86,.6);
  const light=c.createLinearGradient(.3,.3,.7,.9);light.addColorStop(0,'#547d7670');light.addColorStop(1,'#9bc7a535');c.fillStyle=light;c.beginPath();c.roundRect(.29,.31,.42,.58,[.20,.20,.02,.02]);c.fill();
  line(c,[[.31,.84],[.31,.43],[.36,.35]],'#c6e2cc',.022);
 }else if(variant==='B'){
  path(c,[[.08,.88],[.09,.25],[.22,.13],[.28,.28],[.25,.91]],'#8faaa1','#4b7165');
  path(c,[[.74,.91],[.73,.27],[.80,.13],[.92,.25],[.92,.88]],'#8faaa1','#4b7165');
  path(c,[[.11,.22],[.23,.08],[.76,.08],[.90,.22],[.84,.29],[.17,.29]],'#b4c6af','#688571');
  line(c,[[.23,.10],[.75,.10],[.85,.21]],'#d5e0bd',.035);
  const light=c.createLinearGradient(.25,.3,.75,.9);light.addColorStop(0,'#8dc6b9c7');light.addColorStop(.5,'#59988dbd');light.addColorStop(1,'#b6dcc2a6');
  rr(c,.25,.27,.50,.64,.06,light);line(c,[[.28,.32],[.28,.86],[.71,.86],[.71,.32]],'#cce8d3',.018);
  path(c,[[.30,.33],[.49,.28],[.71,.35],[.52,.40]],'#d7edce35');moss(c,.19,.86,.7);
 }else if(variant==='C'){
  path(c,[[.07,.92],[.08,.30],[.20,.11],[.79,.11],[.92,.30],[.92,.92]],'#4e6759');
  path(c,[[.09,.85],[.09,.29],[.22,.065],[.78,.065],[.90,.29],[.90,.85]],'#a1ae90','#58715e');
  path(c,[[.12,.28],[.25,.10],[.75,.10],[.86,.28]],'#c1caa6');
  path(c,[[.20,.86],[.20,.32],[.31,.25],[.49,.25],[.49,.86]],'#7b9080','#536c5d');
  path(c,[[.51,.86],[.51,.25],[.70,.25],[.81,.32],[.81,.86]],'#849988','#536c5d');
  line(c,[[.50,.29],[.50,.85]],'#c6dbba',.035);line(c,[[.14,.40],[.18,.40]],'#607862');line(c,[[.83,.61],[.88,.61]],'#607862');
  line(c,[[.22,.78],[.37,.68]],'#a9b79a');line(c,[[.67,.33],[.77,.39]],'#adbda0');moss(c,.26,.14,.9);
 }else if(variant==='D'){
  rr(c,.025,.055,.95,.93,.13,'#4b655a');rr(c,.05,.045,.90,.72,.12,'#8c9c85');c.fillStyle='#b5c798';c.fillRect(.14,.075,.70,.065);
  line(c,[[.13,.55],[.47,.46],[.67,.68]],'#65735f',.04);

 }else{
  // A living root ring; the short upper root makes a visible ledge.
  c.save();c.translate(.02,.035);c.strokeStyle='#546a4d';c.lineWidth=.18;c.beginPath();c.ellipse(.50,.52,.32,.36,0,0,tau);c.stroke();c.restore();
  c.strokeStyle='#9a9f70';c.lineWidth=.16;c.beginPath();c.ellipse(.50,.49,.32,.36,0,0,tau);c.stroke();
  line(c,[[.30,.15],[.43,.105],[.62,.12],[.73,.20]],'#c4c595',.075);
  line(c,[[.21,.38],[.18,.58],[.27,.80]],'#d1cda1',.025);line(c,[[.78,.37],[.80,.61],[.69,.83]],'#687c53',.035);
  oval(c,.50,.53,.235,.28,'#5c8e7977');
  line(c,[[.30,.20],[.24,.09],[.17,.08]],'#667e50',.04);oval(c,.19,.085,.075,.035,'#9fb86b');oval(c,.28,.16,.04,.065,'#829b58');
  moss(c,.72,.87,.7);
 }
 if(!occupied) number(c,n,.50,variant==='A'?.57:variant==='E'?.52:.51,variant==='A'?.41:.46,variant==='D'?'#e8ebc8':'#f8f0d0');
 if(phase>0){c.globalAlpha=phase*.55;c.strokeStyle='#e2f6cc';c.lineWidth=.035;c.beginPath();c.ellipse(.5,.51,.26,.30,0,0,tau);c.stroke();}
 }
 // Foreground condition remains anchored on the left jamb during overlap.
 if(front&&occupied){number(c,n,.16,.56,.30,'#fff2b7');}
 if(front&&phase>0){
  c.globalAlpha=phase;
  if(effect==='digit')number(c,n,.5,.52,.43,'#ffffdf');
  else if(effect==='particles')for(let i=0;i<4;i++){const a=i*tau/4+.4;oval(c,.5+Math.cos(a)*(.26+phase*.11),.5+Math.sin(a)*(.27+phase*.10),.015,.015,'#fff5c8')}
  else if(effect==='halo'){c.strokeStyle='#d3f0cd';c.lineWidth=.025;c.beginPath();c.ellipse(.5,.52,.28,.32,-.1,-1.5,-1.5+tau*phase);c.stroke()}
 }
 c.restore();
}

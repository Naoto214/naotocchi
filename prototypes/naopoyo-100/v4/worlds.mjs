// Presentation-only comparison. Geometry always comes from the unchanged board.
export const worlds={forest:{name:'森',floor:'#b4c8a0',solid:'#365a43',edge:'#203e32',detail:'#719359',motif:'枝の壁と葉脈の小道'},sea:{name:'海',floor:'#b4d3cf',solid:'#326577',edge:'#204652',detail:'#77b9bd',motif:'珊瑚礁の壁と砂紋の小道'},sky:{name:'空',floor:'#d4e3e2',solid:'#648eaa',edge:'#385e7b',detail:'#eff8f1',motif:'雲の壁と浮遊足場'},earth:{name:'地中',floor:'#d5bd94',solid:'#775c48',edge:'#493d35',detail:'#b69368',motif:'岩盤と根の通る土の道'},snow:{name:'雪山',floor:'#cbdde2',solid:'#6e95ab',edge:'#405e77',detail:'#f8faf3',motif:'雪冠の岩と踏み固めた道'},cave:{name:'洞窟',floor:'#a1b5bd',solid:'#44586c',edge:'#29394c',detail:'#95bdc8',motif:'結晶の岩と灯りの通路'}};
export function ground(c,key,solid,x=0,y=0){const p=worlds[key];c.save();c.translate(x,y);c.fillStyle=p.edge;c.fillRect(0,0,1,1);c.fillStyle=solid?p.solid:p.floor;c.beginPath();c.roundRect(.025,solid?.06:.025,.95,solid?.89:.95,solid?.12:.035);c.fill();c.strokeStyle=solid?p.detail:p.edge+'28';c.lineWidth=.025;
 if(!solid){c.beginPath();c.moveTo(.12,.91);c.lineTo(.88,.91);c.stroke();c.globalAlpha=.4;
 if(key==='sea'){for(const y of [.14,.24]){c.beginPath();c.moveTo(.12,y);c.quadraticCurveTo(.3,y-.09,.48,y);c.quadraticCurveTo(.7,y+.09,.88,y);c.stroke()}}
 else if(key==='forest'){c.beginPath();c.moveTo(.1,.13);c.lineTo(.26,.25);c.moveTo(.17,.19);c.lineTo(.24,.11);c.stroke()}
 else if(key==='sky'){c.fillStyle='#fff';c.beginPath();c.ellipse(.5,.85,.32,.035,0,0,7);c.fill()}
 else if(key==='earth'){for(const [a,b]of [[.12,.2],[.85,.16],[.15,.75]]){c.beginPath();c.arc(a,b,.025,0,7);c.fill()}}
 else if(key==='snow'){c.beginPath();c.moveTo(.15,.15);c.lineTo(.24,.21);c.moveTo(.2,.12);c.lineTo(.18,.25);c.stroke()}
 else{c.beginPath();c.moveTo(.12,.19);c.lineTo(.24,.12);c.lineTo(.32,.23);c.stroke()}
 }else if(key==='forest'){c.fillStyle='#294734';c.fillRect(.42,.1,.17,.78);c.strokeStyle='#b4c58a';c.beginPath();c.moveTo(.5,.8);c.lineTo(.5,.25);c.moveTo(.5,.5);c.lineTo(.2,.3);c.moveTo(.5,.65);c.lineTo(.8,.4);c.stroke();for(const [a,b]of [[.2,.25],[.7,.25],[.75,.5]]){c.fillStyle=p.detail;c.beginPath();c.ellipse(a,b,.17,.09,-.4,0,7);c.fill()}}
 else if(key==='sea'){c.lineWidth=.065;c.lineCap='round';c.beginPath();c.moveTo(.5,.8);c.lineTo(.5,.3);c.moveTo(.5,.6);c.lineTo(.25,.45);c.lineTo(.25,.25);c.moveTo(.5,.5);c.lineTo(.74,.37);c.lineTo(.74,.2);c.stroke()}
 else if(key==='sky'){c.fillStyle=p.detail;for(const[a,b,r]of [[.25,.42,.18],[.48,.32,.23],[.73,.43,.2]]){c.beginPath();c.arc(a,b,r,0,7);c.fill()}c.fillRect(.2,.4,.6,.24)}
 else if(key==='earth'){for(const y of [.28,.5,.74]){c.beginPath();c.moveTo(.1,y);c.lineTo(.35,y-.05);c.lineTo(.7,y+.03);c.lineTo(.9,y-.04);c.stroke()}}
 else if(key==='snow'){c.fillStyle=p.detail;c.beginPath();c.moveTo(.1,.32);c.lineTo(.25,.1);c.lineTo(.8,.1);c.lineTo(.9,.36);c.lineTo(.65,.28);c.lineTo(.48,.4);c.lineTo(.3,.27);c.closePath();c.fill()}
 else{for(const[a,b]of [[.3,.7],[.65,.8]]){c.fillStyle=p.detail;c.beginPath();c.moveTo(a-.1,b);c.lineTo(a-.13,b-.35);c.lineTo(a,b-.5);c.lineTo(a+.12,b-.3);c.lineTo(a+.08,b);c.closePath();c.fill()}}
 c.restore();}

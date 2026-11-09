// Comparison-only vector painter. No simulation, state mutation or game input.
export function paintTile(ctx,id,{phase=0,time=0,mask=0,images={}}={}){
 const c=ctx; c.save(); c.scale(.01,.01);c.lineCap='round';c.lineJoin='round';c.lineWidth=2.3;
 const on=phase>.5,ink='#253b40',mint='#85cfc3',gold='#edcc83';
 const grad=(top,bottom)=>{let g=c.createLinearGradient(20,12,70,88);g.addColorStop(0,top);g.addColorStop(1,bottom);return g};
 const shape=(d,fill,stroke=ink)=>{let p=new Path2D(d);c.fillStyle=fill;if(fill)c.fill(p);c.strokeStyle=stroke;if(stroke)c.stroke(p)};
 const box=(x,y,w,h,r,fill)=>{c.fillStyle=fill;c.beginPath();c.roundRect(x,y,w,h,r);c.fill()};
 const line=(d,color=ink,w=2.3)=>{c.lineWidth=w;shape(d,null,color)};
 const ellipse=(x,y,rx,ry,fill)=>{c.fillStyle=fill;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill()};
 const text=(s,x,y,size=16)=>{c.fillStyle=ink;c.font=`600 ${size}px system-ui`;c.textAlign='center';c.textBaseline='middle';c.fillText(s,x,y)};
 const shadow=()=>ellipse(50,85,34,5,'#10263130');
 const water=()=>{box(0,0,100,100,0,grad('#63c4cb','#36879e'));if(!(mask&1))line('M0 13 Q25 5 50 13 T100 13','#d7fff1',3);line('M12 64 Q30 56 47 64 M60 78 Q75 70 91 78','#b4e4df66',1.5)};
 if(id.startsWith('npc.')){let key={owl:'owl',bear:'forest_bear',otter:'otter',squirrel:'squirrel',penguin:'penguin_friend'}[id.split('.')[1]];shadow();if(images[key])c.drawImage(images[key],10,3,80,80);if(on)line('M17 84 Q50 92 83 84',mint,3);c.restore();return;}
 switch(id){
 case 'terrain.floor':box(3,3,94,94,4,grad('#798e8e','#5e767d'));line('M12 10 H88','#c4d7d650',1);break;
 case 'terrain.wall':shadow();shape('M8 22 L19 8 H82 L94 23 L91 82 L78 91 H17 L6 78 Z',grad('#82949d','#465b6c'));line('M17 22 L25 16 H78','#b9cbd0',2);break;
 case 'scenery.lamp':case 'fixture.signalLamp':shadow();line('M50 12 V28',ink,4);box(29,28,42,45,5,grad('#718287','#2c434a'));box(36,35,28,31,3,on||id==='scenery.lamp'?grad('#fff4c4','#e3b365'):'#2c525c');line('M32 29 H68 M32 72 H68','#c4ba97',3);if(on){ellipse(50,50,27,29,'#ffe8a21c');}break;
 case 'scenery.tree':shadow();shape('M46 38 H55 L60 86 H42 Z',grad('#ad9273','#725e4d'));ellipse(33,37,25,21,grad('#9bbf89','#4c8065'));ellipse(65,32,25,23,grad('#b1ce8b','#5e8c65'));ellipse(49,18,25,16,grad('#bad79b','#70956e'));break;
 case 'scenery.grass':line('M23 84 Q31 60 21 47 M39 84 Q38 46 48 36 M54 84 Q52 60 68 49 M70 84 Q70 65 80 58','#88b79a',4);break;
 case 'sign.gravity':if(images.gravity)c.drawImage(images.gravity,0,0,100,100);break;
 case 'fixture.spike':box(9,73,82,11,1,'#ba879e');shape('M24 75 L37 28 L50 75 M50 75 L63 28 L76 75',grad('#f7cddd','#d995b3'),null);break;
 case 'fixture.gate':box(10,20,10,65,3,grad('#afc4bd','#5f8086'));box(80,20,10,65,3,grad('#afc4bd','#5f8086'));box(10,14,80,18,5,'#aac4ba');text('=2',50,24,16);if(!on)line('M30 44 H70 M30 60 H70', '#a9d5ca',3);break;
 case 'fixture.exit':shadow();shape('M18 85 V46 Q18 13 50 13 Q82 13 82 46 V85 H72 V46 Q72 24 50 24 Q28 24 28 46 V85 Z',grad('#d1d4be','#8caaa7'),null);shape('M50 10 L55 23 L69 24 L58 33 L61 47 L50 39 L39 47 L42 33 L31 24 L45 23 Z',grad('#fff0b5','#d8ad59'),'#ac8547');if(!on){box(31,67,38,21,5,'#f2e8c5');text('=4',50,78,18);}break;
 case 'fixture.plate.hold':case 'fixture.plate.weight':case 'fixture.latch':case 'fixture.sequence':{
 shadow();ellipse(50,74,36,17,'#273e49');ellipse(50,on?72:67,36,17,grad(on?'#ebd398':'#577783',on?'#c3a558':'#354d5d'));c.strokeStyle=on?'#fff0bd':'#77c9bd';c.lineWidth=3;c.beginPath();c.ellipse(50,on?71:66,35,16,0,0,7);c.stroke();line('M25 65 Q50 52 75 65',on?'#fff3d0aa':'#b5ece055',1.3);
 if(id.endsWith('weight')){box(33,59,34,18,4,'#e8e8cf');text('=2',50,68,16)}
 if(id==='fixture.latch')shape(on?'M70 45 H80 V65 H68 V57 H73 V51 H70 Z':'M73 38 H83 V53 H77 V45 H73 Z',gold,ink);
 if(id==='fixture.sequence'){ellipse(38,40,10,10,on?gold:'#63827e');ellipse(64,40,10,10,on?gold:'#63827e');line('M48 40 H54',gold,3)}break;}
 case 'fixture.door':shadow();shape('M15 85 V43 Q15 13 50 13 Q85 13 85 43 V85',null,'#b4c8be');for(let x=28;x<80;x+=15)line(`M${x} 34 V${on?42:84}`,grad('#d5ddd4','#829c9e'),4);line('M25 34 H75 M25 '+(on?42:84)+' H75','#7b9495',3);break;
 case 'fixture.platform':shadow();box(6,on?29:69,88,16,4,grad('#d6b77d','#99754d'));line('M13 16 V85 M87 16 V85','#b7ba9d66',2);line(`M11 ${on?32:72} H89`,'#eee0ab',2);break;
 case 'fixture.crumble':if(on){shape('M10 73 L38 79 L32 90 L13 87 Z',grad('#c2bab0','#807f80'));shape('M61 75 L91 72 L89 86 L71 91 Z',grad('#c2bab0','#807f80'));}else{box(6,63,88,20,3,grad('#bbb9ab','#767f86'));line('M49 63 L43 70 L55 74 L47 83','#404c54',2.5)}break;
 case 'object.boulder':shadow();shape('M10 71 L8 47 L23 20 L51 12 L79 27 L92 60 L81 81 L34 87 Z',grad('#a6b9b2','#526e75'));shape('M23 20 L51 12 L67 37 L42 46 Z','#cfdbcf66',null);line('M14 51 L35 57 L42 46 M67 37 L78 63','#324d5a66',1.5);break;
 case 'object.crate':shadow();box(17,21,66,63,5,grad('#d0ae76','#9c744b'));line('M23 28 H77 V77 H23 Z M24 29 L76 77 M76 29 L24 77','#ead5aa',5);for(let x of [23,77])for(let y of [28,77])ellipse(x,y,2,2,ink);break;
 case 'fixture.oneway':line('M15 22 V84 M85 22 V84','#abc1b9',6);shape('M19 30 L66 20 V66 L19 80 Z',grad('#b0d4c1','#599d91'));line('M35 49 H58 M50 41 L58 49 L50 57','#eff5d6',4);break;
 case 'terrain.water':water();break;
 case 'field.current':water();for(let y of [35,63])line(`M0 ${y} Q25 ${y-9} 50 ${y} T100 ${y}`,'#d9f8e1aa',2);shape('M60 34 L76 43 L60 52',null,'#d9f8e1');break;
 case 'field.wave':water();{let y=25+Math.sin(time)*8;shape(`M0 ${y+23} Q16 ${y+28} 31 ${y+3} Q43 ${y-12} 58 ${y-3} Q65 ${y+6} 54 ${y+11} Q70 ${y+30} 100 ${y+23} L100 100 H0 Z`,grad('#9de4dd','#378ea6'),null);line(`M0 ${y+23} Q16 ${y+28} 31 ${y+3} Q43 ${y-12} 58 ${y-3} Q65 ${y+6} 54 ${y+11} Q70 ${y+30} 100 ${y+23}`,'#e5fff0',3);}break;
 case 'field.bubble':water();for(let i=0;i<4;i++){let y=(92-i*24-time*9)%100;if(y<0)y+=100;let x=45+Math.sin(i*2+time)*9;c.strokeStyle='#d4fff2';c.lineWidth=1.8;c.beginPath();c.arc(x,y,4+i*2,0,7);c.stroke();ellipse(x-2,y-2,1.3,1.3,'#fff9e2')}break;
 case 'field.waterlevel':water();line('M16 18 V84 M12 26 H21 M12 50 H21 M12 74 H21','#f2edc9',3);break;
 case 'terrain.ice':box(0,0,100,100,3,grad('#c3e8e7','#7caebf'));shape('M6 9 H93 L53 54 H6 Z','#f0fffb44',null);line('M21 56 L57 20 M46 78 L81 43','#e7fffa77',2);break;
 case 'field.wind':case 'field.updraft':c.save();if(id==='field.updraft'){c.translate(0,100);c.rotate(-Math.PI/2)}for(let [y,l] of [[28,70],[50,88],[72,59]]){let dx=Math.sin(time)*5;line(`M${8+dx} ${y} H${l} Q${l+15} ${y} ${l+9} ${y-11}`,'#bfdfcd',2.8)}c.restore();break;
 case 'fixture.warp':shadow();for(let r of [31,23]){c.strokeStyle=r===31?'#8fbfd1':'#d0edf0';c.lineWidth=r===31?8:2;c.beginPath();c.ellipse(50,49,r,37,0,0,7);c.stroke()}ellipse(50,49,17,28,grad('#698cbd','#253851'));line('M24 17 L32 25 M28 14 L36 22','#e3edf0',2);break;
 case 'fixture.phase':shadow();ellipse(50,48,32,32,grad('#c4c2a2','#839d9b'));ellipse(50,48,24,24,'#344f59');for(let i=0;i<3;i++){let a=-Math.PI/2+i*Math.PI*2/3;ellipse(50+17*Math.cos(a),48+17*Math.sin(a),5,5,i===(on?1:0)?gold:'#668b8c')}break;
 case 'fixture.toggle':shadow();box(22,65,56,17,5,grad('#a6b9b0','#647e84'));line(`M50 65 L${on?73:27} 31`,'#e4ce9b',7);ellipse(on?73:27,31,9,9,mint);break;
 case 'terrain.soil':box(0,0,100,100,4,grad('#ba9c70','#88694f'));for(let [x,y]of [[20,25],[70,30],[45,60],[80,80]])line(`M${x} ${y} l7 -3`,'#e8cba177',2);break;
 case 'terrain.tunnel':box(2,2,96,96,4,grad('#9c8266','#5a5449'));box(20,22,60,76,20,'#263f42');break;
 case 'fixture.burrow':shadow();ellipse(50,61,34,24,'#a68c66');ellipse(50,58,26,17,'#243c3c');line('M26 52 Q50 38 74 52','#d5b88b',3);break;
 case 'field.cavein':shape('M16 12 L45 8 L49 35 L20 40 Z',grad('#afa98e','#6c7976'));shape('M62 25 L88 17 L91 48 L68 51 Z',grad('#afa98e','#6c7976'));line('M30 53 V75 M75 64 V84','#c9cfab',3);break;
 case 'fixture.rotor':shadow();ellipse(50,56,36,21,grad('#bbad86','#71888a'));ellipse(50,56,5,4,'#e5d5a2');line('M21 22 Q51 5 77 28 M68 25 L77 28 L76 18',mint,3);break;
 case 'fixture.beam':box(8,36,19,30,4,grad('#b2c0bb','#536d7d'));box(27,43,72,16,2,'#f3db9980');line('M30 50 H99','#fff0b7',3);break;
 case 'fixture.mirror':shadow();shape('M25 77 L57 15 L78 25 L46 87 Z',grad('#d4f2ec','#67949f'),'#d0cead');line('M43 62 L62 27','#effff2',2);break;
 case 'vehicle.boat':shape('M7 60 H93 L79 82 H25 Z',grad('#c7a572','#805f47'));box(25,43,48,17,3,'#c9ba92');line('M3 88 Q25 80 48 88 T99 88','#72bbc6',2);break;
 case 'vehicle.cart':box(15,36,70,34,5,grad('#c5bca0','#7e8c87'));for(let x of [29,71]){ellipse(x,76,10,10,'#294653');ellipse(x,76,4,4,'#b7cabf')}line('M10 91 H90','#b4c9c4',2);break;
 default:box(20,20,60,60,12,grad('#b4d2c6','#698e8e'));
 }
 c.restore();
}

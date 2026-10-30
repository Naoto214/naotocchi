const a=(id,x,y,level)=>({id,x,y,level,species:'dog'});
const s=(id,actors,extra)=>({id,w:8,h:8,gravity:true,walls:[],gates:[],exits:[],spikes:[],water:[],guests:[],events:[],actors,...extra});
const column=(x,to=6)=>Array.from({length:to+1},(_,y)=>[x,y]);
export const candidates=[
 s('order-a',[a('a',0,5,3),a('b',2,5,5),a('c',1,7,4)],{walls:[[0,6],[2,6],[3,6],[4,6]],exits:[{x:4,y:5,exact:4},{x:7,y:7,exact:8}]}),
 s('order-b',[a('a',0,5,5),a('b',2,5,3),a('c',1,7,4)],{walls:[[0,6],[2,6],[3,6],[4,6]],gates:[{x:3,y:7,exact:8}],exits:[{x:4,y:5,exact:4},{x:7,y:7,exact:8}]}),
 s('spike-a',[a('a',0,7,8),a('b',1,7,4)],{walls:[[2,7],[4,6],[5,6]],spikes:[{x:2,y:6,power:2}],exits:[{x:5,y:5,exact:4},{x:7,y:7,exact:8}]}),
 s('split-a',[a('a',0,7,8),a('b',1,7,8)],{walls:[[2,7],[4,6],[5,6],[7,6]],spikes:[{x:2,y:6,power:3}],exits:[{x:5,y:5,exact:3},{x:7,y:5,exact:5},{x:7,y:7,exact:8}]}),
 s('split-b',[a('a',0,7,8),a('b',1,7,8)],{walls:[[2,7],[4,6],[5,6],[7,6]],spikes:[{x:3,y:6,power:3}],exits:[{x:5,y:5,exact:3},{x:7,y:5,exact:5},{x:7,y:7,exact:8}]}),
 s('relay-a',[a('a',0,7,8),a('b',1,7,8)],{walls:[[2,6],[4,5],[4,6],[6,4],[6,5],[6,6]],spikes:[{x:0,y:6,power:3}],exits:[{x:6,y:3,exact:3},{x:7,y:7,exact:5},{x:5,y:7,exact:8}]}),
 s('forest-a',[a('a',0,7,6),a('b',1,7,6),a('c',2,7,4)],{walls:[...column(3),[5,6],[6,6],[7,6]],gates:[{x:3,y:7,exact:8}],spikes:[{x:4,y:6,power:3}],exits:[{x:6,y:5,exact:3},{x:7,y:5,exact:5},{x:7,y:7,exact:8}]}),
 s('forest-b',[a('a',0,7,8),a('b',1,7,8)],{walls:[[2,6],[4,5],[4,6],[6,4],[6,5],[6,6],[7,6]],gates:[{x:2,y:7,exact:8}],spikes:[{x:3,y:6,power:3}],exits:[{x:6,y:3,exact:3},{x:7,y:5,exact:5},{x:7,y:7,exact:8}]}),
 s('forest-c',[a('a',0,7,8),a('b',1,7,8)],{walls:[[2,6],[4,6],[5,6],[7,6]],gates:[{x:2,y:7,exact:8},{x:6,y:7,exact:8}],spikes:[{x:3,y:6,power:3}],exits:[{x:5,y:5,exact:3},{x:7,y:5,exact:5},{x:7,y:7,exact:8}]})
];

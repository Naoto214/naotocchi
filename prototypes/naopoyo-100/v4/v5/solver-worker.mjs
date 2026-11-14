import{solve}from '../../solver.mjs';
self.onmessage=({data})=>{try{self.postMessage({signature:data.signature,result:solve(data.board,{limit:3000,maxDepth:60})})}catch(e){self.postMessage({signature:data.signature,error:e.message})}};

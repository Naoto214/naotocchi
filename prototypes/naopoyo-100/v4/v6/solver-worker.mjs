import{verifyStage}from'./validation.mjs';
self.onmessage=({data})=>{try{self.postMessage({token:data.token,signature:data.signature,result:verifyStage(data.draft,{limit:data.limit??12000,maxDepth:90,probe:data.probe||null})})}catch(e){self.postMessage({token:data.token,signature:data.signature,error:e.message})}};

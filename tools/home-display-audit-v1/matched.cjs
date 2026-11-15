// Density-only control: retain the 28-resident camera, dimensions and start seats.
process.env.REACH_DIST ||= '/workspace/sites/naotocchi-movement-v5/dist';
process.env.REACH_OUT ||= '/tmp/home-display-audit-v1';
const q=require('../home-movement-v5/measure.cjs');
(async()=>{const browser=await q.start();try{const config={...q.configFromEnv(),count:28},page=await q.open(browser,'e',config),detail=await page.evaluate(()=>MovementQA.detail()),records=[];
 for(const count of [1,4,10,20,28]){const state=detail.actors.slice(0,count);for(const a of state.filter(a=>a.kind!=='companion'))for(const edge of q.edges){const goal=q.goals(edge,detail.frame,config,64,a.foot,true)[0],r=await q.trial(page,state,a.key,goal,{selectedGround:true}),axis=['left','right'].includes(edge)?'x':'y';records.push({...r,count,edge,directionalProgressCss:r.actor?q.sign(edge)*(r.actor.foot[axis]-a.foot[axis]):0});console.log(count,a.key,edge,records.at(-1).directionalProgressCss);q.save('matched.json',{config,detail,records});}}
 }finally{await browser.close();q.server.close();}})().catch(e=>{console.error(e);q.server.close();process.exitCode=1;});

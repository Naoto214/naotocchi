export const newMetrics=()=>({reached08:false,two08:false,success:false,main08:false,mainTwo08:false,mainSuccess:false,mixedRemoved:0,highLost:0,mainLost:0,mainExposed:0,stageLost:Array(8).fill(0),maxChain:0,chainHistogram:{},evolutions:0,mixedGroups:0,deathGroups:0,eggs:0,transform:0,bulk:0,controls:0,choices:0,occupancySum:0,observations:0,first08:null,firstSuccess:null});
export function observe(m,s,z,a){
 const scan=b=>{const counts=Array(5).fill(0);for(const c of b.flat())if(c?.s===8)counts[c.k]++;if(counts.some(Boolean))m.reached08=true;if(counts.some(n=>n>=2))m.two08=true;if(counts[0])m.main08=true;if(counts[0]>=2)m.mainTwo08=true;};
 scan(s.board);scan(z.board);
 for(const w of z.last.waves){for(const b of [w.before,w.merged,w.after])if(b)scan(b);
  for(const e of w.events){const members=e.members||w.before.flat().filter(c=>c&&e.consumed.includes(c.id));
   if(e.mixed){m.mixedGroups++;m.mixedRemoved+=members.length;m.highLost+=members.filter(c=>c.s>=5).length;m.mainLost+=members.filter(c=>c.k===0).length;for(const c of members)m.stageLost[c.s-1]++;}
   else if(e.death){m.deathGroups++;m.success=true;if(members[0]?.k===0)m.mainSuccess=true;}
   else m.evolutions++;
  }
 }
 m.mainExposed+=a.type==='drop'?s.queue[0].filter(c=>c.k===0).length:a.type==='egg'&&a.k===0?1:0;
 if(a.type==='transform'&&a.to===0)m.mainExposed++;if(a.type==='bulk'&&a.to===0)m.mainExposed+=s.board.flat().filter(c=>c?.k===a.from).length;
 m.maxChain=Math.max(m.maxChain,z.last.waves.length);m.chainHistogram[z.last.waves.length]=(m.chainHistogram[z.last.waves.length]||0)+1;
 m.eggs+=a.type==='egg'?1:0;m.transform+=a.type==='transform'?1:0;m.bulk+=a.type==='bulk'?1:0;
 m.controls+=a.type==='drop'?a.path.length:1;m.choices+=z.last.decisions||0;
 m.occupancySum+=z.board.flat().filter(Boolean).length/72;m.observations++;
 if(m.reached08&&m.first08===null)m.first08=z.drops;if(m.success&&m.firstSuccess===null)m.firstSuccess=z.drops;
}

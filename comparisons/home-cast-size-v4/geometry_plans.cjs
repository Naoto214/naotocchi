// Run the exact distributed planner and policy. Return every resident's hint.
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const [game,json] = process.argv.slice(2);
const {width,height,region,count} = JSON.parse(json);
const env={URLSearchParams,location:{search:''}};
env.window=env;
vm.createContext(env);
for(const filename of ['population-policy.js','population-seating.js'])
  vm.runInContext(fs.readFileSync(path.join(game,filename),'utf8'),env);
const nav={initialPoint:()=>null,project:p=>[p.x,p.z],valid:()=>true};
const plans={};
for(const layout of ['fixed','optimized']) for(const curve of ['linear','step']) for(const policy of ['current','A','B','C']) {
  const query='?'+new URLSearchParams({width,height,region,count,layout,curve,policy});
  const result=env.HomePopulationSeats.withOpeningSeats(nav,{region},width,height,query);
  plans[[layout,curve,policy].join('/')]=Array.from({length:count},(_,i)=>result.initialPoint(i,count));
}
process.stdout.write(JSON.stringify(plans));

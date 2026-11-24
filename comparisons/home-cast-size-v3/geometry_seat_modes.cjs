// Group exactly identical opening hints so one native trajectory can be compared
// at several paint sizes. No actual resident is positioned by this QA script.
const seating = require(process.argv[2] || './seating.js');
const regions = ['forest','river_lake','city','home','countryside','mountain','snow','sea','jungle','desert','deepsea','star_stop','memory_lake'];
const heights={320:516,375:760,390:792,430:880};
const nav={initialPoint:()=>null,project:p=>[p.x,p.z],valid:()=>true};
const output={};
const includeHints=process.argv.includes('--hints');
for(const [width,height] of Object.entries(heights)) {
  for(const region of regions) {
    for(const count of [1,4,10,20,28]) {
      const first=new Map();
      const representative={};
      for(const extra of [0,5,10,15,20]) {
        const seats=seating.withOpeningSeats(nav,{region},Number(width),height,'?layout=optimized&extra='+extra);
        const list=Array.from({length:count},(_,i)=>seats.initialPoint(i,count));
        const canonical=JSON.stringify(list);
        if(!first.has(canonical))first.set(canonical,extra);
        representative[extra]=includeHints?list:first.get(canonical);
      }
      output[[width,region,count].join('-')]=representative;
    }
  }
}
process.stdout.write(JSON.stringify(output)+'\n');

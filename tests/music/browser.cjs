// Read-only decode/output checks against the actual Pages artifact; no audio rewriting.
const {chromium,webkit}=require('playwright');const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),base=process.env.BGM_TEST_BASE||'http://127.0.0.1:8780/';
(async()=>{const records=[];const approved=JSON.parse(fs.readFileSync(path.join(root,'music/library.json'))).tracks.filter(t=>t.status==='approved');const expectedRows=JSON.parse(fs.readFileSync(path.join(root,'music/placements.json'))).length+JSON.parse(fs.readFileSync(path.join(root,'music/extensions.json'))).rows.length;for(const [name,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch({headless:true,...(name==='chromium'&&process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});try{
 const p=await browser.newPage();p.setDefaultTimeout(30000);await p.route('**/music-decode-fixture',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><button>play</button>'}));await p.goto(base+'music-decode-fixture');
 await p.addScriptTag({url:base+'assets/bgm/catalog.js'});await p.addScriptTag({url:base+'assets/bgm/placement.js'});await p.addScriptTag({url:base+'bgm-v2.js'});
 const report=await p.evaluate(async base=>{const ctx=new AudioContext(),tracks=[];for(const [id,t]of Object.entries(NAOTOCCHI_BGM_CATALOG)){
  const r=await fetch(base+'assets/bgm/'+t.file);if(!r.ok)throw Error(id+' HTTP '+r.status);const buf=await ctx.decodeAudioData(await r.arrayBuffer());let sum=0,peak=0;for(let c=0;c<buf.numberOfChannels;c++){const x=buf.getChannelData(c);for(let i=0;i<x.length;i++){sum+=x[i]*x[i];peak=Math.max(peak,Math.abs(x[i]));}}
  if(!(sum>0&&peak<1&&Math.abs(buf.duration-t.duration)<.1))throw Error(id+' invalid decode');tracks.push({id,channels:buf.numberOfChannels,seconds:buf.duration,peak,rms:Math.sqrt(sum/(buf.length*buf.numberOfChannels))});
 }
 const boundaries=[4,5,9,10,15,16,18,19,23].map(h=>NAOTOCCHI_BGM2.homeSong({getHours:()=>h}));await ctx.close();return {tracks,boundaries,placements:NAOTOCCHI_BGM_PLACEMENT.ROWS.length};},base);
 assert.deepEqual(report.tracks.map(t=>t.id).sort(),approved.map(t=>t.id).sort());assert.equal(report.placements,expectedRows);assert.deepEqual(report.boundaries,['home-night','home-morning','home-morning','home-day','home-day','home-evening','home-evening','home-night','home-night']);
 records.push({engine:name,...report});console.log(name+': all32 AAC decode/nonzero/unclipped;50 placements;clock boundaries PASS');
 }finally{await browser.close()}}
 fs.writeFileSync(path.join(root,'docs/music/verification/all32-browser.json'),JSON.stringify(records,null,2));
})().catch(e=>{console.error(e);process.exit(1)});

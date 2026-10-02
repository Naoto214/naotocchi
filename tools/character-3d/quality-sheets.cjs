// Same gallery/camera/light/time for both immutable Claude geometry and revision.
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const {shots}=require('./shot.cjs'),SPEC=require('../../character-3d/spec.js');
const root=path.resolve(__dirname,'../..');
const args=process.argv.slice(2), oi=args.indexOf('--out');
const out=oi<0?'test-results/character-3d-quality/comparisons':args[oi+1];
fs.mkdirSync(out,{recursive:true});
const raw=path.join(out,'raw');fs.mkdirSync(raw,{recursive:true});
const rows=[];
for(const id of [...Object.keys(SPEC.PILOT),...Object.keys(SPEC.ARCHETYPE_REUSE)])for(const stage of SPEC.STAGE_KEYS[id]||[0])rows.push({id,stage});
const label=(s,w)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="28"><rect width="100%" height="100%" fill="#efe9dd"/><text x="8" y="20" fill="#302e2b" font-size="15" font-family="sans-serif">${s}</text></svg>`);
(async()=>{
  const list=rows.flatMap(({id,stage})=>['claude','revised'].map(revision=>({out:path.join(raw,`${id}-${stage}-${revision}.png`),q:`id=${id}&stage=${stage}&revision=${revision}&layout=views&view=front&t=.4&ortho=1&bare=1&el=.18`,w:1400,h:480})));
  const results=await shots(list);if(results.some(r=>r.errors.length))throw new Error(JSON.stringify(results.filter(r=>r.errors.length)));
  for(const {id,stage}of rows){
    const cw=220,ch=300,composite=[];
    const original=await sharp(path.join(root,SPEC.referenceAsset(id,stage))).resize(cw,ch,{fit:'contain',background:'#efe9dd',kernel:'nearest'}).flatten({background:'#efe9dd'}).png().toBuffer();
    composite.push({input:original,left:0,top:28},{input:label(`${id} ${stage} / 2D`,cw),left:0,top:0});
    let i=1;
    for(const revision of ['claude','revised'])for(let v=0;v<4;v++,i++){
      const tile=await sharp(path.join(raw,`${id}-${stage}-${revision}.png`)).extract({left:v*350,top:0,width:350,height:480}).resize(cw,ch,{fit:'contain',background:'#efe9dd'}).png().toBuffer();
      composite.push({input:tile,left:i*cw,top:28},{input:label(`${revision} ${['front','3/4','side','back'][v]}`,cw),left:i*cw,top:0});
    }
    await sharp({create:{width:cw*9,height:ch+28,channels:3,background:'#efe9dd'}}).composite(composite).jpeg({quality:92}).toFile(path.join(out,`${id}-${String(stage).padStart(2,'0')}-comparison.jpg`));
  }
  const emrows=rows.filter(r=>SPEC.PILOT[r.id]);
  if(args.includes('--matrix')) {
    const emos=emrows.flatMap(({id,stage})=>['claude','revised'].flatMap(revision=>[false,true].map(walk=>({out:path.join(raw,`${id}-${stage}-${revision}-${walk?'walk':'idle'}-emotions.png`),q:`id=${id}&stage=${stage}&revision=${revision}&layout=emotions&view=34&t=.4&walk=${walk?1:0}&ortho=1&bare=1&el=.18`,w:1400,h:400}))));
    const er=await shots(emos);if(er.some(r=>r.errors.length))throw new Error(JSON.stringify(er.filter(r=>r.errors.length)));
    for(const {id,stage}of emrows){
      const layers=[];let y=0;
      for(const revision of ['claude','revised'])for(const walk of [false,true]){
        layers.push({input:label(`${id} ${stage} / ${revision} ${walk?'locomotion':'idle'} / normal positive dislike tired sick`,1400),left:0,top:y});y+=28;
        layers.push({input:path.join(raw,`${id}-${stage}-${revision}-${walk?'walk':'idle'}-emotions.png`),left:0,top:y});y+=400;
      }
      await sharp({create:{width:1400,height:y,channels:3,background:'#efe9dd'}}).composite(layers).jpeg({quality:90}).toFile(path.join(out,`${id}-${String(stage).padStart(2,'0')}-emotions-motion.jpg`));
    }
  }
  fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({baseline:'e12f7208427c2f1035849ab4319c78fc31305c65',sample:{emotion:'normal',moving:false,t:.4,elevation:.18},rows,results,emotionMotionMatrix:args.includes('--matrix')},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});

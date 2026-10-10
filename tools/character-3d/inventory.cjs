// Audit from current master/filesystem. Never infer coverage from the Pilot's hard-coded list.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function pngs(root,dir='assets/characters') {return fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?pngs(root,dir+'/'+e.name):e.name.endsWith('.png')?[dir+'/'+e.name]:[]).sort();}
function readMaster(root){const w={};new Function('window',fs.readFileSync(path.join(root,'character-world-master.v1.js'),'utf8'))(w);return w.NAOTOCCHI_CHARACTER_WORLD_MASTER_V1;}
function auditInventory(root,master=readMaster(root),options={}) {
 const assets=options.assets||pngs(root),set=new Set(assets),active=[],supplemental=[];
 const add=(kind,item,stage,asset,group)=>active.push({key:kind+':'+item.id+':'+(stage??0),kind,id:item.id,stage,label:stage?item.stages[stage-1]:item.label,group,asset});
 for(const [group,items] of Object.entries(master.playerSpecies))if(Array.isArray(items))for(const item of items)item.stages.forEach((_,i)=>add('form',item,i+1,`assets/characters/${item.id}/${String(i+1).padStart(2,'0')}.png`,group));
 for(const [group,items] of Object.entries(master.companions))if(Array.isArray(items))for(const item of items)add('companion',item,null,item.asset,group);
 for(const item of master.partners)add('partner',item,null,item.asset,item.firstRegion);
 const author=master.playerSpecies.author;if(author)add('author',author,null,author.asset,'secret');
 for(const asset of assets){if(/^assets\/characters\/egg\/(intact|cracking|ready)\.png$/.test(asset))supplemental.push({kind:'egg',id:path.basename(asset,'.png'),asset,status:'home-startup-only',reason:'Startup egg is not a registered Meguru actor; keep Home presentation unchanged.'});const oldId=path.basename(asset,'.png'),alias=master.compatibility?.companionAliases?.[oldId];if(asset.startsWith('assets/characters/companions/')&&alias&&alias!==oldId&&!active.some(r=>r.asset===asset))supplemental.push({kind:'companion',id:oldId,asset,status:'retired-asset',reason:`master compatibility.companionAliases ${oldId}→${alias}; do not revive retired gameplay.`});}
 const protectedVariants=assets.filter(a=>/^assets\/characters\/(expressions|relationship)\//.test(a)),known=new Set([...active,...supplemental].map(r=>r.asset));
 for(const r of [...active,...supplemental])if(set.has(r.asset)&&fs.existsSync(path.join(root,r.asset)))r.sha256=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,r.asset))).digest('hex');
 return {active,supplemental,protectedVariants,missingAssets:active.filter(r=>!set.has(r.asset)).map(r=>r.asset),unclassifiedAssets:assets.filter(a=>!known.has(a)&&!protectedVariants.includes(a)),counts:{species:new Set(active.filter(r=>r.kind==='form').map(r=>r.id)).size,active:active.length,stages:active.filter(r=>r.kind==='form').length,companions:active.filter(r=>r.kind==='companion').length,partners:active.filter(r=>r.kind==='partner').length,authors:active.filter(r=>r.kind==='author').length,supplemental:supplemental.length,protectedVariants:protectedVariants.length,assets:assets.length}};
}
module.exports={auditInventory,readMaster};
if(require.main===module){const root=path.resolve(__dirname,'../..'),d=auditInventory(root);const out=process.argv[2]||'docs/character-3d/full-rollout-v0/inventory.json';fs.writeFileSync(path.resolve(root,out),JSON.stringify(d,null,2)+'\n');console.log(d.counts);if(d.missingAssets.length||d.unclassifiedAssets.length){console.error(d.missingAssets,d.unclassifiedAssets);process.exitCode=1;}}

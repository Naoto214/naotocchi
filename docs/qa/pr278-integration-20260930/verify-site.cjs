const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');process.chdir(root);
const names=require(root+'/tools/expression-stage-names.json'),expression=require(root+'/pet-expression.js');
const {buildSheet}=require(root+'/tools/expression-contact-sheet.cjs'),{buildPreview}=require(root+'/tools/cat-expression-preview.cjs');
const categories=new Set(),icons=new Set(),sheets=[];
for(const [line,labels] of Object.entries(names))for(let i=0;i<8;i++){
 const stage=String(i+1).padStart(2,'0'),base=`assets/characters/${line}/${stage}.png`;
 categories.add(expression.hungerCategoryFor(base));const markup=expression.accentFor(base,'hungry');for(const m of markup.matchAll(/href="(assets\/[^"]+)"/g)){assert(fs.existsSync(m[1]));icons.add(m[1]);}
 const svg=buildSheet(line,stage,labels[i]);assert.equal([...svg.matchAll(/data:image\/png;base64,/g)].length,10);assert(!/href="assets\//.test(svg));sheets.push({line,stage,sha256:crypto.createHash('sha256').update(svg).digest('hex')});
}
assert.equal(sheets.length,248);assert.equal(categories.size,19);assert.equal(icons.size,15);
const preview=buildPreview();const child=preview.match(/srcdoc="([\s\S]*?)"[^>]*>/)[1].replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;/g,"'").replace(/&amp;/g,'&');let refs=0;
for(const m of child.matchAll(/(?:src|href)="([^"]+)"/g)){const url=m[1].split('?')[0];if(!url||url.startsWith('#')||url.startsWith('data:')||/^https?:/.test(url))continue;assert(fs.existsSync(path.resolve(root,url)),url);refs++;}
fs.writeFileSync(__dirname+'/site-mechanical.json',JSON.stringify({stageSheets:sheets,lines:31,hungerAssignments:248,categories:[...categories].sort(),foodIcons:[...icons].sort(),previewReferences:refs,missingReferences:0,scope:'all 248 SVG sheets regenerated in memory using production bytes, no publication or visual reapproval'},null,2)+'\n');console.log('Site sheets248 / hunger248 / categories19 / icons15 / refs'+refs+' PASS');

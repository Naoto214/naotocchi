const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'../..');
const createCases=require('./cases.cjs');
const BRIDGE='\n  window.__relationshipQaBridge = {state:()=>state,render,startRelationshipPositive,play:()=>el.playWithBtn.click()};\n';
function instrument(source){
 const anchor=/\}\)\(\);\s*$/;if(!anchor.test(source))throw Error('QA bridge anchor missing');
 return source.replace(anchor,match=>BRIDGE+match);
}
const json=value=>JSON.stringify(value).replace(/</g,'\\u003c');
function gameDocument(cases){
 let html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
 if(/<script\b[^>]*\btype=/i.test(html))throw Error('Review new script type before QA generation');
 html=html.replace(/<script\b/g,'<script type="application/x-relationship-qa"');
 html=html.replace(/src="script\.js\?[^\"]*"/,'src="qa-runtime.js"');
 return html.replace('</head>',`<script type="application/json" id="qa-cases">${json(cases)}</script>\n<script src="qa-hook.js"></script>\n<script src="qa-bootstrap.js"></script>\n</head>`);
}
function build(out){
 out=path.resolve(out);if(out===ROOT||out.startsWith(ROOT+path.sep)&&!out.startsWith(path.join(ROOT,'test-results')+path.sep))throw Error('Output must be external or test-results child');
 if(fs.existsSync(out)&&fs.readdirSync(out).length)throw Error('Use an empty output directory');
 fs.mkdirSync(out,{recursive:true});
 const original=process.cwd();let cases;
 try{process.chdir(ROOT);cases=createCases();}finally{process.chdir(original);}
 const sources=[];
 function copy(rel){const input=path.join(ROOT,rel),target=path.join(out,rel);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(input,target);sources.push({path:rel,sha256:crypto.createHash('sha256').update(fs.readFileSync(input)).digest('hex')});}
 for(const file of fs.readdirSync(ROOT))if(/\.(js|css|json)$/.test(file)&&file!=='script.js'&&!file.startsWith('package'))copy(file);
 function assets(dir){for(const entry of fs.readdirSync(path.join(ROOT,dir),{withFileTypes:true})){const rel=path.join(dir,entry.name);if(entry.isDirectory())assets(rel);else copy(rel);}}
 assets('assets');
 fs.writeFileSync(path.join(out,'qa-runtime.js'),instrument(fs.readFileSync(path.join(ROOT,'script.js'),'utf8')));
 fs.writeFileSync(path.join(out,'game.html'),gameDocument(cases));
 for(const [src,target] of [['bootstrap.js','qa-bootstrap.js'],['runtime-hook.js','qa-hook.js'],['controls.js','qa-controls.js']])fs.copyFileSync(path.join(__dirname,src),path.join(out,target));
 fs.writeFileSync(path.join(out,'index.html'),fs.readFileSync(path.join(__dirname,'page.html'),'utf8').replace('/*QA_CASES*/',json(cases.map(({save,...c})=>c))));
 sources.push(...['index.html','script.js'].map(rel=>({path:rel,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,rel))).digest('hex')})));
 fs.writeFileSync(path.join(out,'qa-source-manifest.json'),JSON.stringify({sourceHead:require('node:child_process').execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),files:sources},null,2)+'\n');
 return {out,cases:cases.length,copied:sources.length};
}
if(require.main===module){if(!process.argv[2])throw Error('Usage: node tools/relationship-home-qa/build.cjs <empty-output-directory>');console.log(JSON.stringify(build(process.argv[2])));}
module.exports={createCases,gameDocument,instrument,BRIDGE,build};

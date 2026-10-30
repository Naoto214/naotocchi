// Add v9 to a preserved v8 package. No transformation or overwrite of earlier versions.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const out=path.resolve(process.argv[2]),read=n=>fs.readFileSync(path.join(out,n),'utf8'),files=[];
if(!fs.existsSync(path.join(out,'release-v8.json')))throw Error('Preserved v8 required');
const convert=s=>s.replaceAll('home-v8','home-v9').replaceAll('homeV8','homeV9').replaceAll('HomeV8','HomeV9').replaceAll('data-home-v8','data-home-v9');
function put(n,s){fs.writeFileSync(path.join(out,n),s);files.push(n);}
for(const n of fs.readdirSync(out).filter(n=>/^(qa-home-v8|home-v8)/.test(n)&&/\.(js|mjs|html|css)$/.test(n))){put(n.replaceAll('v8','v9'),convert(read(n)));}
put('home-v9-manifest.mjs',fs.readFileSync('home-v9-manifest.mjs','utf8'));
for(const [src,dst]of [['gallery.html','home-v9.html'],['gallery.js','home-v9-gallery.js'],['qa.js','home-v9-qa-runner.js'],['qa.html','home-v9-validation.html']])put(dst,fs.readFileSync('tools/home-v9-'+src,'utf8'));
const image='assets/home-v9-20261030/runtime/water-g.webp';fs.mkdirSync(path.dirname(path.join(out,image)),{recursive:true});fs.copyFileSync(image,path.join(out,image));files.push(image);
fs.mkdirSync(path.join(out,'v9-comparisons'),{recursive:true});for(const n of fs.readdirSync('docs/qa/home-v9').filter(n=>n.endsWith('.webp'))){const dst='v9-comparisons/'+n;fs.copyFileSync('docs/qa/home-v9/'+n,path.join(out,dst));files.push(dst);}
const unique=[...new Set(files)];put('release-v9.json',JSON.stringify({version:9,githubHead:process.env.HOME_V9_GITHUB_HEAD||require('node:child_process').execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),baselineGitHub:'5376d2e6ca29652cd8ae30ada37ec2e91aff43f9',adoption:{water:'water A retained',waterG:'comparison only; owner iPhone QA required',sea:'sea-b2 design',star_stop:'star-new design',memory_lake:'lake-new design',production:'not approved'},files:Object.fromEntries(unique.map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(path.join(out,n))).digest('hex')]))},null,2)+'\n');
const index=read('index.html');if(!index.includes('id="home-v9-entry"'))put('index.html',index.replace('<body>','<body><nav id="home-v9-entry" style="padding:20px;background:#dcece3"><strong>VERSION 9</strong> · <a href="home-v9.html">水辺A/Gと海B2を比較</a> · <a href="home-v9-play.html">卵から育てる</a></nav>'));
console.log('V9 additive build:',unique.length,'files');

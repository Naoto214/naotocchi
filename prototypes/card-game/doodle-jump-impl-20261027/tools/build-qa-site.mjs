// Build the owner-only trial site for iPhone QA from the CURRENT branch: the Pages runtime files of the card game
// (tools/pages/allowlist.json) + the QA panel. QA-only rewrites, never applied to the repository runtime:
//  - enlarged card art uses the small images (the artifact host holds at most ~511 files; art bytes are unchanged)
//  - the egg image (../../assets/...) is inlined as a data URI
// Usage: node tools/build-qa-site.mjs <out dir>   → <out>/index.html (artifact page) + <out>/files/** + <out>/files.json
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,rmSync} from 'node:fs';import {dirname,join} from 'node:path';import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url)),repo=join(here,'..','..','..','..'),game=join(repo,'prototypes/card-game'),out=process.argv[2];
rmSync(out,{recursive:true,force:true});mkdirSync(join(out,'files'),{recursive:true});
const allow=JSON.parse(readFileSync(join(repo,'tools/pages/allowlist.json'),'utf8')).files.filter(f=>f.startsWith('prototypes/card-game/'));
const keep=allow.map(f=>f.slice('prototypes/card-game/'.length)).filter(f=>!f.startsWith('art-delivery/large/')&&f!=='index.html'&&!f.endsWith('.md'));
const files={};
for(const f of keep){const dst=join(out,'files',f);mkdirSync(dirname(dst),{recursive:true});
 if(f==='ui-art.mjs'){writeFileSync(dst,readFileSync(join(game,f),'utf8').replace(/"large": "art-delivery\/large\/[^"]+"/g,()=>'"large": null').replace(/"small": ("art-delivery\/small\/[^"]+"),\n(\s*)"large": null/g,'"small": $1,\n$2"large": $1'));}
 else if(f==='ui-presentation.mjs'){const egg='data:image/png;base64,'+readFileSync(join(repo,'assets/characters/egg/intact.png')).toString('base64');writeFileSync(dst,readFileSync(join(game,f),'utf8').replace('../../assets/characters/egg/intact.png',egg));}
 else copyFileSync(join(game,f),dst);
 files[f]=f.endsWith('.mjs')?{from:'files/'+f,contentType:'text/javascript'}:'files/'+f;}
// Page: the game's index.html body with the QA panel at the top of the welcome screen.
const html=readFileSync(join(game,'index.html'),'utf8');
const head=html.match(/<head>([\s\S]*?)<\/head>/)[1].replace(/<meta charset[^>]*>|<meta name="viewport"[^>]*>|<title>[^<]*<\/title>/g,'');
let body=html.match(/<body>([\s\S]*?)<\/body>/)[1];
const panel=readFileSync(join(here,'..','qa','qa-panel.html'),'utf8'),css=readFileSync(join(here,'..','qa','qa-panel.css'),'utf8');
const saves=readFileSync(join(game,'tests/doodle-jump-hotseat2-saves.json'),'utf8');
const script=readFileSync(join(here,'..','qa','qa-panel.mjs'),'utf8').replace('__SAVES__',()=>saves.trim());
body=body.replace('<main><section id="welcome">','<main><section id="welcome">\n'+panel);
const page=`<title>ぴょんぴょんジャンプ試遊版</title>\n${head}\n<style>${css}</style>\n${body}\n<script type="module">\n${script}\n</script>\n`;
writeFileSync(join(out,'index.html'),page);writeFileSync(join(out,'files.json'),JSON.stringify(files,null,1));
const art=keep.filter(f=>f.startsWith('art-delivery/'));
console.log(JSON.stringify({files:keep.length,art:art.length,runtime:keep.length-art.length,pageBytes:page.length}));

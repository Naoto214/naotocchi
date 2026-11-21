// Run from repo root. Reads registrations without starting games.
const fs=require('fs'),vm=require('vm'),cp=require('child_process');
const dest=__dirname;
const box={console,Math,Map,Set,Date};vm.createContext(box);
vm.runInContext(fs.readFileSync('games.js','utf8'),box);
const g=box.installNaotocchiMinigames({SEASON:{SPRING:'spring',SUMMER:'summer',AUTUMN:'autumn',WINTER:'winter'},clamp:(v,a,b)=>Math.max(a,Math.min(b,v))});
const script=fs.readFileSync('script.js','utf8');
const object=name=>vm.runInNewContext('('+script.split('const '+name+' = ')[1].split('\n  };')[0]+'\n})');
const info=object('MINIGAME_INFO'),genres=object('MINIGAME_GENRE_OF_CATEGORY');
const unique=new Map();
function add(game,category,pool){if(!game?.id)return;const genre=genres[category]||'action';unique.set(game.id,{id:game.id,name:info[game.id]?.name||game.id,category,genre,pool,currentBgm:genre==='drive3d'?'race':['puzzle','board'].includes(genre)?'puzzle':genre==='sports'?'sports':'game',proposed:'mini-'+genre});}
for(const game of g.MINIGAMES)add(game,g.minigameCategoryOf.get(game),'general');
for(const [key,entries] of Object.entries(g.REGION_MINIGAMES))for(const e of entries)add(e.game,e.category,'region:'+key);
for(const [key,entries] of Object.entries(g.SEASONAL_MINIGAMES))for(const e of entries)add(e.game,e.category,'season:'+key);
const quickText=fs.readFileSync('quick.js','utf8');
const quick=[...quickText.matchAll(/def\(\{ id: '([^']+)',[\s\S]*?cue: '([^']+)'/g)].map(m=>({id:m[1],name:m[2],currentBgm:'game (quick run level)',proposed:/find|memory|count|partner|order|color|same|sort/.test(m[1])?'quick-think':'quick-play',policy:'連続モードはラウンド境界でのみ切替。各3秒ゲームで再起動しない'}));
const paths=cp.execFileSync('git',['ls-tree','-r','--name-only','HEAD'],{encoding:'utf8',maxBuffer:8*1024*1024}).trim().split('\n');
const allow=fs.readFileSync('tools/pages/allowlist.json','utf8');
const routes=paths.filter(p=>p.endsWith('.html')).map(path=>({path,served:allow.includes('"'+path+'"'),scope:path.startsWith('docs/')?'documentation/QA':path.startsWith('comparisons/')?'comparison':'runtime/prototype',audit:fs.existsSync(path)?'source available':'historical source not fetched; no playback claim'}));
const evidence=[];for(const p of paths.filter(p=>/\.(js|mjs|html)$/.test(p)&&!p.startsWith('vendor/')&&!p.startsWith('tests/')&&!p.startsWith('tools/')&&fs.existsSync(p))){const text=fs.readFileSync(p,'utf8');text.split('\n').forEach((l,i)=>{if(/AudioContext|new Audio\(|<audio\b|installNaotocchiAudio|soundBgm|\.mp3|\.ogg|\.wav|\.m4a/.test(l))evidence.push({path:p,line:i+1,text:l.slice(0,350)});});}
const data={baseline:cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',maxBuffer:8*1024*1024}).trim(),trackedFiles:paths.length,normal:[...unique.values()],quick,routes,audioFiles:paths.filter(p=>/\.(mp3|ogg|wav|m4a|flac|mid)$/i.test(p)),evidence};
fs.writeFileSync(dest+'/inventory.json',JSON.stringify(data,null,2));
fs.writeFileSync(dest+'/GAME-MAPPING.md','# 全ミニゲーム割当案\n\n未制作のジャンル曲は proposed ID。既存ルールは変更しない。\n\n|ID|名前|プール|現行BGM|候補|\n|---|---|---|---|---|\n'+data.normal.map(g=>`|${g.id}|${g.name}|${g.pool}|${g.currentBgm}|${g.proposed}|`).join('\n')+'\n\n## クイック\n\n|ID|指示|候補|\n|---|---|---|\n'+quick.map(g=>`|${g.id}|${g.name}|${g.proposed}|`).join('\n'));
console.log({normal:unique.size,quick:quick.length,html:routes.length,servedHtml:routes.filter(r=>r.served).length,audioFiles:data.audioFiles.length,evidence:evidence.length});

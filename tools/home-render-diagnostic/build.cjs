// Local/owner-only diagnosis of the preserved V17 renderer. Never edits V17
// assets, entrypoints or production saves; publication requires owner approval.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const out=path.resolve(process.argv[2]),here=__dirname;
const runtime=fs.readFileSync(path.join(out,'v17-script.js'),'utf8');
if(crypto.createHash('sha256').update(runtime).digest('hex')!=='fbeac5d83232afc290f87bb107753a37230c45270aa3a75890d010f45517d8d9')throw Error('V17 runtime differs from c0a05f8');
const baseHTML=fs.readFileSync(path.join(out,'v17.html'),'utf8');
if(!baseHTML.includes('data-home-display-version="17"'))throw Error('V17 entry required');
const hook=fs.readFileSync(path.join(here,'state-hook.js'),'utf8');
let script=runtime.replaceAll('naotocchi-save-v1','naotocchi-render-diagnostic-v1').replace('setInterval(loop, TICK_MS);','/* isolated diagnostic clock */');
for(const name of ['scheduleIdleGreeting','scheduleCompanionEncounter','scheduleEnvironmentMoment'])script=script.replace('function '+name+'() {','function '+name+'() { return; /* isolated diagnostic timers */');
const end=script.lastIndexOf('})();');if(end<0)throw Error('Runtime closure not found');
script=script.slice(0,end)+hook+'\n'+script.slice(end);
const hash=s=>crypto.createHash('sha256').update(s).digest('hex').slice(0,12);
fs.writeFileSync(path.join(out,'v17-render-diagnostic-script.js'),script);
const panel=fs.readFileSync(path.join(here,'panel.js'),'utf8');fs.writeFileSync(path.join(out,'v17-render-diagnostic-panel.js'),panel);
const html=baseHTML.replace(/src="v17-script.js[^"\n]*"/,'src="v17-render-diagnostic-script.js?v='+hash(script)+'"').replace('</body>','<script src="v17-render-diagnostic-panel.js?v='+hash(panel)+'"></script>\n</body>');
fs.writeFileSync(path.join(out,'v17-render-diagnostic.html'),html);
console.log(JSON.stringify({files:3,baseline:'V17',productionFilesChanged:0}));

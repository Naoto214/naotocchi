const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const sources={
 'prototypes/main-theme-20261108/songs.js':'4af9dd03ccbdf4d9a22fdaacf04e3ae11d25f4d9',
 'prototypes/main-theme-v2-20261108/songs-v2.js':'b376a9c94cb66eee08407213df0243a530648d91',
 'prototypes/main-theme-v2-20261108/engine-v2.js':'1fa6dc43d141179c3db935b7e6e0a3bdf8db2b66',
 'prototypes/main-theme-v3-morning-20261108/songs-v3.js':'551811916177ab72ddefb5d4befe2dd1205fadb0',
 'prototypes/main-theme-favorites-20261108/favorites.js':'3b137b09e3834de3184f7533c385e052192d0da1'};
test('all five upstream files match pinned Git blobs byte for byte',()=>{for(const [file,sha]of Object.entries(sources)){const b=fs.readFileSync(path.join(root,file));assert.equal(crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),sha,file)}});
test('いつものにわ retains every raw melody, rhythm and harmony value from audio.js home',()=>{const src=fs.readFileSync(path.join(root,'audio.js'),'utf8');const tracks=vm.runInNewContext('const _=null;('+src.slice(src.indexOf('const TRACKS = ')+15,src.indexOf('\n    };',src.indexOf('const TRACKS = '))+6)+')');const raw=require('../selection.js').THEMES[1].song.raw;for(const key of ['bpm','swing','lead','bass','chords','roots'])assert.equal(JSON.stringify(raw[key]),JSON.stringify(tracks.home[key]),key)});
test('exactly 13 official regions times 4 background files exist',async()=>{const {DAYPARTS}=await import(path.join(root,'home-dayparts.mjs'));assert.equal(Object.keys(DAYPARTS).length,13);for(const row of Object.values(DAYPARTS)){assert.deepEqual(Object.keys(row),['morning','day','evening','night']);for(const file of Object.values(row)){const b=fs.readFileSync(path.join(root,file));assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP')}}});

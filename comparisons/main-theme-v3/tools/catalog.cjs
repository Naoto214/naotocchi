const fs=require('node:fs'),path=require('node:path'),music=require('../songs.js'),audio=require('../engine.js');
fs.writeFileSync(path.join(__dirname,'../catalog.json'),JSON.stringify(music.SONGS.map(s=>({...s,events:audio.events(s,true)})),null,2)+'\n');

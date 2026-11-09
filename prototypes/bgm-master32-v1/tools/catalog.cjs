const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=n=>JSON.parse(fs.readFileSync(path.join(root,n)));
const source=read('source.json'),scores=read('scores.json'),home=read('home-metrics-original.json');
const homeIds={'home-morning':'soyokaze','home-day':'current','home-evening':'starlake','home-night':'hoshizora'};
const grouping={poyo:'なおぽよ。',koro:'なおころ。',card:'CARD GAME',action:'ミニゲーム・クイック',quick:'ミニゲーム・クイック',race:'ミニゲーム・クイック',puzzle:'ミニゲーム・クイック',sports:'ミニゲーム・クイック',board:'ミニゲーム・クイック',fishing:'ミニゲーム・クイック',explore:'3D・冒険',flight:'3D・冒険'};
const descriptions={poyo:'マリンバとハープの、柔らかな木漏れ日。',koro:'ころがるピアノと弦のピチカート。',card:'輪郭のあるピアノと、控えめなリズム。',action:'マレットとピアノの、軽やかな掛け合い。',explore:'木管と弦が描く、少し不思議な地下世界。',love:'ピアノとハープで包む、静かな記念日。',celebrate:'温かなピアノとベルのお祝い。',memory:'柔らかなピアノと弦でたどる思い出。',quick:'粒立ちのよいマリンバと軽いリズム。',race:'ピアノと弦の刻みで生む、ほどよい疾走感。',farewell:'音数を抑えたピアノとハープ。',puzzle:'フルートと穏やかな3拍子の伴奏。',sports:'マリンバと弦が跳ねる軽いステップ。',flight:'フルート、透明なベル、きらめくハープ。',board:'小さなピアノのメヌエット。',fishing:'ピアノの間に、ハープと水面のきらめき。',sleep:'ごく静かなハープと、柔らかなピアノ。',hatch:'金管、ベル、ティンパニによる短いファンファーレ。'};
const metrics=fs.existsSync(path.join(root,'render-metrics.json'))?read('render-metrics.json'):[];
const tracks=source.map((s,i)=>{
 const a=scores.find(x=>x.id===s.id),h=home.find(x=>x.id===homeIds[s.id]+'-A'),m=metrics.find(x=>x.id===s.id)||h;
 const homeUse={'home-morning':'ホーム・朝 05:00〜09:59','home-day':'ホーム・昼 10:00〜15:59','home-evening':'ホーム・夕 16:00〜18:59','home-night':'ホーム・夜 19:00〜04:59'};
 const usage=homeUse[s.id]||(s.uses.length?[...new Set(s.uses.map(x=>x.game==='ホーム'?x.scene.split('（')[0]:x.game+' / '+x.scene.split('（')[0]))].slice(0,2).join('・'):(s.id==='ohayo'?'孵化ファンファーレの原曲（採用一覧に保存）':'飛行・海の原曲108版（配置は120版）'));
 const duration=h?h.seconds:a.duration;
 const file='audio/'+s.id+'.m4a',master='audio/'+s.id+'.flac';
 const meta={number:i+1,id:s.id,title:s.title,usage,category:h?'ホーム':grouping[a.family]||'人生・特別な場面',bpm:s.song.bpm,meter:s.song.meter,bars:s.song.bars.length,repeats:s.song.repeats,duration,loop:a?a.loop:true,loopStart:0,loopEnd:duration,sampleRate:h?32000:44100,audio:file,master,midi:'midi/'+s.id+'.mid',badge:h?'採用アレンジA':s.id==='var-flight'?'飛行・海の完成版':s.uses.length===0?'採用原曲':a&&!a.loop?'ジングル':'',arrangement:h?'採用済みアレンジAを無加工で継承。':descriptions[a.family],placementRows:read('placement.json').filter(r=>r.songs.includes(s.id)).map(r=>r.rowId),integratedLUFS:m?.integratedLUFS??a?.targetLUFS,baselineLUFS:-23};
 for(const [label,p] of [['audio',file],['master',master]])if(fs.existsSync(path.join(root,p))){const b=fs.readFileSync(path.join(root,p));meta[label+'Sha256']=crypto.createHash('sha256').update(b).digest('hex');meta[label+'Bytes']=b.length;}
 return meta;
});
fs.writeFileSync(path.join(root,'catalog.json'),JSON.stringify({version:1,sourcePR:534,sourceCommit:read('source-lock.json').pr534,tracks},null,2)+'\n');
fs.writeFileSync(path.join(root,'TRACKS.md'),'# 採用32曲と音源ID\n\n| ID | 曲名 | 用途 | BPM | 秒 | 編曲 |\n|---|---|---|---:|---:|---|\n'+tracks.map(s=>`| ${s.id} | ${s.title} | ${s.usage} | ${s.bpm} | ${s.duration.toFixed(2)} | ${s.arrangement} |`).join('\n')+'\n');
fs.writeFileSync(path.join(root,'PLACEMENT.md'),'# 最終配置表50行（曲の選択はPR #534のまま）\n\n| 行ID | ゲーム | 場面 | 曲ID | 状態 | ループ | 指定音量 |\n|---|---|---|---|---|---|---|\n'+read('placement.json').map(r=>`| ${r.rowId} | ${r.game} | ${r.scene} | ${r.songs.join(', ')||'—'} | ${r.status} | ${r.loop} | ${r.volume} |`).join('\n')+'\n\n全ての開始・停止・フェード・効果音・gameIds指定はplacement.jsonに保持。原盤の実測音量と場面指定音量は別なので、統合時は二重に減衰しないこと。基準−23 LUFSに対し、再生ゲイン(dB) = 場面指定差(dB) − (原盤実測LUFS + 23)。\n');
console.log(`Catalog: ${tracks.length} tracks / ${tracks.filter(s=>s.audioSha256).length} audio files present`);

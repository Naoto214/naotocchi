'use strict';
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const calls=[],listeners={};
function element(id){return{id,value:id==='volume'?'65':id==='mode'?'full':'native',checked:true,textContent:'',classList:{add(){},remove(){}},setAttribute(){},append(){},selectedOptions:[{textContent:'test'}],addEventListener(name,fn){(listeners[id+':'+name]??=[]).push(fn);}};}
const ids={};for(const id of ['mode','tempo','volume','loop','stop','status','progress','references','candidates','media'])ids[id]=element(id);
const media=ids.media;media.paused=true;media.currentTime=0;media.duration=48;media.readyState=4;
media.pause=()=>{calls.push('pause');media.paused=true;};media.load=()=>calls.push('load');media.removeAttribute=()=>{};
let rejectPlay=false;
media.play=()=>{calls.push('play');media.paused=false;return rejectPlay?Promise.reject(Object.assign(new Error('blocked'),{name:'NotAllowedError'})):Promise.resolve();};
const card=element('card');
const document={hidden:false,getElementById:id=>ids[id]||card,createElement:()=>element('new'),querySelectorAll:()=>[],querySelector:()=>card,addEventListener(name,fn){listeners['doc:'+name]=[fn];}};
const song={id:'A',label:'A',title:'test',signature:[4,4],bpm:80,bars:[{}],meter:4,repeats:1,subtitle:'',character:''};
const sandbox={document,window:{addEventListener(){}},THEME_V3:{SONGS:[song]},THEME_AUDIO:{render(){return{samples:new Float32Array(100),sampleRate:22050}},wav(){return new ArrayBuffer(244)}},Blob,URL:{createObjectURL(){return 'blob:test'},revokeObjectURL(){calls.push('revoke')}},setTimeout(){},setInterval(){},console:{error(){}}};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../player.js'),'utf8'),sandbox);
(async()=>{
 const promise=vm.runInContext('play(songs[0])',sandbox);
 assert(calls.includes('play'),'HTMLAudioElement.play must run synchronously inside the click, before any await');
 assert(!sandbox.context,'Playback must not depend on AudioContext');
 await promise;
 assert(!ids.status.textContent.startsWith('再生中'),'Do not report playback before a media event');
 for(const fn of listeners['media:playing']||[])fn();
 assert(ids.status.textContent.startsWith('再生中'));
 media.currentTime=12;for(const fn of listeners['media:timeupdate']||[])fn();assert.equal(ids.progress.value,.25);
 vm.runInContext('stop()',sandbox);assert(media.paused);assert.equal(media.currentTime,0);
 rejectPlay=true;await vm.runInContext('play(songs[0])',sandbox);assert(ids.status.textContent.includes('標準プレーヤー'));
 assert.equal(ids.media.src,'blob:test');
 for(const fn of listeners['media:error']||[])fn();assert(ids.status.textContent.includes('読み込めません'));
 console.log('PASS: synchronous native play, no AudioContext, truthful status, progress, stop, rejection fallback, media error');
})().catch(e=>{console.error(e);process.exitCode=1});

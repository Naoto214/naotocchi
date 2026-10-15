import assert from 'node:assert/strict';import fs from 'node:fs';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{JSDOM}=require(process.env.JSDOM_PATH||'/tmp/naopoyo-ui-deps/node_modules/jsdom');
const dom=new JSDOM(fs.readFileSync(new URL('../index.html',import.meta.url),'utf8'),{url:'http://localhost/prototypes/growth-clear/'});
for(const k of ['window','document','Option'])globalThis[k]=dom.window[k];
await import('../ui.mjs');const $=id=>document.getElementById(id),click=id=>$(id).click();
assert.equal(document.querySelectorAll('.cell').length,72);assert.equal($('next').children.length,4);click('drop');assert.match($('status').textContent,/1セット/);
$('anchor').value='C';click('start');let choices=0;for(let i=0;i<15;i++){click('drop');while(document.querySelector('.pick')){choices++;document.querySelector('.pick').click();}}
assert(choices>0);click('ai');assert.match($('status').textContent,/セット/);$('mode').value='old';click('start');click('drop');assert.match($('status').textContent,/1セット/);
$('anchor').value='A';$('mode').value='new';click('start');click('egg');document.querySelectorAll('.cell')[71].click();assert.match($('message').textContent,/Invalid egg/);assert.match($('status').textContent,/0セット/);click('cancel');
console.log(JSON.stringify({cells:72,NEXT:3,Cchoices:choices,AI:true,oldMode:true,invalidItemAtomic:true,scope:'DOM functional smoke, not browser layout or iPhone QA'}));

globalThis.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(new URL('../'+url.replace('./',''),import.meta.url),'utf8'))});
$('example').value='chain5';await $('load-example').onclick();assert.equal($('wave').max,'5');$('wave').value='3';$('wave').oninput();assert.equal($('drop').disabled,true);click('live');assert.equal($('drop').disabled,false);console.log('Representative 5-chain load and wave replay PASS');

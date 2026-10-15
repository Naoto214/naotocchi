import {createRequire} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const {JSDOM}=createRequire(import.meta.url)(process.env.JSDOM_PATH||'/tmp/naopoyo-ui-deps/node_modules/jsdom');
const old=new JSDOM(fs.readFileSync(new URL('../../growth-chain/player.html',import.meta.url),'utf8')).window.document;
for(const id of ['title','modes']) {
 const section=old.getElementById(id),link=section.querySelector('[data-new-rule]');
 assert.ok(link,`new-rule entry on ${id}`);
 assert.equal(link.getAttribute('href'),'../growth-clear/player.html');
 assert.match(section.textContent,/旧ルール/);
}
const trial=new JSDOM(fs.readFileSync(new URL('../player.html',import.meta.url),'utf8')).window.document;
assert.equal(trial.querySelector('[data-old-rule]').getAttribute('href'),'../growth-chain/player.html?series=1');
assert.equal(trial.querySelector('#cost').value,'2');
console.log('PASS old default, explicit trial entry and return');

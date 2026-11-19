import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8'),app=fs.readFileSync(new URL('../app.mjs',import.meta.url),'utf8');
test('D/power/variants/Undo controls exist',()=>{for(const id of ['power','max-steps','reset-heading','pass-generated','undo','trace'])assert(html.includes(`id="${id}"`),id);assert(html.includes('data-mode="D"'));});
test('preview never uses production persistence',()=>assert(!/localStorage|sessionStorage|indexedDB|serviceWorker/.test(app)));
test('eight tutorial steps and four-way comparison are wired',()=>{assert(app.includes("['A','B','C','D']"));assert(app.includes('時を取り戻す'));assert(app.includes("$('power').value"));});

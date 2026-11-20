import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {CARD_ART} from '../ui-art.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>readFileSync(new URL('../'+p,import.meta.url));
// Independently pinned approved PR498 delivery; do not derive expectations from the live manifest.
const EXPECTED={
  "W-time-ix": {
    "original": "22ce850de58275e9826730e56ca67ee24efe6d2af5d9be034094b5877797ae52",
    "small": "d92309a354406c802005e90efeda46a96104d2cf8f620dd362ee9b33929cba1d",
    "large": "816e94692e5d2fea279871a92916e35896d1b63967312430dd80baf9b77566dd"
  },
  "W-time-x": {
    "original": "49c41e8ed93006d29c431dac5a5088b7592b8067ca2808c8c0be67ee455ee2ed",
    "small": "01a1e086347116af5bebec9f7d6e6c26c640b4e59c3277df08492fc57b773169",
    "large": "31089be76a35ce07310de3b4141b4f9dcdad2b96331ecd075623369c6a2dbeb0"
  },
  "W-time-xi": {
    "original": "0767d333d57274796d76d7dd5be1f221427a4ddc18622f1bc5990ba26bc832e6",
    "small": "92ebfefa3bd496a741c0ad55d632b7fcacc97557b0f6a83d7ca1aba3670e0cda",
    "large": "bf941f5652cfbe127349757ee70c90ac73a6f31ce57270a86a38f1f0632ec875"
  },
  "W-time-xii": {
    "original": "a7288da3b853b1d86b34b699fda9b63328caf37524ff0cdd289a4085b8a23c1d",
    "small": "ab939cb57c278047654a725754f31e0b1ac3cda1dbdd85b7f96ee37e31ed3550",
    "large": "68ab1da0d45536abf3f91fe45df231e3c78f9e6ab6e63c9a6a0116edfb4c40e7"
  },
  "E-hayajimai": {
    "original": "654b96e76d975a2cc5727b7c839b5b705dfe184ea84b8e6a8a2e4d6ca4683fe6",
    "small": "c6654b4e04eec72f8336f30430dbffd5254185b99fe01f34183e327288d68acb",
    "large": "e218b4236826fa5412ddfe663e2e9f8ac66fb129ec6d32817d16998acf862555"
  },
  "E-nagaiki": {
    "original": "9eb4a8d125aa9f42ee2d08db4ff6e98e840341eca4f85e87d4e57a0a9669c239",
    "small": "df181cbf68449dcd5f0a4cc1200420573e1353a38bb3d846560f1cfce88bd7ec",
    "large": "630e05ecf2eeecc4321a457f19f35203e8ec66c156f2e622d0ea5e4edfbb78f2"
  },
  "E-omoide-photo": {
    "original": "63eea753e9b34d76d4f8af4173c8771edde26b91fadc559dde1c16bf4f3162bd",
    "small": "4d04892dd9af1bd872ab2887bdd617ed3d78ab37d9bfb33e95979a7653c620ce",
    "large": "7cef5605a0cc27581e2e83137084c20219422aa458cf5cd30a1c477ab827c923"
  }
};
test('459 art mappings include the seven exact approved deliveries',()=>{
 assert.equal(Object.keys(CARD_ART).length,459);
 const manifest=JSON.parse(read('art-delivery/manifest.json'));
 const approval=JSON.parse(read('art-pilot/approved-card459-20261120/manifest.json'));
 assert.equal(manifest.count,459);assert.equal(manifest.cards.length,459);assert.equal(approval.cards.length,7);
 for(const [id,hashes] of Object.entries(EXPECTED)){
  const original=read('art-pilot/illustrations/'+id+'.png');
  assert.equal(sha(original),hashes.original,id+' original');
  assert.equal(original.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.deepEqual([original.readUInt32BE(16),original.readUInt32BE(20),original[24],original[25],original[28]],[1536,1024,8,2,0]);
  for(let p=8;p<original.length;){assert.notEqual(original.toString('ascii',p+4,p+8),'tRNS');p+=original.readUInt32BE(p)+12;}
  const record=manifest.cards.find(r=>r.id===id),approved=approval.cards.find(r=>r.id===id);
  assert.equal(record.source_sha256,hashes.original);assert.equal(approved.sha256,hashes.original);
  for(const size of ['small','large']){
   const path=`art-delivery/${size}/${id}-${hashes[size].slice(0,12)}.webp`;
   assert.equal(CARD_ART[id][size],path);assert.equal(sha(read(path)),hashes[size]);
   assert.equal(record[size].path,path);assert.equal(record[size].sha256,hashes[size]);assert.equal(record[size].bytes,read(path).length);
  }
 }
 for(const key of ['original','small','large'])assert.equal(manifest.totals[key],manifest.cards.reduce((n,r)=>n+(key==='original'?r.original_bytes:r[key].bytes),0));
});
test('the existing 452 art mappings and source/delivery records remain unchanged',()=>{
 const prior=Object.fromEntries(Object.entries(CARD_ART).filter(([id])=>!EXPECTED[id]));
 assert.equal(Object.keys(prior).length,452);
 assert.equal(sha(JSON.stringify(prior)),'6143aaf4d7645b432f4c9354d740b0a78bc4669fc58f27807ef128ef48f75dd4');
 const records=JSON.parse(read('art-delivery/manifest.json')).cards.filter(r=>!EXPECTED[r.id]);
 assert.equal(sha(JSON.stringify(records)),'abf512405506fe1b620ea5d58a114de8e186f698aa144b906ff435c5e25b72e3');
});

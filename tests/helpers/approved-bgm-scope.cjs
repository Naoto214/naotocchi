// Only remove the exact adopted BGM hooks; all other baseline bytes remain protected.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const baseline={
  "script.js": "d3c610f1d6c03d38c6fe377d8453194b54cb911b",
  "prototypes/card-game/index.html": "ce413c0598e51e15f7f0145502b87793a4bf09f0",
  "prototypes/life-sugoroku/index.html": "193ea229c806041c9dc9ce93aca86bfb86d39c2c",
  "prototypes/naopoyo-time-hand-chapter1/index.html": "d34a826b9ae1cc00306624213a9967d33ccf8820",
  "prototypes/naopoyo-chapter1/index.html": "7ae48ffb5d4e24ea87b781cf097044582011a970",
  "prototypes/naopoyo-chapter2/index.html": "39b6f6d8300b87a0e20e2edbbd633a0c4e153751",
  "prototypes/naopoyo-rescue/index.html": "b1eb46f60f5305d236b7ba0ff2ded39bb5141a80"
};
const additions={
  "script.js": [
    "    if (audio.bgmJingle) audio.bgmJingle('var-ohayo-hatch2', { duckDb: -14 }); // BGM V2: たまごが かえる しゅんかんの ファンファーレ（配置表 scene-13）\n",
    "    if (event && event.achievement && audio.bgmJingle) audio.bgmJingle('jingle-achieve', { delay: .35 }); // BGM V2: 達成の お知らせ（配置表 scene-15）\n",
    "    getMinigameCategory: (game) => { try { return minigameCategoryOf.get(game) || null; } catch (err) { return null; } },\n",
    "        if (audio.bgmMoment) audio.bgmMoment('event-2', 20000); // BGM V2: 結婚した お知らせ（配置表 scene-10）\n"
  ],
  "prototypes/card-game/index.html": [
    "<script src=\"../../assets/bgm/catalog.js?v=20261114-0fdff208\"></script>\n<script src=\"../../bgm-v2.js?v=20261114-072fe9b2\"></script>\n<script src=\"../../bgm-subapps.js?v=20261114-f60de548\" data-app=\"card\"></script>\n"
  ],
  "prototypes/life-sugoroku/index.html": [
    "<script src=\"../../assets/bgm/catalog.js?v=20261114-0fdff208\"></script>\n<script src=\"../../bgm-v2.js?v=20261114-072fe9b2\"></script>\n<script src=\"../../bgm-subapps.js?v=20261114-f60de548\" data-app=\"naokoro\"></script>\n"
  ],
  "prototypes/naopoyo-time-hand-chapter1/index.html": [
    "<script src=\"../../assets/bgm/catalog.js?v=20261114-0fdff208\"></script>\n<script src=\"../../bgm-v2.js?v=20261114-072fe9b2\"></script>\n<script src=\"../../bgm-subapps.js?v=20261114-f60de548\" data-app=\"naopoyo\"></script>\n"
  ],
  "prototypes/naopoyo-chapter1/index.html": [
    "<script src=\"../../assets/bgm/catalog.js?v=20261114-0fdff208\"></script>\n<script src=\"../../bgm-v2.js?v=20261114-072fe9b2\"></script>\n<script src=\"../../bgm-subapps.js?v=20261114-f60de548\" data-app=\"naopoyo\"></script>\n"
  ],
  "prototypes/naopoyo-chapter2/index.html": [
    "<script src=\"../../assets/bgm/catalog.js?v=20261114-0fdff208\"></script>\n<script src=\"../../bgm-v2.js?v=20261114-072fe9b2\"></script>\n<script src=\"../../bgm-subapps.js?v=20261114-f60de548\" data-app=\"naopoyo\"></script>\n"
  ],
  "prototypes/naopoyo-rescue/index.html": [
    "<script src=\"../../assets/bgm/catalog.js?v=20261114-0fdff208\"></script>\n<script src=\"../../bgm-v2.js?v=20261114-072fe9b2\"></script>\n<script src=\"../../bgm-subapps.js?v=20261114-f60de548\" data-app=\"naopoyo-legacy\"></script>\n"
  ]
};
function restoredBlob(file,text=fs.readFileSync(file,'utf8')){
 for(const addition of additions[file]||[]){assert.equal(text.split(addition).length,2,'exact single BGM insertion: '+file);text=text.replace(addition,'');}
 const bytes=Buffer.from(text);return crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
}
function verify(){for(const [file,hash] of Object.entries(baseline))assert.equal(restoredBlob(file),hash,'non-BGM bytes changed: '+file);}
module.exports={baseline,restoredBlob,verify};

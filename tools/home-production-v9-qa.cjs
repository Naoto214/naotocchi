// Private V9 only; reuse the existing V8 seed, renderer and save isolation.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const out=path.resolve(process.argv[2]);
cp.execFileSync(process.execPath,['tools/home-production-v8-qa.cjs',out]);
for(const name of ['script.js','home-production-touch.js','home-production-layout.css'])fs.copyFileSync(name,path.join(out,name));
const prepare=html=>html.replace(/data-home-viewport-version="8"/g,'data-home-viewport-version="9"').replace('<body data-home-production','<body data-home-viewport-version="9" data-home-production').replace('</head>','<meta name="theme-color" content="#342b25"></head>').replace(/((?:src|href)=")([^"?]+)\?v=([^"\s]+)(")/g,(all,pre,file,token,post)=>fs.existsSync(file)?pre+file+'?v='+token.split('-')[0]+'-'+crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex').slice(0,8)+post:all);
for(const kind of ['script.js','diorama.js'])fs.copyFileSync(path.join(out,'v8-qa-'+kind),path.join(out,'v9-qa-'+kind));
// Exercise real independent comment producers through the isolated QA entry.
const q=path.join(out,'v9-qa-script.js');
fs.writeFileSync(q,fs.readFileSync(q,'utf8').replace('window.HomeReleaseQA={',`window.HomeReleaseQA={
 overlap(){clearConversationTimers();clearTimeout(storyFlashTimer);storyFlashTimer=null;homeNoticeQueue.length=0;el.storyFlash.classList.add('hidden');setSpeechBubble('自然なひとこと',petSpeaker(),{holdMs:60000});showStoryEvent({message:'物語のひとこと',petReaction:true,characterComment:true});setMessage('操作への反応',petSpeaker());},
 questionOverlap(){clearTimeout(storyFlashTimer);storyFlashTimer=null;homeNoticeQueue.length=0;el.storyFlash.classList.add('hidden');const ok=this.question();setMessage('質問中の操作反応',petSpeaker());return ok;},
 choiceReply(){showHomeChoiceResult('選んでくれてありがとう',petSpeaker());},
`));
fs.writeFileSync(path.join(out,'v9-qa.html'),prepare(fs.readFileSync(path.join(out,'v8-qa.html'),'utf8').replaceAll('v8-qa','v9-qa')));
const normal=prepare(fs.readFileSync('index.html','utf8'));fs.writeFileSync(path.join(out,'index.html'),normal);fs.writeFileSync(path.join(out,'v9.html'),normal);
fs.writeFileSync(path.join(out,'v9-review.html'),'<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>V9 UI確認</title><style>body{max-width:700px;margin:auto;padding:20px;font:16px/1.7 system-ui;background:#faf8ee}a{display:block;padding:12px;margin:8px 0;border:1px solid #879a81;border-radius:8px}</style><h1>VERSION 9 UI確認</h1><p>縦は通知42px・コメント76px・固定5＋4ボタン。横は右側操作欄。通常試遊とQAの保存は別です。</p><a href="v9.html">V9 通常試遊</a>'+[1,6,28].map(n=>'<a href="v9-qa.html?region=home&count='+n+'">おうち・'+n+'体</a>').join('')+'<a href="v9-qa.html?region=home&count=6&comment='+encodeURIComponent('きれいな景色を見て、しばらく立ちどまっていた。'.repeat(6))+'">長文コメント</a>');

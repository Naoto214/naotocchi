// Run the existing Home geometry regression with an explicit all-present cast fixture.
const fs=require('node:fs'),vm=require('node:vm');
const {serve}=require('./character-3d/shot.cjs');
(async()=>{
 let html;require('../tests/visual-qa.cjs')().configureServer({middlewares:{use(_p,fn){fn({}, {setHeader(){},end(v){html=v;}});}}});
 const source=html.match(/<script>([\s\S]*?)<\/script>/)[1],fixtures=vm.runInNewContext(source.slice(0,source.indexOf('const mount='))+'\nfixtures');
 const server=await serve();let browser;
 try{browser=await require('playwright').chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox']});
 const out='docs/qa/social-expression-20261016/home-layout';fs.mkdirSync(out,{recursive:true});
 await require('../tests/home-conversation-browser.cjs')(browser,'chromium',fixtures,`http://127.0.0.1:${server.address().port}/`,out,['alone','small','small-full','small-large-text']);
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

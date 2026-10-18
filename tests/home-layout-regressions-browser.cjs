// Focus the existing geometry/lifecycle assertions before the full layout suite.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {chromium,webkit}=require('playwright');
let qaHtml;
require('./visual-qa.cjs')().configureServer({middlewares:{use(_path,handler){
  handler({}, {setHeader(){},end(html){qaHtml=html;}});
}}});
const source=qaHtml.match(/<script>([\s\S]*?)<\/script>/)[1];
const fixtures=vm.runInNewContext(source.slice(0,source.indexOf('const mount='))+'\nfixtures');
(async()=>{
  const {createServer}=await import('vite');
  const server=await createServer({server:{host:'127.0.0.1',port:5191,strictPort:true}});
  await server.listen();
  const failures=[];
  try {
    for(const [engine,type] of Object.entries({chromium,webkit})) {
      const browser=await type.launch();
      try {
        for(const [suite,names] of [
          ['home-conversation',['alone','small','small-full','small-large-text']],
          ['dialog-layout',['puppy','small']],
        ]) {
          const output=path.resolve('test-results/home-layout/focused',suite);
          fs.mkdirSync(output,{recursive:true});
          try {
            await require('./'+suite+'-browser.cjs')(browser,engine,fixtures,'http://127.0.0.1:5191/',output,names);
            console.log('PASS focused '+engine+' '+suite);
          } catch(error) {failures.push(engine+' '+suite+': '+error.message);console.error('FAIL focused '+failures.at(-1));}
        }
      } finally {await browser.close();}
    }
  } finally {await server.close();}
  if(failures.length) process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});

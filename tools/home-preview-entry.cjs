// Historical comparison builders need the preserved v22 presenter, not the
// production adapter. Only their disposable entry HTML is converted here.
module.exports=function previewEntry(){return require('fs').readFileSync('index.html','utf8')
 .replaceAll('home-production-diorama.js','home-diorama.js')
 .replaceAll('home-production-model.js','home-diorama-model.js')
 .replaceAll('home-production-touch.js','home-touch.js')
 .replace(' data-home-production="true"','')
 .replace(/<link rel="stylesheet" href="home-production-layout\.css[^\"]*">/g,'')
 .replace(/<script type="module" src="home-v6-egg\.mjs[^\"]*"><\/script>/g,'')
 .replace(/<link rel="stylesheet" href="home-(?:art|v8)\.css[^\"]*">/g,'');};

const native=require('@napi-rs/canvas'),fs=require('node:fs'),path=require('node:path'),{fileURLToPath,pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../../../../..');
function setup(){global.Image=class extends native.Image{set src(v){super.src=typeof v==='string'&&v.startsWith('file:')?fs.readFileSync(fileURLToPath(v)):v}};global.Path2D=native.Path2D;global.document={createElement:()=>native.createCanvas(1,1)};global.devicePixelRatio=1}
module.exports={...native,fs,path,root,setup,mod:p=>import(pathToFileURL(path.join(root,p)))};

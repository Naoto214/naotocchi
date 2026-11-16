const fs=require('fs'),Module=require('module'),path=require('path');
const file=path.resolve('tests/home-production-birth-browser.cjs'),m=new Module(file,module);m.filename=file;m.paths=Module._nodeModulePaths(path.dirname(file));
// Isolate the failing viewport without changing the lifecycle or any assertion.
const source=fs.readFileSync(file,'utf8').replace("['reduce','no-preference']","['reduce']").replace('[[320,568],[375,667],[390,844],[430,932],[390,844,true]]','[[320,568]]');
m._compile(source,file);

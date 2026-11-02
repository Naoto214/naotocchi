import {ChapterSession} from './session.mjs';
import {solutions} from './solutions.mjs';
import {clone} from './engine.mjs';
export const solutionKey=(index,path=solutions[index])=>JSON.stringify([index,path]);
export class ExampleReplay {
 constructor(index,path=solutions[index]){this.path=clone(path);this.session=new ChapterSession(index);this.index=0;this.snapshots=[this.session.serialize()];this.events=[[]];this.results=[null];for(const step of this.path){if(!Array.isArray(step)||step.length!==3)throw Error('Invalid witness');const r=this.session.step(...step);if(!r.ok)throw Error('Illegal witness step '+this.snapshots.length);this.snapshots.push(this.session.serialize());this.events.push(clone(r.events));this.results.push(clone(r));}if(!this.session.cleared)throw Error('Incomplete witness');this.reset();}
 show(index){if(!Number.isInteger(index)||index<0||index>=this.snapshots.length)return false;if(!this.session.restore(this.snapshots[index]))throw Error('Invalid replay snapshot');this.index=index;return true;}
 next(){return this.show(this.index+1);}
 previous(){return this.show(this.index-1);}
 reset(){this.show(0);}
}

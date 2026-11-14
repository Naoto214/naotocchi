export class EditHistory{
 constructor(d){this.current=structuredClone(d);this.past=[];this.future=[]}
 apply(next){this.past.push(structuredClone(this.current));if(this.past.length>100)this.past.shift();this.current=next;this.future=[];return this.current}
 undo(){if(this.past.length){this.future.push(structuredClone(this.current));this.current=this.past.pop()}return this.current}
 redo(){if(this.future.length){this.past.push(structuredClone(this.current));this.current=this.future.pop()}return this.current}
}

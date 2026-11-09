// An approved Undo unit is one continuous stroke, independent of cell count.
export class GestureHistory {
 constructor(){this.reset()}
 reset(groups=[]){this.groups=[...groups];this.start=null}
 begin(length){if(this.start===null)this.start=length}
 end(){this.start=null}
 record(length){const start=this.start??length;if(this.groups.at(-1)!==start)this.groups.push(start)}
 pop(){this.end();return this.groups.pop()}
}

// A rendered control or timer belongs to exactly one state revision.
export function bindRevision(readState,callback){
 const initial=readState(),id=initial?.id,revision=initial?.revision;
 return (...args)=>{const current=readState();if(current?.id!==id||current?.revision!==revision)return;return callback({revision},...args);};
}

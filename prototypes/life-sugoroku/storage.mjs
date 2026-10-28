export function assertCurrentSave(storage,key,expected){
 if(expected!==null&&storage.getItem(key)!==expected)throw Error('別のタブで対戦が更新されています。再読み込みして再開してください。');
}
export function readWithBackup(storage,key,validate){
 for(const [candidate,recovered]of [[key,false],[key+'-backup',true]]){
  try{const raw=storage.getItem(candidate);if(raw)return {value:validate(raw),recovered};}catch{}
 }
 return {value:null,recovered:false};
}

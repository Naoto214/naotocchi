import {validateState} from './state.mjs';
export const SAVE_KEY='naopoyo-swap-prototype-v1';
export class Store {
 constructor(storage){this.storage=storage;this.observed=storage.getItem(SAVE_KEY);this.broken=false;}
 read(){const raw=this.storage.getItem(SAVE_KEY);this.observed=raw;if(!raw)return null;try{const s=JSON.parse(raw);validateState(s);this.broken=false;return s;}catch(e){this.broken=true;throw Error('保存を読み込めません。新しく始めるまで元のデータを保持します。');}}
 save(s){validateState(s);if(this.broken)throw Error('保存が壊れています。新しく始めてください');if(this.storage.getItem(SAVE_KEY)!==this.observed)throw Error('別のタブで更新されています。読み込み直してください');const raw=JSON.stringify(s);this.storage.setItem(SAVE_KEY,raw);this.observed=raw;return true;}
 replace(s){if(this.broken&&this.observed)this.storage.setItem(SAVE_KEY+'-recovery',this.observed);this.broken=false;return this.save(s);}
}

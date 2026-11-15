import {loadArt} from '../../render.mjs';
import {drawCrateSwatch,drawCrateBoard,crateScene} from './crate-art.mjs';
const $=id=>document.getElementById(id),scene=crateScene();
function draw(){for(const px of [36,48])for(const style of ['old','new'])drawCrateSwatch($(style+px),px,style);drawCrateSwatch($('large'),180,'new');const width=Number($('size').value)*8;$('board').style.setProperty('--illustration-width',width+'px');drawCrateBoard($('board'),scene,$('style').value);}
const failures=await loadArt();if(failures.length)throw Error(failures.join(','));$('style').onchange=$('size').onchange=draw;draw();$('status').textContent='イラスト比較のみ。物理・100面・保存形式は変更していません。';document.documentElement.dataset.ready='true';

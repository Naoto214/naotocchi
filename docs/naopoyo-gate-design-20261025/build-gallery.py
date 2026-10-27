from pathlib import Path
import re,json,base64
root=Path(__file__).parent
src=root/'source'
def read(p):return (src/p).read_text()
def clean(s):return re.sub(r'^import .*?;\n|^export \{.*?;\n','',s,flags=re.M).replace('export ','')
# Bundle only read-only draw functions and unchanged authored stage data.
code=clean(read('prototypes/naopoyo-chapter2/expansion-stages.mjs'))+'\n'+clean(read('prototypes/naopoyo-chapter2/stages.mjs'))
code+='\n'+clean(read('prototypes/naopoyo-rescue/sprite-data.mjs'))
code+='\n'+clean(read('prototypes/naopoyo-rescue/sprites.mjs'))
# Original all-species loader is not invoked; load only the exact assets in this study.
code+='\n'+clean(read('prototypes/naopoyo-rescue/fixtures.mjs'))
code+='\nfunction conditionLabel(g){return String(g.exact??"ALL")}\n'
code+='\n'+clean(read('prototypes/naopoyo-chapter2/stone.mjs')).replace('function drawMagicRock(','function drawOriginalMagicRock(')
code+='\n'+clean((root/'designs.mjs').read_text())
r=clean(read('prototypes/naopoyo-chapter2/render.mjs'))
r=re.sub(r'const loadForest=.*?;\}\);','',r)
# Replace import.meta based URL loader with inert explicit loader (not used).
r=r.replace("new URL('../../assets/world/forest-v1.webp',import.meta.url).href","ASSETS.forest")
code+='\n'+r
code+='\nlet currentVariant="A";\nfunction visualActors(q){return q.state.actors.map(a=>({...a,opacity:1,landing:0}))}\nfunction drawMagicRock(c,g,opts){if(currentVariant==="V6")drawOriginalMagicRock(c,g,opts);else drawDesign(c,g,{variant:currentVariant,...opts})}\n'
code=code.replace("new URL('../../'+spec.path,import.meta.url).href","''")
assets={'forest':'data:image/webp;base64,'+base64.b64encode((src/'assets/world/forest-v1.webp').read_bytes()).decode()}
for n in [3,4,6,8]:assets[f'dog/0{n}']='data:image/png;base64,'+base64.b64encode((src/f'assets/characters/dog/0{n}.png').read_bytes()).decode()
css='\n'.join(read(f'prototypes/{n}/style.css') for n in ['naopoyo-world','naopoyo-chapter1','naopoyo-chapter2'])
css=re.sub(r'@import[^;]+;','',css).replace("url('../../assets/world/forest-v1.webp')","url('"+assets['forest']+"')")
(root/'phone-css.json').write_text(json.dumps(css))
script=Path(root/'gallery-app.js').read_text()
html='''<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>なおぽよ。数字ゲート比較・デザインのみ</title><style>
*{box-sizing:border-box}body{margin:0;background:#18342b;color:#edf0dc;font:14px system-ui,sans-serif}header{padding:24px;max-width:1250px;margin:auto}h1{font-size:25px;margin:5px 0 12px}p{line-height:1.8}button,select{font:inherit;padding:9px 12px;border:1px solid #9aae8b;border-radius:9px;background:#edf0dd;color:#254738}button{cursor:pointer}nav{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.row{display:flex;gap:20px;align-items:flex-start;overflow-x:auto;padding:12px 24px 24px}.panel{flex:none}.panel h2{font-size:16px;margin:5px 0 12px}.panel canvas{display:block;border-radius:10px;outline:2px solid #aabd96}iframe{border:1px solid #abc097;border-radius:18px;background:#20382d;display:block}small{color:#c3d6bb}.note{color:#f1dda9}.detailrow{display:flex;gap:18px;flex-wrap:wrap}a{color:#d8eec7}#status{min-height:24px}#details{padding:20px 24px}#details canvas{margin:6px;border:1px solid #859975;border-radius:8px}.animrow{display:flex;gap:20px;overflow:auto;padding:16px 24px}.animrow canvas{background:#dce9c9;border-radius:9px}.label{margin:10px 0}.chip{color:#1b473a;background:#ccdfb8;border-radius:5px;padding:3px 8px}</style>
<header><small>NAOPOYO. / DESIGN STUDY / 2026-10-25</small><h1>数字が合うと、すうっと通れる。</h1><p>A〜Eを同じ森・同じ盤面・同じ縮尺で比較。<strong>採用前のデザイン資料</strong>です。第19・20面はversion 6の初期配置をそのまま表示しています。<br><span class="note">ゲームは操作できません。通過・足場サンプルは仮配置。演出は視覚モックで、解答再生ではありません。</span></p><nav><label>画面幅 <select id="width"><option>375</option><option selected>390</option><option>430</option></select></label><label>場面 <select id="scene"><option value="20">20 森の結び目</option><option value="19">19 星から逆算</option><option value="fixture">並列・隣接・通過・足場</option></select></label><button id="view">縦画面で比較</button><button id="export">全比較PNGを保存</button></nav><small>390px幅 → 362px盤面 / 45.25pxマス。375px → 43.375px、430px → 50.25px。左右にスクロールできます。</small><p id="status"></p></header><section class="row" id="boards"></section><section id="details"><h2>単体・数字1〜8・通常岩との並列</h2><p>左は拡大図。右の数字列は390px幅での実寸相当です。</p><div class="detailrow" id="tiles"></div></section><header><h2>通過演出の比較</h2><p>各演出は240ms。見比べるために繰り返します。数字はキャラの頭上と分けて、重なる間だけ左支柱に残します。枠全体も透過し「一致時には足場にならない」性質を表現します。</p><nav><label>候補 <select id="animvariant"><option>A</option><option>B</option><option>E</option></select></label><button id="replay">演出を再生</button></nav><small>左から 数字の光 / 内側と枠の透過 / 4粒の光 / 数字の周囲の光。自動再生はしません。</small></header><section class="animrow" id="animations"></section><script>'''
html+='const ASSETS='+json.dumps(assets)+';\nconst PHONE_CSS='+json.dumps(css)+';\n'+code+'\n'+script+'</script></html>'
(root/'gallery.html').write_text(html)
print('Gallery bytes',len(html))

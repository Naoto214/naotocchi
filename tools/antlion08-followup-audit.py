#!/usr/bin/env python3
"""Read-only QA. Writes SVG/JSON/HTML under a new QA directory; never writes PNGs."""
from pathlib import Path
import base64, hashlib, json, html
import numpy as np
from PIL import Image
from scipy import ndimage

R=Path(__file__).resolve().parents[1]
O=R/'docs/qa/antlion08-followup-20260928'
OLD=R/'docs/qa/antlion08-method-d-nine-20260928'
STATES=['happy','strained','hungry','sick','tired','sulky','weak','critical','wantsPlay','sleeping']
PATHS={'normal':R/'assets/characters/antlion/08.png',**{s:(R/'assets/characters/expressions/antlion/08-tired.png' if s=='tired' else OLD/f'candidates/{s}.png') for s in STATES}}
LABEL={'normal':'通常基準08','tired':'D4 tired（正式採用）',**{s:s for s in STATES if s!='tired'}}
O.mkdir(exist_ok=True,parents=True)
A={s:np.array(Image.open(p).convert('RGBA')) for s,p in PATHS.items()}
URI={s:'data:image/png;base64,'+base64.b64encode(p.read_bytes()).decode() for s,p in PATHS.items()}
SHA=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
PANELS=[]

def sheet(file,title,states,roi=(0,0,128,128),scale=1,notes='',boxes=None,isolated=False):
    x0,y0,x1,y1=roi; w=(x1-x0)*scale;h=(y1-y0)*scale
    cw=max(w+24,180); cols=min(3,len(states));rows=(len(states)+cols-1)//cols
    pieces=[]
    for i,s in enumerate(states):
        x=12+i%cols*cw;y=92+i//cols*(h+46)
        content=f'<image href="{URI[s]}" width="128" height="128" style="image-rendering:pixelated"/>'
        if isolated:
            content=''.join(f'<rect x="{xx}" y="{yy}" width="1" height="1" fill="rgb({r},{g},{b})" fill-opacity="{a/255}"/>' for xx,yy in SICK for r,g,b,a in [A[s][yy,xx].tolist()]) if s=='sick' else ''
        overlay=''
        for bx,by,bw,bh in boxes or []:
            overlay+=f'<rect x="{bx}" y="{by}" width="{bw}" height="{bh}" fill="none" stroke="#db1871" stroke-width=".25"/>'
        pieces.append(f'<text x="{x}" y="{y-8}" font-size="14">{html.escape(LABEL[s])}</text><svg x="{x}" y="{y}" width="{w}" height="{h}" viewBox="{x0} {y0} {x1-x0} {y1-y0}"><rect x="{x0}" y="{y0}" width="{x1-x0}" height="{y1-y0}" fill="#e6eaed"/>{content}{overlay}</svg>')
    text=f'<svg xmlns="http://www.w3.org/2000/svg" width="{max(600,cols*cw+24)}" height="{110+rows*(h+46)}"><rect width="100%" height="100%" fill="white"/><g font-family="sans-serif" fill="#172638"><text x="12" y="28" font-size="20">{html.escape(title)}</text><text x="12" y="52" font-size="12">{html.escape(notes)}</text><text x="12" y="70" font-size="12">同一PNG座標・同倍率／画像変更なし／拡大は最近傍。端末の自動縮小に注意。</text>{"".join(pieces)}</g></svg>\n'
    (O/file).write_text(text);PANELS.append(file)

SICK=[(77,95),(77,96),(78,96),(77,97),(73,102),(72,103),(73,103),(73,104)]
for n in [128,104,80,64]:
    sheet(f'faces-body-{n}.svg',f'本体だけ：通常＋10表情 {n}px',['normal']+STATES,scale=n/128,notes='状態マーク・汗なし。顔のニュアンスと10表情の読み分け。')
    for key in ['strained','sick','critical']:
        sheet(f'{key}-{n}.svg',f'{key}：通常／D4／候補 {n}px',['normal','tired',key],scale=n/128)
sheet('faces-enlarged.svg','顔だけの同倍率拡大：通常＋10表情',['normal']+STATES,(85,51,112,72),8,notes='全画像で同じ顔ROI。頭部陰影も含む。拡大で見える差が64pxで読めるとは限らない。')
sheet('strained-legs.svg','strained：脚の付け根から先端',['normal','tired','strained'],(73,63,112,113),8,notes='外側4経路を便宜上追跡する。解剖学的な脚の本数は断定しない。')
sheet('strained-roots.svg','strained：脚の付け根・腹部との境界',['normal','tired','strained'],(77,65,105,88),10)
sheet('sick-context.svg','sick：脚脇の小成分と主経路',['normal','tired','sick'],(69,88,88,109),12,boxes=[(76.5,94.5,2.5,3.5),(71.5,101.5,2.5,3.5)],notes='桃枠はsickの小成分位置。同じ座標を通常／D4にも表示。')
sheet('sick-isolated-128.svg','sick：対象8画素のみ・128px canvas',['sick'],isolated=True,notes='切り抜き資料のみ。元PNGには一切変更なし。')
sheet('sick-isolated-zoom.svg','sick：対象8画素のみ・12倍',['sick'],(69,88,88,109),12,isolated=True,notes='上4画素・下4画素。これだけでは粒子か構造由来かを断定できない。')
sheet('critical-rear.svg','critical：後方粒子と軌跡の同領域比較',['normal','tired','critical'],(8,59,62,118),7,notes='色方針は変更しない。密度・散在分布・軌跡とのバランスを比較。')
sheet('critical-upper.svg','critical：上側の微小成分分布',['normal','tired','critical'],(63,20,90,58),8)

metrics={}
for s in ['normal','tired','strained','sick','critical']:
    a=A[s]; lab,num=ndimage.label(a[:,:,3]>0,np.ones((3,3)));sizes=np.bincount(lab.ravel());main=1+int(np.argmax(sizes[1:]));ind=(lab>0)&(lab!=main)
    rear=np.zeros((128,128),bool);rear[59:118,8:62]=True
    exterior=np.zeros_like(rear);exterior[95:118,8:35]=True
    points=np.argwhere(ind&rear);ids=set(lab[ind&rear].tolist())
    bins=[]
    for y0,y1 in [(59,79),(79,99),(99,118)]:
        for x0,x1 in [(8,26),(26,44),(44,62)]:
            bins.append({'roi':[x0,y0,x1,y1],'independent_alpha_pixels':int(ind[y0:y1,x0:x1].sum())})
    # Normal's exterior trail is detached (component17); candidates' trail joins the wing.
    # Exclude that reviewed normal trail when comparing detached particle-like fragments.
    particle_like=ind.copy()
    if s=='normal': particle_like[lab==17]=False
    metrics[s]={'sha256':SHA(PATHS[s]),'independent_components_all':num-1,'independent_pixels_all':int(ind.sum()),'rear_roi':[8,59,62,118],'rear_independent_components_intersecting':len(ids),'rear_independent_pixels':len(points),'rear_independent_coverage':len(points)/(54*59),'rear_centroid_xy':points[:,::-1].mean(axis=0).tolist(),'rear_grid':bins,'rear_particle_like_components':len(set(lab[particle_like&rear].tolist())),'rear_particle_like_pixels':int((particle_like&rear).sum()),'exterior_roi_alpha_pixels':int(((lab>0)&exterior).sum()),'exterior_trail_main_pixels':int(((lab==main)&exterior).sum()),'note':'Alpha 8-neighbour components, not semantic particle counts. Particle-like excludes reviewed normal detached trail17; candidates body-connected trail already excluded with main. Tiny ambiguous fragments remain counted, not automatically classified as particles.'}
    if s=='sick':
        distances=ndimage.distance_transform_edt(lab!=main)
        metrics[s]['small_components']=[{'pixels':[[int(x),int(y)] for y,x in np.argwhere(lab==lab[yy,xx])],'min_distance_to_main_pixels':float(distances[lab==lab[yy,xx]].min()),'RGBA':[a[y,x].tolist() for y,x in np.argwhere(lab==lab[yy,xx])]}for xx,yy in [(77,95),(73,102)]]
(O/'measurements.json').write_text(json.dumps({'source_head':'3126a7ce9e6c17a1c2ee3208c3be6dcea1b13b8f','date':'2026-09-28','assets':{s:{'path':str(p.relative_to(R)),'sha256':SHA(p)} for s,p in PATHS.items()},'metrics':metrics,'limits':['No new tolerance threshold. No inference from component count to anatomical leg or semantic particle count.','All crops are shared absolute coordinates, with no registration/warping that could conceal anatomy differences.','Readability is an observer QA judgment, not a blinded recognition experiment.']},indent=2)+'\n')
links=''.join(f'<section><h2>{f}</h2><div class="scroll"><img src="{f}" alt="{f}"></div></section>' for f in PANELS)
marks=''.join(f'<section><h2>正式状態マーク {n}px（汗なし）</h2><div class="scroll"><img src="../antlion08-method-d-nine-20260928/mark-{n}.svg"></div></section>' for n in [104,80,64])
(O/'comparison.html').write_text('<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui;margin:16px}.scroll{overflow:auto}img{display:block;max-width:none}h2{font-size:18px}</style><h1>ウスバカゲロウ08 追加監査</h1><p>画像変更0。通常基準・D4・候補9枚を保持。拡大と実寸を区別して確認。正式採用の判断ではありません。</p>'+links+marks+'</html>\n')
print(json.dumps({s:{k:v for k,v in m.items() if k in ['rear_independent_components_intersecting','rear_independent_pixels','exterior_trail_main_pixels','small_components']}for s,m in metrics.items()}))

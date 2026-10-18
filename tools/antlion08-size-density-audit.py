#!/usr/bin/env python3
"""Read-only source-image audit; writes descriptive SVG/JSON/CSV, never source PNGs."""
from pathlib import Path
import base64, csv, hashlib, html, json
import numpy as np
from PIL import Image
from scipy import ndimage

R = Path(__file__).resolve().parents[1]
O = R / 'docs/qa/antlion08-size-density-20260928'
O.mkdir(parents=True, exist_ok=True)
ASSETS = json.loads((R/'docs/qa/antlion08-followup-20260928/measurements.json').read_text())['assets']
REAR = (8, 59, 62, 118)
CORRIDOR = (8, 95, 35, 118)
STATES = list(ASSETS)
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()

def crop(a, box):
    x0,y0,x1,y1 = box
    return a[y0:y1,x0:x1]

def masks(a, threshold=12):
    lab, n = ndimage.label(a[:,:,3] > 0, np.ones((3,3)))
    sizes = np.bincount(lab.ravel())
    main = int(sizes[1:].argmax()+1)
    body = lab == main
    elongated = np.zeros_like(body)
    ids = []
    for k in range(1,n+1):
        if k == main:
            continue
        yy,xx = np.where(lab == k)
        if max(int(np.ptp(xx))+1,int(np.ptp(yy))+1) >= threshold:
            elongated |= lab == k
            ids.append(k)
    return lab, (lab > 0) & ~body & ~elongated, body | elongated, ids

def panel(file, title, box, scale, classified=False):
    x0,y0,x1,y1=box
    w,h=(x1-x0)*scale,(y1-y0)*scale
    cw=max(w+18,180); ch=h+38
    parts=[]
    for i,(state,v) in enumerate(ASSETS.items()):
        x=12+(i%3)*cw;y=80+(i//3)*ch
        uri=base64.b64encode((R/v['path']).read_bytes()).decode()
        content=f'<image width="128" height="128" href="data:image/png;base64,{uri}" style="image-rendering:pixelated"/>'
        if classified:
            a=np.array(Image.open(R/v['path']).convert('RGBA'))
            lab,p,t,ids=masks(a)
            content=''
            colors=np.zeros((128,128),int)
            colors[a[:,:,3]>0]=1;colors[p]=2
            corridor=np.zeros((128,128),bool);corridor[95:118,8:35]=True
            colors[t&corridor]=3
            # Horizontal runs preserve exact classified pixels without off-crop geometry.
            for code,color in [(1,'#72818d'),(2,'#cd2481'),(3,'#007f86')]:
                runs=[]
                for yy in range(y0,y1):
                    row=np.pad(colors[yy,x0:x1]==code,(1,1))
                    edges=np.flatnonzero(np.diff(row.astype(int)))
                    for start,end in zip(edges[::2],edges[1::2]):
                        length=int(end-start)
                        runs.append(f'M{int(start+x0)} {yy}h{length}v1h-{length}z')
                content+=f'<path fill="{color}" d="{" ".join(runs)}"/>'
            content+='<rect x="8" y="95" width="27" height="23" fill="none" stroke="#0066ff" stroke-width=".3"/>'
        parts.append(f'<text x="{x}" y="{y-8}" font-size="14">{state}</text><svg x="{x}" y="{y}" width="{w}" height="{h}" viewBox="{x0} {y0} {x1-x0} {y1-y0}"><rect x="{x0}" y="{y0}" width="{x1-x0}" height="{y1-y0}" fill="#e6eaed"/>{content}</svg>')
    text=f'<svg xmlns="http://www.w3.org/2000/svg" width="{max(600,cw*3+24)}" height="{90+4*ch}"><rect width="100%" height="100%" fill="white"/><g font-family="sans-serif" fill="#172638"><text x="12" y="25" font-size="19">{html.escape(title)}</text><text x="12" y="48" font-size="12">Same coordinates / nearest-neighbour / no marks or sweat / source PNG unchanged</text>{"".join(parts)}</g></svg>\n'
    (O/file).write_text(text)

metrics={}
for s,v in ASSETS.items():
    path=R/v['path']
    assert sha(path)==v['sha256'], s
    a=np.array(Image.open(path).convert('RGBA'))
    lab,p,t,ids=masks(a)
    q=crop(p,REAR); cl=crop(lab,REAR)
    ys,xs=np.where(q)
    # Complete sliding 12x12 windows within the rear ROI, including all edges.
    integ=np.pad(q.astype(int),((1,0),(1,0))).cumsum(0).cumsum(1)
    windows=integ[12:,12:]-integ[:-12,12:]-integ[12:,:-12]+integ[:-12,:-12]
    iy,ix=np.unravel_index(windows.argmax(),windows.shape)
    grid=[]
    for y0,y1 in [(59,79),(79,99),(99,118)]:
        for x0,x1 in [(8,26),(26,44),(44,62)]:
            k=crop(p,(x0,y0,x1,y1))
            grid.append({'roi':[x0,y0,x1,y1],'pixels':int(k.sum()),'coverage_pct':float(k.mean()*100)})
    tp=int(crop(t,CORRIDOR).sum()); pp=int(crop(p,CORRIDOR).sum())
    sensitivity={}
    for threshold in [10,12,16]:
        _,ps,_,es=masks(a,threshold)
        sensitivity[str(threshold)]={'rear_particle_pixels':int(crop(ps,REAR).sum()),'elongated_component_ids':es}
    metrics[s]={'particle_components':len(set(cl[q].tolist())),
        'particle_pixels':int(q.sum()),'occupied_area_px2':int(q.sum()),
        'rear_area_px2':q.size,'coverage_pct':float(q.mean()*100),
        'particle_bbox_xyxy':[int(xs.min()+8),int(ys.min()+59),int(xs.max()+9),int(ys.max()+60)],
        'max_local_12x12_pixels':int(windows.max()),'max_local_12x12_pct':float(windows.max()/144*100),
        'max_local_window_xyxy':[int(ix+8),int(iy+59),int(ix+20),int(iy+71)],
        'local_grid':grid,'corridor_particle_pixels':pp,'corridor_trail_pixels':tp,
        'corridor_particle_to_trail_ratio':pp/tp,'rear_particles_to_corridor_trail_ratio':int(q.sum())/tp,
        'elongated_component_ids':ids,'span_threshold_sensitivity':sensitivity,
        'alpha_values':np.unique(a[:,:,3]).tolist()}
summary={}
for key in ['particle_components','particle_pixels','max_local_12x12_pixels','corridor_particle_to_trail_ratio']:
    values=[m[key] for s,m in metrics.items() if s!='critical']
    q1,med,q3=np.percentile(values,[25,50,75])
    summary[key]={'reference_n':10,'min':min(values),'max':max(values),'q1':q1,'median':med,'q3':q3,
                  'tukey_upper_fence':q3+1.5*(q3-q1),'critical':metrics['critical'][key],
                  'critical_to_median':metrics['critical'][key]/med}
data={'source_head':'f1707cc65fb638bc5128ec0151b8c8f5d67d9a32','assets':ASSETS,
      'method':{'alpha_threshold':'>0','connectivity':8,'rear_roi':REAR,'trail_corridor':CORRIDOR,
                'elongated_span_px':12,'local_window_px':[12,12],
                'particle_definition':'Detached components excluding largest body-connected component and detached components with x/y span >=12; not semantic counts.',
                'trail_definition':'Body-connected or elongated component pixels ONLY in fixed wing-free exterior corridor; a partial trail proxy, not full trail segmentation.',
                'occupancy':'Binary-alpha occupied area equals foreground pixel count. Bbox is NOT occupied area.',
                'outlier_limit':'Descriptive non-independent set n=10; Tukey fence is a flag, not significance or aesthetic acceptance.'},
      'metrics':metrics,'critical_vs_other_ten':summary}
(O/'density.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
fields=['particle_components','particle_pixels','occupied_area_px2','coverage_pct','max_local_12x12_pixels','max_local_12x12_pct','corridor_particle_pixels','corridor_trail_pixels','corridor_particle_to_trail_ratio','rear_particles_to_corridor_trail_ratio']
with (O/'density.csv').open('w') as f:
    writer=csv.writer(f,lineterminator='\n');writer.writerow(['state']+fields)
    for s,m in metrics.items():writer.writerow([s]+[m[k] for k in fields])
for size in [128,104,80,64]:panel(f'body-{size}.svg',f'Body only / {size}px',(0,0,128,128),size/128)
panel('faces-enlarged.svg','Face ROI / 8x',(85,51,112,72),8)
panel('rear.svg','Rear particles and trail / 6x',REAR,6)
panel('extraction.svg','Magenta: particles; teal: corridor trail; grey: excluded',REAR,6,True)
files=['body-128.svg','body-104.svg','body-80.svg','body-64.svg','faces-enlarged.svg','rear.svg','extraction.svg']
(O/'comparison.html').write_text('<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Antlion08 size and density audit</title><style>body{font-family:system-ui;margin:16px}.scroll{overflow:auto}img{display:block;max-width:none}</style><h1>サイズ別可読性・粒子密度監査</h1><p>画像変更なし。原寸はブラウザー倍率100%。端末の自動縮小に注意。</p>'+''.join(f'<h2>{f}</h2><div class="scroll"><img src="{f}" alt="{f}"></div>' for f in files)+'</html>\n')
print(json.dumps({'metrics':{s:{k:m[k] for k in fields} for s,m in metrics.items()},'summary':summary},ensure_ascii=False))

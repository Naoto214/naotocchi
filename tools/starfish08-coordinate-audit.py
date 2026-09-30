#!/usr/bin/env python3
"""Read-only 08 audit. Writes derived QA only. No asset writes or resampling for measurement."""
from pathlib import Path
import hashlib,json,subprocess,csv,io,base64,html
import numpy as np
from scipy.ndimage import label,binary_erosion
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/qa/starfish08-coordinate-20260928'; OUT.mkdir(exist_ok=True)
SOURCE='cedde3a83fde05a5ccb4091a0c67cd08f719a772'
KEYS=['normal','happy','strained','hungry','sick','tired','sulky','weak','critical','wantsPlay','sleeping']
IDS=['B1','B2','B3','B4','B5']
ROIS=[(22,23,46,46),(93,23,123,53),(4,63,33,94),(100,70,124,94),(102,90,111,97)]
NAMES=['左上','右上','左下','右下大泡','右下極小泡（復元）']
def hashes():
 return {str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((ROOT/'assets').rglob('*')) if p.is_file()}
def stats(m):
 y,x=np.where(m); box=[int(x.min()),int(y.min()),int(x.max()+1),int(y.max()+1)]
 return dict(box=box,center=[(box[0]+box[2])/2,(box[1]+box[3])/2],centroid=[float(x.mean()),float(y.mean())],width=box[2]-box[0],height=box[3]-box[1],area=int(m.sum()))
def shift(a,dx,dy):
 b=np.zeros_like(a); xs=max(0,-dx);xe=min(128,128-dx);ys=max(0,-dy);ye=min(128,128-dy)
 b[ys+dy:ye+dy,xs+dx:xe+dx]=a[ys:ye,xs:xe];return b
before=hashes()
paths=[ROOT/'assets/characters/starfish/08.png']+[ROOT/f'assets/characters/expressions/starfish/08-{k}.png' for k in KEYS[1:]]
arrays=[np.array(Image.open(p).convert('RGBA')) for p in paths]
assert all(a.shape==(128,128,4) for a in arrays)
ref=arrays[0]; labs,_=label(ref[:,:,3]>0); tiny=labs==labs[93,106]; assert tiny.sum()==45
# Body silhouette, excluding all bubble regions and the expression-bearing central face.
valid=np.ones((128,128),bool)
for x0,y0,x1,y1 in ROIS:valid[y0:y1,x0:x1]=False
valid[50:86,40:90]=False
# This common analysis mask excludes face and bubbles from scoring, not source PNGs.
refbody=ref[:,:,3]>0
rows=[];images=[]; cores=[]
for k,p,a in zip(KEYS,paths,arrays):
 ai=a.astype(int); alpha=a[:,:,3]>0
 scores=[]
 for dy in range(-8,9):
  for dx in range(-8,9):
   v=valid&shift(valid,dx,dy); score=int(np.count_nonzero((shift(alpha,dx,dy)^refbody)&v));scores.append((score,dx,dy,int(v.sum())))
 scores.sort(key=lambda z:(z[0],abs(z[1])+abs(z[2]),z[2],z[1]))
 best=scores[0]; ties=[list(s[1:3]) for s in scores if s[0]==best[0]]
 # Fixed body reference = normal body's bbox top-left (8,14), transported by registration.
 origin=[8-best[1],14-best[2]]
 blue=(ai[:,:,3]>16)&(ai[:,:,0]<90)&(ai[:,:,1]>40)&(ai[:,:,2]>ai[:,:,1]+20)
 l,n=label(alpha); allcomponents={j:stats(l==j) for j in range(1,n+1)}
 imrec=dict(key=k,path=str(p.relative_to(ROOT)),sha256=before[str(p.relative_to(ROOT))],canvas=[128,128],transparent_bounds=stats(alpha)['box'],registration_to_normal=[best[1],best[2]],registration_score=best[0],registration_ties=ties,runner_up_score=scores[1][0],body_origin=origin)
 body_component=max(allcomponents.values(),key=lambda c:c['area'])
 imrec['body_component_box']=body_component['box']
 imrec['body_bbox_origin']=body_component['box'][:2]
 images.append(imrec); masks=[]
 for bi,(id,roi) in enumerate(zip(IDS,ROIS)):
  x0,y0,x1,y1=roi;m=np.zeros((128,128),bool);m[y0:y1,x0:x1]=blue[y0:y1,x0:x1]
  if id=='B4':m[tiny]=False
  assert m.any(); masks.append(m)
  s=stats(m);s.update(key=k,id=id,roi=list(roi),relative_center=[s['center'][0]-origin[0],s['center'][1]-origin[1]],relative_box=[s['box'][0]-origin[0],s['box'][1]-origin[1],s['box'][2]-origin[0],s['box'][3]-origin[1]])
  # Independent full alpha component is exact only when it contains no outside-ROI pixels.
  ids,count=np.unique(l[m],return_counts=True);cid=int(ids[np.argmax(count)]);cm=l==cid
  outside=cm.copy();outside[y0:y1,x0:x1]=False
  if id=='B5':
   s['full_footprint']=stats(tiny);s['full_footprint_method']='45-pixel restoration provenance support, not merged alpha component'
   s['reference_support_rgba_differences']=int(np.count_nonzero(np.any(a[tiny]!=ref[tiny],axis=1)))
   yy,xx=np.where(tiny&np.any(a!=ref,axis=2));s['reference_support_differing_coordinates']=[[int(x),int(y)]for x,y in zip(xx,yy)]
  elif not outside.any():s['full_footprint']=allcomponents[cid];s['full_footprint_method']='independent alpha>0 4-connected component'
  else:s['full_footprint']=None;s['full_footprint_method']='joined to body/another bubble; full contour not uniquely segmentable by alpha; use exact blue-core metrics and full-window comparison'
  rows.append(s)
 cores.append(masks)
for i,k in enumerate(KEYS):
 dx,dy=images[i]['registration_to_normal']
 for j,id in enumerate(IDS):
  r=rows[i*5+j];r0=rows[j];m=cores[i][j];m0=cores[0][j]
  r['delta_abs_center']=[r['center'][q]-r0['center'][q]for q in range(2)]
  r['delta_relative_center']=[r['relative_center'][q]-r0['relative_center'][q]for q in range(2)]
  r['delta_size']=[r['width']-r0['width'],r['height']-r0['height']]
  r['body_bbox_relative_center']=[r['center'][q]-images[i]['body_bbox_origin'][q] for q in range(2)]
  r['delta_body_bbox_relative_center']=[r['body_bbox_relative_center'][q]-(r0['center'][q]-images[0]['body_bbox_origin'][q]) for q in range(2)]
  r['delta_area']=r['area']-r0['area'];r['core_mask_xor_after_registration']=int((shift(m,dx,dy)^m0).sum())
  union=shift(m,dx,dy)|m0;aligned=shift(arrays[i],dx,dy)
  r['core_union_rgba_differences_after_registration']=int(np.count_nonzero(np.any(aligned!=ref,axis=2)&union))
  x0,y0,x1,y1=ROIS[j];r['window_rgba_differences_after_registration']=int(np.any(aligned[y0:y1,x0:x1]!=ref[y0:y1,x0:x1],axis=2).sum())
  r['window_alpha_differences_after_registration']=int((aligned[y0:y1,x0:x1,3]!=ref[y0:y1,x0:x1,3]).sum())
  if id=='B5':
   r['reference_support_rgba_differences_after_registration']=int(np.count_nonzero(np.any(aligned[tiny]!=ref[tiny],axis=1)))
   ts=[]
   for sy in range(-8,9):
    for sx in range(-8,9):
     shifted=shift(arrays[i],sx,sy);ts.append((int(np.count_nonzero(np.any(shifted[tiny]!=ref[tiny],axis=1))),sx,sy))
   ts.sort();r['B5_template_best_mismatch']=ts[0][0];r['B5_template_best_shifts']=[list(t[1:])for t in ts if t[0]==ts[0][0]]
# Derived visual evidence: nearest-neighbour only, same registered coordinates, no auto centering.
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',15)
def panel(a,scale):
 im=Image.fromarray(a.astype('uint8'),'RGBA');bg=Image.new('RGBA',(128,128),'#e9edf2');bg.alpha_composite(im);return bg.convert('RGB').resize((128*scale,128*scale),Image.Resampling.NEAREST)
sheet=Image.new('RGB',(1180,10*425+60),'white');d=ImageDraw.Draw(sheet);d.text((12,12),'Normal | expression (body registered) | 50% overlay. Bubble IDs B1-B5. Native px; 3x.',font=font,fill='black')
for i,k in enumerate(KEYS[1:],1):
 y=60+(i-1)*425;dx,dy=images[i]['registration_to_normal']; a=shift(arrays[i],dx,dy)
 d.text((12,y),f'{k}: registration ({dx:+d},{dy:+d}); silhouette XOR={images[i]["registration_score"]}',font=font,fill='black')
 p0=panel(ref,3);p1=panel(a,3);ov=Image.blend(p0,p1,.5)
 for col,pn in enumerate([p0,p1,ov]):
  dd=ImageDraw.Draw(pn)
  for j,(x0,y0,x1,y1) in enumerate(ROIS):dd.rectangle((x0*3,y0*3,x1*3-1,y1*3-1),outline='#007777',width=1);dd.text((x0*3,max(0,y0*3-16)),IDS[j],font=font,fill='#003333')
  sheet.paste(pn,(col*392,y+24))
sheet.save(OUT/'registered-overlays.png')
# Every bubble has fixed window, 8x, baseline + ten expressions in the same coordinate frame.
for j,id in enumerate(IDS):
 x0,y0,x1,y1=ROIS[j];x0-=3;y0-=3;x1+=3;y1+=3;scale=8;cw=max((x1-x0)*scale+12,220);ch=(y1-y0)*scale+55
 sh=Image.new('RGB',(cw*4,ch*3+45),'white');dd=ImageDraw.Draw(sh);dd.text((10,10),f'{id}: fixed registered window, 8x. Crosshair = normal core bbox center.',font=font,fill='black')
 for i,k in enumerate(KEYS):
  a=shift(arrays[i],*images[i]['registration_to_normal']);im=panel(a,1).crop((x0,y0,x1,y1)).resize(((x1-x0)*scale,(y1-y0)*scale),Image.Resampling.NEAREST)
  dr=ImageDraw.Draw(im);cx,cy=rows[j]['center'];cx=(cx-x0)*scale;cy=(cy-y0)*scale
  dr.line((cx-5,cy,cx+5,cy),fill='#ff00aa');dr.line((cx,cy-5,cx,cy+5),fill='#ff00aa')
  xx=(i%4)*cw;yy=45+(i//4)*ch;dd.text((xx+6,yy),k,font=font,fill='black');sh.paste(im,(xx+6,yy+25))
 sh.save(OUT/f'{id}-comparison.png')
# Segmented cores only, keeping registered positions inside fixed windows (no body/marks).
sh=Image.new('RGB',(220*11,250*5+40),'white');dd=ImageDraw.Draw(sh)
dd.text((10,10),'Blue-core masks ONLY (not full contours/highlights), fixed registered windows, 6x.',font=font,fill='black')
for j,id in enumerate(IDS):
 x0,y0,x1,y1=ROIS[j]
 for i,k in enumerate(KEYS):
  a=arrays[i].copy();a[~cores[i][j]]=0;a=shift(a,*images[i]['registration_to_normal'])
  im=panel(a,1).crop((x0-2,y0-2,x1+2,y1+2)).resize(((x1-x0+4)*6,(y1-y0+4)*6),Image.Resampling.NEAREST)
  xx=i*220;yy=40+j*250;dd.text((xx+5,yy),id+' '+k,font=font,fill='black');sh.paste(im,(xx+5,yy+24))
sh.save(OUT/'core-only.png')
after=hashes();assert before==after
report=dict(source_head=SOURCE,scope='starfish08 normal+10 expressions only',ids=dict(zip(IDS,NAMES)),images=images,measurements=rows,method=dict(core='alpha>16, R<90, G>40, B>G+20, in inherited identity ROIs; B4 ROI expanded to avoid bottom clipping, B5 provenance support excluded from B4',bbox='half-open pixel-edge coordinates [x0,y0,x1,y1); center is bbox midpoint; centroid also recorded',body_reference='normal body alpha-component bbox top-left (8,14); transported using integer translation registration, face and bubble ROIs excluded from score',registration='exhaustive integer shifts [-8,+8], minimize silhouette XOR on common valid mask; no scale, rotation or nonrigid warping; scores/ties recorded',limitation='Core bbox is not full bubble contour. Joined full alpha contours are explicitly null, not guessed. Window RGBA differences may include nearby body. Registration is an optimal rigid estimate; deformed local body edges are not made identical.'),asset_hashes_before=before,asset_hashes_after=after,image_asset_changes=0)
(OUT/'measurements.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
fields=['key','id','box','center','centroid','width','height','area','relative_box','relative_center','delta_abs_center','delta_relative_center','delta_size','delta_area','core_mask_xor_after_registration','core_union_rgba_differences_after_registration','window_rgba_differences_after_registration','window_alpha_differences_after_registration','body_bbox_relative_center','delta_body_bbox_relative_center','full_footprint','full_footprint_method']
s=io.StringIO();w=csv.DictWriter(s,fieldnames=fields,extrasaction='ignore',lineterminator='\n');w.writeheader();w.writerows(rows);(OUT/'measurements.csv').write_text(s.getvalue())
# Standalone browser-readable artifact; source PNGs and QA sheets are embedded, no Site sync.
def data(p):return 'data:image/png;base64,'+base64.b64encode(p.read_bytes()).decode()
h=['<!doctype html><meta charset="utf-8"><title>ヒトデ08 泡位置監査</title><style>body{font-family:system-ui;margin:24px;max-width:1500px;background:#f5f6f8;color:#18222f}img{max-width:100%;image-rendering:pixelated}table{border-collapse:collapse}td,th{border:1px solid #bbb;padding:6px}section{background:white;padding:16px;margin:20px 0}a{color:#1361aa}</style><h1>ヒトデ08：B1〜B5 座標・形状監査</h1><p>画像変更0。泡の存在・復元の承認を維持。位置・形状の追加監査は人間判断待ち。ウスバカゲロウ08未補修。</p><p>測定は128px原寸。座標は半開区間。身体の輪郭を整数平行移動でregistration（顔・泡は評価外）。自動拡大縮小や顔合わせなし。</p><p><b>青い核のbboxと泡全体の輪郭は別です。</b>接触した輪郭は独立成分として一意に分離できないため、核の厳密な測定値と共通窓のRGBA比較を示します。接触画素を勝手に泡へ割り当てていません。</p>']
h.append('<p><b>B5は全10枚が同じ絶対座標。</b>45画素のうち7枚は完全一致、3枚は既存輪郭1画素のみ違います。身体registration後には一部で1pxの差が残り、既存B1〜B4にも形・サイズ差があります。許容差は決めず、人間判断待ちです。</p>')
h.append('<h2>B5重点：身体registration後の差</h2><table><tr><th>表情</th><th>Δx,Δy</th><th>幅差,高さ差</th><th>基準45画素中の原座標RGBA差</th></tr>')
for rr in rows[5:]:
 if rr['id']=='B5':h.append('<tr><td>'+rr['key']+'</td><td>'+str(rr['delta_relative_center'])+'</td><td>0,0</td><td>'+str(rr['reference_support_rgba_differences'])+'</td></tr>')
h.append('</table>')
for j,id in enumerate(IDS):h.append(f'<section><h2>{id} {NAMES[j]}</h2><img src="{data(OUT/(id+"-comparison.png"))}"></section>')
h.append(f'<section><h2>通常／対象／50%重ね合わせ（身体registration後）</h2><img src="{data(OUT/"registered-overlays.png")}"></section>')
h.append(f'<section><h2>身体を除いた青い核のみ（全輪郭ではありません）</h2><img src="{data(OUT/"core-only.png")}"></section>')
h.append('<h2>55件の測定値（青い核）</h2><table><tr>'+''.join('<th>'+html.escape(f)+'</th>'for f in fields[:15])+'</tr>')
for r in rows:h.append('<tr>'+''.join('<td>'+html.escape(str(r[f]))+'</td>'for f in fields[:15])+'</tr>')
h.append('</table>');(OUT/'comparison.html').write_text('\n'.join(h))
print(json.dumps({'rows':len(rows),'assets_unchanged':len(before),'registration':[(x['key'],x['registration_to_normal'],x['registration_score'],x['registration_ties'])for x in images],'B5':[(r['key'],r['delta_relative_center'],r['reference_support_rgba_differences'])for r in rows if r['id']=='B5']},ensure_ascii=False))

#!/usr/bin/env python3
"""QA only: measure original rasters; emit explanatory sheets, never candidates/assets.
Dependencies: existing QA Python environment (Pillow, numpy, scipy), not runtime.
Coordinates are integer pixels, boxes half-open. Annotations are review ROIs,
not validated transplant masks. Rigid transforms are fitted to coordinates only.
"""
from pathlib import Path
import hashlib,json,base64,io,html
import numpy as np
from PIL import Image,ImageDraw
from scipy import ndimage
from scipy.spatial import cKDTree
from scipy.optimize import minimize
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'docs/qa/antlion08-reconstruction-20260928';OUT.mkdir(exist_ok=True)
SOURCE='de77644bfd6d2a4bb0927d50776b578634b9950f';DATE='2026-09-28'
KEYS=['normal','happy','strained','hungry','sick','tired','sulky','weak','critical','wantsPlay','sleeping']
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def hashes():return {str(p.relative_to(ROOT)):sha(p) for p in sorted((ROOT/'assets').rglob('*')) if p.is_file()}
before=hashes(); paths=[ROOT/'assets/characters/antlion/08.png']+[ROOT/f'assets/characters/expressions/antlion/08-{k}.png'for k in KEYS[1:]]
ims=[Image.open(p).convert('RGBA')for p in paths]; aa=[np.array(im)for im in ims]; assert all(a.shape==(128,128,4)for a in aa)
def box(m):
 y,x=np.where(m);return [int(x.min()),int(y.min()),int(x.max()+1),int(y.max()+1)] if len(x)else None
def rect(b):
 m=np.zeros((128,128),bool);x,y,r,b=b;m[y:b,x:r]=True;return m
def poly(p):
 im=Image.new('L',(128,128));ImageDraw.Draw(im).polygon(p,fill=1);return np.array(im)>0
# Distinct screen-position wing groups; anatomical left/right cannot be inferred from this view.
regions={
 'head':rect([87,53,109,70]),'antennae':rect([76,20,122,54]),
 'wing_upper':poly([(7,8),(32,9),(87,58),(87,64),(67,72),(37,70),(22,51)]),
 'wing_lower':poly([(82,66),(76,82),(55,105),(43,115),(32,109),(34,94),(43,77),(64,68)]),
 'abdomen':poly([(77,69),(85,75),(82,89),(72,106),(63,111),(58,108),(63,91),(68,79)]),
 'legs':poly([(88,65),(103,65),(111,83),(108,95),(87,113),(74,118),(68,110),(80,91)]),
 'trail':rect([9,94,37,117]),'crossing':rect([52,83,110,119])}
# Feature supports traced by position and local form, not color thresholding.
faceparts={
 'tired_left_eye_lid':poly([(93,59),(97,59),(99,61),(98,65),(94,65),(93,64)]),
 'tired_right_eye_lid':poly([(102,59),(105,60),(106,61),(106,64),(104,66),(102,64)]),
 'tired_mouth_chin_ambiguous':rect([97,65,101,69])}
face=np.logical_or.reduce(list(faceparts.values())); facebox=box(face)
normalface=poly([(92,59),(98,59),(98,63),(102,63),(102,59),(106,59),(106,65),(102,68),(95,68),(92,65)])
# Exclude a deliberately larger head/face envelope from all registration and nonface claims.
excluded=rect([86,52,110,71]); occ=[a[:,:,3]>0 for a in aa]
edges=[m&~ndimage.binary_erosion(m,structure=np.ones((3,3)))for m in occ]
fitnames=['antennae','wing_upper','wing_lower','abdomen']
def points(m):
 y,x=np.where(m);return np.column_stack([x,y]).astype(float)
def fitting(k,names):
 pairs=[]
 for n in names:
  # Erode ROI so its artificial boundary cannot become an anatomical landmark.
  roi=ndimage.binary_erosion(regions[n],iterations=2)&~excluded
  p=points(edges[0]&roi);q=points(edges[k]&roi)
  if len(p)>3 and len(q)>3:pairs.append((p,q))
 def score(v):
  dx,dy,degrees=v;r=np.deg2rad(degrees);R=np.array([[np.cos(r),-np.sin(r)],[np.sin(r),np.cos(r)]])
  vals=[]
  for p,q in pairs:
   z=(q-[64,64])@R.T+[64+dx,64+dy]
   vals.append((cKDTree(p).query(z)[0].mean()+cKDTree(z).query(p)[0].mean())/2)
  return float(np.mean(vals))
 integers=[(score([x,y,0]),x,y)for y in range(-4,5)for x in range(-4,5)]
 s,dx,dy=min(integers)
 fits=[minimize(score,[dx,dy,ang],method='Powell',bounds=[(-4,4),(-4,4),(-6,6)],options={'xtol':1e-5,'ftol':1e-6,'maxiter':100})for ang in [-3,0,3]]
 best=min(fits,key=lambda r:r.fun)
 # A local optimizer may return worse than its integer seed; retain the measured seed.
 if best.fun>s: best.x=np.array([dx,dy,0.]);best.fun=s
 return dict(integer_translation=[dx,dy],translation_chamfer_px=round(s,6),rigid_tired_to_normal=dict(dx=round(float(best.x[0]),5),dy=round(float(best.x[1]),5),angle_deg=round(float(best.x[2]),5),chamfer_px=round(float(best.fun),6)),parts=names)
fits={k:fitting(i,fitnames)for i,k in enumerate(KEYS)if i}; local={n:fitting(5,[n])for n in fitnames}
def translate(a,dx,dy):
 out=np.zeros_like(a);sx=max(0,-dx);sy=max(0,-dy);ex=min(128,128-dx);ey=min(128,128-dy)
 out[sy+dy:ey+dy,sx+dx:ex+dx]=a[sy:ey,sx:ex];return out
reg=translate(aa[5],*fits['tired']['integer_translation']); n=aa[0];o=n[:,:,3]>0;t=reg[:,:,3]>0;union=(o|t)&~excluded
exact=np.all(n==reg,axis=2)&union; shared=(o&t)&union&~exact; shape=(o^t)&union
# Contour distance bands are measured pixel distances, NOT acceptance thresholds.
d0=ndimage.distance_transform_edt(~edges[0]);d5=ndimage.distance_transform_edt(~(t&~ndimage.binary_erosion(t,structure=np.ones((3,3)))))
partstats={}
for name,m in regions.items():
 roi=m&~excluded if name!='head' else m
 u=(o|t)&roi
 partstats[name]=dict(occupied_union=int(u.sum()),rgba_exact=int((np.all(n==reg,axis=2)&u).sum()),same_alpha_different_rgba=int(((o&t)&~np.all(n==reg,axis=2)&roi).sum()),silhouette_xor=int(((o^t)&roi).sum()),normal_box=box(o&roi),tired_box=box(t&roi))
# Raw source topology, 8-connectivity; component independence does not itself label anatomy.
components=[]
for k,m in zip(KEYS,occ):
 lab,num=ndimage.label(m,structure=np.ones((3,3)));sizes=np.bincount(lab.ravel());main=int(np.argmax(sizes[1:])+1)
 components.append(dict(key=k,component_count=int(num),main_pixels=int(sizes[main]),components=[dict(id=j,pixels=int(sizes[j]),bbox=box(lab==j),main=j==main)for j in range(1,num+1)]))
face_rect=rect(facebox);boundary=face_rect&~ndimage.binary_erosion(face_rect)
normaluncovered=normalface&~face
faceinfo=dict(annotation_bbox=facebox,meaning='手動注記した目・まぶた・口周囲の外接bbox。安全な顔抽出maskではない。頬・陰影の意味境界は確定不能。',feature_support_pixels=int(face.sum()),bbox_pixels=int(face_rect.sum()),background_or_other_pixels_in_rectangle=int((face_rect&~face).sum()),normal_feature_annotation_outside_tired_support=int(normaluncovered.sum()),boundary_pixels=int(boundary.sum()),boundary_rgba_different=int((boundary&np.any(n!=aa[5],axis=2)).sum()),tired_alpha_values=sorted(map(int,np.unique(aa[5][:,:,3]))),semitransparent_in_box=int(((aa[5][:,:,3]>0)&(aa[5][:,:,3]<255)&face_rect).sum()),outline_contact_pixels=int((face&edges[5]).sum()),normal_face_annotation_bbox=box(normalface),registered_bbox=box(translate(face,*fits['tired']['integer_translation'])))
# Embedded original/diagnostic images only: no recombination of anatomy and face.
def uri(im):
 b=io.BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
def flat(im):
 bg=Image.new('RGBA',(128,128),'#e6eaed');bg.alpha_composite(im);return bg.convert('RGB')
def crop(im,b):return flat(im).crop(b)
def svg_sheet(name,title,panels,notes):
 # Panels: label, PIL image, displayed width. Vertical mobile-friendly layout.
 y=76;body=[]
 for label,im,w in panels:
  h=round(im.height*w/im.width);body.append(f'<text x="20" y="{y}" font-size="19">{html.escape(label)}</text>');y+=16
  body.append(f'<image x="20" y="{y}" width="{w}" height="{h}" href="{uri(im)}" style="image-rendering:pixelated"/>');y+=h+38
 for line in notes:body.append(f'<text x="20" y="{y}" font-size="16">{html.escape(line)}</text>');y+=26
 s=f'<svg xmlns="http://www.w3.org/2000/svg" width="680" height="{y+12}" viewBox="0 0 680 {y+12}"><rect width="100%" height="100%" fill="white"/><g font-family="sans-serif" fill="#152638"><text x="20" y="36" font-size="23">{html.escape(title)}</text>'+''.join(body)+'</g></svg>'
 (OUT/name).write_text(s+'\n');return name
sheets=[]
sheets.append(svg_sheet('01-originals.svg','① 通常基準08とtired：元画像', [('通常基準・128px原寸',flat(ims[0]),128),('tired・128px原寸',flat(ims[5]),128),('通常基準・4倍',flat(ims[0]),512),('tired・4倍',flat(ims[5]),512)],['拡大は最近傍。画像の置換・候補作成はしていません。']))
# Silhouette overlay, not a renderable character candidate.
rgb=np.full((128,128,3),238,dtype=np.uint8);rgb[o&~t]=[0,135,220];rgb[t&~o]=[235,75,105];rgb[o&t]=[70,70,80]
sheets.append(svg_sheet('02-registration.svg','② 身体registration：輪郭対応', [('通常=青／tired=赤／重複=灰',Image.fromarray(rgb),512)], [f"tired→通常：平行移動 {fits['tired']['integer_translation']} px。",'顔を除外し、触角・上側翅・下側翅・腹部を等重み。','回転fitは測定のみ。変形による一致化はしていません。']))
rgb=np.full((128,128,3),240,dtype=np.uint8);rgb[exact]=[40,145,70];rgb[shared]=[225,167,25];rgb[shape]=[210,60,145];rgb[excluded]=[200,211,222]
sheets.append(svg_sheet('03-nonface-difference.svg','③ 顔周辺を除いたpixel差分',[('緑=RGBA一致／黄=占有一致・色差／紫=形状差',Image.fromarray(rgb),512)],['青灰=顔周辺の除外域 x86:110 / y52:71。','透明同士を「一致」の水増しに数えていません。','黄は同じ輪郭位置の画素。視覚的同一とは断定しません。']))
colors={'head':(240,70,100),'antennae':(30,130,250),'wing_upper':(40,175,110),'wing_lower':(100,200,190),'abdomen':(165,85,220),'legs':(245,155,20),'trail':(140,110,65),'crossing':(220,40,180)}
ps=[]
for ix,label in [(0,'通常基準'),(5,'tired')]:
 b=np.array(flat(ims[ix])).astype(float)
 for name,m in regions.items():b[m]=b[m]*.62+np.array(colors[name])*.38
 ps.append((label+'・保守的な部位ROI（重複あり）',Image.fromarray(b.astype('uint8')),512))
sheets.append(svg_sheet('04-structure.svg','④ 部位別構造・保護範囲',ps,['赤=頭／青=触角／緑=画面上側翅／青緑=下側翅','紫=腹部／橙=脚／茶=左下軌跡／桃=帰属曖昧な交差部','左右翅・各脚の解剖学的分離は確定せず、曖昧部を保護。']))
ps=[]
for ix,label in [(0,'通常顔'),(5,'tired顔')]:
 im=flat(ims[ix]);d=ImageDraw.Draw(im);d.rectangle((facebox[0],facebox[1],facebox[2]-1,facebox[3]-1),outline='#ff0088');ps.append((label+'・同じ座標枠',im.crop((84,49,111,73)),540))
sheets.append(svg_sheet('05-face-bbox.svg','⑤ 顔bboxと境界：安全maskではない',ps,[f'観測要素の外接bbox {facebox}（右・下端は含まない）','右目は外縁と接し、口周囲は顎の陰影・輪郭と連続。','矩形には頭部背景も含まれ、矩形コピーを提案しません。']))
sheets.append(svg_sheet('06-face-features.svg','⑥ 通常顔と疲労顔・頭部の一体感',[('通常：目・口・頬・頭部陰影',crop(ims[0],(86,52,110,71)),600),('tired：まぶた・目の下・口／顎の陰影',crop(ims[5],(86,52,110,71)),600)],['通常顔の背後の無表情な頭部背景はPNGに保存されていない。','通常顔の除去を近傍色で埋める場合、推測が必要。','alphaは二値でも色・陰影の継ぎ目リスクは残ります。']))
sheets.append(svg_sheet('07-crossing.svg','⑦ 脚・腹部・太線の交差部',[('通常基準：同一crop',crop(ims[0],(52,64,113,119)),610),('tired：同一crop',crop(ims[5],(52,64,113,119)),610)],['付け根から先端までの線が重なる部分は保護側。','腹部・脚を個別に安全置換できるという意味ではありません。']))
sheets.append(svg_sheet('08-trail.svg','⑧ 左下の軌跡／粒子',[('通常基準',crop(ims[0],(9,67,57,118)),480),('tired',crop(ims[5],(9,67,57,118)),480)],['通常は散在粒子と淡い線。tiredは連続する太い線。','独立成分だけ追加しても既存の太線は消えません。']))
# Abstract provenance boxes only. No combined source character.
s=( '<svg xmlns="http://www.w3.org/2000/svg" width="680" height="540"><rect width="100%" height="100%" fill="white"/><g font-family="sans-serif" fill="#172638"><text x="20" y="35" font-size="23">⑨ 方式B1の由来概念図（合成画像ではない）</text><rect x="30" y="75" width="620" height="210" fill="#dbefff" stroke="#167bbb"/><text x="50" y="110" font-size="21">通常基準由来となる想定領域</text><text x="50" y="150" font-size="19">触角・翅・腹部・脚・軌跡・粒子・頭部背景</text><text x="50" y="190" font-size="18">→ tired側の輪郭・陰影・姿勢の微差を失う</text><rect x="70" y="215" width="530" height="50" fill="#ffdce4" stroke="#ba4560"/><text x="85" y="247" font-size="18">tired由来：目・まぶた・口（境界未確定）</text><text x="30" y="330" font-size="20">接続条件は未解決</text><text x="30" y="369" font-size="18">通常顔を消した後の背景は既存情報だけで復元不能。</text><text x="30" y="405" font-size="18">右目と頭部外縁、口と顎の境界を安全分離できない。</text><text x="30" y="450" font-size="18">B3：頭部まで保持すると、触角付け根・首境界が増える。</text><text x="30" y="490" font-size="18">本図は処理の仮説説明のみ。候補PNGは0枚。</text></g></svg>')
(OUT/'09-provenance.svg').write_text(s+'\n');sheets.append('09-provenance.svg')
ps=[]
for size in [64,80,104]:
 for ix,label in [(0,'通常基準'),(5,'tired')]:ps.append((f'{label} {size}px・静的縮小',flat(ims[ix]).resize((size,size),Image.Resampling.LANCZOS),size))
sheets.append(svg_sheet('10-small-sizes.svg','⑩ 現状把握：64／80／104px',ps,['実ブラウザーHome未確認。状態マーク・汗はこの図に未合成。','通常の表示処理を完全再現した資料ではありません。']))
ps=[]
for k,im in zip(KEYS,ims):ps.append((k+'・頭部と触角の同一座標crop',crop(im,(76,22,122,73)),368))
sheets.append(svg_sheet('11-face-crosscheck.svg','⑪ 全10表情：顔・頭・触角の予備比較',ps,['全表情に同じcropを使用。各表情の最小顔bboxではありません。','予備比較のみ。顔以外の差と感情の因果・制作意図は未確定。']))
ps=[(k,flat(im),256)for k,im in zip(KEYS,ims)]
sheets.append(svg_sheet('12-body-crosscheck.svg','⑫ 全10表情：身体差の予備横断',ps,['全体配置は類似。翅縁・脚先・腹部の微差は複数表情に存在。','tiredだけの下向き姿勢等の系統性は立証できません。']))
# Face support overlay distinguishes annotated features from the rectangular enclosure.
ps=[]
for ix,label,support in [(0,'通常顔の手動注記',normalface),(5,'tired顔の手動注記',face)]:
 b=np.array(flat(ims[ix])).astype(float);b[support]=b[support]*.45+np.array([230,20,140])*.55
 ps.append((label+'（安全な抽出maskではない）',Image.fromarray(b.astype('uint8')).crop((86,52,110,71)),600))
sheets.append(svg_sheet('13-face-support.svg','⑬ 顔構成要素・背景・外縁の関係',ps,['桃色は位置・局所形状に基づく注記。色閾値抽出ではない。','支持域と矩形の差55画素を顔と決めつけません。','外縁接触16画素には口／顎の曖昧な部分も含まれます。']))
ps=[]
for ix,label in [(0,'通常基準'),(5,'tired')]:
 lab,num=ndimage.label(occ[ix],structure=np.ones((3,3)));sz=np.bincount(lab.ravel());main=int(np.argmax(sz[1:])+1)
 b=np.full((128,128,3),235,dtype='uint8');b[lab==main]=[90,100,115];b[(lab!=0)&(lab!=main)]=[200,40,180]
 ps.append((label+'：灰=最大成分／桃=独立成分',Image.fromarray(b),512))
sheets.append(svg_sheet('14-components.svg','⑭ 軌跡・粒子の連結性（8近傍）',ps,['通常の独立25成分は別成分として識別可能。','tiredの左下線・中央線は身体と同じ最大成分に接続。','連結性は画素帰属の証明ではなく、分離困難の証拠です。']))
record=dict(source_head=SOURCE,source_tree='8429bffbd437b94b7ec75e8076484ca3ba63caea',real_main_at_start='ddb91876555943f37c4b4460ec575aa9b3777f10',date=DATE,tool='tools/antlion08-reconstruction-audit.py',tool_sha256=sha(Path(__file__)),candidate_count=0,asset_changes=0,runtime_changes=0,records=[dict(key=k,path=str(p.relative_to(ROOT)),sha256=sha(p),transparent_bounds=box(a[:,:,3]>0))for k,p,a in zip(KEYS,paths,aa)],registration=dict(method='Equal-weight per-ROI symmetric chamfer of alpha boundary pixel centers. Face envelope excluded. Integer search ±4px; rigid coordinate fit ±4px/±6deg, no source warping. Local fits are diagnostics, not true anatomical rotations.',global_fits=fits,local_tired_fits=local),face=faceinfo,face_support_polygons='see tool source; manual positional annotation, not edit masks',regions={k:dict(mask_bbox=box(m),color=colors[k])for k,m in regions.items()},part_statistics=partstats,nonface=dict(exclusion_box=[86,52,110,71],occupied_union=int(union.sum()),rgba_exact=int(exact.sum()),shared_occupancy_different_rgba=int(shared.sum()),silhouette_difference=int(shape.sum())),components=components,asset_hashes_before=before,asset_hashes_after=hashes(),sheets=sheets)
assert before==record['asset_hashes_after']
(OUT/'measurements.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
h=['<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ウスバカゲロウ08 再構成方式の非破壊監査</title><style>body{font-family:system-ui;max-width:720px;margin:20px auto;padding:12px;color:#172638}img{max-width:100%;height:auto}section{border-top:1px solid #ccc;padding:16px 0}</style><h1>通常基準身体＋tired顔：成立性監査</h1><p>候補画像は作成していません。詳細判定・方式A/B/Cは同じディレクトリのreport.mdを参照してください。</p>']
for f in sheets:h.append('<section><img alt="'+f+'" src="data:image/svg+xml;base64,'+base64.b64encode((OUT/f).read_bytes()).decode()+'"></section>')
(OUT/'comparison.html').write_text('\n'.join(h)+'</html>\n')
print(json.dumps({k:record[k]for k in ['registration','face','nonface','part_statistics']},ensure_ascii=False))

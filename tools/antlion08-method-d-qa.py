#!/usr/bin/env python3
"""QA only. Reads a single generated candidate; never writes production assets."""
from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np
from scipy import ndimage
import json,hashlib,base64,io,html
R=Path(__file__).resolve().parents[1];O=R/'docs/qa/antlion08-method-d-20260928'
keys=['通常基準','既存tired','方式D候補・人間未承認']
ps=[R/'assets/characters/antlion/08.png',R/'assets/characters/expressions/antlion/08-tired.png',O/'tired-candidate.png']
ims=[Image.open(p).convert('RGBA')for p in ps];arr=[np.array(i)for i in ims]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def bbox(m):
 y,x=np.where(m);return [int(x.min()),int(y.min()),int(x.max()+1),int(y.max()+1)]if len(x)else None
def mask(b):
 m=np.zeros((128,128),bool);x,y,r,b=b;m[y:b,x:r]=True;return m
rois={'head':[86,52,109,71],'antennae':[76,20,122,54],'wing_upper':[7,8,88,73],'wing_lower':[30,67,79,116],'abdomen':[58,68,89,112],'legs':[73,65,109,116],'outer_trail':[8,94,36,117],'crossing':[52,83,110,119],'particles':[8,62,44,117]}
face=mask([86,52,110,71]);a,b=arr[0],arr[2];oa=a[:,:,3]>0;ob=b[:,:,3]>0
metrics={}
for name,bb in rois.items():
 m=mask(bb);u=(oa|ob)&m;diff=np.any(a!=b,axis=2)&u
 metrics[name]={'roi':bb,'occupied_union':int(u.sum()),'rgba_diff':int(diff.sum()),'silhouette_xor':int(((oa^ob)&m).sum()),'normal_occupied':int((oa&m).sum()),'candidate_occupied':int((ob&m).sum()),'note':'rectangular review ROI, overlaps other anatomy; not an exact anatomical mask'}
nonface=(oa|ob)&~face
# No registration warping: both candidates were normalized to the same approved bounds.
components=[]
for k,im in zip(keys,arr):
 lab,num=ndimage.label(im[:,:,3]>0,structure=np.ones((3,3)));sz=np.bincount(lab.ravel());main=int(np.argmax(sz[1:])+1)
 components.append({'label':k,'count':int(num),'main_pixels':int(sz[main]),'independent_pixels':int(sum(sz[1:])-sz[main]),'bounds':bbox(im[:,:,3]>0),'alpha_values':list(map(int,np.unique(im[:,:,3])))})
def flat(im):
 bg=Image.new('RGBA',im.size,'#e6eaed');bg.alpha_composite(im);return bg.convert('RGB')
def uri(im):
 b=io.BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
def sheet(file,title,panels,notes):
 y=70;parts=[]
 for label,im,w in panels:
  h=round(w*im.height/im.width);parts += [f'<text x="18" y="{y}" font-size="18">{html.escape(label)}</text>',f'<image x="18" y="{y+16}" width="{w}" height="{h}" href="{uri(im)}" style="image-rendering:pixelated"/>'];y+=h+52
 for line in notes:parts.append(f'<text x="18" y="{y}" font-size="16">{html.escape(line)}</text>');y+=26
 s=f'<svg xmlns="http://www.w3.org/2000/svg" width="680" height="{y+12}"><rect width="100%" height="100%" fill="white"/><g font-family="sans-serif" fill="#172638"><text x="18" y="34" font-size="23">{html.escape(title)}</text>'+''.join(parts)+'</g></svg>\n'
 (O/file).write_text(s);return file
sheets=[]
sheets.append(sheet('01-three-way.svg','① 通常／既存／方式D：同じ倍率',[(k,flat(im),512)for k,im in zip(keys,ims)],['確認：同じ個体か、既存tiredより好ましいか。','候補は本番未採用。既存tiredを修理・切り貼りしていません。']))
for f,title,bb,note in [
 ('02-face.svg','② 顔：疲労の意味と自然さ',(85,50,111,73),'重いまぶたと小口。睡眠・不機嫌に見えないか確認。'),
 ('03-legs.svg','③ 脚：付け根から先端まで',(70,63,111,119),'通常の見える脚経路を基準に、欠損・誤結合を確認。'),
 ('04-antennae.svg','④ 触角：本数・湾曲・先端',(75,20,123,60),'2本の連続性。疲労のために垂らしていないか確認。'),
 ('05-wings.svg','⑤ 翅：上側／下側の輪郭と模様',(5,8,91,118),'切れ込み・内部模様・透明感が保たれているか確認。'),
 ('06-abdomen-line.svg','⑥ 腹部と問題の太線領域',(51,64,111,120),'腹部下の太い斜線、脚とつながる線の再発を確認。'),
 ('07-particles.svg','⑦ 軌跡と粒子の軽さ',(7,59,61,118),'候補は粒子が明るめ。重さ・ノイズ・欠落を確認。')]:
 sheets.append(sheet(f,title,[(k,flat(im).crop(bb),min(600,(bb[2]-bb[0])*10))for k,im in zip(keys,ims)],[note,'同一座標crop。境界を合わせるための局所変形なし。']))
pan=[]
for n in [128,104,80,64]:
 for k,im in zip(keys,ims):pan.append((k+f'・{n}px',flat(im).resize((n,n),Image.Resampling.NEAREST),n))
sheets.append(sheet('08-sizes.svg','⑧ 原寸／104／80／64px',pan,['Homeのpixelated表示に合わせた最近傍縮小。','64pxの顔は小さく、疲労の強さは人間確認が必要。']))
# All nine unchanged expressions shown for style comparison, not regeneration.
others=['happy','strained','hungry','sick','sulky','weak','critical','wantsPlay','sleeping']
pan=[('方式D tired候補',flat(ims[2]),256)]
for k in others:pan.append((k+'・既存原本',flat(Image.open(R/f'assets/characters/expressions/antlion/08-{k}.png').convert('RGBA')),256))
sheets.append(sheet('11-style.svg','⑪ 他9表情との画風比較',pan,['線・色・顔の描き込みが別シリーズになっていないか確認。','他9枚は表示のみ。変更・生成はしていません。']))
rgb=np.full((128,128,3),235,dtype='uint8');rgb[oa&ob]=[160,160,160];rgb[oa&~ob]=[0,120,230];rgb[ob&~oa]=[240,60,130];rgb[face]=[220,215,240]
sheets.append(sheet('12-nonface.svg','⑫ 顔以外の輪郭差', [('通常のみ=青／候補のみ=桃／共通=灰',Image.fromarray(rgb),512)],['薄紫=顔除外領域。自然な差と構造破綻を区別します。','pixel差だけでは採否を決めません。']))
# Four visually separable exterior leg routes, not a claim about anatomical total legs.
traces=[[(85,81),(85,89),(82,95),(79,100),(74,104)],[(88,78),(91,86),(91,91),(88,99),(83,107)],[(94,76),(98,80),(98,87),(95,94)],[(101,72),(104,77),(104,82),(103,85)]]
legchecks=[]
for ix in [0,2]:
 for j,line in enumerate(traces):
  corridor=Image.new('L',(128,128));ImageDraw.Draw(corridor).line(line,fill=1,width=7)
  pixels=(np.array(corridor)>0)&(arr[ix][:,:,3]>0);lab,num=ndimage.label(pixels,structure=np.ones((3,3)))
  def labels(pt):
   x,y=pt;return set(lab[y-2:y+3,x-2:x+3].ravel())-{0}
  connected=bool(labels(line[0])&labels(line[-1]));legchecks.append({'source':keys[ix],'visible_route':j+1,'root_probe':line[0],'tip_probe':line[-1],'corridor_width':7,'connected_8_neighbour':connected})
start=json.loads((O/'start-hashes.json').read_text());after={str(p.relative_to(R)):sha(p)for p in sorted((R/'assets').rglob('*'))if p.is_file()};assert start==after
gen=json.loads((O/'generation.json').read_text())
record={'source_head':'89315adf38091ef2e1eecddbd3de0684bffe82f6','source_tree':'d16dbb6acbcf2aa1a4c5e11d2dc3c3fb4314a593','date':'2026-09-28','method':'D: built-in image_gen; sole reference official normal08; existing normalizer copied with QA-only output','emotion':'tired','generation_calls':1,'retries':0,'human_approved':False,'production_adopted':False,'candidate_png_count':1,'production_asset_changes':0,'runtime_changes':0,'normal_sha256':sha(ps[0]),'existing_tired_sha256':sha(ps[1]),'candidate_sha256':sha(ps[2]),'raw_generation_sha256':gen['raw_sha256'],'raw_generation_size':gen['raw_size'],'raw_generation_source_name':gen['raw_source_name'],'raw_note':'one generation source, not an additional expression candidate; normalized PNG saved in QA','prompt_file':'generation-prompt.txt','generation_reference_paths':['assets/characters/antlion/08.png'],'old_tired_pixels_used':False,'components':components,'face_exclusion_bbox':[86,52,110,71],'nonface_occupied_union':int(nonface.sum()),'nonface_rgba_diff':int((np.any(a!=b,axis=2)&nonface).sum()),'nonface_silhouette_xor':int(((oa^ob)&nonface).sum()),'part_statistics':metrics,'leg_route_checks':legchecks,'asset_hashes_after':after,'sheets':sheets,'limitations':['Body ROIs overlap; not exact anatomical segmentation.','No claim that six legs can be separately counted from an overlapping sprite.','Generative run is not deterministic; normalization/comparison from saved input are reproducible.']}
(O/'audit.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
h=['<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>方式D tired候補</title><style>body{font-family:system-ui;max-width:720px;margin:auto;padding:16px}img{max-width:100%;height:auto}</style><h1>方式D tired候補・人間未承認</h1><p>本番画像変更0。顔・脚・翅・触角・軽さを確認してください。詳細はreport.md、正式CSS合成はstate-composite.html。</p>']
for f in sheets:h.append('<img alt="'+f+'" src="data:image/svg+xml;base64,'+base64.b64encode((O/f).read_bytes()).decode()+'">')
(O/'comparison.html').write_text('\n'.join(h)+'\n</html>\n')
print(json.dumps({k:record[k]for k in ['candidate_sha256','components','nonface_occupied_union','nonface_rgba_diff','nonface_silhouette_xor','part_statistics']},ensure_ascii=False))

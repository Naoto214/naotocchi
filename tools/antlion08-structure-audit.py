#!/usr/bin/env python3
"""Read-only structural study. Does not generate repair candidates or write assets."""
from pathlib import Path
import json,hashlib,base64
import numpy as np
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs/qa/antlion08-structure-20260928';OUT.mkdir(exist_ok=True)
SOURCE='43c40dd4905c869d3f73fd98a33555852e6ea3c2'
KEYS=['normal','happy','strained','hungry','sick','tired','sulky','weak','critical','wantsPlay','sleeping']
FONT=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',16)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def hashes():return {str(p.relative_to(ROOT)):sha(p) for p in sorted((ROOT/'assets').rglob('*'))if p.is_file()}
before=hashes();paths=[ROOT/'assets/characters/antlion/08.png']+[ROOT/f'assets/characters/expressions/antlion/08-{k}.png'for k in KEYS[1:]]
ims=[Image.open(p).convert('RGBA') for p in paths]; assert all(im.size==(128,128)for im in ims)
a=np.array(ims[5]);occupied=a[:,:,3]>0
# Deliberately broad protection regions, not claims of exact anatomical segmentation.
polys={
 'head_face':[(86,50),(108,50),(108,69),(86,69)],
 'antennae':[(76,20),(122,20),(122,59),(76,59)],
 'wings':[(7,8),(33,10),(87,58),(91,65),(69,77),(60,99),(46,116),(31,110),(31,94),(41,77),(34,69),(25,67),(20,43),(6,14)],
 'body':[(78,54),(96,60),(89,83),(79,100),(68,112),(56,115),(61,94),(64,77)],
 'legs':[(84,64),(103,66),(111,85),(106,96),(89,111),(76,118),(65,112),(77,94)],
 'ambiguous_crossings':[(52,118),(61,106),(83,94),(103,82),(110,88),(84,105),(66,118)]}
masks={}
for name,poly in polys.items():
 im=Image.new('L',(128,128));ImageDraw.Draw(im).polygon(poly,fill=255);masks[name]=np.array(im)>0;im.save(OUT/('mask-'+name+'.png'))
protected=np.logical_or.reduce(list(masks.values()));Image.fromarray((protected*255).astype('uint8')).save(OUT/'mask-protected-union.png')
roi=np.zeros((128,128),bool);roi[98:114,10:34]=True
safe=roi&occupied&~protected;Image.fromarray((safe*255).astype('uint8')).save(OUT/'mask-distal-trail-study.png')
def flat(im,size):
 bg=Image.new('RGBA',(128,128),'#e6eaed');bg.alpha_composite(im);return bg.convert('RGB').resize((size,size),Image.Resampling.NEAREST)
def title(d,x,y,t):d.text((x,y),t,font=FONT,fill='#172a37')
# All 11 originals, re-read from source without modifications.
sh=Image.new('RGB',(1024,900),'white');d=ImageDraw.Draw(sh)
for i,(k,im)in enumerate(zip(KEYS,ims)):
 x=i%4*256;y=i//4*300;title(d,x+8,y+5,k);sh.paste(flat(im,256),(x,y+32))
sh.save(OUT/'all11-originals.png')
# Structure panel keeps original visible separately from conservative masks.
sh=Image.new('RGB',(1100,1340),'white');d=ImageDraw.Draw(sh);title(d,12,12,'tired: conservative protected regions; overlaps stay protected. NOT a repair mask approval.')
items=[('normal',None),('tired original',None)]+list(polys.items())
cols={'head_face':(255,80,110),'antennae':(80,180,255),'wings':(70,190,130),'body':(210,100,230),'legs':(255,160,20),'ambiguous_crossings':(230,80,20)}
for i,(name,poly) in enumerate(items):
 x=(i%4)*275;y=45+(i//4)*320;title(d,x+8,y,name)
 im=ims[0]if i==0 else ims[5]; bg=flat(im,256)
 if poly:
  tint=np.zeros((128,128,4),dtype='uint8');tint[masks[name]]=[*cols[name],90];layer=Image.fromarray(tint).resize((256,256),Image.Resampling.NEAREST);b=bg.convert('RGBA');b.alpha_composite(layer);bg=b.convert('RGB')
 sh.paste(bg,(x,y+25))
for i,(name,m,col)in enumerate([('union: do not alter',protected,(230,70,80)),('distal trail study only',safe,(40,100,255))]):
 x=i*400;y=700;title(d,x+8,y,name);tint=np.zeros((128,128,4),dtype='uint8');tint[m]=[*col,100];bg=flat(ims[5],384).convert('RGBA');bg.alpha_composite(Image.fromarray(tint).resize((384,384),Image.Resampling.NEAREST));sh.paste(bg.convert('RGB'),(x,y+25))
title(d,12,1125,'Left exterior trail can be isolated, but the central thick line remains in protected crossings.')
title(d,12,1155,'Color alone cannot establish which shared pixels are leg / abdomen / branch.')
title(d,12,1185,'The prior rejected trial PNG / processing mask could not be recovered; no recreation is shown.')
title(d,12,1215,'No candidate made. Existing originals, expressions, legs, wings and antennae stay byte-identical.')
sh.save(OUT/'structure-masks.png')
# Four requested columns, explicitly missing instead of inventing historical images or a candidate.
labels=['normal','tired before','prior rejected: unavailable','new candidate: NOT CREATED']
sh=Image.new('RGB',(1160,620),'white');d=ImageDraw.Draw(sh)
for j,label in enumerate(labels):title(d,j*290+5,8,label)
for i,n in enumerate([128,64,80,104]):
 yy=[50,215,320,450][i]
 for j in range(4):
  title(d,j*290+5,yy,str(n)+'px')
  if j<2:sh.paste(flat(ims[0 if j==0 else 5],n),(j*290+65,yy+22))
  else:d.rectangle((j*290+65,yy+22,j*290+65+n,yy+22+n),outline='#aaaaaa');title(d,j*290+65,yy+24,'N/A')
sh.save(OUT/'comparison-sizes.png')
# Leg crossing crops: same rectangle, same 8x scale, no independent recentering.
box=(52,64,113,119);sh=Image.new('RGB',(1020,1120),'white');d=ImageDraw.Draw(sh)
for i,label in enumerate(labels):
 x=(i%2)*510;y=(i//2)*550;title(d,x+10,y+8,label)
 if i<2:
  q=flat(ims[0 if i==0 else 5],128).crop(box).resize((488,440),Image.Resampling.NEAREST);sh.paste(q,(x+10,y+40))
 else:title(d,x+10,y+50,'No image. Not substituted with original.')
title(d,10,1045,'Fixed crop x52:113 / y64:119, nearest-neighbour 8x. Anatomy is NOT auto-segmented.')
sh.save(OUT/'legs-closeup.png')
# All expression crossings to evaluate generalization without editing any expression.
sh=Image.new('RGB',(5*260,3*270),'white');d=ImageDraw.Draw(sh)
for i,(k,im)in enumerate(zip(KEYS,ims)):
 x=i%5*260;y=i//5*270;title(d,x+6,y+4,k);q=flat(im,128).crop(box).resize((244,220),Image.Resampling.NEAREST);sh.paste(q,(x+6,y+28))
sh.save(OUT/'all11-leg-regions.png')
notes={
 'normal':'薄い金色の軌跡と散在粒子。脚は胸部から右下へ伸び、翅・腹部との境界を確認。',
 'happy':'腹部下から右の脚群へ太線が連続。左側散在粒子は通常より乏しい。',
 'strained':'左下端と脚下に線があり、右側交差部の帰属は不明瞭。',
 'hungry':'左下へ長い線、右前方にも枝状の突起。脚側を保護する必要。',
 'sick':'腹部下の長い線が右側の脚群へ接続。通常の粒子的表現と異なる。',
 'tired':'左下の太い外側部分と腹部下〜脚交差部が明瞭。代表に選定。',
 'sulky':'左下の線と腹部下の太線。翅下縁近傍と脚交差部を保護。',
 'weak':'左下の太線が強く、右下で脚群へ接続。',
 'critical':'腹部下の斜線と右側脚の交差が明瞭。',
 'wantsPlay':'左下に太い分岐状構造。局所形状が他表情と異なりmask転用不可。',
 'sleeping':'下側の線が腹部・脚側へ接続。閉眼を保護、通常置換は不可。'}
records=[dict(key=k,path=str(p.relative_to(ROOT)),sha256=sha(p),size=list(im.size),review=notes[k])for k,p,im in zip(KEYS,paths,ims)]
y,x=np.where(safe);safe_box=[int(x.min()),int(y.min()),int(x.max()+1),int(y.max()+1)]
# Negative evidence: exact palette overlap does not establish the past failure mechanism.
sample=np.zeros((128,128),bool);sample[69:83,94:108]=True;sample&=occupied
common=sorted({tuple(map(int,v))for v in a[safe]}&{tuple(map(int,v))for v in a[sample]})
(OUT/'color-ambiguity.json').write_text(json.dumps(dict(distal_region='mask-distal-trail-study.png',protected_sample_roi=[94,69,108,83],common_rgba=common,meaning='No exact common RGBA in these samples. Similar brown appearance is not an anatomical label; this does not identify the historical failed algorithm.'),indent=2)+'\n')
report=dict(source_head=SOURCE,representative='tired',status='B_no_safe_complete_local_repair_established',candidate_count=0,production_images_changed=0,baseline_images_changed=0,old_trial_image_available=False,records=records,protection_polygons=polys,protection_method='conservative overlapping geometry from visual anatomical continuity; ambiguous pixels stay protected; not color-only segmentation',protected_occupied_pixels={n:int((m&occupied).sum())for n,m in masks.items()},distal_study=dict(pixels=int(safe.sum()),box=safe_box,not_approved_for_edit=True,reason='isolating this tail does not solve the central branch/leg crossing; no edit performed'),asset_hashes_before=before,asset_hashes_after=hashes(),protected_changes={n:0 for n in masks},protected_changes_semantics='No candidate generated; source files unchanged. These zeros are not evidence of a successful repair candidate.')
assert report['asset_hashes_before']==report['asset_hashes_after']
(OUT/'structure.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
def data(p):return 'data:image/png;base64,'+base64.b64encode(p.read_bytes()).decode()
h=['<!doctype html><meta charset="utf-8"><title>ウスバカゲロウ08 構造監査</title><style>body{font-family:system-ui;margin:24px;background:#f4f6f8;color:#172a37}img{max-width:100%;image-rendering:pixelated}section{padding:16px;background:white;margin:20px 0}</style><h1>ウスバカゲロウ08：代表tiredの構造監査</h1><p><b>停止条件B。安全な補修方法を確立できず、候補作成0。本番画像変更0。</b></p><p>ヒトデ泡の正式承認は別commitで確定済み。代表は太い外側線と脚交差部を一緒に検査できるtired。左下の離れた部分は局所化できても、腹部下〜脚側の太線は保護領域に残ります。推測で共有画素を削りません。</p><p>前回不採用試作の画像・処理maskは回収できていません。比較列は「未取得」と明示し、元画像や再現推測で代用していません。新候補も未作成です。</p>']
for f,title_ in [('all11-originals.png','通常基準と10表情のfresh比較'),('structure-masks.png','構造別の保護領域（重複を許す保守的mask）'),('legs-closeup.png','脚・腹部・枝状線の近接／交差部8倍'),('comparison-sizes.png','128／64／80／104px（元画像の確認、候補の評価ではない）'),('all11-leg-regions.png','全11画像の脚周囲：他9枚への自動転用を避ける根拠')]:h.append(f'<section><h2>{title_}</h2><img src="{data(OUT/f)}"></section>')
h.append('<p>脚・顔・翅・触角の変更0は元画像非変更の意味で、候補成功を意味しません。手順4は未完了、残り9枚の補修・本番採用なし。詳細はreport.md。</p>')
(OUT/'comparison.html').write_text('\n'.join(h))
print(json.dumps(dict(images=11,representative='tired',candidate_count=0,distal_study_pixels=int(safe.sum()),distal_box=safe_box,protected_pixels=report['protected_occupied_pixels'],assets_unchanged=len(before)),ensure_ascii=False))

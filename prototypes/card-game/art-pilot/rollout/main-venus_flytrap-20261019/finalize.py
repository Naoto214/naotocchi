from pathlib import Path
import json,csv,hashlib,subprocess,collections
from PIL import Image,ImageDraw
p=Path(__file__).resolve().parents[2];q=Path(__file__).resolve().parent;repo=p.parents[2]
def read(f):return json.loads(f.read_text())
def write(f,x):f.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
def sha(f):return hashlib.sha256(f.read_bytes()).hexdigest()
scenes=read(q/'play-prompts.json');inv=read(p/'inventory-452.json');prov=read(p/'provenance.json');by={c['card_id']:c for c in inv['cards']};qa=read(q/'browser-qa.json')
assert qa['pass'] and {x['id'] for x in qa['checks']}=={x['id'] for x in scenes}
allscenes=scenes
for s in scenes:
 if s.get('qa_status')=='repair_pending':
  row=by[s['id']];row['production_status']='repair_pending';row['existing_card_candidate']='illustrations/'+s['id']+'.png';row['notes']=s['qa_issue'];row['supporting_source']=';'.join(s['sources'])
scenes=[s for s in scenes if s.get('qa_status')!='repair_pending']
repair_ids=[c['card_id'] for c in inv['cards'] if c['production_status']=='repair_pending' and c['card_id'] not in {s['id'] for s in scenes}]
initial='aba67da04c91db70744fc6a4d03334ab5635ba3c'
baseline=read(p/'rollout/protected46-baseline.json')
protected=[]
for row in baseline['files']:
 f=repo/row['path'];data=f.read_bytes();actual=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest();assert actual==row['sha'],row['path'];protected.append(row['path'])
assert len(protected)==184
for s in scenes:
 id=s['id'];row=by[id];row['supporting_source']=';'.join(s['sources']);row['production_status']='complete_qa';row['existing_card_candidate']='illustrations/'+id+'.png'
 row['notes']='2026-10-18 continuation: 2D identity visually reviewed; 4 PNG sizes and Chromium layout verified. '+('Revision history retained.' if 'revision_prompt' in s else '')
 entry={'id':id,'name':row['name'],'scene':s['scene'],'identity_review':'Visual comparison to canonical character references: '+s['identity'],'sources':s['provenance_sources'],'illustration':'illustrations/'+id+'.png','sha256':sha(p/'illustrations'/(id+'.png')),'dimensions':[1536,1024],'format':'PNG','generation':'Built-in image_gen; rollout/main-venus_flytrap-20261019/play-prompts.json; '+('revised candidate; all prior candidates retained' if 'revision_prompt' in s else 'first candidate'),'approval':'production_qa_complete_under_406_card_authorization','preview':'previews/'+id+'.png'}
 prov['cards']=[c for c in prov['cards'] if c['id']!=id]+[entry]
done={c['id'] for c in prov['cards']};assert len(done)==len(prov['cards'])
checks=[]
for row in inv['cards']:
 id=row['card_id'];out={'id':id,'status':row['production_status'],'files':[]}
 for folder,suffix,size in [('illustrations','',(1536,1024)),('previews','',(600,900)),('previews','-80',(80,120)),('previews','-110',(110,165))]:
  f=p/folder/(id+suffix+'.png');ok=False
  if f.exists():
   with Image.open(f) as im:ok=im.format=='PNG' and im.size==size;im.verify()
   with Image.open(f) as im:im.load()
  if id in done:assert ok,str(f)
  out['files'].append({'path':f.relative_to(p).as_posix(),'exists':f.exists(),'valid':ok})
 checks.append(out)
assert len(checks)==452 and len({c['id'] for c in checks})==452
assert len({c['sha256'] for c in prov['cards']})==len(done)
prov['status']='production_in_progress';prov['generated_count']=len(done);inv['scope']='Canonical paths/blobs mapped for 452 cards. Visual production review covers the completed cards recorded in provenance; remaining cards are not yet reviewed.'
write(p/'provenance.json',prov);write(p/'inventory-452.json',inv)
with open(p/'inventory-452.csv','w',encoding='utf-8-sig',newline='')as f:
 w=csv.DictWriter(f,fieldnames=list(inv['cards'][0]),quoting=csv.QUOTE_ALL,lineterminator="\n");w.writeheader();w.writerows(inv['cards'])
cats={k:{'complete':sum(c['internal_category']==k and c['card_id'] in done for c in inv['cards']),'remaining':sum(c['internal_category']==k and c['card_id'] not in done for c in inv['cards'])} for k in ['main','companion','partner','world','play','item','event']}
pending=[c['card_id'] for k in ['companion','partner','world','item','event','play','main'] for c in inv['cards'] if c['internal_category']==k and c['card_id'] not in done and c['card_id'] not in repair_ids]
progress={'completed':len(done),'remaining':452-len(done),'categories':cats,'next_lot':'main-woman','next_ids':pending[:16],'approval':'All remaining406 authorized 2026-10-18; no per-lot approval needed','main_merge':False,'production_paused':False,'latest_review':'rollout/main-venus_flytrap-20261019/README.md','completed_ids':sorted(done),'not_started_ids':pending,'repair_pending_ids':repair_ids}
write(p/'rollout/progress.json',progress);write(p/'rollout/asset-coverage.json',{'completed':len(done),'not_started':len(pending),'repair_pending':len(repair_ids),'original46_four_sizes_byte_identical':True,'duplicate_image_hashes':0,'id_count':452,'checks':checks})
write(q/'quality-review.json',{'visual_review':'Seed, red-tipped sprout, leafy rosette, two traps, three traps, single large trap with blue inner face, five traps and flowering form matched to2D. Stage08 corrected to five petals per flower and leaf-only base; original retained. Trap counts, facial consistency, plant anatomy, close/overhead views and water settings checked.','canonical_text':'Chromium comparison to full-catalog.mjs; title, cost, text, category and ornament preserved.','old46_protected_files':protected,'complete_ids':[s['id'] for s in scenes],'repair_pending_ids':repair_ids,'physical_iphone_safari':False,'legacy_preview_colors':'Old 46 PNG previews retained; approved-color deck export remains separate final task.'})
scenes=allscenes
for kind,w,h,cols in [('art',360,240,4),('cards',240,360,5),('small',220,190,5)]:
 im=Image.new('RGB',(cols*(w+12)+12,((len(scenes)+cols-1)//cols)*(h+30)+12),'#f4efe2');d=ImageDraw.Draw(im)
 for i,s in enumerate(scenes):
  x=12+(i%cols)*(w+12);y=12+(i//cols)*(h+30);id=s['id'];d.text((x,y),id+(' [REPAIR]' if s.get('qa_status')=='repair_pending' else ''),fill='#30251a')
  if kind=='small':
   for size,offset in [(80,0),(110,95)]:im.paste(Image.open(p/'previews'/f'{id}-{size}.png').convert('RGB'),(x+offset,y+20))
  else:im.paste(Image.open(p/('illustrations' if kind=='art' else 'previews')/(id+'.png')).convert('RGB').resize((w,h)),(x,y+20))
 im.save(q/('play-'+kind+'.png'))
write(q/'summary.json',{'completed':len(done),'remaining':452-len(done),'categories':cats,'all452_complete':False,'protected46':True,'new_png_count':len(scenes)*4})
print(json.dumps({'completed':len(done),'remaining':452-len(done),'categories':cats}))

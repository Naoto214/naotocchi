from pathlib import Path
import json,csv,hashlib,subprocess,collections
from PIL import Image,ImageDraw
p=Path(__file__).resolve().parents[2];q=Path(__file__).resolve().parent;repo=p.parents[2]
def read(f):return json.loads(f.read_text())
def write(f,x):f.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
def sha(f):return hashlib.sha256(f.read_bytes()).hexdigest()
scenes=read(q/'companions-prompts.json');inv=read(p/'inventory-452.json');prov=read(p/'provenance.json');by={c['card_id']:c for c in inv['cards']};qa=read(q/'browser-qa.json')
assert qa['pass'] and {x['id'] for x in qa['checks']}=={x['id'] for x in scenes}
initial='aba67da04c91db70744fc6a4d03334ab5635ba3c'
old=json.loads(subprocess.check_output(['git','show',initial+':prototypes/card-game/art-pilot/provenance.json'],cwd=repo))
protected=[]
for c in old['cards']:
 for folder,suffix in [('illustrations',''),('previews',''),('previews','-80'),('previews','-110')]:
  f=p/folder/(c['id']+suffix+'.png');rp=f.relative_to(repo).as_posix();expected=subprocess.check_output(['git','rev-parse',initial+':'+rp],cwd=repo,text=True).strip();actual=subprocess.check_output(['git','hash-object',str(f)],cwd=repo,text=True).strip();assert expected==actual,rp;protected.append(rp)
for s in scenes:
 id=s['id'];row=by[id];row['production_status']='complete_qa';row['existing_card_candidate']='illustrations/'+id+'.png'
 row['notes']='2026-10-18 continuation: 2D identity visually reviewed; 4 PNG sizes and Chromium layout verified. '+('Bat foot attachment repaired; first candidate retained.' if id=='C-bat' else '')
 entry={'id':id,'name':row['name'],'scene':s['scene'],'identity_review':'Visual comparison to canonical 2D sprite: '+s['identity'],'sources':[{'path':row['source_path'],'ref':row['source_ref'],'blob':row['source_blob']}],'illustration':'illustrations/'+id+'.png','sha256':sha(p/'illustrations'/(id+'.png')),'dimensions':[1536,1024],'format':'PNG','generation':'Built-in image_gen; rollout/continuation-20261018/companions-prompts.json; '+('one targeted foot-attachment revision' if id=='C-bat' else 'first candidate'),'approval':'production_qa_complete_under_406_card_authorization','preview':'previews/'+id+'.png'}
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
pending=[c['card_id'] for k in ['companion','partner','world','item','event','play','main'] for c in inv['cards'] if c['internal_category']==k and c['card_id'] not in done]
progress={'completed':len(done),'remaining':452-len(done),'categories':cats,'next_lot':'partners-01','next_ids':pending[:16],'approval':'All remaining406 authorized 2026-10-18; no per-lot approval needed','main_merge':False,'production_paused':False,'latest_review':'rollout/continuation-20261018/README.md','completed_ids':sorted(done),'not_started_ids':pending,'repair_pending_ids':[]}
write(p/'rollout/progress.json',progress);write(p/'rollout/asset-coverage.json',{'completed':len(done),'not_started':452-len(done),'repair_pending':0,'original46_four_sizes_byte_identical':True,'duplicate_image_hashes':0,'id_count':452,'checks':checks})
write(q/'quality-review.json',{'visual_review':'Each source sprite and generated illustration inspected; exact pixel/color equality is not intended for storybook rendering. Bat repaired once. No gross extra limbs or cropped primary features seen.','canonical_text':'Verified against branch full-catalog.mjs in Chromium; no card-rule edits.','old46_protected_files':protected,'complete_ids':[s['id'] for s in scenes],'repair_pending_ids':[],'physical_iphone_safari':False,'legacy_preview_colors':'Original 46 previews retained byte-for-byte; some predate approved colors. Current HTML applies approved colors. Refreshing old previews for a final full deck remains outstanding.'})
for kind,w,h,cols in [('art',360,240,4),('cards',240,360,5),('small',220,190,5)]:
 im=Image.new('RGB',(cols*(w+12)+12,((len(scenes)+cols-1)//cols)*(h+30)+12),'#f4efe2');d=ImageDraw.Draw(im)
 for i,s in enumerate(scenes):
  x=12+(i%cols)*(w+12);y=12+(i//cols)*(h+30);id=s['id'];d.text((x,y),id,fill='#30251a')
  if kind=='small':
   for size,offset in [(80,0),(110,95)]:im.paste(Image.open(p/'previews'/f'{id}-{size}.png').convert('RGB'),(x+offset,y+20))
  else:im.paste(Image.open(p/('illustrations' if kind=='art' else 'previews')/(id+'.png')).convert('RGB').resize((w,h)),(x,y+20))
 im.save(q/('companions-'+kind+'.png'))
write(q/'summary.json',{'completed':len(done),'remaining':452-len(done),'categories':cats,'all452_complete':False,'protected46':True,'new_png_count':len(scenes)*4})
print(json.dumps({'completed':len(done),'remaining':452-len(done),'categories':cats}))

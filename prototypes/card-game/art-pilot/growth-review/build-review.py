from pathlib import Path
import json,csv,hashlib,subprocess
from PIL import Image,ImageDraw,ImageFont

P=Path(__file__).resolve().parent.parent
D=P/'growth-review'
BASE='7a10e8f3bcd4902567a5f0425c01ef8f23602504'
rev=json.loads((D/'revision-prompts.json').read_text())
changed={r['id']:r for r in rev}
font=ImageFont.truetype('/root/.local/share/fonts/mplus-rounded.ttf',22)
def sha(f): return hashlib.sha256(f.read_bytes()).hexdigest()
def art(id,before=False):
    f=D/'before'/f'{id}.png'
    return f if before and f.exists() else P/'illustrations'/f'{id}.png'
for species in ['beetle','cat','clownfish']:
    for before in [True,False]:
        strip=Image.new('RGB',(3072,256),'#f4efe2')
        for i in range(8):
            strip.paste(Image.open(art(f'M-{species}-{i+1:02}',before)).convert('RGB').resize((384,256)),(i*384,0))
        strip.save(D/f'{species}-{"before" if before else "after"}-blind.png')
    sheet=Image.new('RGB',(3072,512),'white')
    for y,label in [(0,'before'),(256,'after')]:sheet.paste(Image.open(D/f'{species}-{label}-blind.png'),(0,y))
    sheet.save(D/f'{species}-before-after.png')
sheet=Image.new('RGB',(1536,7*552),'#f4efe2');draw=ImageDraw.Draw(sheet)
for i,r in enumerate(rev):
    id=r['id'];draw.text((12,i*552+4),id+'    BEFORE / AFTER',font=font,fill='#302920')
    for j,b in enumerate([True,False]):sheet.paste(Image.open(art(id,b)).convert('RGB').resize((768,512)),(j*768,i*552+36))
sheet.save(D/'seven-before-after.png')
small=Image.new('RGB',(8*230,3*220),'#f4efe2');dr=ImageDraw.Draw(small)
for row,s in enumerate(['beetle','cat','clownfish']):
    for i in range(8):
        id=f'M-{s}-{i+1:02}';x=i*230;y=row*220
        dr.text((x,y),id,font=font,fill='#302920')
        for w,dx in [(80,0),(110,90)]:small.paste(Image.open(P/'previews'/f'{id}-{w}.png').convert('RGB'),(x+dx,y+38))
small.save(D/'24-small.png')
inv=json.loads((P/'inventory-452.json').read_text());prov=json.loads((P/'provenance.json').read_text())
assert json.loads((D/'browser-qa.json').read_text())['pass']
for c in prov['cards']:
    id=c['id']
    if id in changed:
        if c.get('revision')!='growth-story-v2':
            old={k:v for k,v in c.items() if k!='history'}
            old['illustration']=f'growth-review/before/{id}.png'
            old['preview']=f'growth-review/before/{id}-card.png'
            c.setdefault('history',[]).append(old)
        c.update(revision='growth-story-v2',scene=changed[id]['scene'],sha256=sha(art(id)),generation='built-in image_gen identity-preserve edit; growth-review/revision-prompts.json',identity_review='Canonical 2D and before/after visually checked; see growth-review/README.md',approval='revision_qa_complete_under_user_authorization')
for c in inv['cards']:
    if c['card_id'] in changed and 'growth-story-v2' not in c['notes']:c['notes']+=' growth-story-v2: 情景・構図修正、旧版はgrowth-review/before/に保存。'
(P/'inventory-452.json').write_text(json.dumps(inv,ensure_ascii=False,indent=2)+'\n')
with (P/'inventory-452.csv').open('w',encoding='utf-8-sig',newline='') as f:
    w=csv.DictWriter(f,fieldnames=list(inv['cards'][0]),quoting=csv.QUOTE_ALL);w.writeheader();w.writerows(inv['cards'])
prov['growth_review']='growth-review/README.md'
(P/'provenance.json').write_text(json.dumps(prov,ensure_ascii=False,indent=2)+'\n')
checks=[]
for c in prov['cards']:
    id=c['id']
    for folder,suf,size in [('illustrations','',(1536,1024)),('previews','',(600,900)),('previews','-80',(80,120)),('previews','-110',(110,165))]:
        f=P/folder/f'{id}{suf}.png'
        with Image.open(f) as im:assert im.size==size and im.format=='PNG';im.verify()
        rel=str(f.relative_to(P.parent.parent.parent))
        old=subprocess.check_output(['git','show',BASE+':'+rel],cwd=P)
        if id not in changed:assert hashlib.sha256(old).hexdigest()==sha(f)
        checks.append({'path':str(f.relative_to(P)),'valid':True,'sha256':sha(f),'unchanged':hashlib.sha256(old).hexdigest()==sha(f)})
assert len(prov['cards'])==46 and len({c['sha256'] for c in prov['cards']})==46
assert len(inv['cards'])==452 and len({c['card_id'] for c in inv['cards']})==452
assert sum(c['production_status']=='not_started' for c in inv['cards'])==406
for id in changed:
    old=subprocess.check_output(['git','show',BASE+':prototypes/card-game/art-pilot/illustrations/'+id+'.png'],cwd=P)
    assert hashlib.sha256(old).hexdigest()==sha(D/'before'/f'{id}.png')
qa={'baseline':BASE,'revised':list(changed),'revised_count':7,'unchanged_cards':39,'completed':46,'not_started':406,'all_184_png_valid':True,'unique_current_art_hashes':46,'archived_originals_match':True,'pupa_and_dandelion_unchanged':True,'physical_iPhone_Safari':False,'blind_human_test_performed':False,'files':checks}
(D/'asset-qa.json').write_text(json.dumps(qa,ensure_ascii=False,indent=2)+'\n')
print({k:v for k,v in qa.items() if k!='files'})

from pathlib import Path
from html.parser import HTMLParser
import fitz,json,hashlib
r=Path(__file__).resolve().parents[1];expected=[]
for sheet in fitz.open(r/'source/madoromi_no_hakoniwa_38_full.pdf'):
 lines=[]
 for b in sheet.get_text('dict')['blocks']:
  for l in b.get('lines',[]):
   if l['bbox'][1]<=550:lines.append((l['bbox'][1],''.join(s['text'] for s in l['spans'])))
 expected.extend(t for _,t in sorted(lines))
for edit in json.loads((r/'source/approved-edits-20261027.json').read_text())['edits']:expected[expected.index(edit['before'])]=edit['after']
baseline=json.loads((r/'source/manuscript-v18.json').read_text());assert [l for x in baseline for l in x['text'].split('\n')]==expected
import copy
approved=copy.deepcopy(baseline)
assert approved[210]['text']=='ある日、なおとがソファでうとうとしていると、あの小さな世界が現\nれた。'
approved[210]['text']='仕事が終わったある夜、なおとは風呂から上がり、ソファに座っていた。'
approved[354]['text']='川を渡った先では、かめが草の間を歩いていた。'
approved[355]['text']='さっきまで渡れなかった川を越えて、今はそこにいる。'
approved.insert(211,{**baseline[210],'text':'そのうち、うとうとしていると、あの小さな世界が現れた。'})
records=json.loads((r/'source/manuscript-lines.json').read_text());assert records==approved
assert json.loads((r/'dist/manuscript.json').read_text())==records
ids=json.loads((r/'source/reader-source-ids.json').read_text());expected_ids=list(range(395));expected_ids.insert(211,395);assert ids==expected_ids
assert (r/'dist/madoromi-v19-full.txt').read_text()=='\n\n'.join(x['text'] for i,x in enumerate(records) if i!=1)+'\n'

assert (r/'dist/manuscript-38-revised.txt').read_text()=='\n\n'.join(x['text'] for x in records)+'\n'
class Reader(HTMLParser):
 def __init__(self):super().__init__();self.current=None;self.items=[];self.images=0
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  if 'data-source-index' in a:self.current=[t,int(a['data-source-index']),'']
  if t in ['img','figure','picture']:self.images+=1
 def handle_data(self,d):
  if self.current:self.current[2]+=d
 def handle_endtag(self,t):
  if self.current and t==self.current[0]:self.items.append(self.current);self.current=None
p=Reader();p.feed((r/'dist/index.html').read_text());assert [(i,t) for _,i,t in p.items]==[(ids[i],x['text']) for i,x in enumerate(records) if i!=1]
assert len([x for x in p.items if x[0]=='h2'])==6 and p.images==0
assert hashlib.sha256((r/'source/madoromi_no_hakoniwa_38_full.pdf').read_bytes()).hexdigest()=='223a56946527739ba55bded2717ad73b32666f7ad899e95f719879a1a70349ba'
for page in ['qa-white-position.html']:
 q=Reader();q.feed((r/'dist'/page).read_text());assert q.items==p.items
print('PASS: independent PDF + prior 2 river edits + ONLY v19 approved passages = 396 canonical records; HTML/QA/JSON/TXT exact; old reading IDs preserved; 6 chapters, no images')

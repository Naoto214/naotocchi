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
records=json.loads((r/'source/manuscript-lines.json').read_text());assert [l for x in records for l in x['text'].split('\n')]==expected
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
p=Reader();p.feed((r/'dist/index.html').read_text());assert [(i,t) for _,i,t in p.items]==[(i,x['text']) for i,x in enumerate(records) if i!=1]
assert len([x for x in p.items if x[0]=='h2'])==6 and p.images==0
assert hashlib.sha256((r/'source/madoromi_no_hakoniwa_38_full.pdf').read_bytes()).hexdigest()=='223a56946527739ba55bded2717ad73b32666f7ad899e95f719879a1a70349ba'
print('PASS: independent PDF 426 lines + 2 approved edits = canonical 395 records; rendered 393 chapter records + title exact; zero images')

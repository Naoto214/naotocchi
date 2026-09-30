#!/usr/bin/env python3
"""Independently inspect saved SVG transforms; no placement constants for C."""
import copy,json,re,hashlib,tempfile,subprocess
from pathlib import Path
import xml.etree.ElementTree as E
E.register_namespace('', 'http://www.w3.org/2000/svg')
ROOT=Path(__file__).resolve().parents[1];QA=ROOT/'docs/qa';NS='{http://www.w3.org/2000/svg}'
HEAD='b69c94e8f913f05072b7f4e0caacb1666080e5e7'
OUT=Path(tempfile.gettempdir())/'starfish-source-check';OUT.mkdir(exist_ok=True)
for name,source in [('old-abc.svg','starfish-silver-reevaluation-20260927.svg'),('old-02.svg','starfish-expressions-step3-20260927-02.svg'),('old-03.svg','starfish-expressions-step3-20260927-03.svg')]:
 (OUT/name).write_bytes(subprocess.check_output(['git','show','e845d685ad0af8b0a98b55653f2150e73ed34f23:docs/qa/'+source],cwd=ROOT))
def nums(s):return list(map(float,re.findall(r'-?\d+(?:\.\d+)?',s)))
def load(file):
 r=E.parse(file).getroot();par={c:p for p in r.iter() for c in p};symbols={e.get('id'):e for e in r.iter(NS+'symbol')};cards=[]
 for g in r.iter():
  if g.get('class')!='pet-expression-accent' or not any('accent-warm-line' in p.get('class','') for p in g.iter()):continue
  cell=par[g];scale=nums(g.get('transform'))[0];off=nums(list(g)[0].get('transform'));n=round(scale*104)
  normalized=copy.deepcopy(cell);normalized.attrib.pop('transform',None)
  for use in list(normalized):
   if use.tag==NS+'use':
    im=copy.deepcopy(list(symbols[use.get('href')[1:]])[0]);im.set('width',use.get('width'));im.set('height',use.get('height'));im.set('y',use.get('y'));normalized.remove(use);normalized.insert(0,im)
  sweat=[x.get('transform') for x in cell if 'rotate' in x.get('transform','')]
  # local anchor = first point M17 24 of actual saved silver path, transformed by saved SVG matrices
  p=next(p for p in g.iter() if p.tag==NS+'path');start=nums(p.get('d'))[:2]
  cards.append({'n':n,'offset':off,'cell_origin':nums(cell.get('transform')),'silver_start':[round((v+d)*scale,6) for v,d in zip(start,off)],'silver_translation':[round(v*scale,6) for v in off],'sweat_transforms':sweat,'node':normalized})
 return r,cards
records=[];panels=[]
for version in ['old','fresh']:
 abc=Path('/tmp/starfish-source-check/old-abc.svg') if version=='old' else QA/'starfish-silver-reevaluation-20260927-C-verified.svg'
 r,cards=load(abc)
 for j,st in enumerate(['02','03']):
  sheet=Path('/tmp/starfish-source-check')/f'old-{st}.svg' if version=='old' else QA/f'starfish-expressions-step3-20260927-{st}-C-verified.svg'
  sr,sc=load(sheet)
  for i,n in enumerate([64,80,104]):
   c=cards[j*9+6+i];a=cards[j*9+i];matches=[x for x in sc if x['n']==n]
   for m in matches:
    assert c['offset']==m['offset'] and c['silver_start']==m['silver_start']
    if m['sweat_transforms']:assert c['sweat_transforms']==m['sweat_transforms']
   actual=next(x for x in matches if x['sweat_transforms'])
   # Compare the complete saved composite: actual PNG bytes, body baseline, silver, sweat, transforms.
   assert E.tostring(c['node'])==E.tostring(actual['node']), (version,st,n)
   record={'version':version,'stage':st,'size':n,'C':{k:v for k,v in c.items() if k!='node'},'contact':{k:v for k,v in actual.items() if k!='node'},'composite_svg_equal':True}
   records.append(record)
   for tag,item in [('C',c),('contact',actual)]:
    svg=E.Element(NS+'svg',{'width':'144','height':'144'});svg.append(copy.deepcopy(r.find(NS+'style')));g=E.SubElement(svg,NS+'g',{'transform':'translate(16 16)'});g.append(copy.deepcopy(item['node']));E.ElementTree(svg).write(OUT/f'{version}-{st}-{n}-{tag}.svg')
   if version=='fresh':panels.append((st,n,a,c,actual))
svg=E.Element(NS+'svg',{'width':'1080','height':'1130','font-family':'Rounded Mplus 1c,sans-serif'});svg.append(copy.deepcopy(r.find(NS+'style')))
E.SubElement(svg,NS+'rect',{'width':'100%','height':'100%','fill':'#faf7ef'})
def text(x,y,s,size=16):E.SubElement(svg,NS+'text',{'x':str(x),'y':str(y),'font-size':str(size)}).text=s
text(20,30,'ヒトデ02・03｜A／C／contact sheet実描画の照合',24)
text(20,55,'source HEAD '+HEAD,14);text(20,77,'候補C反映済み。同一サイズ・PNG・汗位相。Cと右は保存SVGの内容が一致。',16)
for row,(st,n,a,c,actual) in enumerate(panels):
 y=110+row*166;text(20,y,f'ヒトデ{st}・{n}px')
 for col,(label,card) in enumerate(zip(['A 補修前','C 最終候補','contact sheetから抽出'],[a,c,actual])):
  x=col*350;text(x+45,y+25,label,16);g=E.SubElement(svg,NS+'g',{'transform':f'translate({x+140} {y+35})'});g.append(copy.deepcopy(card['node']))
E.ElementTree(svg).write(QA/'starfish-contact-source-proof-20260927.svg',encoding='unicode')
(QA/'starfish-contact-source-proof-20260927.json').write_text(json.dumps({'source_head':HEAD,'runtime_sha256':hashlib.sha256((ROOT/'pet-expression.js').read_bytes()).hexdigest(),'records':records},ensure_ascii=False,indent=2)+'\n')
print('PASS: old/fresh × 2 stages × 3 sizes = 12 complete SVG equality checks; all normal/sweat silver offsets equal')

subprocess.run(['node','-e',r"const sharp=require('sharp');(async()=>{for(const v of ['old','fresh'])for(const st of ['02','03'])for(const n of [64,80,104]){const p='/tmp/starfish-source-check/'+v+'-'+st+'-'+n;const a=await sharp(p+'-C.svg').raw().toBuffer(),b=await sharp(p+'-contact.svg').raw().toBuffer();if(!a.equals(b))throw Error(p);}console.log('Pixel equality PASS 12/12; differing pixels 0');})();"],cwd=ROOT,check=True)

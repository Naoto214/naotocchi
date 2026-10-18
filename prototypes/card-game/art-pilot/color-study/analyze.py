"""Relative palette screening; not an accessibility certification or user perception test."""
import json,itertools
from pathlib import Path
import numpy as np
P=Path(__file__).parent
MATRICES={
'protan':[[.152286,1.052583,-.204868],[.114503,.786281,.099216],[-.003882,-.048116,1.051998]],
'deutan':[[.367322,.860646,-.227968],[.280085,.672501,.047413],[-.011820,.042940,.968881]],
'tritan':[[1.255528,-.076749,-.178779],[-.078411,.930809,.147602],[.004733,.691367,.303900]]}
def rgb(h):return np.array([int(h[i:i+2],16)/255 for i in (1,3,5)])
def linear(x):return np.where(x<=.04045,x/12.92,((x+.055)/1.055)**2.4)
def encoded(x):return np.where(x<=.0031308,x*12.92,1.055*np.maximum(x,0)**(1/2.4)-.055)
def lab(x):
 lms=np.cbrt(linear(x)@np.array([[.4122214708,.5363325363,.0514459929],[.2119034982,.6806995451,.1073969566],[.0883024619,.2817188376,.6299787005]]).T)
 return lms@np.array([[.2104542553,.793617785,-.0040720468],[1.9779984951,-2.428592205,.4505937099],[.0259040371,.7827717662,-.808675766]]).T

def sim(x,mode):return encoded(np.clip(linear(x)@np.array(MATRICES[mode]).T,0,1))
def lum(x):return float(linear(x)@np.array([.2126,.7152,.0722]))
def contrast(a,b):
 a,b=sorted([lum(a),lum(b)]);return (b+.05)/(a+.05)
focus=[['むし','なかま'],['ひと','こいびと'],['みずべ','セカイ'],['けもの','あいてむ'],['あそび','なかま'],['うみ','ふしぎ']]
def analyze(p):
 out={}
 for mode in ['normal',*MATRICES]:
  xs={k:rgb(v) if mode=='normal' else sim(rgb(v),mode) for k,v in p.items()}
  pairs=sorted([{'a':a,'b':b,'deltaEOK100':round(float(np.linalg.norm(lab(xs[a])-lab(xs[b])))*100,3)} for a,b in itertools.combinations(p,2)],key=lambda x:x['deltaEOK100'])
  out[mode]={'minimum':pairs[0],'median':round(float(np.median([x['deltaEOK100'] for x in pairs])),3),'pairs':pairs,'focus':[next(x for x in pairs if {x['a'],x['b']}==set(pair)) for pair in focus]}
 out['colors']={k:{'hex':v,'L':round(float(lab(rgb(v))[0])*100,2),'C':round(float(np.linalg.norm(lab(rgb(v))[1:]))*100,2),'h':round(float(np.degrees(np.arctan2(*lab(rgb(v))[1:][::-1])))%360,2),'white_icon_contrast':round(contrast(rgb(v),rgb('#fffdf1')),2),'board_base_contrast':round(contrast(rgb(v),rgb('#132d2c')),2)} for k,v in p.items()}
 return out
if __name__=='__main__':
 palettes=json.loads((P/'palettes.json').read_text());out={k:analyze(v) for k,v in palettes.items()};(P/'metrics.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
 for k,v in out.items():
  print(k,{m:{'min':v[m]['minimum'],'median':v[m]['median']} for m in ['normal',*MATRICES]});print('focus',v['normal']['focus']);print('white',[(k,d['white_icon_contrast']) for k,d in v['colors'].items()][:8])

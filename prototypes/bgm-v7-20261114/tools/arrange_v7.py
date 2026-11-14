"""Authored home-only chamber parts. Pitch/rhythm/velocity of all piano notes stay V6.
Phrase tuples: (repeat index, 1-based bar, beat offset, MIDI, beats held).
No algorithmic chord-tone or counter-melody generation.
"""
import pathlib,json,copy,sys
ROOT=pathlib.Path(__file__).resolve().parents[1];V6=ROOT.parent/'bgm-v6-20261114'
sys.path.insert(0,str(V6/'tools'));from arrange_v6 import curve
PARTS={
'a':{
 'home-morning':{'violin_solo':[(1,9,.35,71,3.2),(1,10,.35,69,3.1),(1,13,.35,66,3.2),(1,14,.35,67,3.0)]},
 'home-day':{'violin_solo':[(2,5,.5,64,3),(2,6,.5,67,3),(2,7,.35,69,3),(2,8,.4,67,1.7)],'cello_chamber':[(1,3,.3,53,3),(1,4,.3,50,2.8)]},
 'home-evening':{'violin_solo':[(1,13,.4,64,2.2),(1,14,.4,67,2.2),(1,15,.4,69,1.7)]},
 'home-night':{}
},
'b':{
 'home-morning':{
  'cello_chamber':[(0,5,.2,54,3.1),(0,6,.2,55,3.1),(0,7,.2,52,3.1),(0,8,.2,50,2.8),(1,5,.2,54,3.1),(1,6,.2,55,3.1),(1,7,.2,52,3.1),(1,8,.2,50,2.5)],
  'violin_solo':[(0,9,.4,66,3.2),(0,10,.4,64,3.2),(0,11,.4,66,3.2),(0,12,.4,67,2.6),(1,3,.4,66,3.0),(1,4,.4,64,2.4),(1,9,.4,71,3.25),(1,10,.4,69,3.25),(1,11,.4,66,3.25),(1,12,.4,67,3.2),(1,13,.4,69,3.25),(1,14,.4,71,3.2),(1,15,.4,67,2.2)]},
 'home-day':{
  'cello_chamber':[(1,1,.25,48,3.1),(1,2,.25,45,3.1),(1,3,.25,53,3.1),(1,4,.25,43,2.8),(2,1,.25,52,3.1),(2,2,.25,48,3.1),(2,3,.25,45,3.1),(2,4,.25,47,2.7)],
  'violin_solo':[(1,5,.45,64,3.1),(1,6,.45,67,3.1),(1,7,.45,69,3.1),(1,8,.45,71,1.6),(2,1,.45,67,3.0),(2,2,.45,64,3.0),(2,3,.45,65,3.0),(2,4,.45,67,2.6),(2,5,.45,67,3.1),(2,6,.45,71,3.1),(2,7,.45,72,3.1),(2,8,.4,71,1.35),(2,8,2.0,67,1.2)]},
 'home-evening':{'violin_solo':[(0,5,.35,60,2.25),(0,6,.35,62,2.25),(0,7,.35,59,2.25),(0,8,.35,68,2.25),(0,9,.35,69,2.25),(0,10,.35,66,2.25),(0,11,.35,67,2.25),(0,12,.35,66,1.8),(0,14,.35,70,2.25),(0,15,.35,69,1.8),(1,5,.35,64,2.25),(1,6,.35,66,2.25),(1,7,.35,67,2.25),(1,8,.35,68,2.25),(1,9,.35,69,2.25),(1,10,.35,66,2.25),(1,11,.35,67,2.25),(1,12,.35,69,1.7),(1,13,.35,71,2.25),(1,14,.35,74,2.25),(1,15,.35,72,2.0),(1,16,.35,71,1.4)]},
 'home-night':{'violin_solo':[(0,9,.6,69,2.8),(0,10,.6,68,2.8),(0,11,.6,69,2.3),(0,13,.6,64,2.8),(0,14,.6,66,2.3)],'cello_chamber':[(0,9,.4,50,3),(0,10,.4,49,3),(0,11,.4,54,2.6),(0,13,.4,49,3),(0,14,.4,50,2.6)]}
}}
NOTES={
'home-morning':{'a':'ピアノを中心に、2周目の9〜10・13〜14小節だけ弱奏バイオリン。','b':'チェロが中盤を温かく支え、後半のバイオリンへ受け渡す。13小節の山を二人で囲む。'},
'home-day':{'a':'2周目の短いチェロ、3周目の4小節だけバイオリン。軽やかな庭の余白を保つ。','b':'2周目はチェロからバイオリンへ、3周目で応答を広げる。36秒の高音木管は無し。'},
'home-evening':{'a':'低いチェロを生録音で再構成。最後の高まりだけ3つのバイオリンの長音。','b':'静かな導入から弦の応答が始まり、2周目14小節で最も高く歌って柔らかく帰着。'},
'home-night':{'a':'V6のピアノ独奏を原盤のまま使用。弦を足さない案。','b':'V6のピアノ原盤に、9〜11・13〜14小節だけごく静かな弦。余韻と前半の静けさを優先。'}
}
def build(variant):
 scores=json.loads((V6/'scores-v6.json').read_text())
 for s in scores[:4]:
  original=copy.deepcopy(s['events']);s['events']=[e for e in original if e['instrument']=='piano'];beat=60/s['bpm'];bar=beat*s['meter'];arc=s['v6']['profile']['arc']
  # Existing evening cello foundation stays in place, with a new native sustain engine.
  if s['id']=='home-evening':
   for e in original:
    if e['role']=='bass' and e['instrument']=='cellos':
     n={**e,'instrument':'cello_chamber','role':'string_cello','vel':.65,'source':'V6 bass, native recording reconstruction'};s['events'].append(n)
  for inst,phrases in PARTS[variant][s['id']].items():
   for rep,b,off,pitch,length in phrases:
    t=(rep*s['bars']+b-1)*bar+off*beat
    s['events'].append({'t':round(t,6),'midi':pitch,'dur':round(length*beat,6),'vel':.65,'instrument':inst,'role':'string_violin' if inst=='violin_solo' else 'string_cello','pan':-.16 if inst=='violin_solo' else .12,'layer':1,'expressionDb':curve(arc,t/bar),'source':'authored phrase'})
  # Keep original piano ordering exactly; renderer sorts new string voices separately.
  s['v7']={'variant':variant,'description':NOTES[s['id']][variant],'removedAuxiliaryNotes':len(original)-sum(e['instrument']=='piano' for e in original),'syntheticLoops':False,'nightReusesV6Piano':s['id']=='home-night'}
 return scores
if __name__=='__main__':
 for v in ('a','b'):
  out=build(v);(ROOT/f'scores-{v}.json').write_text(json.dumps(out,ensure_ascii=False,indent=1)+'\n');print(v,[(s['id'],sum(e['instrument']!='piano' for e in s['events'])) for s in out[:4]])

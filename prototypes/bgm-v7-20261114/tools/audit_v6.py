import sys,pathlib,json,numpy as np,collections
repo=pathlib.Path(__file__).resolve().parents[3];sys.path.insert(0,str(repo/'prototypes/bgm-v6-20261114/tools'));import render_v6 as V
L=V.L;orig=L.Library.shifted;rows=[];state={}
def shifted(self,inst,root,layer,rri,src,semis,maxlen):
 key=(inst,root,layer,rri,semis);cached=key in self.cache
 x=orig(self,inst,root,layer,rri,src,semis,maxlen)
 if inst in ('clarinet','flute','violas','cellos'):
  e=state['event'];needed=round((e['dur']+L.SPEC[inst]['release'])*L.SR)
  rows.append({'song':state['song'],'instrument':inst,'midi':e['midi'],'time':e['t'],'dur':e['dur'],'sourceSeconds':round(len(src)/L.SR,3),'shiftedSeconds':round(len(x)/L.SR,3),'cached':cached,'extends':len(x)<needed,'cacheTruncation':cached and len(x)<needed and len(src)/2**(semis/12)>=needed,'sourceMidi':root,'semitones':semis})
 return x
L.Library.shifted=shifted;lib=L.Library();scores=json.loads((repo/'prototypes/bgm-v6-20261114/scores-v6.json').read_text())
for s in scores[:4]:
 state['song']=s['id'];V.V4._soft['db']=V.V4.SOFTEN.get(s['id'],V.V4.SOFTEN_FAMILY.get(s['family'],0.))
 for e in V.V4.performed(s)['events']:
  state['event']=e;lib.note(e['instrument'],e['midi'],e['dur'],e['vel'],e.get('layer',1))
summary={}
for inst in ('clarinet','flute','violas','cellos'):
 rr=[r for r in rows if r['instrument']==inst];summary[inst]={'notes':len(rr),'loopExtendedNotes':sum(r['extends'] for r in rr),'avoidableCacheLoops':sum(r['cacheTruncation'] for r in rr),'maxTranspositionSemitones':max(abs(r['semitones']) for r in rr),'scoreMidiRange':[min(r['midi'] for r in rr),max(r['midi'] for r in rr)]}
output={'summary':summary,'notes':rows};(repo/'prototypes/bgm-v7-20261114/source-audit.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n');print(json.dumps(summary,indent=2))

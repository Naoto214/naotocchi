from pathlib import Path
import json
P=Path(__file__).resolve().parent;c=json.loads((P/'catalog.json').read_text())
outs={'fixture.plate.hold','fixture.plate.weight','fixture.latch','fixture.sequence','fixture.phase','fixture.toggle'}
ins={'fixture.door','fixture.platform','fixture.signalLamp'}
for e in c['entries']:
 id=e['id'];ports=[]
 if id in outs:ports.append({'id':'signal','direction':'out','type':'boolean'})
 if id in ins:ports.append({'id':'enable','direction':'in','type':'boolean'})
 if id=='fixture.phase':ports.append({'id':'phase','direction':'out','type':'phase'})
 if e['kind']=='npc':ports=[{'id':'ready','direction':'in','type':'boolean'},{'id':'helped','direction':'out','type':'event'}]
 e['ports']=ports;e['connectivity']['ports']=ports
 e['visualConnectionKey']=id if e['connectivity']['mask'] else None
 e['effectGroupPolicy']='explicit-group-id' if e['connectivity']['family'] in ['water','air','rail'] else 'none'
 e['requiresTerrain']='terrain.water' if id in ['field.current','field.wave','field.bubble'] else None
 e['exclusiveSlot']='field' if e['layer']=='field' else e['layer']
 e['parameterContract']={'orientation':{'enum':['N','E','S','W']}} if id in ['field.wind','field.current','fixture.oneway'] else {}
 if id in ['fixture.gate','fixture.plate.weight','fixture.exit']:e['parameterContract']={'exact':{'type':'integer','minimum':1,'maximum':8},'min':{'type':'integer','minimum':1,'maximum':8},'max':{'type':'integer','minimum':1,'maximum':8}}
(P/'catalog.json').write_text(json.dumps(c,ensure_ascii=False,indent=2))
s=json.loads((P/'stage.schema.json').read_text());p=s['properties'];p['board']['properties']['gravity']={'type':'boolean'};p['board']['required']=list(dict.fromkeys(p['board']['required']+['gravity']))
def obj(props):return {'type':'object','required':list(props),'properties':props,'additionalProperties':False}
def arr(item,maxn=64):return {'type':'array','maxItems':maxn,'items':item}
string={'type':'string','maxLength':80};pos={'type':'integer','minimum':0,'maximum':7}
p['routes']=arr(obj({'id':string,'cells':arr(obj({'x':pos,'y':pos})), 'mode':{'enum':['one-shot','ping-pong']}}))
p['effectGroups']=arr(obj({'id':string,'memberIds':arr(string),'routeId':string,'phaseOffsets':arr({'type':'integer','minimum':0,'maximum':63}),'periodTurns':{'type':'integer','minimum':2,'maximum':16}}))
p['logicNodes']=arr(obj({'id':string,'op':{'enum':['AND','OR','NOT']},'inputCount':{'type':'integer','minimum':1,'maximum':4}}))
p['links']['items']=obj({'from':string,'fromPort':string,'to':string,'toPort':string,'type':{'enum':['boolean','event','phase']}})
s['required']=list(dict.fromkeys(s['required']+['routes','effectGroups','logicNodes']));(P/'stage.schema.json').write_text(json.dumps(s,ensure_ascii=False,indent=2))
e=json.loads((P/'stage-example.json').read_text());e['board']['gravity']=False;e.update(routes=[],effectGroups=[],logicNodes=[]);(P/'stage-example.json').write_text(json.dumps(e,ensure_ascii=False,indent=2))

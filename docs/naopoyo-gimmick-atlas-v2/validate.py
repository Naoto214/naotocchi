"""Design-contract checks, not a production editor or a solver."""
import json, copy, unittest
from pathlib import Path
P=Path(__file__).resolve().parent
load=lambda name:json.loads((P/name).read_text())
C=load('catalog.json'); D=load('candidates.json'); REG={e['id']:e for e in C['entries']}
def validate(s):
 assert s['board']=={'width':8,'height':8,'gravity':s['board']['gravity']} and isinstance(s['board']['gravity'],bool)
 assert 1<=len(s['startActors'])<=7
 nodes={}; occupied=set(); grounds={(i['x'],i['y']):i['catalogId'] for i in s['instances'] if i['layer']=='medium'}
 for i in s['instances']:
  assert i['instanceId'] not in nodes
  e=REG[i['catalogId']]; assert e['editor']['eligible'] and e['implementation']!='保留'
  assert i['layer']==e['layer'] and 0<=i['x']<8 and 0<=i['y']<8
  slot=(i['x'],i['y'],e['exclusiveSlot']); assert slot not in occupied;occupied.add(slot)
  if e['requiresTerrain']:assert grounds.get((i['x'],i['y']))==e['requiresTerrain']
  nodes[i['instanceId']]=e['ports']
 for a in s['startActors']:assert 0<=a['x']<8 and 0<=a['y']<8 and a['species']=='dog' and 1<=a['level']<=8
 for n in s['logicNodes']:
  assert n['id'] not in nodes and n['op'] in ['AND','OR','NOT'] and 1<=n['inputCount']<=4
  assert n['op']!='NOT' or n['inputCount']==1
  nodes[n['id']]=[{'id':f'in{i}','direction':'in','type':'boolean'} for i in range(n['inputCount'])]+[{'id':'out','direction':'out','type':'boolean'}]
 edges={k:[] for k in nodes}
 for link in s['links']:
  for side,direction in [('from','out'),('to','in')]:
   assert any(p['id']==link[side+'Port'] and p['direction']==direction and p['type']==link['type'] for p in nodes[link[side]])
  edges[link['from']].append(link['to'])
 def visit(n,path):
  assert n not in path
  for target in edges[n]:visit(target,path|{n})
 for n in nodes:visit(n,set())
 ids={i['instanceId']:i for i in s['instances']}
 assert s['exits'] and all(ids[x]['catalogId']=='fixture.exit' for x in s['exits'])
 routes={r['id']:r for r in s['routes']};assert len(routes)==len(s['routes'])
 for r in routes.values():
  assert r['cells'] and all(0<=p['x']<8 and 0<=p['y']<8 for p in r['cells'])
  assert all(abs(a['x']-b['x'])+abs(a['y']-b['y'])==1 for a,b in zip(r['cells'],r['cells'][1:]))
 for g in s['effectGroups']:
  assert g['routeId'] in routes and all(x in ids for x in g['memberIds'])
  assert len(g['memberIds'])==len(g['phaseOffsets']) and all(0<=v<g['periodTurns'] for v in g['phaseOffsets'])
 return True
class ContractTests(unittest.TestCase):
 def test_registry(self):
  self.assertEqual(len(REG),45);self.assertEqual(len(C['abilities']),2)
  self.assertEqual(len(D['items']),64);self.assertEqual([sum(x['decision']==v for x in D['items']) for v in ['推奨','保留','不採用']],[41,16,7])
  self.assertEqual([sum(x['designClass'].startswith(v) for x in D['items']) for v in 'ABC'],[8,11,45])
  ids={x['id'] for x in D['items']}
  for e in REG.values():
   self.assertTrue(set(e['candidates'])<=ids);self.assertEqual(e['footprint'],[1,1]);self.assertEqual(e['discovery']['dedupe'],'catalogId')
 def test_plan(self):
  self.assertEqual([s['number'] for s in D['stages']],list(range(1,101)))
  old=json.loads((P.parent/'naopoyo-gimmick-atlas-v1/atlas.json').read_text())
  for a,b in zip(D['stages'][:10],old['stages'][:10]):
   for key in b:self.assertEqual(a[key],b[key])
  ids={x['id'] for x in D['items']}
  for s in D['stages']:self.assertTrue({s['main'],*s['support']}<=ids)
 def test_valid_fixture(self):self.assertTrue(validate(load('stage-example.json')))
 def test_invalid_fixtures(self):
  fixtures=[];s=load('stage-example.json');s['instances'][0]['x']=8;fixtures.append(s)
  s=load('stage-example.json');s['startActors']*=8;fixtures.append(s)
  s=load('stage-example.json');s['instances'].append(copy.deepcopy(s['instances'][0]));fixtures.append(s)
  s=load('stage-example.json');s['instances'][0]['catalogId']='vehicle.boat';fixtures.append(s)
  s=load('stage-example.json');s['instances'][0].update(catalogId='field.wave',layer='field');fixtures.append(s)
  s=load('stage-example.json');s['links']=[dict(fromPort='enable',toPort='enable',type='boolean',**{'from':'exit-a','to':'floor-a'})];fixtures.append(s)
  s=load('stage-example.json');s['logicNodes']=[dict(id='n',op='NOT',inputCount=1)];s['links']=[dict(fromPort='out',toPort='in0',type='boolean',**{'from':'n','to':'n'})];fixtures.append(s)
  s=load('stage-example.json');s['exits']=['floor-a'];fixtures.append(s)
  for s in fixtures:
   with self.subTest(s=s):
    with self.assertRaises((AssertionError,KeyError)):validate(s)
if __name__=='__main__':unittest.main(verbosity=2)

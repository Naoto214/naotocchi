import copy,gzip,json,unittest
from unittest.mock import patch
from pathlib import Path
try:import proxy_public_declaration_prefix as subject
except ModuleNotFoundError:subject=None
from proxy_public_main_prefix import refine_outcomes as previous
class DeclarationTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.root=Path(__file__).resolve().parents[1];cls.rows=json.loads(gzip.decompress((cls.root/'data/proxy-equivalence-pilot-447/shadow.json.gz').read_bytes()))['rows']
 def setUp(self):self.assertIsNotNone(subject,'declaration prefix absent')
 def test_all_remaining_prefixes_preserve_unknowns(self):
  count={'challenge':0,'place_partner':0,'place_companion':0}
  for row in self.rows:
   x=row['input'];before=copy.deepcopy(x);old=previous(x);new=subject.refine_outcomes(x);actions={a['candidate_id']:a for a in x['actions']}
   for a,b in zip(old,new):
    if 'generator_unsupported' not in a['unknowns']:self.assertEqual(a,b);continue
    kind=actions[b['candidate_id']]['action_type'];count[kind]+=1;self.assertNotIn('generator_unsupported',b['unknowns']);self.assertTrue(b['unknowns']);self.assertTrue(any(z['zone'] in ('challenge','pending_action') for z in b['atoms']))
   self.assertEqual(x,before)
  self.assertEqual(count,{'challenge':146,'place_partner':4,'place_companion':2})
 def test_challenge_keeps_participants_parameter_and_no_reward(self):
  x=next(r['input'] for r in self.rows if any(a['action_type']=='challenge' for a in r['input']['actions']));a=next(a for a in x['actions'] if a['action_type']=='challenge');v,battle=subject.challenge_declaration(x['view'],a)
  self.assertEqual(v['public'],x['view']['public']);self.assertEqual(v['runtime'],x['view']['runtime']);self.assertTrue(v['rights'][v['actor']]['challenge_used']);self.assertEqual(battle['parameter'],a['candidate_variant']);self.assertIsNone(battle['result']);self.assertEqual(v['control']['return_target'],'challenge_comparison')
 def test_false_immediate_reward_is_error(self):
  x=copy.deepcopy(next(r['input'] for r in self.rows if any(a['action_type']=='challenge' for a in r['input']['actions'])));a=next(a for a in x['actions'] if a['action_type']=='challenge');score=next(s for s in x['baseline_problem']['candidates'] if s['candidate_id']==a['candidate_id']);score['certain_growth_difference']=5
  with self.assertRaises(ValueError):subject.refine_outcomes(x)
 def test_person_arrival_not_safe_or_resolved(self):
  x=next(r['input'] for r in self.rows if r['group']=='legacy_unsupported' and any(a['action_type']=='place_partner' for a in r['input']['actions']));o=next(o for o in subject.refine_outcomes(x) if any(a['candidate_id']==o['candidate_id'] and a['action_type']=='place_partner' for a in x['actions']))
  self.assertIn('unresolved_arrival_or_departure',o['unknowns']);self.assertEqual(o['boundary']['prefix_stage'],'atomic_public_person_placement_before_arrival');self.assertTrue(any(z['zone']=='pending_action' for z in o['atoms']))
 def test_changed_challenge_contract_is_rejected(self):
  x=next(r['input'] for r in self.rows if any(a['action_type']=='challenge' for a in r['input']['actions']))
  original=Path.read_bytes
  def changed(path):
   data=original(path)
   return data+b'changed' if path.name=='65-challenge-participants-and-resolution.md' else data
  with patch.object(Path,'read_bytes',changed):
   with self.assertRaises(ValueError):subject.refine_outcomes(x)
 def test_mismatched_turn_owner_is_rejected(self):
  x=copy.deepcopy(next(r['input'] for r in self.rows if any(a['action_type']=='challenge' for a in r['input']['actions'])))
  x['view']['control']['turn_player']='B' if x['view']['actor']=='A' else 'A'
  with self.assertRaises(ValueError):subject.refine_outcomes(x)
 def test_saved_challenge_declarations_match_engine(self):
  checked=0;run_count=0
  files=list((self.root/'data/proxy-equivalence-pilot-447/trajectories').glob('probe-*.json.gz'))
  self.assertEqual({p.name for p in files},{f'probe-{n:02d}-{side}-first.json.gz' for n in (1,2) for side in ('a','b')})
  for p in files:
   for r in json.loads(gzip.decompress(p.read_bytes()))['rows']:
    run_count+=1;run=r['run'];shots={s['event_seq']:s for s in run['snapshots']}
    for e in run['events']:
     if e['action_type']!='challenge_declared':continue
     from proxy_equivalence_inputs import project_equivalence_view
     before=shots[e['seq']-1];after=shots[e['seq']];v=project_equivalence_view(before,e['actor'],[z for z in run['events'] if z['seq']<e['seq']]);v,b=subject.challenge_declaration(v,{'candidate_variant':e['parameter']});c=after['legacy_continuation']
     self.assertEqual(b,c['game_state']['challenge']);self.assertEqual(v['control']['phase'],c['game_state']['phase']);self.assertEqual(v['control']['response_context'],c['response_context']);self.assertEqual(v['control']['return_target'],c['return_target']);checked+=1
  self.assertEqual(run_count,12);self.assertEqual(checked,58)

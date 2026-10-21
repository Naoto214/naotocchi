import copy,gzip,json,unittest
from pathlib import Path
try:
 import proxy_public_relationship_prefix as subject
except ModuleNotFoundError:subject=None
class RelationshipPrefixTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.rows=json.loads(gzip.decompress((Path(__file__).resolve().parents[1]/'data/proxy-equivalence-pilot-447/shadow.json.gz').read_bytes()))['rows']
 def setUp(self):self.assertIsNotNone(subject,'public relationship prefix absent')
 def test_source_bound_stages_payment_rights_and_response(self):
  seen=set()
  for row in self.rows:
   x=row['input'];actions=[a for a in x['actions'] if a['action_type']=='relationship']
   if not actions:continue
   stage=x['view']['public']['own_board']['partner_stage']
   if stage in seen:continue
   seen.add(stage);a=actions[0];r=subject.refine_outcomes(x);o=next(o for o in r if o['candidate_id']==a['candidate_id']);actor=x['view']['actor'];atoms=o['atoms']
   self.assertNotIn('generator_unsupported',o['unknowns']);self.assertIn('unresolved_response',o['unknowns'])
   self.assertEqual(next(z for z in atoms if z['zone']=='own_board.partner_stage')['value'],'married' if stage==3 else stage+1)
   self.assertEqual(next(z for z in atoms if z['zone']=='time' and z['owner']==actor)['value'],x['view']['public']['time'][actor]-1)
   self.assertTrue(next(z for z in atoms if z['zone']=='rights' and z['owner']==actor)['value']['relationship_progressed'])
   self.assertEqual(next(z for z in atoms if z['zone']=='growth' and z['owner']==actor)['value'],x['view']['public']['growth'][actor]+(10 if stage==3 else 0))
   self.assertEqual(o['boundary']['phase'],'post_placement_response');self.assertEqual(o['boundary']['return_target'],'normal_action_opportunity')
   self.assertEqual(next(z for z in atoms if z['zone']=='history')['value'][-1]['action_type'],'relationship_marriage' if stage==3 else 'relationship_progress')
  self.assertEqual(seen,{0,1,2,3})
 def test_other_candidates_and_input_unchanged(self):
  from proxy_equivalence_outcomes import derive_outcomes
  x=next(r['input'] for r in self.rows if any(a['action_type']=='relationship' for a in r['input']['actions']));before=copy.deepcopy(x);old=derive_outcomes(x);new=subject.refine_outcomes(x)
  ids={a['candidate_id'] for a in x['actions'] if a['action_type']=='relationship'}
  self.assertEqual([o for o in old if o['candidate_id'] not in ids],[o for o in new if o['candidate_id'] not in ids]);self.assertEqual(x,before)
 def test_invalid_source_input_is_not_fallback(self):
  x=copy.deepcopy(next(r['input'] for r in self.rows if any(a['action_type']=='relationship' for a in r['input']['actions'])));x['source_manifest']['01-core-rules.md']='0'*64
  with self.assertRaises(ValueError):subject.refine_outcomes(x)

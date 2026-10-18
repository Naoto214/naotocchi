import copy,gzip,json,unittest
from pathlib import Path
try:
 import proxy_public_main_prefix as subject
except ModuleNotFoundError:subject=None
from proxy_resource_value_selection import canonical_sha256 as sha
class MainPrefixTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.rows=json.loads(gzip.decompress((Path(__file__).resolve().parents[1]/'data/proxy-equivalence-pilot-447/shadow.json.gz').read_bytes()))['rows']
 def setUp(self):self.assertIsNotNone(subject,'public main prefix absent')
 def examples(self):
  for r in self.rows:
   x=r['input']
   if x['view']['public']['own_board']['main']:
    for a in x['actions']:
     if a['action_type']=='play_main':yield x,a
 def test_replacements_preserve_physical_cards_and_unresolved_tails(self):
  count=0;equipment=0
  for x,a in self.examples():
   old=copy.deepcopy(x);v=x['view'];actor=v['actor'];main=v['public']['own_board']['main'];out=next(o for o in subject.refine_outcomes(x) if o['candidate_id']==a['candidate_id']);atoms=out['atoms'];count+=1
   self.assertNotIn('generator_unsupported',out['unknowns']);self.assertIn('unresolved_arrival_or_departure',out['unknowns'])
   self.assertEqual(next(z for z in atoms if z['zone']=='own_board.main')['identity'],a['source_instance_id'])
   discarded=[z['identity'] for z in atoms if z['zone']=='discard' and z['owner']==actor]
   self.assertEqual(discarded[-1],main['instance_id'])
   for sid,link in v['runtime']['attachments'].items():
    if link['target_instance_id']==main['instance_id']:
     equipment+=1;self.assertIn(sid,discarded);self.assertFalse(any(z['zone']=='attachments' and z['identity']==sid for z in atoms))
   self.assertFalse(any(z['zone']=='own_hand' and z['identity']==a['source_instance_id'] for z in atoms))
   self.assertEqual(next(z for z in atoms if z['zone']=='history')['value'][-1]['action_type'],'main_movement')
   self.assertTrue(any(z['zone']=='pending_action' for z in atoms));self.assertEqual(x,old)
  self.assertEqual(count,59);self.assertEqual(equipment,16)
 def test_non_main_candidates_unchanged(self):
  from proxy_public_relationship_prefix import refine_outcomes
  x,a=next(self.examples());ids={a['candidate_id'] for a in x['actions'] if a['action_type']=='play_main'}
  self.assertEqual([o for o in subject.refine_outcomes(x) if o['candidate_id'] not in ids],[o for o in refine_outcomes(x) if o['candidate_id'] not in ids])
 def test_effect_departure_is_target_bound_not_source_bound(self):
  x,a=next(self.examples());v=copy.deepcopy(x['view']);main=v['public']['own_board']['main']['instance_id'];other=v['public']['opponent_board']['main']['instance_id']
  # Pure public movement helper: these distinct target/source relationships
  # exercise the existing batch transition's target-based lifetime operation.
  for key in ('stat_effects','conditional_effects'):
   v['runtime'][key]=[{'effect_id':'departed','target_instance_id':main,'source_instance_id':other},{'effect_id':'survives','target_instance_id':other,'source_instance_id':main}]
  result=subject.move_public_main(v,a,1,[])
  for key in ('stat_effects','conditional_effects'):self.assertEqual(result['runtime'][key],[v['runtime'][key][1]])
  self.assertEqual(result['rights'],v['rights']);self.assertEqual(result['runtime']['ability_uses'],v['runtime']['ability_uses'])
 def test_payment_consumption_exact_ids(self):
  x,a=next(self.examples());v=copy.deepcopy(x['view']);v['runtime']['payment_effects']=[{'effect_id':'used'},{'effect_id':'kept'}]
  after=subject.move_public_main(v,a,1,['used']);self.assertEqual(after['runtime']['payment_effects'],[{'effect_id':'kept'}])
 def test_bad_payment_evidence_is_error(self):
  x,a=next(self.examples());x=copy.deepcopy(x);a=next(t for t in x['actions'] if t['candidate_id']==a['candidate_id']);a['evidence']['payment_effect_ids']=['invented']
  with self.assertRaises(ValueError):subject.refine_outcomes(x)
 def test_ambiguous_multi_equipment_order_keeps_unsupported(self):
  x,a=next(self.examples());v=copy.deepcopy(x['view']);main=v['public']['own_board']['main']['instance_id'];v['runtime']['attachments']={'first':{'target_instance_id':main},'second':{'target_instance_id':main}}
  self.assertIsNone(subject.move_public_main(v,a,1,[]))

 def test_public_movement_matches_saved_engine_snapshots(self):
  from proxy_equivalence_inputs import project_equivalence_view
  root=Path(__file__).resolve().parents[1]/'data/proxy-equivalence-pilot-447/trajectories';checked=0
  for path in sorted(root.glob('probe-*.json.gz')):
   for row in json.loads(gzip.decompress(path.read_bytes()))['rows']:
    run=row['run'];snapshots={s['event_seq']:s for s in run['snapshots']}
    for event in run['events']:
     if event['action_type']!='main_movement':continue
     seq=event['seq'];before=snapshots.get(seq-1);after=snapshots.get(seq)
     if before is None or after is None:continue
     actor=event['actor'];history=[e for e in run['events'] if e['seq']<seq]
     v=project_equivalence_view(before,actor,history);expected=project_equivalence_view(after,actor,history+[event])
     if not v['public']['own_board']['main']:continue
     actual=subject.move_public_main(v,{'source_instance_id':event['source_instance_id']},event['payment_time'],event.get('payment_effect_ids',[]))
     if actual is None:continue
     for key in ('public','runtime','rights','egg_state'):self.assertEqual(actual[key],expected[key],(run['run_id'],seq,key))
     checked+=1
  self.assertGreater(checked,0)

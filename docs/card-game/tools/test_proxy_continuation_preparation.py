import copy,gzip,json,unittest
from pathlib import Path
import proxy_continuation_batch as batch
import proxy_continuation_candidates as candidates
import proxy_continuation_state as state
import proxy_continuation_actions as actions
try: import proxy_continuation_preparation as preparation
except ImportError: preparation=None

class PreparationTests(unittest.TestCase):
 def setUp(self):
  self.assertIsNotNone(preparation)
  rs=json.loads(gzip.decompress((Path(__file__).resolve().parents[1]/'data/proxy-continuation-world-438/paired.json.gz').read_bytes()))['results']
  self.e=copy.deepcopy(rs[1]['final_envelope']);self.history=rs[1]['events']
  g=self.e['legacy_continuation']['game_state'];p=g['players'][g['turn_player']];p['time']=3
  if not any(g['cards'][s]['card_id']=='I-poop1' for s in p['hand']):
   s=next(s for s in p['deck'] if g['cards'][s]['card_id']=='I-poop1');p['deck'].remove(s);p['hand'].append(s)
 def test_set_has_atomic_payment_metadata_and_full_hashes(self):
  with batch.scope(),preparation.scope():
   inv=candidates.audit(self.e,self.history);a=next(a for a in inv['legal_candidate_details'] if a['action_type']=='set_item')
   before=copy.deepcopy(self.e);after,events=preparation.set_card(self.e,a)
  actor=before['legacy_continuation']['game_state']['turn_player'];p=after['legacy_continuation']['game_state']['players'][actor];s=a['source_instance_id']
  self.assertEqual(p['time'],before['legacy_continuation']['game_state']['players'][actor]['time']-a['evidence']['payment_time'])
  self.assertIn(s,p['board']['prepared']);self.assertNotIn(s,p['hand']);self.assertFalse(after['runtime']['public_prepared'][s]['face_up'])
  self.assertEqual(events[0]['envelope_after_sha256'],state.state_hash(after));self.assertEqual(self.e,before)
 def test_opponent_concealed_identity_does_not_change_normal_inventory(self):
  with batch.scope(),preparation.scope():
   a=next(a for a in candidates.audit(self.e,self.history)['legal_candidate_details'] if a['action_type']=='set_item');after,events=preparation.set_card(self.e,a)
   g=after['legacy_continuation']['game_state'];owner=g['turn_player'];g['turn_player']='B' if owner=='A' else 'A';g['phase']='normal_action'
   one=candidates.audit(after,[]);two=copy.deepcopy(after);two['legacy_continuation']['game_state']['cards'][a['source_instance_id']]['card_id']='I-bond1'
   other=candidates.audit(two,[])
   self.assertEqual(one,other)
if __name__=='__main__':unittest.main()

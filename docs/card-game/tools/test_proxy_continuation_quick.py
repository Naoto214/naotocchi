import copy,gzip,json,unittest
from pathlib import Path
import proxy_continuation_state as state
import proxy_resource_value_trajectory as old
try:import proxy_continuation_quick as quick
except ImportError:quick=None

class QuickTests(unittest.TestCase):
 def setUp(self):
  self.assertIsNotNone(quick)
  r=json.loads(gzip.decompress((Path(__file__).resolve().parents[1]/'data/proxy-continuation-world-438/paired.json.gz').read_bytes()))['results'][5]
  self.e=copy.deepcopy(r['final_envelope']);self.history=copy.deepcopy(r['events']);g=self.e['legacy_continuation']['game_state'];p=g['players']['B'];g['round']=10;p['time']=2
  self.source=next(s for s in p['deck'] if g['cards'][s]['card_id']=='E-final-time');p['deck'].remove(self.source);p['hand'].append(self.source)
  self.history[-1]['game_state_after_sha256']=old.start.opening._stop_state_sha256(g);self.history[-1]['continuation_state_after_sha256']=old.start._hash(state.current(self.e))
 def test_concealed_trap_is_not_cost_three_equipment_target(self):
  c=state.current(self.e);g=c['game_state'];p=g['players']['B'];trap=next(s for s in p['deck'] if g['cards'][s]['card_id']=='I-poop1');p['deck'].remove(trap);p['board']['prepared'].append(trap)
  asteroid=next(s for s in p['deck'] if g['cards'][s]['card_id']=='G-asteroids-classic')
  details,reason=quick.hand_candidates(c,self.history,'B',asteroid,old.start.load_candidate_rows()['G-asteroids-classic'])
  self.assertEqual(details,[]);self.assertEqual(reason['reason_code'],'required_public_equipment_target_absent')
 def test_final_time_all_nonmain_discard_targets(self):
  details,reason=quick.hand_candidates(state.current(self.e),self.history,'B',self.source,old.start.load_candidate_rows()['E-final-time'])
  g=self.e['legacy_continuation']['game_state'];p=g['players']['B'];expected={s for s in p['discard'] if not g['cards'][s]['card_id'].startswith('M-')}
  self.assertEqual({d['target_instance_ids'][0] for d in details},expected);self.assertEqual(reason['reason_code'],'enumerated_targeted_quick_action')
 def test_same_name_limit_resets_when_opponent_turn_starts(self):
  c=state.current(self.e);seq=self.history[-1]['seq']
  history=self.history+[dict(seq=seq+1,actor='B',action_type='activate_response',source_instance_id=self.source),dict(seq=seq+2,actor='A',action_type='turn_start_and_normal_draw')]
  details,reason=quick.hand_candidates(c,history,'B',self.source,old.start.load_candidate_rows()['E-final-time'])
  self.assertNotEqual(reason['reason_code'],'same_name_used_this_turn')
 def test_same_name_use_during_actors_turn_excludes_every_copy(self):
  c=state.current(self.e);seq=self.history[-1]['seq']
  history=self.history+[dict(seq=seq+1,actor='B',action_type='activate_response',source_instance_id=self.source)]
  details,reason=quick.hand_candidates(c,history,'B',self.source,old.start.load_candidate_rows()['E-final-time'])
  self.assertEqual(details,[]);self.assertEqual(reason['reason_code'],'same_name_used_this_turn')

if __name__=='__main__':unittest.main()

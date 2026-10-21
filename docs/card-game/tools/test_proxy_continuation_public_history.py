import unittest,gzip,json
from pathlib import Path
try:import proxy_continuation_public_history as public
except ImportError:public=None
class PublicHistoryTests(unittest.TestCase):
 def setUp(self):
  self.assertIsNotNone(public)
  self.g=json.loads(gzip.decompress((Path(__file__).resolve().parents[1]/'data/proxy-continuation-world-438/paired.json.gz').read_bytes()))['results'][1]['final_envelope']['legacy_continuation']['game_state']
 def source(self,card,actor):return next(s for s,c in self.g['cards'].items() if s.startswith(actor+'-') and c['card_id']==card)
 def test_public_continuous_application_requires_both_worlds_and_main(self):
  events=[dict(seq=1,actor='A',action_type='turn_start_and_normal_draw'),dict(seq=2,actor='A',action_type='main_movement',source_instance_id=self.source('M-antlion-04','A')),dict(seq=3,actor='A',action_type='person_placement',source_instance_id=self.source('C-chameleon','A')),dict(seq=4,actor='A',action_type='place_world',source_instance_id=self.source('W-city','A'))]
  self.assertFalse(public.companion_applied(self.g,events,'A')['condition_met'])
  events.append(dict(seq=5,actor='B',action_type='place_world',source_instance_id=self.source('W-deepsea','B')))
  self.assertTrue(public.companion_applied(self.g,events,'A')['condition_met'])
 def test_public_history_drops_opponent_private_draw_and_bottom_ids(self):
  e=dict(seq=4,actor='B',action_type='resolve_event',source_instance_id='B-039#1',result=dict(drawn_instance_ids=['secret'],hand_bottom_instance_id='secret2'))
  result=public.event_projection(e,'A')
  self.assertNotIn('secret',str(result));self.assertNotIn('secret2',str(result))
if __name__=='__main__':unittest.main()

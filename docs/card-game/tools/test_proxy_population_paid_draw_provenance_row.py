"""The paid-draw activation provenance row names its card like every other six-stage row."""
import unittest
from unittest.mock import patch
from test_proxy_population_paid_draw import fixture
from test_proxy_population_runtime import initial
import proxy_population_runtime as base
import proxy_population_paid_draw as api
import proxy_continuation_state as state
import proxy_continuation_triggers as triggers
import proxy_continuation_end as end


class PaidDrawProvenanceRowTests(unittest.TestCase):
 def test_activation_row_carries_card_id_for_the_frozen_registry(self):
  def run(forced):
   import proxy_continuation_candidates as candidates
   e,s,costs=fixture('M-antlion-02');e['legacy_continuation']['game_state']['phase']='normal_action'
   with patch.object(end,'verify_new_events',return_value=[]):
    with api.scope():
     action=next(a for a in candidates.audit(e,[])['legal_candidate_details'] if a['action_type']=='activate_main_ability');after,events=api.activate_normal(e,action,[])
     raw={k:v for k,v in events[0].items() if k not in end.BIND_KEYS};self.assertEqual(raw['action_type'],'activate_main_ability')
     proofs=end.verify_new_events([raw],[],[e,after])
   self.assertEqual([(p['event_seq'],p['kind'],p.get('card_id'),p['certain_growth_difference'],p['duration']) for p in proofs],[(raw['seq'],'paid_draw_activation','M-antlion-02',0,'activation_until_resolution')])
   # The frozen end_scope registry is keyed by kind and card_id (group-081-A-first stopped with KeyError 'card_id').
   registry={}
   for p in proofs:registry.setdefault(p['kind'],{})[p['card_id']]=dict(growth_delta=p['certain_growth_difference'],duration=p['duration'],reference=p['source_reference'])
   self.assertIn('M-antlion-02',registry['paid_draw_activation'])
   return {}
  base.operation(initial(),run)


if __name__=='__main__':unittest.main()

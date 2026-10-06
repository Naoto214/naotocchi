"""Historical115/zero-root conditional prefix; no new match or input lock."""
import copy,unittest
from test_proxy_mandatory_population_input import bundle
import proxy_population_connected_entry as connected
import proxy_continuation_payments as payments
try:import proxy_population_automatic_binding as api
except ImportError:api=None

class AutomaticBindingTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.record=connected.reconstruct(bundle(),'test-1A',16)
 def check(self,step):
  with payments.scope():return api.audit_step(step)
 def test_resolution_and_next_turn_bind_all_outputs(self):
  self.assertIsNotNone(api)
  rows=[s for s in self.record['runtime']['steps'] if s['forced_record'] is not None]
  self.assertGreaterEqual(len(rows),2)
  self.assertTrue(any(len(s['events'])>1 for s in rows))
  for s in rows:
   proof=self.check(s)
   self.assertTrue(proof['automatic_output_binding_verified'],proof['errors'])
   self.assertFalse(proof['effect_semantics_proven']);self.assertFalse(proof['all_rule_opportunities_proven'])
   for mutate in (
    lambda b:b['forced_record']['new_events'][0].update(action_type='forged'),
    lambda b:b['forced_record']['new_snapshots'].pop(),
    lambda b:b['forced_record'].update(new_decisions=[{}]),
    lambda b:b['forced_record'].update(last_valid_event_seq=True),
    lambda b:b['forced_record'].update(completed=0),
    lambda b:b['forced_record']['final_continuation_state']['game_state'].update(round=99),
    lambda b:b['events'][0].update(envelope_before_sha256='0'*64),
    lambda b:b.update(result={'winner':'A'}),
    lambda b:b.update(final_envelope=copy.deepcopy(b['source_envelope']))):
    bad=copy.deepcopy(s);mutate(bad)
    self.assertFalse(self.check(bad)['automatic_output_binding_verified'])
 def test_ordinary_entry_cannot_be_relabelled_automatic(self):
  self.assertIsNotNone(api)
  s=copy.deepcopy(next(s for s in self.record['runtime']['steps'] if s['decision'] is not None))
  s['decision']=None;s['forced_record']={}
  self.assertFalse(self.check(s)['automatic_output_binding_verified'])
 def test_rehashed_runtime_cannot_diverge_from_native_snapshots(self):
  import proxy_continuation_actions as actions
  from proxy_population_runtime import BIND_KEYS
  original=next(s for s in self.record['runtime']['steps'] if s['forced_record'] is not None and not s['forced_record'].get('new_envelopes'))
  bad=copy.deepcopy(original);prior=bad['source_envelope']
  with payments.scope():
   for event,after in zip(bad['events'],bad['envelopes']):
    g=after['legacy_continuation']['game_state']
    after['runtime']['ability_uses'].append(dict(source_instance_id=next(iter(g['cards'])),ability_key='forged-runtime-use',turn_player=g['turn_player'],round=g['round'],count=1))
    raw={k:v for k,v in event.items() if k not in BIND_KEYS}
    rebound=actions.bind_event(prior,after,raw);event.clear();event.update(rebound);prior=after
   bad['final_envelope']=copy.deepcopy(prior)
   self.assertFalse(api.audit_step(bad)['automatic_output_binding_verified'])
 def test_connected_resolution_steps_bind_top_link_order(self):
  steps=[s for s in self.record['runtime']['steps'] if s['source_envelope']['legacy_continuation']['response_context']['chain_status']=='resolving']
  self.assertTrue(steps)
  for step in steps:self.assertTrue(step['resolution_order_audit']['resolution_order_verified'])
 def test_connected_entry_exports_automatic_bindings(self):
  for s in self.record['runtime']['steps']:
   if s['forced_record'] is not None:self.assertTrue(s['automatic_output_binding']['automatic_output_binding_verified'])
if __name__=='__main__':unittest.main()

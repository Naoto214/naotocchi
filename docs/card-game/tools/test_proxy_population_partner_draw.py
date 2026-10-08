"""06/93 unresolved partner suppression via current actual forced dispatch."""
import copy,unittest
from unittest.mock import patch
from test_proxy_population_draw_effects import actual
from test_proxy_population_runtime import initial
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
import proxy_population_draw_effects as audit
import proxy_continuation_triggers as triggers
import proxy_continuation_state as state
import proxy_population_boundary_response as boundary
try:import proxy_population_partner_draw as api
except ImportError:api=None


def egg(outer=False):
 b,_,_=actual('P-desert_scorpion',outer=outer);p=b['legacy_continuation']['game_state']['players']['A'];p['discard'].append(p['board']['main']);p['board']['main']=None;state.validate(b);return b

class PartnerDrawTests(unittest.TestCase):
 def test_current_forced_keeps_resolution_but_does_not_draw_while_egg(self):
  def run(forced):
   for outer in (False,True):
    b=egg(outer);before=copy.deepcopy(b);result=forced(b,initial(),[],[],[b]);event=result['new_events'][0]
    self.assertEqual(event['result']['drawn_instance_ids'],[],'06/93 forbids unresolved partner draw while egg')
    a=state.advance(b,result['new_snapshots'][0]['continuation_state'],event['seq']);proof=audit.audit(b,a,event)
    self.assertEqual(proof['errors'],[]);self.assertTrue(proof['partner_egg_suppressed']);self.assertEqual(b,before)
    self.assertEqual(a['legacy_continuation']['game_state'],b['legacy_continuation']['game_state'] if outer else dict(b['legacy_continuation']['game_state'],phase='turn_end'))
    self.assertEqual(len(a['legacy_continuation']['activation_zone']),int(outer));self.assertEqual(result['new_decisions'],[])
    if not outer:
     reopened=boundary.normalize(b,result,dict(kind='end',turn_player='A',origin_event_seq=3));a=state.advance(b,reopened['new_snapshots'][0]['continuation_state'],event['seq']);event=reopened['new_events'][0];self.assertEqual(audit.audit(b,a,event)['errors'],[])
    self.assertEqual(audit.audit(b,a,event)['errors'],[])
    bad=copy.deepcopy(a);p=bad['legacy_continuation']['game_state']['players']['A'];p['hand'].append(p['deck'].pop(0));self.assertTrue(audit.audit(b,bad,event)['errors'])
   return {}
  with connected.contract_scope():runtime.operation(initial(),run)
 def test_live_partner_still_draws_and_non_partner_draws_even_while_egg(self):
  def run(forced):
   b,a,event=actual('P-desert_scorpion');self.assertEqual(len(event['result']['drawn_instance_ids']),1);self.assertEqual(audit.audit(b,a,event)['errors'],[])
   b,a,event=actual('M-antlion-02',departed=True);self.assertEqual(len(event['result']['drawn_instance_ids']),1);self.assertEqual(audit.audit(b,a,event)['errors'],[]);return {}
  with connected.contract_scope():runtime.operation(initial(),run)
 def test_scope_and_temporary_descriptor_restore_even_on_native_failure(self):
  self.assertIsNotNone(api,'partner draw adapter absent');original=triggers.resolve;draws=triggers.DRAW_EFFECTS
  def run(forced):
   b=egg();inside=triggers.DRAW_EFFECTS
   with patch.object(triggers.old,'_snapshot',side_effect=ValueError('native probe failure')):
    with self.assertRaisesRegex(ValueError,'native probe failure'):forced(b,initial(),[],[],[b])
   self.assertIs(triggers.DRAW_EFFECTS,inside);self.assertEqual(triggers.DRAW_EFFECTS['P-desert_scorpion'],1)
   result=forced(b,initial(),[],[],[b]);self.assertEqual(result['new_events'][0]['result']['drawn_instance_ids'],[])
   raise RuntimeError('scope unwind probe')
  with self.assertRaisesRegex(RuntimeError,'scope unwind probe'):
   with connected.contract_scope():runtime.operation(initial(),run)
  self.assertIs(triggers.resolve,original);self.assertIs(triggers.DRAW_EFFECTS,draws)

if __name__=='__main__':unittest.main()

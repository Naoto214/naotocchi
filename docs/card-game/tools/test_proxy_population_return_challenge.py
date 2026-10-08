"""Real existing challenge normalization must compose with return audits."""
import copy,unittest
import test_proxy_population_return_effects as fixtures
transition=fixtures.transition
from test_proxy_population_runtime import initial
import proxy_population_return_effects as audit
import proxy_population_trigger_effects as effects
import proxy_continuation_actions as actions
import proxy_continuation_challenge as challenge
import proxy_continuation_state as state


def in_battle(b,status):
 b=copy.deepcopy(b);c=b['legacy_continuation'];g=c['game_state']
 for actor in 'AB':
  p=g['players'][actor]
  if p['board']['main'] is None:
   source=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='M-beetle-01')
   (p['hand'] if source in p['hand'] else p['deck']).remove(source);p['board']['main']=source
 g['challenge']=dict(challenge_id='challenge-1',declaring_actor=g['turn_player'],participants={o:g['players'][o]['board']['main'] for o in 'AB'},parameter='power',status='comparing',started_event_seq=1,result=None)
 c['response_context']['source_phase']='challenge_declaration';c['return_target']='challenge_comparison'
 if status=='resolved':
  # Execute the real comparison in a closed supplied boundary, then retain
  # its result/resources while supplying the already activated return link.
  closed=copy.deepcopy(b);cc=closed['legacy_continuation'];cc['activation_zone']=[];cc['response_context'].update(chain_links=[],chain_status='empty',consecutive_passes=2);cc['game_state']['phase']='challenge_comparison'
  r=challenge.compare(closed);g=r['new_envelopes'][0]['legacy_continuation']['game_state'];c['game_state']=g;b['event_seq']=r['new_events'][0]['seq'];c['response_context']['source_phase']='challenge_result';c['return_target']='challenge_end'
 state.validate(b);return b


class ReturnChallengeTests(unittest.TestCase):
 run_case=fixtures.ReturnEffectsTests.run_case
 def test_comparing_and_result_restart_and_retained_outer_link(self):
  def run():
   for card in ('C-bat','M-antlion-06'):
    for status in ('comparing','resolved'):
     for outer in (False,True):
      b,_,_,_=transition(card);b=in_battle(b,status);c=b['legacy_continuation']
      if outer:
       link=copy.deepcopy(c['activation_zone'][-1]);link['link_id']='outer-supplied-link';link.pop('activation_receipt',None);c['activation_zone'].insert(0,link);c['response_context']['chain_links'].insert(0,link['link_id'])
      result=actions.normalize_resolution_result(b,effects.resolve(b,initial()));a=result['new_envelopes'][0];event=result['new_events'][0]
      with self.subTest(card=card,status=status,outer=outer):self.assertEqual(audit.audit(b,a,event)['errors'],[])
      bad=copy.deepcopy(a);bad['legacy_continuation']['return_target']='normal_action_opportunity';self.assertTrue(audit.audit(b,bad,event)['errors'])
      if outer:
       bad=copy.deepcopy(a);bad['legacy_continuation']['activation_zone']=[];bad['legacy_continuation']['response_context']['chain_links']=[];self.assertTrue(audit.audit(b,bad,event)['errors'])
   return {}
  self.run_case(run)
 def test_malformed_boundary_does_not_authenticate_restart(self):
  import proxy_population_boundary_response as boundary
  import proxy_continuation_payments as payments
  def run():
   for card in ('C-bat','M-antlion-06'):
    b,a,event,_=transition(card);r=boundary.normalize(b,payments.forced_result(b,a,event),dict(kind='end',turn_player=b['legacy_continuation']['game_state']['turn_player'],origin_event_seq=3));a=r['new_envelopes'][0];event=r['new_events'][0]
    for descriptor in (None,[],True,dict(kind='end',turn_player=b['legacy_continuation']['game_state']['turn_player'],origin_event_seq=True)):
     self.assertTrue(audit.audit(b,a,dict(event,processing_boundary=descriptor))['errors'])
   return {}
  self.run_case(run)

if __name__=='__main__':unittest.main()

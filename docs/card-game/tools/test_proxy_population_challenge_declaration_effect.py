import copy,unittest
import test_proxy_population_payment_consumption as fixtures
import proxy_continuation_candidates as candidates
import proxy_continuation_challenge as challenge
import proxy_continuation_payments as payments
try:import proxy_population_challenge_declaration_effect as api
except ImportError:api=None

def actual(template,actor,parameter):
 b=copy.deepcopy(template);g=b['legacy_continuation']['game_state'];g['turn_player']=actor;g['players'][actor]['challenge_used']=False
 b['runtime']['payment_effects']=[]
 for owner in ('A','B'):
  for source,row in g['cards'].items():
   if source.startswith(owner+'-') and row['card_id']=='E-fateful-transform':payments.add_modifier(b,owner,source)
 c=b['legacy_continuation'];c['response_context']['turn_player']=actor;c['response_context']['priority_actor']=actor
 action=next(a for a in candidates.audit(b,[])['legal_candidate_details'] if a['action_type']=='challenge' and a['candidate_variant']==parameter)
 a,events=challenge.declare(b,action,[]);return b,a,events[0]

class ChallengeDeclarationEffectTests(unittest.TestCase):
 run_case=fixtures.ConsumptionTests.run_case
 def setUp(self):self.assertIsNotNone(api,'challenge declaration full delta absent')
 def test_both_actors_and_parameters_fix_participants_without_rewards(self):
  def run(template):
   for actor in ('A','B'):
    for parameter in ('power','wisdom'):
     b,a,event=actual(template,actor,parameter);proof=api.audit(b,a,event)
     self.assertEqual(proof['errors'],[]);self.assertTrue(proof['supplied_challenge_declaration_verified']);self.assertFalse(proof['participant_history_proven']);self.assertIsNone(proof['balance_admitted'])
   return {}
  self.run_case(run)
 def test_participant_usage_reward_cost_and_unrelated_changes_refused(self):
  def run(template):
   b,a,event=actual(template,'B','wisdom')
   for mode in ('used','opponent','growth','time','parameter','participant','source','actor','seq','typed','metadata','window','reservation','egg','already_used','nested'):
    before=copy.deepcopy(b);bad=copy.deepcopy(a);ev=copy.deepcopy(event);g=bad['legacy_continuation']['game_state'];p=g['players']['B']
    if mode=='used':p['challenge_used']=False
    elif mode=='opponent':g['players']['A']['challenge_used']=not g['players']['A']['challenge_used']
    elif mode=='growth':p['growth']+=5
    elif mode=='time':p['time']-=1
    elif mode=='parameter':ev['parameter']='other'
    elif mode=='participant':ev['participants']['A']=ev['participants']['B']
    elif mode=='source':ev['source_instance_id']=ev['participants']['A']
    elif mode=='actor':ev['actor']='A'
    elif mode=='seq':ev['seq']=True
    elif mode=='typed':bad['runtime']['payment_effects']=[]
    elif mode=='metadata':g['cards'][p['board']['main']]['card_id']='M-beetle-02'
    elif mode=='window':bad['legacy_continuation']['response_context']['priority_actor']='A'
    elif mode=='reservation':before['legacy_continuation']['game_state']['players']['B']['reservations']=[{'unknown':True}]
    elif mode=='egg':before['legacy_continuation']['game_state']['players']['A']['board']['main']=None
    elif mode=='already_used':before['legacy_continuation']['game_state']['players']['B']['challenge_used']=True
    else:before['legacy_continuation']['game_state']['challenge']=copy.deepcopy(g['challenge'])
    with self.subTest(mode=mode):self.assertTrue(api.audit(before,bad,ev)['errors'])
   return {}
  self.run_case(run)
 def test_coverage_rejects_added_reward_with_updated_hashes(self):
  import proxy_population_trigger_coverage as coverage
  def run(template):
   b,a,event=actual(template,'B','power');a['legacy_continuation']['game_state']['players']['B']['growth']+=5
   ev=payments.transition_event(b,a,event['action_type'],event['actor'],**{k:event[k] for k in ('source_instance_id','selected_candidate','declaring_actor','participants','parameter','source_reference')})
   try:coverage.audit(dict(source_envelope=b,steps=[dict(source_envelope=b,events=[ev],envelopes=[a],final_envelope=a)]),[],dict(occurrences=[]))
   except (ValueError,KeyError) as error:message=str(error)
   else:message='accepted early reward'
   self.assertIn('challenge declaration full delta',message);return {}
  self.run_case(run)
if __name__=='__main__':unittest.main()

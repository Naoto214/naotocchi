import copy,unittest
from unittest.mock import patch
from proxy_mandatory_policy_contract import canonical
from test_proxy_population_trigger_connection import both
from test_proxy_population_boundary_response import case
from test_proxy_population_runtime import initial
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
import proxy_population_trigger_sequential as sequential
import proxy_population_trigger_existing as existing
import proxy_population_opportunity_ledger as ledger
import proxy_continuation_payments as payments
import proxy_population_activation_reference as references
try:import proxy_population_board_group_effect as api
except ImportError:api=None

def actual(card,pending=True,parameter="power"):
 if card in ("M-antlion-07","P-anglerfish"):
  from test_proxy_population_challenge_predicates import challenge_fixture
  b,history,occurrence=challenge_fixture(card);b=payments.upgrade(b);g=b["legacy_continuation"]["game_state"];g["challenge"]["parameter"]=parameter;rows=[occurrence];adapter=existing.ExistingAdapter(history)

 elif card in ('C-chicken','I-bowtie'):
  b,_,proof=both();b=payments.upgrade(b);g=b['legacy_continuation']['game_state'];rows=[r for r in proof['occurrences'] if g['cards'][r['source_instance_id']]['card_id']==card];adapter=sequential.StartAdapter();history=[]
 else:
  b=payments.upgrade(case('end' if card=='W-countryside' else 'start'));c=b['legacy_continuation'];g=c['game_state'];p=g['players']['A'];p['hand'].append(p['board']['world']);p['board']['world']=None;c['activation_zone']=[];c['response_context'].update(chain_links=[],chain_status='empty',consecutive_passes=0,origin_event_seq=3,window_kind='after_normal_action')
  def place(name,slot):
   s=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']==name);(p['hand'] if s in p['hand'] else p['deck']).remove(s);p['board'][slot]=s;return s
  history=[dict(seq=1,actor='A',action_type='turn_start_and_normal_draw',fixture_only=True)]
  if card=='P-cat_ceo':
   place('M-antlion-04','main');source=place(card,'partner');p['board']['partner_stage']=0;c['pending_triggers']=[f'mandatory:3:{source}'] if pending else [];history.append(dict(seq=3,actor='A',action_type='relationship_start',source_instance_id=source))
  else:
   source=place(card,'world' if card=='W-countryside' else 'main');target=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='I-c_coin2');(p['hand'] if target in p['hand'] else p['deck']).remove(target);p['discard'].append(target)
   if card=='W-countryside':history.extend([dict(seq=2,actor='A',action_type='use_item',source_instance_id=target),dict(seq=3,actor='A',action_type='open_turn_end_triggers',eligible_source_instance_ids=[source])])
   else:history.append(dict(seq=3,actor='A',action_type='main_movement',source_instance_id=source,candidate_variant='birth'))
  adapter=existing.ExistingAdapter(history);rows=adapter.collect(b)['occurrences']
 j=ledger.observe(ledger.create(g['turn_player']),rows,'empty');i=initial()
 # Explicit conditional choice injection, never a policy/seed-origin proof.
 def choose(_initial,_current,_actor,options,*address):
  option=next(r for r in options if r['action']=='activate');key=canonical(option).decode()
  return dict(selected_candidate=key,selected_action=dict(candidate_id=key,option=copy.deepcopy(option)),fixture_only=True)
 with references.scope(),patch.object(sequential.choices,'resolve',side_effect=choose):r=sequential.step(b,i,j,adapter)
 assert r['chosen']['action']=='activate',(card,r['chosen']['action'])
 return b,r['after_envelope'],r['events'][0],r,history

class BoardGroupEffectTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'board group full delta absent')
 def run_case(self,callback):
  with connected.contract_scope():return runtime.operation(initial(),lambda forced:callback())
 def test_start_arrival_end_and_forced_relationship(self):
  def run():
   for card in ('C-chicken','I-bowtie','M-antlion-04','W-countryside','P-cat_ceo'):
    b,a,event,r,history=actual(card);out=api.audit(b,a,event,r);self.assertEqual(out['errors'],[],card);self.assertTrue(out['supplied_board_group_verified']);self.assertIsNone(out['balance_admitted'])
   return {}
  self.run_case(run)
 def test_full_state_receipts_and_forced_pending(self):
  def run():
   for card in ('C-chicken','P-cat_ceo'):
    b,a,event,r,history=actual(card)
    for mode in ('time','growth','runtime','link','pending','receipt','mandatory','origin','decision','missing'):
     after=copy.deepcopy(a);ev=copy.deepcopy(event);record=copy.deepcopy(r);c=after['legacy_continuation']
     if mode=='time':c['game_state']['players']['A']['time']+=1
     elif mode=='growth':c['game_state']['players']['A']['growth']+=5
     elif mode=='runtime':after['runtime']['ability_uses'].append(dict(invented=True))
     elif mode=='link':c['activation_zone'][-1]['target_instance_ids']=['invented']
     elif mode=='pending':c['pending_triggers']=['invented']
     elif mode=='receipt':c['activation_zone'][-1]['activation_receipt']['before_envelope_sha256']='0'*64
     elif mode=='mandatory':ev['mandatory']=not ev['mandatory']
     elif mode=='origin':ev['trigger_origin_event_seq']+=1
     elif mode=='decision':record['decision']=dict(selected_candidate='wrong')
     if mode=='missing':record=None
     else:record['after_envelope']=copy.deepcopy(after);record['events']=[copy.deepcopy(ev)]
     with self.subTest(card=card,mode=mode):self.assertTrue(api.audit(b,after,ev,record)['errors'])
   return {}
  self.run_case(run)
 def test_forced_group_without_legacy_pending_and_coverage(self):
  import proxy_population_trigger_coverage as coverage
  def run():
   b,a,event,r,history=actual('P-cat_ceo',pending=False);self.assertIsNone(r['decision']);self.assertEqual(api.audit(b,a,event,r)['errors'],[])
   a['legacy_continuation']['game_state']['players']['A']['growth']+=5
   ev=payments.transition_event(b,a,event['action_type'],event['actor'],**{k:event[k] for k in ('source_instance_id','source_zone','selected_candidate','chain_link_id','target_instance_ids','payment','trigger_origin_event_seq','mandatory','source_reference')})
   r['after_envelope']=copy.deepcopy(a);r['events']=[copy.deepcopy(ev)]
   with self.assertRaisesRegex(ValueError,'board group full delta'):coverage.audit(dict(source_envelope=b,trigger_records=[r],steps=[dict(source_envelope=b,events=[ev],envelopes=[a],final_envelope=a)]),history,dict(occurrences=[]))
   return {}
  self.run_case(run)
 def test_challenge_parameter_is_retained_for_m07_only(self):
  def run():
   for card in ('M-antlion-07','P-anglerfish'):
    for parameter in ('power','wisdom'):
     b,a,event,r,history=actual(card,parameter=parameter);self.assertEqual(api.audit(b,a,event,r)['errors'],[],(card,parameter))
     self.assertEqual(a['legacy_continuation']['activation_zone'][-1]['candidate_variant'],parameter if card=='M-antlion-07' else None)
     bad=copy.deepcopy(a);bad['legacy_continuation']['activation_zone'][-1]['candidate_variant']='wisdom' if parameter=='power' else 'power';record=copy.deepcopy(r);record['after_envelope']=copy.deepcopy(bad);self.assertTrue(api.audit(b,bad,event,record)['errors'])
   return {}
  self.run_case(run)
if __name__=='__main__':unittest.main()

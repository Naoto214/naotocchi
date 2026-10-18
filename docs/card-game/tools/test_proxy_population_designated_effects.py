"""Existing465/native effects joined to complete supplied envelopes."""
import copy,unittest
from test_proxy_population_partner_cycle import cat
from test_proxy_population_runtime import initial
import proxy_population_runtime as runtime
import proxy_population_challenge_window as window
import proxy_population_policy_bridge as bridge
import proxy_population_incarnation_policy as incarnation_policy
import proxy_population_incarnation as life
import proxy_population_boundary_response as boundary
import proxy_continuation_state as state
try:import proxy_population_designated_effects as api
except ImportError:api=None

CARDS=('M-beetle-01','P-cat_ceo','I-sleepboost1','M-beetle-02','W-city','E-final-time')

def actual(forced,card,mode='normal'):
 b=cat(egg=mode=='egg');c=b['legacy_continuation'];g=c['game_state'];p=g['players']['A'];link=c['activation_zone'][-1]
 if card!='P-cat_ceo':
  source=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']==card);(p['hand'] if source in p['hand'] else p['deck']).remove(source)
  if card.startswith('M-'):
   p['discard'].append(p['board']['main']);p['board']['main']=source
  elif card=='W-city':
   if p['board']['world']:p['discard'].append(p['board']['world'])
   p['board']['world']=source
  elif card=='I-sleepboost1':
   p['board']['prepared'].append(source);b['runtime']['public_prepared'][source]=dict(controller='A',face_up=True,paid_time=2,placed_event_seq=2);b['runtime']['attachments'][source]=dict(controller='A',target_instance_id=p['board']['main'],attached_event_seq=2)
  link.update(source_instance_id=source,card_id=card,card_copy_id=g['cards'][source]['card_copy_id'])
  if card=='E-final-time':
   target=next(s for s in p['discard'] if not g['cards'][s]['card_id'].startswith('M-'));link.update(source_zone='hand',action_type='use_event',payment=dict(time=2),target_instance_ids=[target])
   if mode=='invalid':p['discard'].remove(target);p['hand'].append(target)
 if mode=='empty':p['discard'].extend(p['deck']);p['deck']=[];p['discard'].extend(p['hand']);p['hand']=[]
 if mode=='outer':
  s=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='C-chicken');(p['hand'] if s in p['hand'] else p['deck']).remove(s);p['board']['companions'].append(s);outer=copy.deepcopy(link);outer.update(link_id='outer-supplied',source_instance_id=s,card_id='C-chicken',card_copy_id=g['cards'][s]['card_copy_id'],source_zone='board',action_type='activate_board_ability',payment=dict(time=0),target_instance_ids=[]);c['activation_zone'].insert(0,outer);c['response_context']['chain_links'].insert(0,outer['link_id'])
 registry=life.create(b)
 if mode in ('retained','retained_source','retained_target'):
  # Supplied registry projection is structural; this does not attest the move history.
  old=link['source_instance_id'] if mode=='retained_source' else link['target_instance_ids'][0] if mode=='retained_target' else p['deck'][0]
  new=old.rsplit('#',1)[0]+'#2';g['cards'][new]=copy.deepcopy(g['cards'][old])
  for zone in ('hand','deck','discard'):p[zone]=[new if x==old else x for x in p[zone]]
  if link['source_instance_id']==old:link['source_instance_id']=new
  link['target_instance_ids']=[new if x==old else x for x in link['target_instance_ids']]
  registry['metadata']=copy.deepcopy(g['cards']);registry['active'][g['cards'][old]['card_copy_id']]=new;registry['current_envelope_sha256']=life.digest(b);life.check(registry,b)
 s=incarnation_policy.Session(dict(protocol_id='unit',group_id='unit',mirror_side='A_first'),{'A':'00'*32,'B':'00'*32},lambda game:registry);s.turn_start('A','supplied-start');s.effect(bridge.occurrence_key(state.current(b)),'A')
 with incarnation_policy.handler_scope(s):r=forced(b,initial(),[],[],[b])
 if mode in ('start','end'):r=boundary.normalize(b,r,dict(kind=mode,turn_player='A',origin_event_seq=3))
 ev=r['new_events'][0];a=state.advance(b,r['new_snapshots'][0]['continuation_state'],ev['seq']);return b,a,ev,r['new_decisions'],registry

class DesignatedEffectTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'designated full effect audit absent')
 def run_case(self,callback):
  with window.contract_scope():return runtime.operation(initial(),callback)
 def test_six_native_effects_choices_no_choices_outer_and_retained_metadata(self):
  def run(forced):
   for card in CARDS:
    for mode in ('normal','empty','outer','retained','start','end'):
     if card=='E-final-time' and mode=='retained':
      with self.assertRaisesRegex(ValueError,'406 instance zones differ'):actual(forced,card,mode)
      continue
     b,a,ev,decisions,registry=actual(forced,card,mode);proof=api.audit(b,a,ev,decisions,registry)
     with self.subTest(card=card,mode=mode):
      self.assertEqual(proof['errors'],[]);self.assertTrue(proof['supplied_designated_effect_verified']);self.assertFalse(proof['choice_authenticated']);self.assertIsNone(proof['balance_admitted'])
   for card,mode in (('P-cat_ceo','egg'),('E-final-time','invalid')):
    b,a,ev,decisions,registry=actual(forced,card,mode);self.assertEqual(decisions,[]);self.assertEqual(api.audit(b,a,ev,decisions,registry)['errors'],[])
   return {}
  self.run_case(run)
 def test_choice_receipt_runtime_and_old_metadata_tampering_are_rejected(self):
  def run(forced):
   for card in CARDS:
    b,a,ev,decisions,registry=actual(forced,card)
    for mode in ('choice','omitted','receipt','runtime','deck','refund','source','registry','old'):
     bad=copy.deepcopy(a);event=copy.deepcopy(ev);ds=copy.deepcopy(decisions);reg=copy.deepcopy(registry);p=bad['legacy_continuation']['game_state']['players']['A']
     if mode=='choice':ds[0]['selected_candidate']='foreign'
     elif mode=='omitted':ds=[]
     elif mode=='receipt':event['result']['hand_bottom_instance_id']='foreign'
     elif mode=='runtime':bad['runtime']['ability_uses'].append(dict(forged=True))
     elif mode=='deck':p['hand'].append(p['deck'].pop(0))
     elif mode=='refund':p['time']+=1
     elif mode=='source':p['hand'].append(event['source_instance_id'])
     elif mode=='registry':reg['current_envelope_sha256']='0'*64
     else:bad['legacy_continuation']['game_state']['cards'][event['source_instance_id']]['card_id']='C-box'
     with self.subTest(card=card,mode=mode):self.assertTrue(api.audit(b,bad,event,ds,reg)['errors'])
   return {}
  self.run_case(run)
 def test_existing_trace_audit_invokes_semantics_before_accepting_opportunities(self):
  from unittest.mock import patch
  from test_proxy_mandatory_population_input import bundle
  import proxy_population_connected_entry as connected
  import proxy_population_policy_journal as journal
  record=connected.reconstruct(bundle(),'test-1A',2)
  with patch.object(api,'audit',return_value=dict(applicable=True,errors=['sentinel semantic mismatch'])):
   proof=journal.audit_opportunities(record)
  self.assertFalse(proof['designated_opportunities_covered']);self.assertIn('designated effect semantics differ',str(proof['errors']))

if __name__=='__main__':unittest.main()

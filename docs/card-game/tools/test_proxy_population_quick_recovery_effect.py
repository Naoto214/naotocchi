import copy,unittest
from unittest.mock import patch
from test_proxy_population_partner_cycle import cat
from test_proxy_population_runtime import initial
from test_proxy_population_return_challenge import in_battle
import proxy_population_runtime as runtime
import proxy_population_challenge_window as window
import proxy_population_boundary_response as boundary
import proxy_population_discard_recovery as recovery
import proxy_continuation_state as state
try:import proxy_population_quick_recovery_effect as api
except ImportError:api=None

def actual(forced,mode='normal',order=0):
 b=cat();c=b['legacy_continuation'];g=c['game_state'];p=g['players']['A'];outer=copy.deepcopy(c['activation_zone'][-1]);link=c['activation_zone'][-1]
 source=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='G-animal-shogi');(p['hand'] if source in p['hand'] else p['deck']).remove(source)
 target=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='C-chicken');(p['hand'] if target in p['hand'] else p['deck']).remove(target);p['discard'].append(target)
 link.update(link_id='supplied-shogi',action_type='use_play',source_zone='hand',source_instance_id=source,card_id='G-animal-shogi',card_copy_id=g['cards'][source]['card_copy_id'],target_instance_ids=[target],payment=dict(time=2));c['response_context']['chain_links']=[link['link_id']]
 if mode=='departed':p['discard'].remove(target);p['hand'].append(target)
 if mode=='wrongtype':link['target_instance_ids']=[next(s for s in p['discard'] if g['cards'][s]['card_id']=='I-c_coin2')]
 if mode=='empty':p['discard'].extend(p['deck']);p['deck']=[]
 if mode=='singleton':p['discard'].extend(p['deck'][1:]);p['deck']=p['deck'][:1]
 if mode=='outer':c['activation_zone'].insert(0,outer);c['response_context']['chain_links'].insert(0,outer['link_id'])
 if mode in ('comparing','resolved'):b=in_battle(b,mode)
 supplied=initial();supplied['order_id']+='-shogi-unit-'+str(order)
 r=forced(b,supplied,[],[],[b])
 if mode in ('start','end'):r=boundary.normalize(b,r,dict(kind=mode,turn_player='A',origin_event_seq=3))
 ev=r['new_events'][0];a=r['new_envelopes'][0] if 'new_envelopes' in r else state.advance(b,r['new_snapshots'][0]['continuation_state'],ev['seq']);return b,a,ev,r['new_decisions']

class QuickRecoveryEffectTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'quick recovery full effect audit absent')
 def run_case(self,fn):
  def run(forced):
   with recovery.scope():return fn(forced)
  with window.contract_scope():return runtime.operation(initial(),run)
 def test_target_choice_and_all_state_branches(self):
  def run(forced):
   positions=set()
   for mode in ('normal','departed','wrongtype','empty','singleton','outer','start','end','comparing','resolved'):
    b,a,event,ds=actual(forced,mode);proof=api.audit(b,a,event,ds)
    with self.subTest(mode=mode):self.assertEqual(proof['errors'],[]);self.assertTrue(proof['supplied_quick_recovery_verified']);self.assertEqual(proof['old_116_excluded'],bool(ds));self.assertIsNone(proof['balance_admitted'])
   for order in range(8):
    b,a,event,ds=actual(forced,order=order);positions.add(event['created_effect']['topdeck_position']);self.assertEqual(api.audit(b,a,event,ds)['errors'],[])
   self.assertEqual(positions,{'top','bottom'});return {}
  self.run_case(run)
 def test_choice_receipt_and_unrelated_state_tampering_refused(self):
  def run(forced):
   b,a,event,ds=actual(forced)
   for mode in ('choice','omitted','receipt','destination','growth','refund','runtime','source'):
    bad=copy.deepcopy(a);ev=copy.deepcopy(event);records=copy.deepcopy(ds);p=bad['legacy_continuation']['game_state']['players']['A'];target=event['created_effect']['target_instance_id']
    if mode=='choice':records[0]['selected_action']['option']['position']='side'
    elif mode=='omitted':records=[]
    elif mode=='receipt':ev['created_effect']['effect_applied']=False
    elif mode=='destination':p['hand'].remove(target);p['deck'].append(target)
    elif mode=='growth':p['growth']+=5
    elif mode=='refund':p['time']+=2
    elif mode=='runtime':bad['runtime']['ability_uses'].append(dict(forged=True))
    else:p['discard'].remove(event['source_instance_id'])
    with self.subTest(mode=mode):self.assertTrue(api.audit(b,bad,ev,records)['errors'])
   return {}
  self.run_case(run)
 def test_coverage_calls_full_effect_audit(self):
  import proxy_population_trigger_coverage as coverage
  def run(forced):
   b,a,event,ds=actual(forced);r=dict(source_envelope=b,steps=[dict(source_envelope=b,events=[event],envelopes=[a],final_envelope=a,mandatory_decisions=ds)])
   with patch.object(api,'audit',return_value=dict(applicable=True,errors=['sentinel'])):
    with self.assertRaisesRegex(ValueError,'quick recovery'):coverage.audit(r,[],dict(occurrences=[]))
   return {}
  self.run_case(run)

if __name__=='__main__':unittest.main()

"""I-bowtie start draw: activation and resolution get certified turn-end provenance rows."""
import copy,unittest
from unittest.mock import patch
from test_proxy_population_trigger_connection import both
from test_proxy_population_runtime import initial
from proxy_mandatory_policy_contract import canonical
import proxy_population_runtime as base
import proxy_population_challenge_window as connected
import proxy_population_trigger_sequential as sequential
import proxy_population_trigger_connection as connection
import proxy_population_activation_reference as references
import proxy_population_start_obligations as starts
import proxy_population_draw_effects as draw_effects
import proxy_population_board_group_effect as group_effect
import proxy_population_trigger_replay as api
import proxy_continuation_state as state
import proxy_continuation_end as end


def start_draw_history():
 """Actual I-bowtie activation record, two implicit passes, then the actual draw."""
 before,l,proof=both()
 def choose(_initial,_current,_actor,options,*address):
  option=next(r for r in options if r['action']=='activate' and r['activation']['card_id']=='I-bowtie');key=canonical(option).decode()
  return dict(selected_candidate=key,selected_action=dict(candidate_id=key,option=copy.deepcopy(option)),fixture_only=True)
 with connection.scope(proof),references.scope(),patch.object(sequential.choices,'resolve',side_effect=choose):
  record=sequential.step(before,initial(),l,sequential.StartAdapter())
  after=record['after_envelope'];activation={k:v for k,v in record['events'][0].items() if k not in base.BIND_KEYS}
  current=copy.deepcopy(after);current['event_seq']=after['event_seq']+2;current['legacy_continuation']['response_context'].update(chain_status='resolving',consecutive_passes=2)
  one=connection.resolve(current,initial());resolution=one['new_events'][0];final=state.advance(current,one['new_snapshots'][0]['continuation_state'],resolution['seq'])
 return record,activation,resolution,[before,after,current,final]


class BowtieProvenanceTests(unittest.TestCase):
 def test_start_draw_events_get_certified_rows_from_existing_audits(self):
  def run(forced):
   record,activation,resolution,trace=start_draw_history()
   self.assertEqual(group_effect.audit(trace[0],trace[1],activation,record)['errors'],[])
   self.assertEqual(draw_effects.audit(trace[2],trace[3],resolution)['errors'],[])
   row=starts.catalog()['cards']['I-bowtie']
   with patch.object(end,'verify_new_events',return_value=[]):
    with api.scope([record]):proofs=end.verify_new_events([activation,resolution],[],trace)
   self.assertEqual([(p['event_seq'],p['kind'],p['card_id'],p['certain_growth_difference'],p['duration']) for p in proofs],
    [(activation['seq'],'activate_response','I-bowtie',0,'activation_until_resolution'),(resolution['seq'],'resolve_board_ability','I-bowtie',0,'none')])
   for p in proofs:self.assertEqual((p['source_reference'],p['source_raw_sha256']),(row['reference'],row['source_raw_sha256']))
   return {}
  with connected.contract_scope():base.operation(initial(),run)

 def test_missing_receipt_tampered_delta_or_duplicate_provenance_fails_closed(self):
  def run(forced):
   record,activation,resolution,trace=start_draw_history()
   def verify(records,events,states):
    with patch.object(end,'verify_new_events',return_value=[]):
     with api.scope(records):return end.verify_new_events(events,[],states)
   with self.assertRaises(ValueError):verify([],[activation,resolution],trace)
   with self.assertRaises(ValueError):verify([record,record],[activation,resolution],trace)
   bad=copy.deepcopy(trace);bad[3]['legacy_continuation']['game_state']['players']['A']['growth']+=1
   with self.assertRaises(ValueError):verify([record],[resolution],bad)
   bad=copy.deepcopy(resolution);bad['result']['growth_added']=1
   with self.assertRaises(ValueError):verify([record],[bad],trace)
   bad=copy.deepcopy(trace);bad[1]['legacy_continuation']['game_state']['players']['A']['time']+=1
   with self.assertRaises(ValueError):verify([record],[activation],bad)
   with patch.object(end,'verify_new_events',return_value=[dict(event_seq=resolution['seq'],kind='resolve_board_ability',card_id='I-bowtie',source_reference='x',source_raw_sha256='y',certain_growth_difference=0,duration='none')]):
    with api.scope([record]):
     with self.assertRaises(ValueError):end.verify_new_events([resolution],[],trace)
   # Non-bowtie board events are left to their existing verifiers.
   other=copy.deepcopy(resolution);other['action_type']='resolve_item'
   with patch.object(end,'verify_new_events',return_value=[]):
    with api.scope([record]):self.assertEqual(end.verify_new_events([other],[],trace),[])
   return {}
  with connected.contract_scope():base.operation(initial(),run)


if __name__=='__main__':unittest.main()

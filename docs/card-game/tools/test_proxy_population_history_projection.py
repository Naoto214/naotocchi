"""Independent allowed-history boundary at the actual normal entry."""
import copy,unittest
from unittest.mock import patch
import proxy_continuation_public_history as history
import proxy_population_connected_entry as entry
from test_proxy_mandatory_population_input import bundle

class HistoryProjectionTests(unittest.TestCase):
 def test_shared_projector_cannot_add_private_fields_to_actual_inventory(self):
  native=history.event_projection;seen=[]
  def leaking(event,actor):
   result=native(event,actor)
   secret=event.get('state_before_sha256',event.get('nonpublic_state_sha256'))
   if secret is not None:
    result['nonpublic_state_sha256']=secret;seen.append(True)
   return result
  with patch.object(history,'event_projection',leaking):record=entry.reconstruct(bundle(),'test-1A',3)
  self.assertTrue(seen);self.assertFalse(entry._LOCK.locked())
  self.assertFalse(record['completed']);self.assertIn('allowed history',str(record['runtime']['stop']))
  self.assertFalse(any('nonpublic_state_sha256' in str(d) for d in record['runtime']['decisions']))


 def test_actual_normal_projection_and_permitted_fields_are_bound(self):
  import proxy_population_history_projection as api
  record=entry.reconstruct(bundle(),'test-1A',3);r=record['runtime'];step=next(s for s in r['steps'] if s.get('normal_allowed_history'))
  e=step['source_envelope'];seq=e['event_seq'];events=[{k:v for k,v in event.items() if k not in ('execution_contract_id','envelope_before_sha256','envelope_after_sha256')} for event in record['opening']['events']+r['events'] if event['seq']<=seq]
  boundaries=[r['source_envelope']]+[v for s in r['steps'] for v in s['envelopes'] if v['event_seq']<=seq]
  inventory=step['decision']['inventory'];before=copy.deepcopy(inventory);proof=api.audit(e,events,boundaries,inventory)
  self.assertTrue(proof['allowed_history_projection_verified'],proof);self.assertEqual(proof,step['normal_allowed_history']);self.assertEqual(before,inventory)
  self.assertFalse(proof['raw_history_origin_authenticated']);self.assertFalse(proof['all_information_use_proven']);self.assertIsNone(proof['policy_eligible'])
  for mode in ('extra_top','extra_result','missing','reorder','public_value','own_egg_id','duplicate_raw','future_raw','bool_raw'):
   changed=copy.deepcopy(inventory);raw=copy.deepcopy(events)
   if mode=='extra_top':changed['public_history'][0]['private_deck']=['hidden']
   elif mode=='extra_result':changed['public_history'][0]['result']={'drawn_instance_ids':['hidden']}
   elif mode=='missing':changed['public_history'].pop()
   elif mode=='reorder':changed['public_history'].reverse()
   elif mode=='public_value':changed['public_history'][0]['actor']='B'
   elif mode=='own_egg_id':next(x for x in changed['public_history'] if x['action_type']=='egg_exchange_bottom')['source_instance_id']='wrong'
   elif mode=='duplicate_raw':raw.append(copy.deepcopy(raw[-1]))
   elif mode=='future_raw':raw[-1]['seq']=seq+1
   else:raw[-1]['seq']=True
   with self.subTest(mode=mode):self.assertFalse(api.audit(e,raw,boundaries,changed)['allowed_history_projection_verified'])

 def test_owner_private_memory_and_public_reveals_are_kept(self):
  import proxy_population_history_projection as api
  from proxy_population_opening import reconstruct_opening
  prefix=reconstruct_opening(bundle(),'test-1A');root=prefix['final_envelope'];events=prefix['events']
  for actor in ('A','B'):
   e=copy.deepcopy(root);e['legacy_continuation']['game_state']['turn_player']=actor
   expected=[dict(seq=1,action_type='turn_start_and_egg_draw',actor='A',source_instance_id=None),dict(seq=2,action_type='egg_exchange_bottom',actor='A')]
   if actor=='A':expected[1]['source_instance_id']=events[1]['source_instance_id']
   self.assertTrue(api.audit(e,events,[],dict(public_history=expected))['allowed_history_projection_verified'])
   # Explicit reveal fields are public; draw/bottom receipts are not.
   raw=dict(seq=2,action_type='resolve_item',actor='A',source_instance_id='public-source',result=dict(revealed_instance_id='revealed',revealed_card_id='M-beetle-01',growth_added=5,drawn_instance_ids=['private-draw'],hand_bottom_instance_id='private-bottom'))
   visible=dict(seq=2,action_type='resolve_item',actor='A',source_instance_id='public-source',result=dict(revealed_instance_id='revealed',revealed_card_id='M-beetle-01',growth_added=5))
   self.assertTrue(api.audit(e,[raw],[],dict(public_history=[visible]))['allowed_history_projection_verified'])
   visible['result']['hand_bottom_instance_id']='private-bottom'
   self.assertFalse(api.audit(e,[raw],[],dict(public_history=[visible]))['allowed_history_projection_verified'])

 def test_return_identity_requires_actual_public_preparation(self):
  import proxy_population_history_projection as api
  from proxy_population_opening import reconstruct_opening
  e=copy.deepcopy(reconstruct_opening(bundle(),'test-1A')['final_envelope']);e['legacy_continuation']['game_state']['turn_player']='B';e['event_seq']=20
  before=copy.deepcopy(e);before['event_seq']=19;target=before['legacy_continuation']['game_state']['players']['A']['hand'][0]
  before['legacy_continuation']['game_state']['players']['A']['board']['prepared']=[target]
  raw=dict(seq=20,action_type='resolve_board_ability',actor='A',source_instance_id='public-bat',source_reference='72-companion-26-card-text-draft.md#C-bat',result=dict(target_instance_id=target,returned_instance_id=target,effect_applied=True))
  for visible in (False,True):
   before['runtime']['public_prepared']={target:dict(face_up=visible)};raw['envelope_before_sha256']=api.digest(before)
   expected=dict(seq=20,action_type='resolve_board_ability',actor='A',source_instance_id='public-bat',result=dict(effect_applied=True))
   if visible:expected['result'].update(target_instance_id=target,returned_instance_id=target)
   self.assertTrue(api.audit(e,[raw],[before],dict(public_history=[expected]))['allowed_history_projection_verified'])
   changed=copy.deepcopy(expected)
   if visible:del changed['result']['target_instance_id']
   else:changed['result']['returned_instance_id']=target
   self.assertFalse(api.audit(e,[raw],[before],dict(public_history=[changed]))['allowed_history_projection_verified'])
  before['event_seq']=18
  self.assertFalse(api.audit(e,[raw],[before],dict(public_history=[expected]))['allowed_history_projection_verified'])

if __name__=='__main__':unittest.main()

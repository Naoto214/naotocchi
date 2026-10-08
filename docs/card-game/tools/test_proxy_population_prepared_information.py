"""Bind private state hashes separately from the actual public choice record."""
import copy, unittest
from unittest.mock import patch
import proxy_population_decision_binding as binding
from test_proxy_population_information_use import supplied,execute,window,runtime,state,initial,canonical


def prepared(phase,card='E-boss'):
 e,actor,source,history=supplied(phase,card);g=e['legacy_continuation']['game_state'];other='B' if actor=='A' else 'A';p=g['players'][other]
 hidden=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='I-poop1')
 (p['hand'] if hidden in p['hand'] else p['deck']).remove(hidden);p['board']['prepared'].append(hidden)
 e['runtime']['public_prepared'][hidden]=dict(controller=other,face_up=False,paid_time=1,placed_event_seq=0)
 # Existing public comparison origin, not the later pass. This is a supplied
 # local state, not proof of how the preparation or its history was generated.
 if phase=='response_window':e['legacy_continuation']['response_context']['origin_event_seq']=2
 return e,actor,source,history


class PreparedInformationTests(unittest.TestCase):
 def run_scoped(self,body):
  with window.contract_scope():runtime.operation(initial(),body)

 def test_actual_hidden_variants_change_only_the_bound_response_state_hash(self):
  def run(forced):
   for card in ('E-boss','G-hit-blow','I-c_coin2'):
    for phase in ('normal_action','response_window'):
     e,actor,source,history=prepared(phase,card);baseline=execute(e,history,forced);reference=copy.deepcopy(baseline['decision'])
     field='inventory' if phase=='normal_action' else 'candidate_set_evidence'
     self.assertTrue(any(a.get('source_instance_id')==source for a in reference[field]['legal_candidate_details']))
     if phase=='response_window':self.assertEqual(reference[field].pop('envelope_sha256'),state.state_hash(e))
     for mode in ('both_reverse','hidden_exchange'):
      changed=copy.deepcopy(e);g=changed['legacy_continuation']['game_state'];other=g['players']['B' if actor=='A' else 'A']
      if mode=='both_reverse':
       for p in g['players'].values():p['deck'].reverse()
      else:other['hand'][0],other['deck'][0]=other['deck'][0],other['hand'][0]
      with self.subTest(card=card,phase=phase,mode=mode):
       self.assertNotEqual(state.state_hash(changed),state.state_hash(e));self.assertEqual(state.visible(e,actor),state.visible(changed,actor))
       self.assertEqual(g['cards'],e['legacy_continuation']['game_state']['cards']);self.assertEqual(changed['runtime'],e['runtime'])
       for owner in ('A','B'):
        a=e['legacy_continuation']['game_state']['players'][owner];b=g['players'][owner]
        self.assertEqual(a['board'],b['board'])
        for zone in ('hand','deck'):self.assertEqual(len(a[zone]),len(b[zone]))
        self.assertCountEqual(a['hand']+a['deck'],b['hand']+b['deck'])
       step=execute(changed,history,forced);decision=copy.deepcopy(step['decision'])
       if phase=='response_window':self.assertEqual(decision[field].pop('envelope_sha256'),state.state_hash(changed))
       # Remove exactly one separately verified private binding field. All
       # candidates, comparison, context, seed proof and selection must match.
       self.assertEqual(canonical(decision),canonical(reference));self.assertEqual(step['evaluation'],baseline['evaluation'])
       self.assertEqual(step['ordinary_entry_binding']['errors'],[])
       self.assertIsNone(step['balance_admitted']);self.assertFalse(step['ready_for_execution'])
   return {}
  self.run_scoped(run)

 def test_response_inventory_hash_must_bind_actual_prepared_envelope(self):
  def run(forced):
   e,actor,source,h=prepared('response_window');step=execute(e,h,forced)
   self.assertTrue(binding.audit_step(step,'unit-only')['entry_and_transition_binding_verified'])
   changed=copy.deepcopy(e);changed['legacy_continuation']['game_state']['players'][actor]['deck'].reverse()
   for mode,value in (('missing',None),('forged','0'*64),('null',None),('another_hidden_state',state.state_hash(changed))):
    bad=copy.deepcopy(step);evidence=bad['decision']['candidate_set_evidence']
    if mode=='missing':evidence.pop('envelope_sha256')
    else:evidence['envelope_sha256']=value
    with self.subTest(mode=mode):
     proof=binding.audit_step(bad,'unit-only')
     self.assertFalse(proof['entry_and_transition_binding_verified'],proof)
     self.assertIn('response inventory envelope binding differs',proof['errors'])
   return {}
  self.run_scoped(run)

 def test_current_entry_rejects_forged_private_binding_after_native_execution(self):
  original=runtime._step
  def tampered(*args,**kwargs):
   step=original(*args,**kwargs);step['decision']['candidate_set_evidence']['envelope_sha256']='0'*64;return step
  def run(forced):
   e,actor,source,h=prepared('response_window')
   with self.assertRaisesRegex(ValueError,'response inventory envelope binding differs'):execute(e,h,forced)
   return {}
  with patch.object(runtime,'_step',tampered),window.contract_scope():runtime.operation(initial(),run)

 def test_public_equipment_also_requires_binding_and_plain_entry_checks_any_supplied_hash(self):
  def run(forced):
   for equipment in (False,True):
    e,actor,source,h=supplied('response_window')
    if equipment:
     g=e['legacy_continuation']['game_state'];owner='B' if actor=='A' else 'A';p=g['players'][owner]
     for card,zone in (('M-antlion-01','main'),('I-bowtie','prepared')):
      s=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']==card)
      (p['hand'] if s in p['hand'] else p['deck']).remove(s)
      if zone=='main':p['board']['main']=s
      else:p['board']['prepared'].append(s)
     e['runtime']['public_prepared'][s]=dict(controller=owner,face_up=True,paid_time=1,placed_event_seq=0)
     e['runtime']['attachments'][s]=dict(controller=owner,target_instance_id=p['board']['main'],attached_event_seq=0)
     e['legacy_continuation']['response_context']['origin_event_seq']=2
    step=execute(e,h,forced);evidence=step['decision']['candidate_set_evidence']
    self.assertEqual('envelope_sha256' in evidence,equipment)
    self.assertTrue(binding.audit_step(step,'unit-only')['entry_and_transition_binding_verified'])
    if equipment:
     missing=copy.deepcopy(step);missing['decision']['candidate_set_evidence'].pop('envelope_sha256')
     self.assertFalse(binding.audit_step(missing,'unit-only')['entry_and_transition_binding_verified'])
    # No preparation needs no additional binding. If one is supplied it must
    # still match; adding a self-reported hash cannot certify a different state.
    evidence['envelope_sha256']=state.state_hash(e)
    self.assertTrue(binding.audit_step(step,'unit-only')['entry_and_transition_binding_verified'])
    evidence['envelope_sha256']='0'*64
    self.assertFalse(binding.audit_step(step,'unit-only')['entry_and_transition_binding_verified'])
   return {}
  self.run_scoped(run)

 def test_public_cost_still_changes_candidates_with_concealed_preparation(self):
  def run(forced):
   e,actor,source,h=prepared('response_window');baseline=execute(e,h,forced)
   changed=copy.deepcopy(e);changed['legacy_continuation']['game_state']['players'][actor]['time']=0;step=execute(changed,h,forced)
   self.assertNotEqual(state.visible(e,actor),state.visible(changed,actor))
   self.assertNotEqual(baseline['decision']['legal_candidate_ids'],step['decision']['legal_candidate_ids'])
   self.assertEqual(step['decision']['legal_candidate_ids'],['response-pass'])
   self.assertEqual(step['decision']['candidate_set_evidence']['envelope_sha256'],state.state_hash(changed))
   self.assertIsNone(step['balance_admitted']);self.assertFalse(step['ready_for_execution']);return {}
  self.run_scoped(run)

 def test_normal_public_view_references_bind_current_actor_projection(self):
  def run(forced):
   for card in ('E-boss','G-hit-blow'):
    e,actor,source,h=prepared('normal_action',card);step=execute(e,h,forced)
    self.assertTrue(binding.audit_step(step,'unit-group')['entry_and_transition_binding_verified'])
    mutations=[lambda d:d['inventory'].update(view_sha256='0'*64),lambda d:d['inventory'].pop('view_sha256')]
    if step['decision']['problem'] is not None:
     mutations.extend([lambda d:d['problem'].update(view_sha256='0'*64),lambda d:d['problem']['candidate_set_evidence'].update(state_ref='0'*64),lambda d:d['problem']['pairs'][0].update(view_sha256='0'*64)])
    if 'candidate_set_evidence' in step['decision']['choice']:
     mutations.append(lambda d:d['choice']['candidate_set_evidence'].update(state_ref='0'*64))
    for i,mutate in enumerate(mutations):
     bad=copy.deepcopy(step);mutate(bad['decision'])
     with self.subTest(card=card,mutation=i):self.assertFalse(binding.audit_step(bad,'unit-group')['entry_and_transition_binding_verified'])
   return {}
  self.run_scoped(run)


if __name__=='__main__':unittest.main()

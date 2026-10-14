"""Native conditional reentry fixtures; no game/worker or input generation."""
import copy,unittest
from unittest.mock import patch
from test_proxy_population_first_response import game_with
from test_proxy_population_runtime import initial
from proxy_population_start_window import _context
import proxy_population_runtime as runtime
import proxy_population_incarnation_runtime as incarnation
import proxy_continuation_state as state
import proxy_continuation_payments as payments
import proxy_continuation_preparation as preparation
import proxy_continuation_candidates as candidates
import proxy_continuation_quick as quick
import proxy_continuation_triggers as triggers
import proxy_continuation_end as end
import proxy_continuation_actions as actions

class HistoryIncarnationDispatchTests(unittest.TestCase):
 def exercise(self,card,check):
  def run(forced):
   g,actor,source=game_with(card);g['phase']='normal_action';p=g['players'][actor];p['time']=10
   if card=='I-sleepboost1':
    main=next(i for i in p['hand']+p['deck'] if g['cards'][i]['card_id']=='M-beetle-01');(p['hand'] if main in p['hand'] else p['deck']).remove(main);p['board']['main']=main
   root=payments.upgrade(state.create(dict(game_state=g,response_context=_context(actor,actor),activation_zone=[],pending_triggers=[],return_target='normal_action_opportunity'),2))
   p=root['legacy_continuation']['game_state']['players'][actor];p['hand'].remove(source);p['board']['prepared'].append(source)
   root['runtime']['public_prepared'][source]=dict(controller=actor,face_up=card=='I-sleepboost1',paid_time=2,placed_event_seq=1)
   if card=='I-sleepboost1':root['runtime']['attachments'][source]=dict(controller=actor,target_instance_id=main,attached_event_seq=1)
   connection=incarnation.Connection(root);before=copy.deepcopy(root);p=before['legacy_continuation']['game_state']['players'][actor]
   p['board']['prepared'].remove(source);p['hand'].append(source);before['runtime']['public_prepared'].pop(source);before['runtime']['attachments'].pop(source,None);before['event_seq']=3
   recovery=payments.transition_event(root,before,'unit_recovery',actor);connection.capture(root,before,recovery);history=[recovery]
   with connection.scope():
    action=next(a for a in candidates.audit(before,history)['legal_candidate_details'] if a['action_type']==('attach_item' if card=='I-sleepboost1' else 'set_item') and a['source_instance_id']==source)
    after,events=(actions.attach if card=='I-sleepboost1' else preparation.set_card)(before,action,history);event={k:v for k,v in events[0].items() if k not in end.BIND_KEYS}
    successor=source.split('#')[0]+'#2'
    self.assertNotIn(successor,before['legacy_continuation']['game_state']['cards']);self.assertIn(successor,after['legacy_continuation']['game_state']['cards'])
    self.assertEqual(event['source_instance_id'],successor);
    if card!='I-sleepboost1':self.assertTrue(end.RUNTIME_TRANSITION_VERIFIER(before,after,event,history))
    saved=copy.deepcopy((before,after,event));check(before,after,event,history);self.assertEqual((before,after,event),saved)
   return {}
  runtime.operation(initial(),run)

 def test_unrelated_classifiers_do_not_dereference_after_only_source(self):
  for card in ('I-sleepboost1','I-poop1'):
   for module in (quick,triggers):
    def check(before,after,event,history):
     # Isolate this classifier from earlier history layers; native preparation
     # replay above remains real. This does not certify an entire synthetic game.
     with patch.object(end,'verify_new_events',return_value=[]),module.scope(initial()):
      try:proofs=end.verify_new_events([event],[],[before,after])
      except KeyError as error:self.fail('unrelated classifier read after-only identity: '+str(error))
      self.assertEqual(proofs,[])
    with self.subTest(card=card,module=module.__name__):self.exercise(card,check)

 def test_applicable_missing_source_still_fails_closed(self):
  for module,kind in ((quick,'use_item'),(triggers,'activate_response')):
   def check(before,after,event,history):
    bad=dict(event,action_type=kind,source_zone='board')
    with patch.object(end,'verify_new_events',return_value=[]),module.scope(initial()):
     with self.assertRaises((KeyError,ValueError)):end.verify_new_events([bad],[],[before,after])
   with self.subTest(module=module.__name__):self.exercise('I-poop1',check)

 def test_native_preparation_replay_rejects_forged_receipt_and_snapshot(self):
  def check(before,after,event,history):
   bad=copy.deepcopy(event);bad['instance_transitions'][0]['from_instance_id']='A-999#1'
   with self.assertRaises(ValueError):end.RUNTIME_TRANSITION_VERIFIER(before,after,bad,history)
   bad_after=copy.deepcopy(after);bad_after['legacy_continuation']['game_state']['cards'].pop(event['source_instance_id'])
   with self.assertRaises((ValueError,KeyError)):end.RUNTIME_TRANSITION_VERIFIER(before,bad_after,event,history)
  self.exercise('I-poop1',check)


class LegacyPlacementHistoryTests(unittest.TestCase):
 def exercise(self,card,slot,kind,reentry,check):
  import proxy_continuation_batch as batch
  def run(forced):
   g,actor,source=game_with(card);p=g['players'][actor];g['phase']='normal_action';p['time']=10;p['person_placed']=False
   if reentry:
    p['hand'].remove(source)
    if slot=='companions':p['board'][slot].append(source)
    else:p['board'][slot]=source;p['board']['partner_stage']=0
   root=payments.upgrade(state.create(dict(game_state=g,response_context=_context(actor,actor),activation_zone=[],pending_triggers=[],return_target='normal_action_opportunity'),2))
   connection=incarnation.Connection(root);before=copy.deepcopy(root);history=[]
   if reentry:
    p=before['legacy_continuation']['game_state']['players'][actor]
    if slot=='companions':p['board'][slot].remove(source)
    else:p['board'][slot]=None;p['board']['partner_stage']=None
    p['hand'].append(source);before['event_seq']=3
    recovery=payments.transition_event(root,before,'unit_recovery',actor);connection.capture(root,before,recovery);history=[recovery]
   with connection.scope():
    action=next(a for a in candidates.audit(before,history)['legal_candidate_details'] if a['action_type']==kind and a['source_instance_id']==source)
    record=dict(selected_action=action,selected_candidate=action['candidate_id'],candidate_set_complete=True)
    with triggers.old.placements.partner_placement_scope():c,events=triggers.old.extension._apply_placement(state.current(before),record)
    after=state.advance(before,c,c['last_event_seq']);after,events=connection.finish(before,(after,events),source)
    event={k:v for k,v in events[0].items() if k not in end.BIND_KEYS}
    self.assertEqual(event['source_instance_id'],source.split('#')[0]+'#2' if reentry else source)
    check(before,after,event,history)
   return {}
  runtime.operation(initial(),run)

 def test_legacy_person_placement_history_replays_successor_and_first_generation(self):
  for card,slot,kind in (('C-box','companions','place_companion'),('P-cliff_goat','partner','place_partner')):
   for reentry in (False,True):
    def check(before,after,event,history):
     with patch.object(end,'verify_new_events',return_value=[]),triggers.scope(initial()):
      try:proofs=end.verify_new_events([event],[],[before,after])
      except (KeyError,ValueError) as error:self.fail('native placement history differs: '+str(error))
      self.assertEqual(len(proofs),1)
    with self.subTest(card=card,reentry=reentry):self.exercise(card,slot,kind,reentry,check)

class BirthHistoryTests(unittest.TestCase):
 def test_native_birth_reentry_uses_same_finished_historical_boundary(self):
  # Conditional unit state using the already-supported legacy cost modifier.
  # It is not material from the fixed400 manifest or a generated game input.
  for reentry in (False,True):
   def run(forced):
    g,actor,source=game_with('M-beetle-01');g['cards'][source]['card_id']='M-antlion-01';g['phase']='normal_action';p=g['players'][actor];p['time']=10
    if reentry:p['hand'].remove(source);p['board']['main']=source
    root=payments.upgrade(state.create(dict(game_state=g,response_context=_context(actor,actor),activation_zone=[],pending_triggers=[],return_target='normal_action_opportunity'),0))
    connection=incarnation.Connection(root);before=copy.deepcopy(root);events=[];envelopes=[root]
    if reentry:
     p=before['legacy_continuation']['game_state']['players'][actor];p['board']['main']=None;p['hand'].append(source);before['event_seq']=1
     event=payments.transition_event(root,before,'unit_recovery',actor);connection.capture(root,before,event);events=[{k:v for k,v in event.items() if k not in end.BIND_KEYS}];envelopes.append(before)
    unfinished=actions.legacy_placement
    with connection.scope():
     action=next(a for a in candidates.audit(before,events)['legal_candidate_details'] if a['action_type']=='play_main' and a['source_instance_id']==source)
     record=dict(selected_action=action,selected_candidate=action['candidate_id'],candidate_set_complete=True)
     after,generated=actions.legacy_placement(before,record,dict(public_events=events));event={k:v for k,v in generated[0].items() if k not in end.BIND_KEYS}
     self.assertEqual(event['action_type'],'play_main_birth');self.assertEqual(event['source_instance_id'],source.split('#')[0]+'#2' if reentry else source)
     envelopes.append(after);events.append(event);shots=[end.old._snapshot(state.current(e)) for e in envelopes]
     # Call frozen-base history checks with real snapshots and current scoped
     # placement helper; bypass no hash, transition, or selected-action check.
     proof=BASE_HISTORY(events,shots,envelopes)
     self.assertEqual(len(proof),1)
     if reentry:
      with patch.object(actions,'legacy_placement',unfinished),self.assertRaises(ValueError):BASE_HISTORY(events,shots,envelopes)
     bad=copy.deepcopy(events);bad[-1]['game_state_after_sha256']='0'*64
     with self.assertRaises(ValueError):BASE_HISTORY(bad,shots,envelopes)
    return {}
   with self.subTest(reentry=reentry):runtime.operation(initial(),run)

BASE_HISTORY=end.verify_new_events

class SourceCatalogRevisionTests(unittest.TestCase):
 def test_old_catalogs_preserved_and_only_explicit_sources_revised(self):
  import json,hashlib
  from pathlib import Path
  root=Path(__file__).resolve().parents[1];directory=root/'data/proxy-history-incarnation-dispatch-20261014'
  expected=[{'tools/proxy_continuation_quick.py','tools/proxy_continuation_triggers.py'},
   {'tools/proxy_mandatory_choice_boundary.py'},
   {'tools/proxy_mandatory_choice_boundary.py','tools/proxy_population_opening.py'},
   {'tools/proxy_continuation_actions.py','tools/proxy_continuation_end.py','tools/proxy_continuation_quick.py','tools/proxy_continuation_triggers.py','tools/proxy_mandatory_choice_boundary.py','tools/proxy_population_opening.py','tools/proxy_population_start_window.py'}]
  previous=[]
  for row,changed in zip(json.loads((directory/'derivation.json').read_text()),expected):
   raw=(root/row['path']).read_bytes();new=json.loads(raw);meta=new['implementation_revision'];oldraw=(root/row['previous']).read_bytes();old=json.loads(oldraw)
   self.assertEqual(hashlib.sha256(raw).hexdigest(),row['sha256']);self.assertEqual(hashlib.sha256(oldraw).hexdigest(),meta['previous_catalog_sha256'])
   a=old['sources_sha256'];b=new['sources_sha256']
   self.assertEqual(set(a)-set(b),set());self.assertEqual({p for p in a if a[p]!=b[p]},changed)
   self.assertEqual(set(b)-set(a),set(previous));self.assertFalse(meta['execution_authorized'])
   for name,digest in b.items():self.assertEqual(hashlib.sha256((root/name).read_bytes()).hexdigest(),digest,name)
   previous.append(row['path'])
 def test_tampered_source_is_rejected_by_revised_catalog(self):
  import json,shutil,tempfile
  from pathlib import Path
  import proxy_mandatory_choice_boundary as boundary
  root=Path(__file__).resolve().parents[1]
  with tempfile.TemporaryDirectory() as tmp:
   target=Path(tmp);catalog=json.loads((root/boundary.SOURCES).read_text())
   for name in [boundary.SOURCES,*catalog['sources_sha256']]:
    p=target/name;p.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(root/name,p)
   p=target/'tools/proxy_continuation_quick.py';p.write_bytes(p.read_bytes()+b'\n# tampered\n')
   with self.assertRaisesRegex(ValueError,'boundary source differs'):boundary.source_catalog(target)

if __name__=='__main__':unittest.main()

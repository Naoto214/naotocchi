"""Outcome boundary and residual completeness, using saved legal inputs."""
import copy
import unittest
import proxy_equivalence_inputs as inputs
from test_proxy_equivalence_inputs import fixture
try:
 import proxy_equivalence_outcomes as subject
except ModuleNotFoundError:
 subject=None

def problem():
 e,d=fixture();return inputs.build_input(inputs.project_equivalence_view(e,'A',d['inventory']['public_history']),d['inventory'],d['problem'],inputs.source_manifest())

class OutcomeTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(subject,'outcome implementation absent')
 def test_same_instance_stays_identified(self):
  x=problem();rows=subject.derive_outcomes(x);placed=next(r for r in rows if r['candidate_id']=='candidate-place-companion-A-013#1')
  atom=next(a for a in placed['atoms'] if a['identity']=='A-013#1')
  self.assertEqual(atom['zone'],'own_board.companions');self.assertEqual(atom['value']['card_copy_id'],'A-013')
  self.assertEqual(atom['value']['initial_instance_id'],'A-013#1')
 def test_empty_requires_coverage(self):
  x=problem();r=subject.derive_outcomes(x)[0];r['coverage'].pop('discard')
  self.assertTrue(subject.validate_outcome(r,x))
 def test_pass_keeps_pending_end_response(self):
  r=next(r for r in subject.derive_outcomes(problem()) if r['candidate_id']=='pass')
  self.assertEqual(r['boundary']['phase'],'turn_end_response')
  self.assertEqual(r['boundary']['response_context']['priority_actor'],'B')
  self.assertEqual(r['boundary']['response_context']['consecutive_passes'],1)
  self.assertEqual(r['boundary']['return_target'],'turn_end')
  self.assertIn('unresolved_response',r['unknowns'])
  self.assertTrue(any(a['zone']=='end_obligation' for a in r['atoms']))
 def test_forged_reveal_descriptor_rejected_before_prefix(self):
  x=problem();a=x['actions'][0];a['action_type']='unimplemented_public_transition';a['candidate_variant']='reveal'
  with self.assertRaises(ValueError):subject.derive_outcomes(x)
 def test_discard_and_egg_are_not_deleted(self):
  r=subject.derive_outcomes(problem())[0]
  self.assertIn('discard',r['coverage']);self.assertEqual(r['coverage']['discard'],'complete')
  self.assertEqual(len([a for a in r['atoms'] if a['zone']=='egg_state']),2)
 def test_runtime_effects_not_legacy_reservations_only(self):
  x=problem();x['view']['runtime']['stat_effects']=[{'effect_id':'fx','source_instance_id':'A-013#1','target_instance_id':'A-015#1','power':2,'wisdom':0,'controller':'A','round':1,'turn_player':'A','created_event_seq':2}]
  from proxy_resource_value_selection import canonical_sha256
  p=x['baseline_problem'];p['view_sha256']=canonical_sha256(dict(schema='naotocchi.card_game.continuation_view.v2',legacy_view=x['view']['public'],runtime=x['view']['runtime']))
  for pair in p['pairs']:pair['view_sha256']=p['view_sha256']
  r=next(r for r in subject.derive_outcomes(x) if r['candidate_id']=='pass')
  fx=next(a for a in r['atoms'] if a['identity']=='fx');self.assertEqual(fx['value']['target_instance_id'],'A-015#1');self.assertEqual(fx['zone'],'stat_effects')

class CommonPrefixTests(unittest.TestCase):
 def test_hand_activation_retains_source_targets_and_unresolved_effect(self):
  import proxy_completed_comparison as saved
  paired,_,_=saved.load_inputs()
  for run in paired['results']:
   for d in run['decisions']:
    if 'inventory' in d and any(a['action_type']=='use_play' for a in d['inventory']['legal_candidate_details']):
     e=next(e for e in run['snapshots'] if e['event_seq']==d['event_seq']);actor=d['context']['actor']
     x=inputs.build_input(inputs.project_equivalence_view(e,actor,d['inventory']['public_history']),d['inventory'],d['problem'],inputs.source_manifest())
     action=next(a for a in x['actions'] if a['action_type']=='use_play');row=next(r for r in subject.derive_outcomes(x) if r['candidate_id']==action['candidate_id'])
     self.assertNotIn('generator_unsupported',row['unknowns']);self.assertIn('unresolved_effect',row['unknowns'])
     self.assertTrue(any(a['zone']=='pending_action' and a['value']['source_instance_id']==action['source_instance_id'] for a in row['atoms']))
     self.assertFalse(any(a['zone']=='own_hand' and a['identity']==action['source_instance_id'] for a in row['atoms']));return
  self.fail('real legal hand activation fixture absent')
 def test_paid_placement_keeps_declared_board_and_pending_obligations(self):
  import proxy_completed_comparison as saved
  paired,_,_=saved.load_inputs()
  for run in paired['results']:
   for d in run['decisions']:
    if 'inventory' in d and any(a['action_type']=='play_main' for a in d['inventory']['legal_candidate_details']):
     e=next(e for e in run['snapshots'] if e['event_seq']==d['event_seq']);actor=d['context']['actor']
     if e['legacy_continuation']['game_state']['players'][actor]['board']['main']:continue
     x=inputs.build_input(inputs.project_equivalence_view(e,actor,d['inventory']['public_history']),d['inventory'],d['problem'],inputs.source_manifest())
     a=next(a for a in x['actions'] if a['action_type']=='play_main');r=next(r for r in subject.derive_outcomes(x) if r['candidate_id']==a['candidate_id'])
     self.assertNotIn('generator_unsupported',r['unknowns']);self.assertIn('unresolved_arrival_or_departure',r['unknowns'])
     self.assertTrue(any(z['zone']=='own_board.main' and z['identity']==a['source_instance_id'] for z in r['atoms']));return
  self.fail('real legal birth fixture absent')

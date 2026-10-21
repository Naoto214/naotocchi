"""Shared source omissions must not disappear from producer and checker alike."""
import copy
import unittest
from unittest.mock import patch
import proxy_population_start_obligations as starts
import proxy_population_trigger_predicates as predicates
import proxy_population_trigger_existing as existing
import proxy_population_runtime as runtime
from test_proxy_population_runtime import initial
from test_proxy_population_trigger_connection import both
from test_proxy_population_arrival_predicates import fixture


class PublicSourceTests(unittest.TestCase):
 def test_start_capture_and_collection_reject_shared_source_omission(self):
  native=starts.public_sources
  def omit(envelope):
   return {s:r for s,r in native(envelope).items() if r['card_id']!='C-chicken'}
  with patch.object(starts,'public_sources',omit),predicates.scope():
   with self.assertRaisesRegex(ValueError,'public source'):both()

 def test_arrival_collection_rejects_shared_source_omission(self):
  native=starts.public_sources
  def omit(envelope):
   return {s:r for s,r in native(envelope).items() if r['card_id']!='M-beetle-01'}
  def run(forced):
   e,h,o,_=fixture('M-beetle-01')
   with patch.object(starts,'public_sources',omit),predicates.scope():
    with self.assertRaisesRegex(ValueError,'public source'):existing.ExistingAdapter(h).proof(e)
   return {}
  runtime.operation(initial(),run)

 def test_arrival_collection_cannot_reclassify_missing_registered_source_as_outside(self):
  def run(forced):
   e,h,_,_=fixture('M-beetle-01')
   with predicates.scope(),patch.object(existing,'SUPPORTED',existing.SUPPORTED-{'M-beetle-01'}):
    with self.assertRaisesRegex(ValueError,'native collection source coverage'):
     existing.ExistingAdapter(h).proof(e)
   return {}
  runtime.operation(initial(),run)

 def test_connected_scope_requires_the_challenge_source_registration(self):
  import proxy_population_challenge_window as connected
  from test_proxy_population_challenge_predicates import challenge_fixture
  def run(forced):
   for card in ('M-antlion-07','P-anglerfish'):
    e,h,o=challenge_fixture(card)
    good=existing.ExistingAdapter(h).proof(e);self.assertIn(o['source_instance_id'],{r['source_instance_id'] for r in good['occurrences']})
    with self.subTest(card=card),patch.object(existing,'SUPPORTED',existing.SUPPORTED-{card}):
     with self.assertRaisesRegex(ValueError,'native collection source coverage'):
      existing.ExistingAdapter(h).proof(e)
   return {}
  with connected.contract_scope():runtime.operation(initial(),run)

 def test_registration_gate_rejects_every_missing_or_extra_source_and_restores(self):
  def run(forced):
   e,h,_,_=fixture('M-beetle-01');native=existing.ExistingAdapter.collect
   wanted=predicates.NATIVE_CARDS
   for removed in sorted(wanted):
    with self.subTest(removed=removed),predicates.scope(),patch.object(existing,'SUPPORTED',set(wanted)-{removed}):
     with self.assertRaisesRegex(ValueError,'native collection source coverage'):
      existing.ExistingAdapter(h).proof(e)
   with predicates.scope(),patch.object(existing,'SUPPORTED',set(wanted)|{'C-chicken'}):
    with self.assertRaisesRegex(ValueError,'native collection source coverage'):
     existing.ExistingAdapter(h).proof(e)
   self.assertIs(existing.ExistingAdapter.collect,native)
   with predicates.scope():self.assertTrue(existing.ExistingAdapter(h).proof(e)['current_collection_audit']['current_source_collection_bound'])
   return {}
  runtime.operation(initial(),run)

 def test_source_metadata_and_classification_cannot_change_together(self):
  e,_,_=both();native=starts.public_sources
  for field,value in (('actor','B'),('slot','main'),('card_id','C-bat'),('classification',{})):
   def corrupt(envelope):
    result=native(envelope);row=next(iter(result.values()));row[field]=copy.deepcopy(value);return result
   with self.subTest(field=field),patch.object(starts,'public_sources',corrupt),predicates.scope():
    with self.assertRaisesRegex(ValueError,'public source'):starts.public_sources(e)

 def test_scope_restores_source_function_after_exception(self):
  native=starts.public_sources;e,_,_=both()
  with self.assertRaisesRegex(RuntimeError,'stop'):
   with predicates.scope():
    self.assertEqual(starts.public_sources(e),native(e));raise RuntimeError('stop')
  self.assertIs(starts.public_sources,native)

 def test_all_board_slots_and_both_owners_are_checked(self):
  e,_,_=both();g=e['legacy_continuation']['game_state'];native=starts.public_sources
  for actor in ('A','B'):
   p=g['players'][actor];b=p['board']
   for slot,card in (('main','M-beetle-01'),('partner','P-cat_ceo'),('world','W-city'),('companions','C-bat')):
    s=next((s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']==card),None)
    if s is None:continue
    (p['hand'] if s in p['hand'] else p['deck']).remove(s)
    if slot=='companions':b[slot].append(s)
    else:b[slot]=s
  expected=native(e)
  self.assertEqual({r['slot'] for r in expected.values()},{'main','partner','world','companions','prepared'})
  self.assertEqual({r['actor'] for r in expected.values()},{'A','B'})
  with predicates.scope():self.assertEqual(starts.public_sources(e),expected)
  for omitted in expected:
   def corrupt(envelope):return {s:r for s,r in native(envelope).items() if s!=omitted}
   with self.subTest(source=omitted),patch.object(starts,'public_sources',corrupt),predicates.scope():
    with self.assertRaisesRegex(ValueError,'public source'):starts.public_sources(e)

 def test_hidden_prepared_identity_is_not_read_or_promoted(self):
  class Unreadable(dict):
   def __getitem__(self,key):raise AssertionError('hidden identity read')
  e,_,_=both();g=e['legacy_continuation']['game_state'];p=g['players']['B'];s=p['hand'].pop()
  p['board']['prepared'].append(s);e['runtime']['public_prepared'][s]=dict(controller='B',face_up=False,paid_time=1,placed_event_seq=1)
  g['cards'][s]=Unreadable(g['cards'][s])
  with predicates.scope():self.assertNotIn(s,starts.public_sources(e))
  native=starts.public_sources
  def corrupt(envelope):
   result=native(envelope);result[s]=dict(actor='B',slot='prepared',card_id='I-poop1',classification={});return result
  with patch.object(starts,'public_sources',corrupt),predicates.scope():
   with self.assertRaisesRegex(ValueError,'public source'):starts.public_sources(e)

if __name__=='__main__':unittest.main()

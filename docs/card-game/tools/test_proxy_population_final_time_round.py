import copy,gzip,json,unittest
from pathlib import Path
import proxy_continuation_state as state
import proxy_continuation_batch as batch
import proxy_continuation_candidates as candidates
import proxy_normal_action_candidate_completeness as candidate_121
import proxy_population_hand_predicates as hand
import proxy_resource_value_trajectory as old
import proxy_population_final_time_round as final_round

RESULT=json.loads(gzip.decompress((Path(__file__).resolve().parents[1]/'data/proxy-continuation-world-438/paired.json.gz').read_bytes()))['results'][5]


def fixture(round_,main='keep',time=2,used=False,discard=True):
 e=copy.deepcopy(RESULT['final_envelope']);h=copy.deepcopy(RESULT['events']);g=e['legacy_continuation']['game_state'];p=g['players']['B'];g['round']=round_;p['time']=time
 source=next(s for s in p['deck'] if g['cards'][s]['card_id']=='E-final-time');p['deck'].remove(source);p['hand'].append(source)
 if main=='none':p['discard'].append(p['board']['main']);p['board']['main']=None
 elif main=='eight':
  eight=next(s for s in p['deck'] if g['cards'][s]['card_id']=='M-antlion-08');p['deck'].remove(eight);p['discard'].append(p['board']['main']);p['board']['main']=eight
 if not discard:p['deck'].extend(s for s in p['discard'] if not g['cards'][s]['card_id'].startswith('M-'));p['discard']=[s for s in p['discard'] if g['cards'][s]['card_id'].startswith('M-')]
 if used:
  h.append(dict(seq=h[-1]['seq']+1,actor='B',action_type='activate_response',source_instance_id=source))
 h[-1]['game_state_after_sha256']=old.start.opening._stop_state_sha256(g);h[-1]['continuation_state_after_sha256']=old.start._hash(state.current(e))
 return e,h,source


def final_rows(e,h,current=True):
 with batch.scope():
  if not current:return candidates.audit(e,h)
  with final_round.scope():return candidates.audit(e,h)


class FinalTimeRoundTenTests(unittest.TestCase):
 def units(self,inventory):return [(u['candidate_id'],u['reason_codes']) for u in inventory['enumeration_units'] if u['card_id']=='E-final-time']

 def test_round_ten_without_main_is_a_legal_candidate(self):
  e,h,source=fixture(10,'none');inv=final_rows(e,h)
  self.assertEqual(self.units(inv),[(f'candidate-use_event-{source}-target-B-033#1',[])])
  self.assertIn(f'candidate-use_event-{source}-target-B-033#1',inv['legal_candidate_ids'])

 def test_frozen_enumerator_excluded_round_ten_without_main(self):
  e,h,_=fixture(10,'none')
  self.assertEqual(self.units(final_rows(e,h,current=False)),[(None,['required_own_main_absent'])])

 def test_hand_text_audit_agrees_only_with_the_text_bound_inventory(self):
  e,h,_=fixture(10,'none')
  self.assertEqual(hand.audit_normal(e,h,final_rows(e,h))['errors'],[])
  self.assertTrue(any('hand activation disposition differs' in x for x in hand.audit_normal(e,h,final_rows(e,h,current=False))['errors']))

 def test_main_eight_and_round_ten_with_main_are_unchanged(self):
  for round_,main in ((9,'eight'),(10,'keep'),(10,'eight')):
   e,h,source=fixture(round_,main)
   self.assertEqual(final_rows(e,h),final_rows(e,h,current=False))
   self.assertEqual(self.units(final_rows(e,h)),[(f'candidate-use_event-{source}-target-B-033#1',[])])

 def test_neither_branch_stays_excluded(self):
  for main in ('keep','none'):
   e,h,_=fixture(9,main);inv=final_rows(e,h)
   self.assertEqual(inv,final_rows(e,h,current=False))
   self.assertEqual([cid for cid,_ in self.units(inv)],[None])

 def test_other_conditions_still_exclude_at_round_ten_without_main(self):
  for kwargs in (dict(time=1),dict(used=True)):
   e,h,_=fixture(10,'none',**kwargs);inv=final_rows(e,h)
   self.assertTrue(self.units(inv));self.assertTrue(all(cid is None and reasons for cid,reasons in self.units(inv)),kwargs)
   self.assertEqual(hand.audit_normal(e,h,inv)['errors'],[])
  e,h,_=fixture(10,'none',discard=False);inv=final_rows(e,h)
  self.assertTrue(all(cid is None for cid,_ in self.units(inv)))
  self.assertFalse(any(cid and 'E-final-time' in cid for cid in inv['legal_candidate_ids']))

 def test_only_the_absent_main_reason_is_lifted(self):
  view=dict(actor='B',round=10,players=dict(B=dict(board=dict(main=None))))
  unit=dict(card_id='E-final-time',source_family='hand_card_action',action_type='use_event',template=dict(prerequisites=final_round.PREREQUISITES,source_text_reference='91-event-21-card-text-draft.md#E-final-time'))
  self.assertTrue(final_round.round_ten_unit(view,unit,dict(reason_codes=['required_own_main_absent'])))
  self.assertFalse(final_round.round_ten_unit(view,unit,dict(reason_codes=['required_own_main_absent','insufficient_time'])))
  self.assertFalse(final_round.round_ten_unit(dict(view,round=9),unit,dict(reason_codes=['required_own_main_absent'])))
  self.assertFalse(final_round.round_ten_unit(view,dict(unit,card_id='E-fateful-transform'),dict(reason_codes=['required_own_main_absent'])))
  with self.assertRaisesRegex(ValueError,'registered prerequisite differs'):
   final_round.round_ten_unit(view,dict(unit,template=dict(unit['template'],prerequisites='own main')),dict(reason_codes=['required_own_main_absent']))

 def test_scope_restores_and_rejects_reentry(self):
  native=candidate_121.adjudicate_units
  with final_round.scope():
   self.assertIsNot(candidate_121.adjudicate_units,native)
   with self.assertRaisesRegex(ValueError,'reentry'):
    with final_round.scope():pass
  self.assertIs(candidate_121.adjudicate_units,native)

if __name__=='__main__':unittest.main()
